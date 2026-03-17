import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnimeStatus, type AnimeList, type AnimeCache, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AnimeCacheService } from '../common/anime-cache/anime-cache.service';
import type { CreateListEntryDto } from './dto/create-list-entry.dto';
import type { UpdateListEntryDto } from './dto/update-list-entry.dto';
import type { ListQueryDto } from './dto/list-query.dto';

// ─── Response types ───────────────────────────────────────────────────────────

export interface AnimeSummary {
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

export interface ListEntryResponse {
  id: string;
  animeId: number;
  status: AnimeStatus;
  score: number | null;
  episodesWatched: number;
  totalEpisodes: number | null;
  startDate: Date | null;
  finishDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  anime: AnimeSummary | null;
}

export interface PaginatedListResponse {
  results: ListEntryResponse[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type EntryWithCache = AnimeList & { animeCache: AnimeCache | null };

function mapEntry(entry: EntryWithCache): ListEntryResponse {
  const c = entry.animeCache;
  return {
    id: entry.id,
    animeId: entry.animeId,
    status: entry.status,
    score: entry.score !== null ? Number(entry.score) : null,
    episodesWatched: entry.episodesWatched,
    totalEpisodes: entry.totalEpisodes,
    startDate: entry.startDate,
    finishDate: entry.finishDate,
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    anime: c
      ? {
          titleRomaji: c.titleRomaji,
          titleEnglish: c.titleEnglish,
          coverImage: c.coverImage,
          format: c.format,
          episodes: c.episodes,
          status: c.status,
          season: c.season,
          seasonYear: c.seasonYear,
          genres: c.genres,
          averageScore: c.averageScore,
        }
      : null,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly animeCache: AnimeCacheService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Cuando el status es COMPLETED, devuelve el total de episodios resolviendo
   * en orden de prioridad: DTO > entrada existente > caché local.
   * Devuelve null si ninguna fuente conoce el total.
   */
  private resolveCompletedEpisodes(
    dtoTotal: number | undefined,
    storedTotal: number | null,
    cachedEpisodes: number | null | undefined,
  ): number | null {
    return dtoTotal ?? storedTotal ?? cachedEpisodes ?? null;
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async getMyList(
    userId: string,
    query: ListQueryDto,
  ): Promise<PaginatedListResponse> {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const where: Prisma.AnimeListWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, entries] = await this.prisma.$transaction([
      this.prisma.animeList.count({ where }),
      this.prisma.animeList.findMany({
        where,
        include: { animeCache: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: perPage,
      }),
    ]);

    return {
      results: entries.map(mapEntry),
      total,
      page,
      perPage,
      lastPage: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async getEntry(userId: string, animeId: number): Promise<ListEntryResponse> {
    const entry = await this.prisma.animeList.findUnique({
      where: { userId_animeId: { userId, animeId } },
      include: { animeCache: true },
    });

    if (!entry) {
      throw new NotFoundException(`Anime ${animeId} no está en tu lista`);
    }

    return mapEntry(entry);
  }

  async createEntry(
    userId: string,
    dto: CreateListEntryDto,
  ): Promise<ListEntryResponse> {
    // 1. Verificar que no exista ya
    const exists = await this.prisma.animeList.findUnique({
      where: { userId_animeId: { userId, animeId: dto.animeId } },
      select: { id: true },
    });

    if (exists) {
      throw new ConflictException(
        `El anime ${dto.animeId} ya está en tu lista`,
      );
    }

    // 2. Asegurar caché local (lanza excepción si el anime no existe en AniList)
    await this.animeCache.ensure(dto.animeId);

    // 3. Resolver episodios totales y aplicar regla de COMPLETED
    const cache = await this.prisma.animeCache.findUnique({
      where: { animeId: dto.animeId },
      select: { episodes: true },
    });

    const resolvedTotal = this.resolveCompletedEpisodes(
      dto.totalEpisodes,
      null,
      cache?.episodes,
    );

    const episodesWatched =
      dto.status === AnimeStatus.COMPLETED && resolvedTotal !== null
        ? resolvedTotal
        : (dto.episodesWatched ?? 0);

    // 4. Crear entrada
    const entry = await this.prisma.animeList.create({
      data: {
        userId,
        animeId: dto.animeId,
        status: dto.status,
        score: dto.score !== undefined ? new Prisma.Decimal(dto.score) : null,
        episodesWatched,
        totalEpisodes: resolvedTotal,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        finishDate: dto.finishDate ? new Date(dto.finishDate) : null,
        notes: dto.notes ?? null,
      },
      include: { animeCache: true },
    });

    return mapEntry(entry);
  }

  async updateEntry(
    userId: string,
    animeId: number,
    dto: UpdateListEntryDto,
  ): Promise<ListEntryResponse> {
    const existing = await this.prisma.animeList.findUnique({
      where: { userId_animeId: { userId, animeId } },
      select: {
        id: true,
        totalEpisodes: true,
        episodesWatched: true,
        animeCache: { select: { episodes: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Anime ${animeId} no está en tu lista`);
    }

    // Resolver episodesWatched cuando el nuevo status es COMPLETED
    let episodesWatchedOverride: number | undefined;
    if (dto.status === AnimeStatus.COMPLETED) {
      const resolvedTotal = this.resolveCompletedEpisodes(
        dto.totalEpisodes,
        existing.totalEpisodes,
        existing.animeCache?.episodes,
      );
      if (resolvedTotal !== null) {
        episodesWatchedOverride = resolvedTotal;
      }
    }

    const entry = await this.prisma.animeList.update({
      where: { userId_animeId: { userId, animeId } },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.score !== undefined && {
          score: dto.score !== null ? new Prisma.Decimal(dto.score) : null,
        }),
        // episodesWatchedOverride tiene precedencia sobre el valor del DTO
        ...(episodesWatchedOverride !== undefined
          ? { episodesWatched: episodesWatchedOverride }
          : dto.episodesWatched !== undefined
            ? { episodesWatched: dto.episodesWatched }
            : {}),
        ...(dto.totalEpisodes !== undefined && {
          totalEpisodes: dto.totalEpisodes,
        }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.finishDate !== undefined && {
          finishDate: dto.finishDate ? new Date(dto.finishDate) : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { animeCache: true },
    });

    return mapEntry(entry);
  }

  async deleteEntry(userId: string, animeId: number): Promise<void> {
    const existing = await this.prisma.animeList.findUnique({
      where: { userId_animeId: { userId, animeId } },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Anime ${animeId} no está en tu lista`);
    }

    await this.prisma.animeList.delete({
      where: { userId_animeId: { userId, animeId } },
    });
  }
}
