import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizedHeaders, requireAccessToken } from '../shared';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) {
      return response!;
    }
    const headers = buildAuthorizedHeaders(request, accessToken);
    const [docsRes, statsRes, meRes] = await Promise.all([
      backendClient.get('/api/documents', { headers }),
      backendClient.get('/api/scraper/stats', { headers }),
      backendClient.get('/api/me', { headers }),
    ]);
    return NextResponse.json({
      success: true,
      documents: docsRes.data?.documents ?? [],
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
    const formData = await request.formData();
    const file = formData.get('document');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'document file is required' },
        { status: 400 }
      );
    }

    const headers = buildAuthorizedHeaders(request, accessToken, true);
    const backendForm = new FormData();
    backendForm.append('document', file, file.name);
    const uploadRes = await fetch(`${BACKEND_URL}/api/documents`, {
      method: 'POST',
      headers,
      body: backendForm,
    });

    const payload = await uploadRes.json().catch(() => ({}));
    return NextResponse.json(payload, { status: uploadRes.status });
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}

