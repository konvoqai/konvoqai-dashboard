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
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    const response = NextResponse.json({ success: true, authUrl });
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 600,
      path: '/',
    };
    response.cookies.set('oauth_state', state, cookieOpts);
    response.cookies.set('oauth_code_verifier', codeVerifier, cookieOpts);
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to generate Google OAuth URL' },
      { status: 500 }
    );
  }
}
