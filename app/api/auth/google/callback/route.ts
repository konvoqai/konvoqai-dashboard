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
  const state = searchParams.get('state');

  if (error || !code) {
    const msg = error || 'missing_code';
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(msg)}`);
  }

  // Validate state parameter to prevent CSRF attacks
  const storedState = request.cookies.get('oauth_state')?.value;
  const codeVerifier = request.cookies.get('oauth_code_verifier')?.value;
  if (!storedState || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent('invalid_state')}`);
  }
  if (!codeVerifier) {
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent('missing_verifier')}`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    // 1) Exchange authorization code for Google tokens (with PKCE code_verifier).
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
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
    const redirectResponse = NextResponse.redirect(loginUrl.toString());
    // Clear the one-time OAuth cookies
    redirectResponse.cookies.delete('oauth_state');
    redirectResponse.cookies.delete('oauth_code_verifier');
    return redirectResponse;
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent('google_auth_failed')}`);
  }
}
