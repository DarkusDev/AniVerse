import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type {
  AniListDetailResponse,
  AniListMediaBase,
  AniListMediaDetail,
  AniListPageInfo,
  AniListPageResponse,
  AniListSeason,
} from '../types/anilist.types';
import {
  GET_ANIME_DETAIL,
  GET_SEASONAL,
  GET_TRENDING,
  SEARCH_ANIME,
} from './anilist.queries';

const ANILIST_URL = 'https://graphql.anilist.co';

const SORT_MAP: Record<string, string> = {
  SCORE: 'SCORE_DESC',
  POPULARITY: 'POPULARITY_DESC',
  TRENDING: 'TRENDING_DESC',
  NEWEST: 'START_DATE_DESC',
  TITLE: 'TITLE_ROMAJI',
};

export interface PageResult<T> {
  pageInfo: AniListPageInfo;
  media: T[];
}

@Injectable()
export class AniListService {
  private readonly logger = new Logger(AniListService.name);

  private async gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    let res: Response;
    try {
      res = await fetch(ANILIST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
    } catch (err) {
      this.logger.error('AniList unreachable', err);
      throw new InternalServerErrorException('No se pudo conectar con AniList');
    }

    if (!res.ok) {
      this.logger.error(`AniList ${res.status}: ${res.statusText}`);
      throw new InternalServerErrorException(`AniList API error ${res.status}`);
    }

    const body = await res.json() as { errors?: { message: string }[] } & T;

    if (body.errors?.length) {
      const msg = body.errors[0].message;
      this.logger.error(`AniList GraphQL error: ${msg}`);
      throw new InternalServerErrorException(`AniList: ${msg}`);
    }

    return body;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  async search(params: {
    search?: string | undefined;
    genre?: string | undefined;
    format?: string | undefined;
    seasonYear?: number | undefined;
    sort?: string | undefined;
    page?: number | undefined;
    perPage?: number | undefined;
  }): Promise<PageResult<AniListMediaBase>> {
    const sort = params.sort ? [SORT_MAP[params.sort] ?? 'POPULARITY_DESC'] : ['POPULARITY_DESC'];

    const data = await this.gql<AniListPageResponse<AniListMediaBase>>(SEARCH_ANIME, {
      search: params.search || undefined,
      genres: params.genre ? [params.genre] : undefined,
      formats: params.format ? [params.format] : undefined,
      seasonYear: params.seasonYear || undefined,
      sort,
      page: params.page ?? 1,
      perPage: params.perPage ?? 20,
    });

    return data.data.Page;
  }

  async getTrending(page = 1, perPage = 20): Promise<PageResult<AniListMediaBase>> {
    const data = await this.gql<AniListPageResponse<AniListMediaBase>>(GET_TRENDING, {
      page,
      perPage,
    });
    return data.data.Page;
  }

  async getSeasonal(
    season: AniListSeason,
    seasonYear: number,
    page = 1,
    perPage = 20,
  ): Promise<PageResult<AniListMediaBase>> {
    const data = await this.gql<AniListPageResponse<AniListMediaBase>>(GET_SEASONAL, {
      season,
      seasonYear,
      page,
      perPage,
    });
    return data.data.Page;
  }

  async getById(id: number): Promise<AniListMediaDetail> {
    const data = await this.gql<AniListDetailResponse>(GET_ANIME_DETAIL, { id });
    return data.data.Media;
  }
}
