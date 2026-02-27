import { NextRequest, NextResponse } from 'next/server';
import { getServerCookie, COOKIE_NAMES, buildBackendCookieHeader } from '@/lib/utils/cookies';

export async function requireAccessToken() {
  const accessToken = await getServerCookie(COOKIE_NAMES.ACCESS_TOKEN);
  if (!accessToken) {
    return {
      accessToken: null as string | null,
      response: NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      ),
    };
  }
  return { accessToken, response: null as NextResponse | null };
}

export function buildAuthorizedHeaders(
  request: NextRequest,
  accessToken: string,
  includeCsrf = false
) {
  const csrfToken = request.headers.get('x-csrf-token');
  const cookieHeader = buildBackendCookieHeader(request, ['csrf_token']);
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(includeCsrf && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...(includeCsrf && cookieHeader ? { Cookie: cookieHeader } : {}),
  };
}

