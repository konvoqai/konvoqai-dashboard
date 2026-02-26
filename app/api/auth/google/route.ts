import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GET /api/auth/google
 * Build and return the Google OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const appUrl = request.nextUrl.origin || process.env.APP_URL || 'http://localhost:3001';
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.json({ success: true, authUrl });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to generate Google OAuth URL' },
      { status: 500 }
    );
  }
}
