import { NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { getServerCookie, COOKIE_NAMES } from '@/lib/utils/cookies';
import type { UserProfileResponse } from '@/lib/types/auth';

interface ScraperStatsResponse {
  success: boolean;
  stats?: {
    sources: number;
    documents: number;
    pendingJobs?: number;
  };
}

/**
 * GET /api/onboarding/status
 * Returns whether the current authenticated user should see first-login onboarding.
 */
export async function GET() {
  try {
    const accessToken = await getServerCookie(COOKIE_NAMES.ACCESS_TOKEN);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const [meRes, statsRes] = await Promise.all([
      backendClient.get<UserProfileResponse>('/api/me', { headers }),
      backendClient.get<ScraperStatsResponse>('/api/scraper/stats', { headers }),
    ]);

    const loginCount = meRes.data?.user?.loginCount ?? 0;
    const sources = statsRes.data?.stats?.sources ?? 0;
    const documents = statsRes.data?.stats?.documents ?? 0;
    const pendingJobs = statsRes.data?.stats?.pendingJobs ?? 0;
    const hasAnySource = sources > 0 || documents > 0;
    const shouldOnboard = loginCount <= 1 && (!hasAnySource || pendingJobs > 0);

    return NextResponse.json({
      success: true,
      shouldOnboard,
      loginCount,
      stats: {
        sources,
        documents,
        pendingJobs,
      },
    });
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}
