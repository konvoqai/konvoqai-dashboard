import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { getServerCookie, COOKIE_NAMES } from '@/lib/utils/cookies';

/**
 * GET /api/onboarding/scrape-status/:id
 * Returns scrape job status/progress for the authenticated user.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = await getServerCookie(COOKIE_NAMES.ACCESS_TOKEN);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const response = await backendClient.get(`/api/scraper/jobs/${encodeURIComponent(id)}`, {
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
