import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import {
  getServerCookie,
  setServerCookie,
  COOKIE_NAMES,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  buildBackendCookieHeader,
} from '@/lib/utils/cookies';
import type { RefreshTokenResponse } from '@/lib/types/auth';

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = await getServerCookie(COOKIE_NAMES.REFRESH_TOKEN);

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'No refresh token found' },
        { status: 401 }
      );
    }

    const csrfToken = request.headers.get('x-csrf-token');
    // Forward csrf_token cookie so backend double-submit validation passes
    const cookieHeader = buildBackendCookieHeader(request, ['csrf_token']);

    // Send refresh token to backend with CSRF token and cookie
    const response = await backendClient.post<RefreshTokenResponse>('/api/auth/refresh', {
      refreshToken,
    }, {
      headers: {
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    // Update access token cookie
    await setServerCookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, ACCESS_TOKEN_MAX_AGE);

    // Update refresh token if backend sent a new one
    if (newRefreshToken) {
      await setServerCookie(
        COOKIE_NAMES.REFRESH_TOKEN,
        newRefreshToken,
        REFRESH_TOKEN_MAX_AGE
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}
