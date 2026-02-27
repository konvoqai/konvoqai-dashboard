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
    const [meRes, usageRes, statsRes] = await Promise.all([
      backendClient.get('/api/me', { headers }),
      backendClient.get('/api/me/usage', { headers }),
      backendClient.get('/api/scraper/stats', { headers }),
    ]);

    return NextResponse.json({
      success: true,
      user: meRes.data?.user ?? null,
      usage: usageRes.data?.usage ?? null,
      stats: statsRes.data?.stats ?? null,
    });
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}

