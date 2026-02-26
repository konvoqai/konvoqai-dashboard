import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import {
  getServerCookie,
  deleteAllAuthCookies,
  COOKIE_NAMES,
  buildBackendCookieHeader,
} from '@/lib/utils/cookies';

/**
 * POST /api/auth/logout
 * Logout user and clear session
 */
export async function POST(request: NextRequest) {
  try {
    // Get access token from cookie
    const accessToken = await getServerCookie(COOKIE_NAMES.ACCESS_TOKEN);

    const csrfToken = request.headers.get('x-csrf-token');
    // Forward csrf_token cookie so backend double-submit validation passes
    const cookieHeader = buildBackendCookieHeader(request, ['csrf_token']);

    // Call backend logout if we have a token
    if (accessToken) {
      try {
        await backendClient.post(
          '/api/auth/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
              ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            },
          }
        );
      } catch (error) {
        // Log error but continue to clear cookies
        console.error('Backend logout failed:', error);
      }
    }

    // Clear all authentication cookies
    await deleteAllAuthCookies();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    // Even if backend logout fails, clear cookies locally
    await deleteAllAuthCookies();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}
