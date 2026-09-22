type Listener = (token: string | null) => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((fn) => fn(token));
}

export function subscribeToken(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
