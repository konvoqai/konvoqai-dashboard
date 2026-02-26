import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { getServerCookie, COOKIE_NAMES } from '@/lib/utils/cookies';
import type { UserProfileResponse } from '@/lib/types/auth';

/**
 * GET /api/auth/me
 * Get current user profile
 */
export async function GET(request: NextRequest) {
  try {
    // Get access token from cookie
    const accessToken = await getServerCookie(COOKIE_NAMES.ACCESS_TOKEN);

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Request user profile from backend with Bearer token
    const response = await backendClient.get<UserProfileResponse>('/api/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}
