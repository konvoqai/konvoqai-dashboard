import { cookies } from 'next/headers';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import type { NextRequest } from 'next/server';

// Cookie names matching backend
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'witzo_access_token',
  REFRESH_TOKEN: 'witzo_refresh_token',
  CSRF_TOKEN: 'csrf_token',
} as const;

// Cookie options for security
export const COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

// Token expiry times (in seconds)
export const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
export const CSRF_TOKEN_MAX_AGE = 24 * 60 * 60; // 24 hours

/**
 * Get a cookie value from server-side cookies
 */
export async function getServerCookie(name: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

/**
 * Set a cookie on the server-side
 */
export async function setServerCookie(
  name: string,
  value: string,
  maxAge: number
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(name, value, {
    ...COOKIE_OPTIONS,
    maxAge,
  });
}

/**
 * Delete a cookie from server-side
 */
export async function deleteServerCookie(name: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(name);
}

/**
 * Delete all authentication cookies
 */
export async function deleteAllAuthCookies(): Promise<void> {
  await deleteServerCookie(COOKIE_NAMES.ACCESS_TOKEN);
  await deleteServerCookie(COOKIE_NAMES.REFRESH_TOKEN);
  await deleteServerCookie(COOKIE_NAMES.CSRF_TOKEN);
}

/**
 * Check if user has authentication cookies
 */
export async function hasAuthCookies(): Promise<boolean> {
  const accessToken = await getServerCookie(COOKIE_NAMES.ACCESS_TOKEN);
  return !!accessToken;
}

/**
 * Build Cookie header string for backend proxy requests.
 * Forwards specified cookies from the browser request to the backend
 * so the backend's double-submit CSRF validation passes.
 */
export function buildBackendCookieHeader(request: NextRequest, cookieNames: string[]): string {
  return cookieNames
    .map((name) => {
      const value = request.cookies.get(name)?.value;
      return value ? `${name}=${value}` : null;
    })
    .filter((x): x is string => x !== null)
    .join('; ');
}
