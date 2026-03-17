import type {
  AniListMediaBase,
  AniListMediaDetail,
  AniListPageInfo,
} from '../types/anilist.types';

// Re-exportamos los tipos de AniList como DTOs públicos de la API.
// El controlador devuelve las estructuras de AniList sin transformación adicional
// para preservar todos los campos y evitar capas innecesarias.

export type AnimeListItemDto = AniListMediaBase;
export type AnimeDetailDto = AniListMediaDetail;

export interface PaginatedAnimeDto {
  pageInfo: AniListPageInfo;
  results: AnimeListItemDto[];
}
