import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// CSRF token cache
let csrfToken: string | null = null;
let isFetchingCsrf = false;
let csrfFetchPromise: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (isFetchingCsrf && csrfFetchPromise) return csrfFetchPromise;

  isFetchingCsrf = true;
  csrfFetchPromise = (async () => {
    try {
      const response = await axios.get('/api/auth/csrf-token', { withCredentials: true });
      csrfToken = response.data?.token || response.data?.csrfToken || null;
      return csrfToken;
    } catch {
      return null;
    } finally {
      isFetchingCsrf = false;
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
}

export function clearCsrfToken() {
  csrfToken = null;
}

/**
 * Axios instance for client-side requests to Next.js API routes
 * Used in React components via TanStack Query hooks
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
  timeout: 30000, // 30 second timeout
});

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to refresh the access token
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      await apiClient.post('/auth/refresh');
      console.log('[API Client] Token refresh successful');
      return true;
    } catch (error) {
      console.error('[API Client] Token refresh failed:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Request interceptor: attach CSRF token for mutating requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Client] ${config.method?.toUpperCase()} ${config.url}`);
    }

    const method = config.method?.toLowerCase();
    if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
      const token = await fetchCsrfToken();
      if (token) {
        config.headers['X-CSRF-Token'] = token;
      }
    }

    return config;
  },
  (error) => {
    console.error('[API Client] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for automatic token refresh on 401 errors
apiClient.interceptors.response.use(
  (response) => {
    // Successful response, return it
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry the refresh endpoint itself
      if (originalRequest.url?.includes('/auth/refresh')) {
        console.log('[API Client] Refresh token expired or invalid');
        return Promise.reject(error);
      }

      // Mark that we've retried this request
      originalRequest._retry = true;

      console.log('[API Client] Got 401, attempting token refresh...');

      // Try to refresh the token
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Token refreshed successfully, retry the original request
        console.log('[API Client] Retrying original request after token refresh');
        return apiClient(originalRequest);
      } else {
        // Token refresh failed — redirect to login
        console.log('[API Client] Token refresh failed, redirecting to login...');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    // For other errors or if retry already happened, just reject
    if (error.response) {
      console.error(
        `[API Client] Error ${error.response.status}:`,
        error.response.data || error.message
      );
    } else if (error.request) {
      console.error('[API Client] Network error: No response received');
    } else {
      console.error('[API Client] Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
