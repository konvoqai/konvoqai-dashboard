import { NextRequest, NextResponse } from 'next/server';
import { backendClient } from '@/lib/api/backend-client';

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth redirect. Exchanges the code for tokens,
 * verifies Google identity with backend, then creates auth session cookies.
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

    const idToken: string | undefined = tokenData.id_token;
    if (!idToken) {
      throw new Error('Google did not return an id_token');
    }

    // 2) Get a CSRF token from backend and verify Google token.
    const csrfRes = await backendClient.get<{ csrfToken: string }>('/api/auth/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;

    const verifyRes = await backendClient.post(
      '/api/auth/google/verify',
      { idToken },
      {
        headers: {
          'X-CSRF-Token': csrfToken,
          Cookie: `csrf_token=${csrfToken}`,
        },
      }
    );

    // 3) Redirect to dashboard after successful session creation.
    const dashboardUrl = new URL('/dashboard', appUrl);
    const redirectResponse = NextResponse.redirect(dashboardUrl.toString());

    // Forward backend auth cookies to browser.
    const setCookieHeaders = verifyRes.headers['set-cookie'];
    if (setCookieHeaders) {
      const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
      cookieArray.forEach((cookie: string) => {
        redirectResponse.headers.append('Set-Cookie', cookie);
      });
    }

    // Clear the one-time OAuth cookies
    redirectResponse.cookies.delete('oauth_state');
    redirectResponse.cookies.delete('oauth_code_verifier');
    return redirectResponse;
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent('google_auth_failed')}`);
  }
}
