import { clearTokens, getTokens, setTokens } from './tokens';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api';

// ─── Error ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Base fetch ───────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers);

  if (token) headers.set('Authorization', `Bearer ${token}`);

  // No establecer Content-Type para FormData (el browser lo hace con el boundary)
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: unknown };
    const raw = body.message;
    const msg = Array.isArray(raw)
      ? raw.join(', ')
      : typeof raw === 'string'
        ? raw
        : `Error ${res.status}`;
    throw new ApiError(res.status, msg);
  }

  return res.json() as Promise<T>;
}

// Auto-refresh on 401 + retry
async function requestAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = getTokens();
  if (!tokens) throw new ApiError(401, 'No autenticado');

  try {
    return await request<T>(path, init, tokens.accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      try {
        const fresh = await authApi.refresh(tokens.refreshToken);
        setTokens(fresh);
        return await request<T>(path, init, fresh.accessToken);
      } catch {
        clearTokens();
        throw new ApiError(401, 'Sesión expirada. Inicia sesión de nuevo.');
      }
    }
    throw err;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  register(body: { email: string; username: string; password: string }): Promise<AuthTokens> {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
  },

  login(body: { email: string; password: string }): Promise<AuthTokens> {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  },

  refresh(refreshToken: string): Promise<AuthTokens> {
    return request('/auth/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
  },
};

// ─── Anime Types ──────────────────────────────────────────────────────────────

export interface AnimeTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface AnimeCoverImage {
  extraLarge?: string | null;
  large: string | null;
  medium: string | null;
}

export interface AnimePageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

export interface AnimeListItem {
  id: number;
  title: AnimeTitle;
  coverImage: AnimeCoverImage;
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

export interface AnimeCharacter {
  id: number;
  name: { full: string };
  image: { medium: string | null };
}

export interface AnimeStudio {
  id: number;
  name: string;
}

export interface AnimeStreamingEpisode {
  title: string;
  thumbnail: string;
  url: string;
  site: string;
}

export interface AnimeTag {
  name: string;
  rank: number;
  isMediaSpoiler: boolean;
}

export interface AnimeRanking {
  rank: number;
  type: string;
  context: string;
  allTime: boolean;
  season: string | null;
  year: number | null;
}

export interface AnimeDetail extends AnimeListItem {
  meanScore: number | null;
  trending: number;
  duration: number | null;
  source: string | null;
  tags: AnimeTag[];
  studios: { nodes: AnimeStudio[] };
  characters: { nodes: AnimeCharacter[] };
  relations: { nodes: (AnimeListItem & { type: string })[] };
  streamingEpisodes: AnimeStreamingEpisode[];
  trailer: { id: string; site: string } | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  nextAiringEpisode: { airingAt: number; episode: number } | null;
  rankings: AnimeRanking[];
}

export interface PaginatedAnime {
  pageInfo: AnimePageInfo;
  results: AnimeListItem[];
  meta?: { season: string; year: number };
}

// ─── Anime API ────────────────────────────────────────────────────────────────

export const animeApi = {
  search(params: {
    q?: string;
    genre?: string;
    format?: string;
    year?: number;
    sort?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedAnime> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.genre) qs.set('genre', params.genre);
    if (params.format) qs.set('format', params.format);
    if (params.year) qs.set('year', String(params.year));
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    if (params.perPage) qs.set('perPage', String(params.perPage));
    const query = qs.toString();
    return request(`/anime${query ? `?${query}` : ''}`);
  },

  trending(page = 1, perPage = 20): Promise<PaginatedAnime> {
    return request(`/anime/trending?page=${page}&perPage=${perPage}`);
  },

  seasonal(page = 1, perPage = 20): Promise<PaginatedAnime> {
    return request(`/anime/seasonal?page=${page}&perPage=${perPage}`);
  },

  getById(id: number): Promise<AnimeDetail> {
    return request(`/anime/${id}`);
  },
};

// ─── List Types ───────────────────────────────────────────────────────────────

export type AnimeUserStatus = 'WATCHING' | 'COMPLETED' | 'PLANNED' | 'DROPPED' | 'PAUSED';

export interface AnimeCacheSummary {
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

export interface ListEntry {
  id: string;
  animeId: number;
  status: AnimeUserStatus;
  score: number | null;
  episodesWatched: number;
  totalEpisodes: number | null;
  startDate: string | null;
  finishDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  anime: AnimeCacheSummary | null;
}

export interface PaginatedList {
  results: ListEntry[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
}

// ─── Lists API ────────────────────────────────────────────────────────────────

export const listsApi = {
  getMyList(params?: {
    status?: AnimeUserStatus;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedList> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.perPage) qs.set('perPage', String(params.perPage));
    const q = qs.toString();
    return requestAuth(`/lists/me${q ? `?${q}` : ''}`);
  },

  getEntry(animeId: number): Promise<ListEntry> {
    return requestAuth(`/lists/me/${animeId}`);
  },

  createEntry(data: {
    animeId: number;
    status: AnimeUserStatus;
    score?: number;
    episodesWatched?: number;
    totalEpisodes?: number;
    notes?: string;
  }): Promise<ListEntry> {
    return requestAuth('/lists/me', { method: 'POST', body: JSON.stringify(data) });
  },

  updateEntry(
    animeId: number,
    data: {
      status?: AnimeUserStatus;
      score?: number;
      episodesWatched?: number;
      totalEpisodes?: number;
      notes?: string;
    },
  ): Promise<ListEntry> {
    return requestAuth(`/lists/me/${animeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteEntry(animeId: number): Promise<void> {
    return requestAuth(`/lists/me/${animeId}`, { method: 'DELETE' });
  },
};

// ─── Import API ───────────────────────────────────────────────────────────────

export type ImportSource = 'mal' | 'anilist';
export type JobStatus = 'pending' | 'fetching' | 'importing' | 'done' | 'error';

export interface ImportJob {
  id: string;
  source: ImportSource;
  username: string;
  status: JobStatus;
  total: number;
  processed: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export const importApi = {
  startMal(username: string): Promise<{ jobId: string }> {
    return requestAuth('/import/mal', { method: 'POST', body: JSON.stringify({ username }) });
  },

  startAniList(username: string): Promise<{ jobId: string }> {
    return requestAuth('/import/anilist', { method: 'POST', body: JSON.stringify({ username }) });
  },

  /** Polling fallback — use SSE (openProgressStream) for real-time updates */
  getStatus(jobId: string): Promise<ImportJob> {
    return request(`/import/status/${jobId}`);
  },

  /** Opens an SSE stream for real-time progress. Returns EventSource. */
  openProgressStream(jobId: string): EventSource {
    return new EventSource(`${API_BASE}/import/progress/${jobId}`);
  },
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  getMe(): Promise<UserProfile> {
    return requestAuth('/users/me');
  },

  updateMe(data: FormData): Promise<UserProfile> {
    return requestAuth('/users/me', { method: 'PATCH', body: data });
  },
};
