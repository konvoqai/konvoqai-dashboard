import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';

/**
 * GET /api/auth/csrf-token
 * Fetch CSRF token from backend and forward to browser
 */
export async function GET(request: NextRequest) {
  try {
    const response = await backendClient.get('/api/auth/csrf-token');

    const nextResponse = NextResponse.json(response.data);

    // Forward any Set-Cookie headers from backend so browser gets the CSRF cookie
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
