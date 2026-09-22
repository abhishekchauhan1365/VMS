import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserRole } from '@vms/shared';
import { apiFetch, ApiError } from '../lib/api';
import { setAccessToken, subscribeToken } from '../lib/tokenStore';
import { disconnectSocket } from '../lib/socket';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  officeId: string | null;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToken((token) => {
      if (!token) setUser(null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch<LoginResponse>('/auth/refresh', { method: 'POST', skipAuthRetry: true })
      .then((data) => {
        if (cancelled) return;
        setAccessToken(data.accessToken);
        setUser(data.user);
      })
      .catch(() => {
        // no valid session — stay logged out
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuthRetry: true,
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // best effort
    }
    setAccessToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
