const KEYS = {
  access: 'av_access_token',
  refresh: 'av_refresh_token',
} as const;

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export function getTokens(): StoredTokens | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(KEYS.access);
  const refreshToken = localStorage.getItem(KEYS.refresh);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function setTokens(tokens: StoredTokens): void {
  localStorage.setItem(KEYS.access, tokens.accessToken);
  localStorage.setItem(KEYS.refresh, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(KEYS.access);
  localStorage.removeItem(KEYS.refresh);
}
