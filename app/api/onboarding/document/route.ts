import {
  COOKIE_NAMES,
  buildBackendCookieHeader,
  getServerCookie,
} from '@/lib/utils/cookies';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

/**
 * POST /api/onboarding/document
 * Uploads one document file for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = await getServerCookie(COOKIE_NAMES.ACCESS_TOKEN);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('document');
    const csrfToken = request.headers.get('x-csrf-token');
    const cookieHeader = buildBackendCookieHeader(request, ['csrf_token']);

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'document file is required' },
        { status: 400 }
      );
    }

    const backendForm = new FormData();
    backendForm.append('document', file, file.name);

    const backendResponse = await fetch(`${BACKEND_URL}/api/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: backendForm,
    });

    const data = await backendResponse.json().catch(() => ({}));
    if (!backendResponse.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || 'Upload failed' },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
