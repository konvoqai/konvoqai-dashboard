import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import {
  setServerCookie,
  COOKIE_NAMES,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  buildBackendCookieHeader,
} from '@/lib/utils/cookies';
import type { LoginResponse } from '@/lib/types/auth';

/**
 * POST /api/auth/verify
 * Verify email code and create session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const csrfToken = request.headers.get('x-csrf-token');
    // Forward csrf_token cookie so backend double-submit validation passes
    const cookieHeader = buildBackendCookieHeader(request, ['csrf_token']);

    // Forward verification request to backend with CSRF token and cookie
    const response = await backendClient.post<LoginResponse>('/api/auth/verify', body, {
      headers: {
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    const { accessToken, refreshToken, user } = response.data;

    // Set HttpOnly cookies for tokens
    await setServerCookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, ACCESS_TOKEN_MAX_AGE);
    await setServerCookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, REFRESH_TOKEN_MAX_AGE);

    // Return user data (not tokens) to frontend
    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message, errors: authError.errors },
      { status: authError.statusCode }
    );
  }
}
