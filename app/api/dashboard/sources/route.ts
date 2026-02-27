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
    const [sourcesRes, statsRes, meRes] = await Promise.all([
      backendClient.get('/api/scraper/sources', { headers }),
      backendClient.get('/api/scraper/stats', { headers }),
      backendClient.get('/api/me', { headers }),
    ]);

    return NextResponse.json({
      success: true,
      sources: sourcesRes.data?.sources ?? [],
      stats: statsRes.data?.stats ?? {},
      planLimits: meRes.data?.user?.planLimits ?? null,
      planType: meRes.data?.user?.plan_type ?? 'free',
    });
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) {
      return response!;
    }
    const body = await request.json();
    const headers = buildAuthorizedHeaders(request, accessToken, true);
    const createRes = await backendClient.post('/api/scraper/sources', body, { headers });
    return NextResponse.json(createRes.data);
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message, errors: authError.errors },
      { status: authError.statusCode }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) {
      return response!;
    }
    const url = request.nextUrl.searchParams.get('url');
    if (!url) {
      return NextResponse.json(
        { success: false, message: 'url is required' },
        { status: 400 }
      );
    }
    const headers = buildAuthorizedHeaders(request, accessToken, true);
    const deleteRes = await backendClient.delete('/api/scraper/sources', {
      headers,
      params: { url },
    });
    return NextResponse.json(deleteRes.data);
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}

