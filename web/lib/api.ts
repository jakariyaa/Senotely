import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from './types';
import { API_BASE_URL, TOKEN_COOKIE } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers: requestHeaders, ...requestOptions } = options;
  const headers = new Headers(requestHeaders);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (requestOptions.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(new URL(path, API_BASE_URL), {
    ...requestOptions,
    headers,
    cache: 'no-store',
  });
  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'The request could not be completed.',
      response.status,
    );
  }
  return payload as T;
}

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_COOKIE)?.value;
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await getToken();
  if (!token) return null;
  try {
    return await api<User>('/users/me', { token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

export async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) redirect('/login');
  return token;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export { TOKEN_COOKIE as tokenCookie };
