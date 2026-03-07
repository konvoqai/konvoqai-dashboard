import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { requireAccessToken, buildAuthorizedHeaders } from '../../shared';

export async function GET(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) return response!;
    const headers = buildAuthorizedHeaders(request, accessToken);
    const res = await backendClient.get('/api/leads/crm/pipeline', { headers });
    return NextResponse.json(res.data);
  } catch (error) {
    const err = handleApiError(error);
    return NextResponse.json({ success: false, message: err.message }, { status: err.statusCode });
  }
}
