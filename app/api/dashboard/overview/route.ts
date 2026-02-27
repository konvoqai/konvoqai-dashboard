import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { requireAccessToken, buildAuthorizedHeaders } from '../shared';

export async function GET(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) {
      return response!;
    }

    const headers = buildAuthorizedHeaders(request, accessToken);
    const [analyticsRes, usageRes, statsRes, widgetRes] = await Promise.all([
      backendClient.get('/api/me/analytics', { headers }),
      backendClient.get('/api/me/usage', { headers }),
      backendClient.get('/api/scraper/stats', { headers }),
      backendClient.get('/api/widget/analytics?limit=120', { headers }),
    ]);

    return NextResponse.json({
      success: true,
      analytics: analyticsRes.data?.analytics ?? {},
      usage: usageRes.data?.usage ?? {},
      stats: statsRes.data?.stats ?? {},
      widgetAnalytics: widgetRes.data?.analytics ?? [],
    });
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}

