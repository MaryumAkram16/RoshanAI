import { auth } from './firebase';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const target = typeof input === 'string' && input.startsWith('/') && API_BASE_URL
    ? `${API_BASE_URL}${input}`
    : input;
  return fetch(target, { ...init, headers });
}
