import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { requireAccessToken, buildAuthorizedHeaders } from '../../shared';

export async function GET(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) return response!;
    const headers = buildAuthorizedHeaders(request, accessToken);
    try {
      const res = await backendClient.get('/api/leads/webhook', { headers });
      return NextResponse.json(res.data);
    } catch {
      return NextResponse.json({ success: true, webhook: null });
    }
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json({ success: false, message: authError.message }, { status: authError.statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) return response!;
    const body = await request.json();
    const headers = buildAuthorizedHeaders(request, accessToken, true);
    const res = await backendClient.post('/api/leads/webhook', body, { headers });
    return NextResponse.json(res.data);
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json({ success: false, message: authError.message }, { status: authError.statusCode });
  }
}
