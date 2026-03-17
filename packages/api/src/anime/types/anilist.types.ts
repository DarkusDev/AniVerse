// ─── Primitivos ───────────────────────────────────────────────────────────────

export interface AniListTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface AniListCoverImage {
  extraLarge?: string | null;
  large: string | null;
  medium: string | null;
}

export interface AniListPageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

export interface AniListFuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

// ─── Media base (listados) ────────────────────────────────────────────────────

export interface AniListMediaBase {
  id: number;
  title: AniListTitle;
  coverImage: AniListCoverImage;
  bannerImage: string | null;
  genres: string[];
  averageScore: number | null;
  popularity: number;
  episodes: number | null;
  status: string;
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  description: string | null;
}

// ─── Media detail ─────────────────────────────────────────────────────────────

export interface AniListCharacter {
  id: number;
  name: { full: string };
  image: { medium: string | null };
}

export interface AniListStudio {
  id: number;
  name: string;
}

export interface AniListRelation extends AniListMediaBase {
  type: string;
}

export interface AniListStreamingEpisode {
  title: string;
  thumbnail: string;
  url: string;
  site: string;
}

export interface AniListRanking {
  rank: number;
  type: string;
  context: string;
  allTime: boolean;
  season: string | null;
  year: number | null;
}

export interface AniListTag {
  name: string;
  rank: number;
  isMediaSpoiler: boolean;
}

export interface AniListMediaDetail extends AniListMediaBase {
  meanScore: number | null;
  trending: number;
  duration: number | null;
  source: string | null;
  tags: AniListTag[];
  studios: { nodes: AniListStudio[] };
  characters: { nodes: AniListCharacter[] };
  relations: { nodes: AniListRelation[] };
  streamingEpisodes: AniListStreamingEpisode[];
  trailer: { id: string; site: string } | null;
  startDate: AniListFuzzyDate;
  endDate: AniListFuzzyDate;
  nextAiringEpisode: { airingAt: number; episode: number } | null;
  rankings: AniListRanking[];
}

// ─── Respuestas raw del API ───────────────────────────────────────────────────

export interface AniListPageResponse<T> {
  data: {
    Page: {
      pageInfo: AniListPageInfo;
      media: T[];
    };
  };
}

export interface AniListDetailResponse {
  data: {
    Media: AniListMediaDetail;
  };
}

export type AniListSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
