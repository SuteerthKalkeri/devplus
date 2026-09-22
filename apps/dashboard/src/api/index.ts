import type { Account } from './types';
export type { Account, Workspace, Project, IngestionKey } from './types';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.method && options.method !== 'GET') {
    const csrfResponse = await fetch('/api/auth/csrf', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!csrfResponse.ok)
      throw new ApiError('Could not connect. Please try again.', csrfResponse.status);
    const csrf = await csrfResponse.json();
    headers.set(csrf.headerName, csrf.token);
    if (options.body && !(options.body instanceof URLSearchParams))
      headers.set('Content-Type', 'application/json');
  }
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Could not reach DevPulse. Check your connection and try again.', 0);
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(error.message || 'Something went wrong. Please try again.', response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function signIn(email: string, password: string) {
  await api('/auth/login', { method: 'POST', body: new URLSearchParams({ email, password }) });
  return api<Account>('/auth/me');
}
