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
    <div className="flex min-h-screen items-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="mb-8 flex items-center justify-between text-sm">
          <div className="">
            {/* <Image src="/logo.png" alt="Logo" width={100} height={100} /> */}
          </div>
          <a href={WEBSITE_URL} className="text-base font-semibold tracking-[-0.02em] text-[var(--text-1)]">Back to konvoqAI</a>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_auto_0.85fr] lg:gap-10">
          <motion.section
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

            <div className="mt-8 grid max-w-[640px] gap-3 sm:grid-cols-3">
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

            <div className="mt-8 grid max-w-[640px] gap-3 sm:grid-cols-2">
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

            <div className="mt-8 max-w-[640px] border-l pl-4" style={{ borderColor: 'color-mix(in srgb, var(--border-strong) 70%, transparent)' }}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
                First hour checklist
              </p>
              <div className="space-y-3">
                {onboardingSteps.map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--border-strong) 70%, transparent)',
                        color: 'var(--text-1)',
                        background: 'color-mix(in srgb, var(--surface-2) 72%, transparent)',
                      }}
                    >
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-[var(--text-2)]">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <div
            aria-hidden
            className="auth-divider-track hidden h-[min(70vh,560px)] w-6 justify-self-center lg:block"
          >
            <div className="auth-divider-core" />
          </div>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
            className="w-full max-w-[460px] lg:justify-self-center"
          >
            {provider === 'google' && initialStep === 'code' && initialEmail ? (
              <p className="mb-4 text-sm text-[var(--text-2)]">
                Google verified. Enter the one-time code sent to {initialEmail}.
              </p>
            ) : null}

            {error ? (
              <p className="mb-4 text-sm text-red-400">
                Login failed: {error.replaceAll('_', ' ')}
              </p>
            ) : null}

            <div className="space-y-4">
              <GoogleLoginButton mode={mode} />
            </div>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-[color:var(--border-strong)]" />
              <span className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-3)]">or</span>
              <div className="h-px flex-1 bg-[color:var(--border-strong)]" />
            </div>

            <EmailLoginForm
              mode={mode}
              initialEmail={initialEmail}
              initialStep={initialStep}
              redirectTo={redirectTo}
            />

            <p className="mt-8 text-center text-sm text-[var(--text-2)] sm:text-base">
              {switchLead}{' '}
              <Link href={switchHref} className="text-[var(--text-1)] no-underline hover:underline">
                {switchCta}
              </Link>
            </p>

            <p className="mt-7 text-center text-sm leading-6 text-[var(--text-3)]">
              You agree to our{' '}
              <a href={`${WEBSITE_URL}/terms`} className="text-[var(--text-1)] no-underline hover:underline">
                Terms of Use
              </a>{' '}
              and{' '}
              <a href={`${WEBSITE_URL}/privacy`} className="text-[var(--text-1)] no-underline hover:underline">
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
