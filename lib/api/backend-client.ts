import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Backend URL from environment variable
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3008';

/**
 * Axios instance for Next.js API routes to communicate with the backend
 * Used server-side only in API route handlers
 */
export const backendClient: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending/receiving cookies
  timeout: 30000, // 30 second timeout
});

// Request interceptor for logging and CSRF token handling
backendClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Backend API] ${config.method?.toUpperCase()} ${config.url}`);
    }

    // CSRF token is automatically sent via cookies from the browser/Next.js
    // Backend expects it in the cookie, not as a header
    // If backend requires header, uncomment below:
    // const csrfToken = getCsrfTokenFromCookie();
    // if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    //   config.headers['X-CSRF-Token'] = csrfToken;
    // }

    return config;
  },
  (error) => {
    console.error('[Backend API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
backendClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Backend API] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Log errors
    if (error.response) {
      console.error(
        `[Backend API] Error ${error.response.status}:`,
        error.response.data?.message || error.message
      );
    } else if (error.request) {
      console.error('[Backend API] Network error: No response received');
    } else {
      console.error('[Backend API] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default backendClient;
