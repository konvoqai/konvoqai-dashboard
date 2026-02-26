import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth redirect. Exchanges the code for tokens,
 * fetches user info, requests an OTP, and redirects to login code step.
 */
export async function GET(request: NextRequest) {
  const appUrl = request.nextUrl.origin || process.env.APP_URL || 'http://localhost:3001';
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    const msg = error || 'missing_code';
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(msg)}`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    // 1) Exchange authorization code for Google tokens.
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Google token exchange failed:', errBody);
      throw new Error('Failed to exchange code with Google');
    }

    const tokenData = await tokenRes.json();

    // 2) Fetch user profile from Google.
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw new Error('Failed to get user info from Google');
    }

    const userInfo = await userInfoRes.json();
    const email: string = userInfo.email;
    const name: string = userInfo.name || '';

    // 3) Get a CSRF token from backend and request OTP.
    const csrfRes = await backendClient.get<{ csrfToken: string }>('/api/auth/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;

    await backendClient.post(
      '/api/auth/google/verify',
      { email, name },
      {
        headers: {
          'X-CSRF-Token': csrfToken,
          Cookie: `csrf_token=${csrfToken}`,
        },
      }
    );

    // 4) Redirect to login code step with the email pre-filled.
    const loginUrl = new URL('/login', appUrl);
    loginUrl.searchParams.set('mode', 'login');
    loginUrl.searchParams.set('step', 'code');
    loginUrl.searchParams.set('email', email);
    loginUrl.searchParams.set('provider', 'google');
    return NextResponse.redirect(loginUrl.toString());
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent('google_auth_failed')}`);
  }
}
