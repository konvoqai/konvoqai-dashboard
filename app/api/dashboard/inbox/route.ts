import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { requireAccessToken, buildAuthorizedHeaders } from '../shared';

export async function GET(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) return response!;
    const headers = buildAuthorizedHeaders(request, accessToken);
    const status = request.nextUrl.searchParams.get('status') ?? '';
    const url = status ? `/api/inbox?status=${encodeURIComponent(status)}` : '/api/inbox';
    const res = await backendClient.get(url, { headers });
    return NextResponse.json(res.data);
  } catch (error) {
    const err = handleApiError(error);
    return NextResponse.json({ success: false, message: err.message }, { status: err.statusCode });
  }
}
