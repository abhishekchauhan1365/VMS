import { getAccessToken, setAccessToken } from './tokenStore';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  isForm?: boolean;
  skipAuthRetry?: boolean;
}

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let body: BodyInit | undefined;
    if (opts.body !== undefined) {
      if (opts.isForm) {
        body = opts.body as FormData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(opts.body);
      }
    }

    return fetch(`${API_URL}/api/v1${path}`, {
      method: opts.method ?? 'GET',
      headers,
      ...(body !== undefined ? { body } : {}),
      credentials: 'include',
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !opts.skipAuthRetry && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await doFetch();
  }

  if (!res.ok) {
    let code = 'INTERNAL_ERROR';
    let message = res.statusText;
    let details: unknown;
    try {
      const data = (await res.json()) as {
        error?: { code: string; message: string; details?: unknown };
      };
      if (data.error) {
        code = data.error.code;
        message = data.error.message;
        details = data.error.details;
      }
    } catch {
      // response had no JSON body
    }
    throw new ApiError(res.status, code, message, details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
