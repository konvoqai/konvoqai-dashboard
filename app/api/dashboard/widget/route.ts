import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { requireAccessToken, buildAuthorizedHeaders } from '../shared';

const DEFAULT_WIDGET_SETTINGS = {
  primaryColor: '#fc0e3f',
  backgroundColor: '#120b14',
  textColor: '#ffffff',
  botName: 'Konvoq AI',
  welcomeMessage: 'Welcome to your live widget preview.',
  position: 'bottom-right',
  borderRadius: 24,
  fontSize: 14,
};

export async function GET(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) {
      return response!;
    }
    const headers = buildAuthorizedHeaders(request, accessToken);
    try {
      const widgetRes = await backendClient.get('/api/widget', { headers });
      return NextResponse.json(widgetRes.data);
    } catch {
      return NextResponse.json({ success: true, widget: null });
    }
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) {
      return response!;
    }
    const body = await request.json();
    const settings = {
      ...DEFAULT_WIDGET_SETTINGS,
      ...(body?.settings || {}),
    };
    const payload = {
      name: body?.name || 'My Chat Widget',
      settings,
    };
    const headers = buildAuthorizedHeaders(request, accessToken, true);

    try {
      const updateRes = await backendClient.put('/api/widget', payload, { headers });
      return NextResponse.json(updateRes.data);
    } catch {
      const createRes = await backendClient.post('/api/widget', payload, { headers });
      return NextResponse.json(createRes.data);
    }
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message, errors: authError.errors },
      { status: authError.statusCode }
    );
  }
}

