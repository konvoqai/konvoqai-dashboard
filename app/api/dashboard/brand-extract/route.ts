import { NextRequest, NextResponse } from 'next/server';
import { requireAccessToken } from '../shared';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const { accessToken, response } = await requireAccessToken();
    if (!accessToken) return response!;

    const rawUrl = request.nextUrl.searchParams.get('url');
    if (!rawUrl) {
      return NextResponse.json({ success: false, error: 'url param required' }, { status: 400 });
    }

    const backendRes = await fetch(
      `${BACKEND_URL}/api/scraper/brand-extract?url=${encodeURIComponent(rawUrl)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(20000),
      },
    );

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ success: true, brand: null });
  }
}
