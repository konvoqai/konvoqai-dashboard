import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { getServerCookie, COOKIE_NAMES, buildBackendCookieHeader } from '@/lib/utils/cookies';

export async function POST(request: NextRequest) {
  try {
    const accessToken = await getServerCookie(COOKIE_NAMES.ACCESS_TOKEN);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const csrfToken = request.headers.get('x-csrf-token');
    const cookieHeader = buildBackendCookieHeader(request, ['csrf_token']);
    const response = await backendClient.post(
      '/api/me/onboarding/complete',
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message, errors: authError.errors },
      { status: authError.statusCode }
    );
  }
}

