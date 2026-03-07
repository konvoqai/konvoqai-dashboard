import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { requireAccessToken, buildAuthorizedHeaders } from '../../shared';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) return response!;
    const { id } = await params;
    const headers = buildAuthorizedHeaders(request, accessToken, true);
    const res = await backendClient.delete(`/api/auth/sessions/${id}`, { headers });
    return NextResponse.json(res.data);
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json({ success: false, message: authError.message }, { status: authError.statusCode });
  }
}
