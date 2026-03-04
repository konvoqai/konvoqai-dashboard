import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import {
  COOKIE_NAMES,
  buildBackendCookieHeader,
} from '@/lib/utils/cookies';
import type { RefreshTokenResponse } from '@/lib/types/auth';

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'No refresh token found' },
        { status: 401 }
      );
    }

    const csrfToken = request.headers.get('x-csrf-token');
    // Forward csrf_token cookie so backend double-submit validation passes
    const cookieHeader = buildBackendCookieHeader(request, [
      COOKIE_NAMES.CSRF_TOKEN,
      COOKIE_NAMES.REFRESH_TOKEN,
    ]);

    // Refresh using backend cookie-based session.
    const response = await backendClient.post<RefreshTokenResponse>('/api/auth/refresh', {}, {
      headers: {
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    const nextResponse = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    });

    // Forward rotated auth cookies from backend.
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
      cookieArray.forEach((cookie: string) => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}
