'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { authApi, usersApi, type UserProfile } from '@/lib/api-client';
import { clearTokens, getTokens, setTokens } from '@/lib/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: UserProfile) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sesión al montar
  useEffect(() => {
    const tokens = getTokens();
    if (!tokens) {
      setIsLoading(false);
      return;
    }

    usersApi
      .getMe()
      .then(setUser)
      .catch(() => {
        // getMe ya intenta refresh internamente; si falla, limpiamos
        clearTokens();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const tokens = await authApi.login({ email, password });
    setTokens(tokens);
    const profile = await usersApi.getMe();
    setUser(profile);
  }, []);

  const register = useCallback(
    async (email: string, username: string, password: string): Promise<void> => {
      const tokens = await authApi.register({ email, username, password });
      setTokens(tokens);
      const profile = await usersApi.getMe();
      setUser(profile);
    },
    [],
  );

  const logout = useCallback((): void => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
