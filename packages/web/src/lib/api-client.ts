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

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  getMe(): Promise<UserProfile> {
    return requestAuth('/users/me');
  },

  updateMe(data: FormData): Promise<UserProfile> {
    return requestAuth('/users/me', { method: 'PATCH', body: data });
  },
};
