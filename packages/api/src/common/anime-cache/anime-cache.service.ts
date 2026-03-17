import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AniListService } from '../../anime/anilist/anilist.service';

const CACHE_STALE_DAYS = 7;

@Injectable()
export class AnimeCacheService {
  private readonly logger = new Logger(AnimeCacheService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anilist: AniListService,
  ) {}

  /**
   * Garantiza que existe un registro fresco en `anime_cache` para el animeId dado.
   * Si no existe o tiene más de CACHE_STALE_DAYS días, descarga datos de AniList y hace upsert.
   * Lanza InternalServerErrorException si AniList no reconoce el ID.
   */
  async ensure(animeId: number): Promise<void> {
    const existing = await this.prisma.animeCache.findUnique({
      where: { animeId },
      select: { cachedAt: true },
    });

    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - CACHE_STALE_DAYS);

    if (existing && existing.cachedAt >= staleThreshold) return;

    this.logger.debug(`Refreshing cache for anime ${animeId}`);

    const detail = await this.anilist.getById(animeId);

    const coverImage =
      detail.coverImage.extraLarge ??
      detail.coverImage.large ??
      detail.coverImage.medium ??
      null;

    const data = {
      titleRomaji: detail.title.romaji,
      titleEnglish: detail.title.english,
      coverImage,
      format: detail.format,
      episodes: detail.episodes,
      status: detail.status,
      season: detail.season,
      seasonYear: detail.seasonYear,
      genres: detail.genres,
      averageScore: detail.averageScore,
    };

    await this.prisma.animeCache.upsert({
      where: { animeId },
      create: { animeId, ...data },
      update: data,
    });
  }
}
