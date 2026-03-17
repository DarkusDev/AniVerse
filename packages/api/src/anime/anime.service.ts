import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import { AniListService } from './anilist/anilist.service';
import type { AnimeQueryDto } from './dto/anime-query.dto';
import type { AnimeDetailDto, PaginatedAnimeDto } from './dto/anime-response.dto';
import type { AniListSeason } from './types/anilist.types';

// TTL en segundos
const TTL = {
  SEARCH: 5 * 60,       // 5 min   — resultados cambian con frecuencia
  TRENDING: 30 * 60,    // 30 min  — actualización cada media hora
  SEASONAL: 60 * 60,    // 1 hora  — temporada estable
  DETAIL: 24 * 60 * 60, // 24 h    — datos estáticos del anime
} as const;

@Injectable()
export class AnimeService {
  private readonly logger = new Logger(AnimeService.name);

  constructor(
    private readonly anilist: AniListService,
    private readonly redis: RedisService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.redis.get<T>(key);
    if (hit !== null) {
      this.logger.debug(`Cache HIT  ${key}`);
      return hit;
    }

    this.logger.debug(`Cache MISS ${key}`);
    const result = await fn();
    await this.redis.set(key, result, ttl);
    return result;
  }

  private getCurrentSeason(): { season: AniListSeason; year: number } {
    const month = new Date().getMonth() + 1; // 1-12
    const year = new Date().getFullYear();
    let season: AniListSeason;

    if (month <= 3) season = 'WINTER';
    else if (month <= 6) season = 'SPRING';
    else if (month <= 9) season = 'SUMMER';
    else season = 'FALL';

    return { season, year };
  }

  // ─── Métodos públicos ────────────────────────────────────────────────────────

  async search(dto: AnimeQueryDto): Promise<PaginatedAnimeDto> {
    const key = `anime:search:${JSON.stringify(dto)}`;

    return this.cached(key, TTL.SEARCH, async () => {
      const page = await this.anilist.search({
        search: dto.q,
        genre: dto.genre,
        format: dto.format,
        seasonYear: dto.year,
        sort: dto.sort,
        page: dto.page,
        perPage: dto.perPage,
      });

      return { pageInfo: page.pageInfo, results: page.media };
    });
  }

  async getTrending(page = 1, perPage = 20): Promise<PaginatedAnimeDto> {
    const key = `anime:trending:${page}:${perPage}`;

    return this.cached(key, TTL.TRENDING, async () => {
      const result = await this.anilist.getTrending(page, perPage);
      return { pageInfo: result.pageInfo, results: result.media };
    });
  }

  async getSeasonal(page = 1, perPage = 20): Promise<PaginatedAnimeDto> {
    const { season, year } = this.getCurrentSeason();
    const key = `anime:seasonal:${season}:${year}:${page}:${perPage}`;

    return this.cached(key, TTL.SEASONAL, async () => {
      const result = await this.anilist.getSeasonal(season, year, page, perPage);
      return {
        pageInfo: result.pageInfo,
        results: result.media,
        meta: { season, year },
      } as PaginatedAnimeDto & { meta: { season: string; year: number } };
    });
  }

  async getById(id: number): Promise<AnimeDetailDto> {
    const key = `anime:detail:${id}`;

    return this.cached(key, TTL.DETAIL, () => this.anilist.getById(id));
  }
}
