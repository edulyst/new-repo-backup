/**
 * API client – fetch wrapper with auth header and error handling.
 */
import { API_BASE_URL } from '@/constants/api';
import type { ApiError, ApiRequestOptions } from '@/types';
import { getStoredAuth } from './auth-storage';

export type { ApiError, ApiRequestOptions } from '@/types';

async function getAuthToken(): Promise<string | null> {
  const auth = await getStoredAuth();
  return auth?.token ?? null;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuth, headers: customHeaders, ...rest } = options;

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // Bypass ngrok free tier browser warning for API requests
  if (url.includes('ngrok-free.app')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  if (!skipAuth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    ...rest,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: ApiError = {
      message: data?.message ?? `Request failed (${res.status})`,
      statusCode: res.status,
    };
    throw err;
  }

  return data?.data ?? data;
}
