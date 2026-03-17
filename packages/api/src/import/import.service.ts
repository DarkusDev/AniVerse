import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AnimeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const ANILIST_URL = 'https://graphql.anilist.co';

/** 400 ms between Jikan requests → stays safely under 3 req/s */
const JIKAN_DELAY_MS = 400;
/** 50 IDs per AniList batch request */
const ANILIST_BATCH_SIZE = 50;
/** 700 ms between AniList batch requests → ~85 req/min, under the 90/min cap */
const ANILIST_BATCH_DELAY_MS = 700;
/** Completed jobs are kept in memory for 10 minutes before cleanup */
const JOB_TTL_MS = 10 * 60 * 1000;

// ─── Public types ─────────────────────────────────────────────────────────────

export type ImportSource = 'mal' | 'anilist';
export type JobStatus = 'pending' | 'fetching' | 'importing' | 'done' | 'error';

export interface ImportJob {
  id: string;
  source: ImportSource;
  username: string;
  status: JobStatus;
  /** Total entries found in the external list */
  total: number;
  /** Entries processed so far (imported + updated + skipped + errors) */
  processed: number;
  /** New AnimeList rows created */
  imported: number;
  /** Existing AnimeList rows updated */
  updated: number;
  /** Entries that couldn't be mapped (no AniList ID, unknown status, etc.) */
  skipped: number;
  /** Entries that threw an unexpected exception */
  errors: number;
  /** Human-readable progress message */
  message: string;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface AnimeCacheData {
  titleRomaji: string | null;
  titleEnglish: string | null;
  coverImage: string | null;
  format: string | null;
  episodes: number | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  averageScore: number | null;
}

interface ListEntryData {
  animeId: number;
  status: AnimeStatus;
  score: number | null;
  episodesWatched: number;
  totalEpisodes: number | null;
  startDate: Date | null;
  finishDate: Date | null;
  notes: string | null;
}

// Jikan v4 /users/{username}/animelist response shapes
interface JikanAnimeItem {
  mal_id: number;
  score: number;
  status: string;
  num_watched_episodes: number;
  tags: string | null;
  start_date: string | null;
  finish_date: string | null;
}
interface JikanResponse {
  data: JikanAnimeItem[];
  pagination: { has_next_page: boolean; current_page: number; items: { total: number } };
}

// AniList MediaListCollection shapes
interface AniListMediaData {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null; native: string | null };
  coverImage: { extraLarge: string | null; large: string | null; medium: string | null };
  format: string | null;
  episodes: number | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  averageScore: number | null;
}
interface AniListListEntry {
  mediaId: number;
  status: string;
  score: number;
  progress: number;
  startedAt: { year: number | null; month: number | null; day: number | null };
  completedAt: { year: number | null; month: number | null; day: number | null };
  notes: string | null;
  media: AniListMediaData;
}
interface AniListCollectionResponse {
  data: {
    MediaListCollection: {
      lists: Array<{ entries: AniListListEntry[] }>;
    };
  };
}
interface AniListBatchResponse {
  data: {
    Page: { media: AniListMediaData[] };
  };
}

// ─── Status maps ─────────────────────────────────────────────────────────────

function malStatusToEnum(status: string | number): AnimeStatus | null {
  if (typeof status === 'number') {
    const map: Record<number, AnimeStatus> = {
      1: AnimeStatus.WATCHING,
      2: AnimeStatus.COMPLETED,
      3: AnimeStatus.PAUSED,
      4: AnimeStatus.DROPPED,
      6: AnimeStatus.PLANNED,
    };
    return map[status] ?? null;
  }
  const map: Record<string, AnimeStatus> = {
    Watching: AnimeStatus.WATCHING,
    Completed: AnimeStatus.COMPLETED,
    'On-Hold': AnimeStatus.PAUSED,
    Dropped: AnimeStatus.DROPPED,
    'Plan to Watch': AnimeStatus.PLANNED,
  };
  return map[status] ?? null;
}

function anilistStatusToEnum(status: string): AnimeStatus | null {
  const map: Record<string, AnimeStatus> = {
    CURRENT: AnimeStatus.WATCHING,
    REPEATING: AnimeStatus.WATCHING,
    COMPLETED: AnimeStatus.COMPLETED,
    PLANNING: AnimeStatus.PLANNED,
    DROPPED: AnimeStatus.DROPPED,
    PAUSED: AnimeStatus.PAUSED,
  };
  return map[status] ?? null;
}

function parseFuzzyDate(d: {
  year: number | null;
  month: number | null;
  day: number | null;
} | null): Date | null {
  if (!d?.year) return null;
  return new Date(d.year, (d.month ?? 1) - 1, d.day ?? 1);
}

function parseIsoDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly jobs = new Map<string, ImportJob>();

  constructor(private readonly prisma: PrismaService) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  startMalImport(userId: string, username: string): string {
    const job = this.createJob('mal', username);
    void this.runMalImport(job, userId).catch((err: Error) =>
      this.failJob(job, err.message),
    );
    return job.id;
  }

  startAniListImport(userId: string, username: string): string {
    const job = this.createJob('anilist', username);
    void this.runAniListImport(job, userId).catch((err: Error) =>
      this.failJob(job, err.message),
    );
    return job.id;
  }

  getJob(jobId: string): ImportJob | undefined {
    return this.jobs.get(jobId);
  }

  // ── Job lifecycle ──────────────────────────────────────────────────────────

  private createJob(source: ImportSource, username: string): ImportJob {
    const job: ImportJob = {
      id: randomUUID(),
      source,
      username,
      status: 'pending',
      total: 0,
      processed: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      message: 'Iniciando...',
      startedAt: new Date(),
    };
    this.jobs.set(job.id, job);
    return job;
  }

  private patch(job: ImportJob, updates: Partial<ImportJob>): void {
    Object.assign(job, updates);
  }

  private failJob(job: ImportJob, message: string): void {
    this.patch(job, {
      status: 'error',
      errorMessage: message,
      message: `Error: ${message}`,
      completedAt: new Date(),
    });
    this.scheduleCleanup(job.id);
  }

  private doneJob(job: ImportJob): void {
    this.patch(job, {
      status: 'done',
      message: `Importación completada. ${job.imported} añadidos, ${job.updated} actualizados, ${job.skipped} omitidos.`,
      completedAt: new Date(),
    });
    this.scheduleCleanup(job.id);
  }

  private scheduleCleanup(jobId: string): void {
    setTimeout(() => this.jobs.delete(jobId), JOB_TTL_MS);
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Generic GQL ───────────────────────────────────────────────────────────

  private async gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
    const body = (await res.json()) as { errors?: { message: string }[] } & T;
    if (body.errors?.length) throw new Error(`AniList: ${body.errors[0].message}`);
    return body;
  }

  // ── DB helpers ─────────────────────────────────────────────────────────────

  private async upsertCache(animeId: number, data: AnimeCacheData): Promise<void> {
    await this.prisma.animeCache.upsert({
      where: { animeId },
      create: { animeId, ...data },
      update: data,
    });
  }

  private async upsertListEntry(
    userId: string,
    entry: ListEntryData,
  ): Promise<'imported' | 'updated'> {
    const total = entry.totalEpisodes;
    // COMPLETED → episodesWatched must equal total if total is known
    const episodesWatched =
      entry.status === AnimeStatus.COMPLETED && total !== null
        ? total
        : entry.episodesWatched;

    const commonData = {
      status: entry.status,
      score: entry.score !== null ? new Prisma.Decimal(entry.score) : null,
      episodesWatched,
      totalEpisodes: total,
      startDate: entry.startDate,
      finishDate: entry.finishDate,
      notes: entry.notes,
    };

    const exists = await this.prisma.animeList.findUnique({
      where: { userId_animeId: { userId, animeId: entry.animeId } },
      select: { id: true },
    });

    if (exists) {
      await this.prisma.animeList.update({
        where: { userId_animeId: { userId, animeId: entry.animeId } },
        data: commonData,
      });
      return 'updated';
    }

    await this.prisma.animeList.create({
      data: { userId, animeId: entry.animeId, ...commonData },
    });
    return 'imported';
  }

  // ── MAL import ─────────────────────────────────────────────────────────────

  private async runMalImport(job: ImportJob, userId: string): Promise<void> {
    this.patch(job, { status: 'fetching', message: 'Obteniendo lista de MyAnimeList...' });

    // 1. Fetch all pages from Jikan
    const allItems: JikanAnimeItem[] = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const url = `${JIKAN_BASE}/users/${encodeURIComponent(job.username)}/animelist?status=all&page=${page}`;
      this.logger.debug(`Jikan fetch page ${page}: ${url}`);

      let jikanRes: Response;
      try {
        jikanRes = await fetch(url, { headers: { Accept: 'application/json' } });
      } catch (err) {
        throw new Error(`No se pudo conectar con Jikan: ${String(err)}`);
      }

      if (jikanRes.status === 404) {
        throw new Error(`Usuario "${job.username}" no encontrado en MyAnimeList`);
      }
      if (jikanRes.status === 429) {
        // Back-off: wait 2 seconds and retry once
        await this.delay(2000);
        continue;
      }
      if (!jikanRes.ok) {
        throw new Error(`Jikan devolvió HTTP ${jikanRes.status}`);
      }

      const body = (await jikanRes.json()) as JikanResponse;
      allItems.push(...body.data);

      const total = body.pagination.items.total;
      if (job.total === 0) this.patch(job, { total });
      this.patch(job, { message: `Obteniendo lista... ${allItems.length} / ${total}` });

      hasNext = body.pagination.has_next_page;
      page++;

      if (hasNext) await this.delay(JIKAN_DELAY_MS);
    }

    this.patch(job, {
      total: allItems.length,
      message: `${allItems.length} entradas obtenidas. Buscando IDs de AniList...`,
      status: 'importing',
    });

    // 2. Batch-lookup AniList IDs from MAL IDs
    const malIds = allItems.map((i) => i.mal_id);
    const malToAniList = new Map<number, AniListMediaData>();

    for (let i = 0; i < malIds.length; i += ANILIST_BATCH_SIZE) {
      const batch = malIds.slice(i, i + ANILIST_BATCH_SIZE);
      this.patch(job, {
        message: `Mapeando IDs AniList... ${Math.min(i + ANILIST_BATCH_SIZE, malIds.length)} / ${malIds.length}`,
      });

      try {
        const resp = await this.gql<AniListBatchResponse>(
          `query BatchByMalId($ids: [Int]) {
            Page(perPage: 50) {
              media(idMal_in: $ids, type: ANIME) {
                id idMal
                title { romaji english native }
                coverImage { extraLarge large medium }
                format episodes status season seasonYear genres averageScore
              }
            }
          }`,
          { ids: batch },
        );
        for (const m of resp.data.Page.media) {
          if (m.idMal !== null) malToAniList.set(m.idMal, m);
        }
      } catch (err) {
        this.logger.warn(`AniList batch lookup failed: ${String(err)}`);
      }

      if (i + ANILIST_BATCH_SIZE < malIds.length) await this.delay(ANILIST_BATCH_DELAY_MS);
    }

    // 3. Import each entry
    for (const item of allItems) {
      const media = malToAniList.get(item.mal_id);
      if (!media) {
        this.patch(job, { skipped: job.skipped + 1, processed: job.processed + 1 });
        continue;
      }

      const status = malStatusToEnum(item.status);
      if (!status) {
        this.patch(job, { skipped: job.skipped + 1, processed: job.processed + 1 });
        continue;
      }

      try {
        await this.upsertCache(media.id, {
          titleRomaji: media.title.romaji,
          titleEnglish: media.title.english,
          coverImage: media.coverImage.extraLarge ?? media.coverImage.large ?? media.coverImage.medium ?? null,
          format: media.format,
          episodes: media.episodes,
          status: media.status,
          season: media.season,
          seasonYear: media.seasonYear,
          genres: media.genres,
          averageScore: media.averageScore,
        });

        const result = await this.upsertListEntry(userId, {
          animeId: media.id,
          status,
          score: item.score > 0 ? item.score : null,
          episodesWatched: item.num_watched_episodes,
          totalEpisodes: media.episodes,
          startDate: parseIsoDate(item.start_date),
          finishDate: parseIsoDate(item.finish_date),
          notes: item.tags ?? null,
        });

        this.patch(job, {
          [result]: job[result] + 1,
          processed: job.processed + 1,
          message: `Importando... ${job.processed + 1} / ${job.total}`,
        });
      } catch (err) {
        this.logger.warn(`Error importing MAL ${item.mal_id}: ${String(err)}`);
        this.patch(job, { errors: job.errors + 1, processed: job.processed + 1 });
      }
    }

    this.doneJob(job);
  }

  // ── AniList import ─────────────────────────────────────────────────────────

  private async runAniListImport(job: ImportJob, userId: string): Promise<void> {
    this.patch(job, { status: 'fetching', message: 'Obteniendo lista de AniList...' });

    const query = `
      query GetUserList($username: String) {
        MediaListCollection(userName: $username, type: ANIME, forceSingleCompletedList: true) {
          lists {
            entries {
              mediaId status
              score(format: POINT_10_DECIMAL)
              progress
              startedAt   { year month day }
              completedAt { year month day }
              notes
              media {
                id idMal
                title { romaji english native }
                coverImage { extraLarge large medium }
                format episodes status season seasonYear genres averageScore
              }
            }
          }
        }
      }
    `;

    let resp: AniListCollectionResponse;
    try {
      resp = await this.gql<AniListCollectionResponse>(query, { username: job.username });
    } catch (err) {
      const msg = String(err);
      // AniList returns a GQL error when the user doesn't exist
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('user')) {
        throw new Error(`Usuario "${job.username}" no encontrado en AniList`);
      }
      throw new Error(msg);
    }

    // Flatten all list groups into one array
    const allEntries = resp.data.MediaListCollection.lists.flatMap((l) => l.entries);

    this.patch(job, {
      total: allEntries.length,
      status: 'importing',
      message: `${allEntries.length} entradas obtenidas. Importando...`,
    });

    for (const entry of allEntries) {
      const status = anilistStatusToEnum(entry.status);
      if (!status) {
        this.patch(job, { skipped: job.skipped + 1, processed: job.processed + 1 });
        continue;
      }

      const m = entry.media;

      try {
        await this.upsertCache(m.id, {
          titleRomaji: m.title.romaji,
          titleEnglish: m.title.english,
          coverImage: m.coverImage.extraLarge ?? m.coverImage.large ?? m.coverImage.medium ?? null,
          format: m.format,
          episodes: m.episodes,
          status: m.status,
          season: m.season,
          seasonYear: m.seasonYear,
          genres: m.genres,
          averageScore: m.averageScore,
        });

        const result = await this.upsertListEntry(userId, {
          animeId: m.id,
          status,
          score: entry.score > 0 ? entry.score : null,
          episodesWatched: entry.progress,
          totalEpisodes: m.episodes,
          startDate: parseFuzzyDate(entry.startedAt),
          finishDate: parseFuzzyDate(entry.completedAt),
          notes: entry.notes,
        });

        this.patch(job, {
          [result]: job[result] + 1,
          processed: job.processed + 1,
          message: `Importando... ${job.processed + 1} / ${job.total}`,
        });
      } catch (err) {
        this.logger.warn(`Error importing AniList ${m.id}: ${String(err)}`);
        this.patch(job, { errors: job.errors + 1, processed: job.processed + 1 });
      }
    }

    this.doneJob(job);
  }
}
