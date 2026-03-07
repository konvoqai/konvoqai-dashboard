import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { requireAccessToken, buildAuthorizedHeaders } from '../../../shared';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) return response!;
    const { id } = await params;
    const body = await request.json();
    const headers = buildAuthorizedHeaders(request, accessToken, true);
    const res = await backendClient.put(`/api/leads/${id}/pipeline`, body, { headers });
    return NextResponse.json(res.data);
  } catch (error) {
    const err = handleApiError(error);
    return NextResponse.json({ success: false, message: err.message }, { status: err.statusCode });
  }
}
