import { backendClient } from '@/lib/api/backend-client';
import { handleApiError } from '@/lib/utils/error-handler';
import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizedHeaders, requireAccessToken } from '../shared';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const WIDGET_PUBLIC_URL = process.env.WIDGET_PUBLIC_URL || BACKEND_URL;

export async function GET(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) {
      return response!;
    }
    const headers = buildAuthorizedHeaders(request, accessToken);
    const widgetRes = await backendClient.get('/api/widget', { headers });
    const widgetKey = widgetRes.data?.widget?.widgetKey;
    const widgetConfigured = !!widgetRes.data?.widget?.isConfigured;
    if (!widgetKey || !widgetConfigured) {
      return NextResponse.json(
        { success: false, message: 'Save widget configuration before generating embed code' },
        { status: 409 }
      );
    }

    const script = `<script src="${WIDGET_PUBLIC_URL}/api/v1/embed/${widgetKey}.js"></script>`;
    return NextResponse.json({
      success: true,
      widgetKey,
      script,
      installSteps: [
        'Paste this snippet before closing </body> on your website.',
        'Publish your website and test the floating chat button.',
        'Use Dashboard > Widget Customization to update colors and copy again if needed.',
      ],
    });
  } catch (error) {
    const authError = handleApiError(error);
    return NextResponse.json(
      { success: false, message: authError.message },
      { status: authError.statusCode }
    );
  }
}
