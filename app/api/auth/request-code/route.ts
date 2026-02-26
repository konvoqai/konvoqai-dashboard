import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { buildBackendCookieHeader } from '@/lib/utils/cookies';

/**
 * POST /api/auth/request-code
 * Request email verification code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const csrfToken = request.headers.get('x-csrf-token');
    // Forward csrf_token cookie so backend double-submit validation passes
    const cookieHeader = buildBackendCookieHeader(request, ['csrf_token']);

    const response = await backendClient.post('/api/auth/request-code', body, {
      headers: {
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
