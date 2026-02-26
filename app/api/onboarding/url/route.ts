import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import {
  getServerCookie,
  COOKIE_NAMES,
  buildBackendCookieHeader,
} from '@/lib/utils/cookies';

/**
 * POST /api/onboarding/url
 * Saves a URL as a scraper source for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = await getServerCookie(COOKIE_NAMES.ACCESS_TOKEN);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const csrfToken = request.headers.get('x-csrf-token');
    const cookieHeader = buildBackendCookieHeader(request, ['csrf_token']);

    const response = await backendClient.post('/api/scraper/sources', body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message, errors: authError.errors },
      { status: authError.statusCode }
    );
  }
}
