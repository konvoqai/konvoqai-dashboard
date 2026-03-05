import { AxiosError } from 'axios';
import type { ApiError } from '@/lib/types/auth';

/**
 * Custom authentication error class
 */
export class AuthError extends Error {
  statusCode: number;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.errors = errors;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

/**
 * Handles API errors and converts them to AuthError
 */
export function handleApiError(error: unknown): AuthError {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined;
    const statusCode = error.response?.status || 500;
    const message = apiError?.message || error.message || 'An unexpected error occurred';
    const errors = apiError?.errors;

    return new AuthError(message, statusCode, errors);
  }

  // Handle AuthError instances
  if (error instanceof AuthError) {
    return error;
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    return new AuthError(error.message, 500);
  }

  // Handle unknown error types
  return new AuthError('An unexpected error occurred', 500);
}

/**
 * Extracts a user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    return error.message;
  }

  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.message || error.message || 'An unexpected error occurred';
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Checks if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return !error.response && !!error.request;
  }
  return false;
}

/**
 * Checks if error is an authentication error (401)
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AuthError) {
    return error.statusCode === 401;
  }
  if (error instanceof AxiosError) {
    return error.response?.status === 401;
  }
  return false;
}

/**
 * Checks if error is a forbidden error (403)
 */
export function isForbiddenError(error: unknown): boolean {
  if (error instanceof AuthError) {
    return error.statusCode === 403;
  }
  if (error instanceof AxiosError) {
    return error.response?.status === 403;
  }
  return false;
}

/**
 * Gets validation errors from API error response
 */
export function getValidationErrors(error: unknown): Record<string, string[]> | undefined {
  if (error instanceof AuthError) {
    return error.errors;
  }
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined;
    return apiError?.errors;
  }
  return undefined;
}
