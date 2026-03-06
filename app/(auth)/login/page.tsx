'use client';

import { EmailLoginForm } from '@/components/auth/EmailLoginForm';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3000';
const highlights = [
  { label: 'Average setup', value: '2 mins' },
  { label: 'Containment', value: '91%' },
  { label: 'Availability', value: '24/7' },
];

const onboardingSteps = [
  'Connect website and docs in one flow',
  'Configure widget behavior and tone',
  'Go live and monitor conversations',
];

function LoginPageInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = pathname === '/signup' || searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const initialStep = searchParams.get('step') === 'code' ? 'code' : 'email';
  const initialEmail = searchParams.get('email') || '';
  const provider = searchParams.get('provider');
  const error = searchParams.get('error');
  const redirectParam = searchParams.get('redirect');
  const redirectTo =
    redirectParam && redirectParam.startsWith('/') ? redirectParam : '/dashboard';
  const title = mode === 'signup' ? 'Get started for free' : 'Welcome back';
  const subtitle =
    mode === 'signup'
      ? 'Create your Konvoq workspace and launch faster.'
      : 'Log in to manage onboarding, widgets, and conversations.';
  const switchHref = mode === 'signup' ? '/login' : '/signup';
  const switchLead = mode === 'signup' ? 'Already have an account?' : "Don't have an account?";
  const switchCta = mode === 'signup' ? 'Log in' : 'Sign up';

  return (
    <div className="auth-shell flex min-h-screen items-start px-4 py-8 sm:px-6 sm:py-10 lg:items-center lg:px-10">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mb-8 flex items-center justify-between text-sm">
          <div className="">
            {/* <Image src="/logo.png" alt="Logo" width={100} height={100} /> */}
          </div>
          <a href={WEBSITE_URL} className="auth-link text-base font-semibold tracking-[-0.02em]">Back to konvoqAI</a>
        </div>

        <div className="auth-main-grid grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] lg:items-center lg:gap-10">
          <motion.section
            className="auth-content-panel order-2 lg:order-1"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
              Konvoq dashboard
            </p>
            <h1 className="m-0 max-w-[720px] text-4xl font-extrabold tracking-[-0.05em] text-[var(--text-1)] sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-[620px] text-base leading-7 text-[var(--text-2)] sm:text-lg">
              {subtitle}
            </p>

            <div className="auth-highlights-grid mt-8 grid max-w-[640px] gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border px-4 py-3"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border-strong) 70%, transparent)',
                    background: 'color-mix(in srgb, var(--surface) 56%, transparent)',
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-3)]">{item.label}</p>
                  <p className="mt-1 text-lg font-bold tracking-[-0.02em] text-[var(--text-1)]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="auth-features-grid mt-8 grid max-w-[640px] gap-3 sm:grid-cols-2">
              {[
                'Train on website and docs',
                'One assistant for support and sales',
                'Fast setup with production controls',
                'Built for teams that ship quickly',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border px-4 py-3 text-sm"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border-strong) 70%, transparent)',
                    color: 'var(--text-2)',
                    background: 'color-mix(in srgb, var(--surface) 56%, transparent)',
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </motion.section>

          <div
            aria-hidden
            className="auth-divider-track hidden h-[min(70vh,560px)] w-6 justify-self-center lg:block lg:order-2"
          >
            <div className="auth-divider-core" />
          </div>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
            className="auth-form-panel order-1 w-full max-w-[460px] justify-self-center lg:order-3"
          >
            {provider === 'google' && initialStep === 'code' && initialEmail ? (
              <p className="mb-4 text-sm text-[var(--text-2)]">
                Google verified. Enter the one-time code sent to {initialEmail}.
              </p>
            ) : null}

            {error ? (
              <p className="auth-error-banner mb-4 text-sm">
                Login failed: {error.replaceAll('_', ' ')}
              </p>
            ) : null}

            <div className="space-y-4">
              <GoogleLoginButton mode={mode} />
            </div>

            <div className="auth-or-row my-8 flex items-center gap-4">
              <div className="auth-divider-line h-px flex-1" />
              <span className="auth-divider-label text-sm font-semibold uppercase tracking-[0.16em]">or</span>
              <div className="auth-divider-line h-px flex-1" />
            </div>

            <EmailLoginForm
              mode={mode}
              initialEmail={initialEmail}
              initialStep={initialStep}
              redirectTo={redirectTo}
            />

            <p className="mt-8 text-center text-sm text-[var(--text-2)] sm:text-base">
              {switchLead}{' '}
              <Link href={switchHref} className="auth-link no-underline hover:underline">
                {switchCta}
              </Link>
            </p>

            <p className="mt-7 text-center text-sm leading-6 text-[var(--text-3)]">
              You agree to our{' '}
              <a href={`${WEBSITE_URL}/terms`} className="auth-link no-underline hover:underline">
                Terms of Use
              </a>{' '}
              and{' '}
              <a href={`${WEBSITE_URL}/privacy`} className="auth-link no-underline hover:underline">
                Privacy Policy
              </a>
            </p>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
