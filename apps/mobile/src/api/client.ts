import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const TOKEN_KEY = 'xearn_access_token';
const REFRESH_KEY = 'xearn_refresh_token';
const CSRF_KEY = 'xearn_csrf_token';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

async function removeRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

async function getCsrfToken(): Promise<string | null> {
  return SecureStore.getItemAsync(CSRF_KEY);
}

async function setCsrfToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(CSRF_KEY, token);
}

// ---------------------------------------------------------------------------
// API Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Core request builder
// ---------------------------------------------------------------------------

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const token = await getToken();
  const csrf = await getCsrfToken();

  const url = new URL(`${API_URL}${path}`);

  // Append query params
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (csrf) {
    headers['X-CSRF-Token'] = csrf;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  // Extract CSRF token from response headers
  const responseCsrf = response.headers.get('x-csrf-token');
  if (responseCsrf) {
    await setCsrfToken(responseCsrf);
  }

  // Handle 401 ― attempt token refresh once
  if (response.status === 401) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      // Retry original request with new token
      const newToken = await getToken();
      const newCsrf = await getCsrfToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      if (newCsrf) {
        headers['X-CSRF-Token'] = newCsrf;
      }

      const retryResponse = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal,
      });

      const retryCsrf = retryResponse.headers.get('x-csrf-token');
      if (retryCsrf) {
        await setCsrfToken(retryCsrf);
      }

      if (!retryResponse.ok) {
        const retryError = await parseError(retryResponse);
        throw retryError;
      }

      return retryResponse.json() as Promise<T>;
    }

    // Refresh failed — clear tokens and propagate
    await clearTokens();
    throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);
  }

  if (!response.ok) {
    const error = await parseError(response);
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

async function attemptRefresh(): Promise<boolean> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();

    if (data.accessToken) {
      await setToken(data.accessToken);
    }

    if (data.refreshToken) {
      await setRefreshToken(data.refreshToken);
    }

    const csrf = response.headers.get('x-csrf-token');
    if (csrf) {
      await setCsrfToken(csrf);
    }

    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Error parser
// ---------------------------------------------------------------------------

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    return new ApiError(body.message ?? 'Une erreur est survenue', response.status, body.code);
  } catch {
    return new ApiError(`Erreur ${response.status}: ${response.statusText}`, response.status);
  }
}

// ---------------------------------------------------------------------------
// Token lifecycle (for auth screens)
// ---------------------------------------------------------------------------

export async function storeAuthData(accessToken: string, refreshToken: string): Promise<void> {
  await setToken(accessToken);
  await setRefreshToken(refreshToken);
}

export async function clearTokens(): Promise<void> {
  await removeToken();
  await removeRefreshToken();
  await SecureStore.deleteItemAsync(CSRF_KEY);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};

export { getToken, API_URL };
