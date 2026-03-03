'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bot, Layers3, ShieldCheck } from 'lucide-react';
import { EmailLoginForm } from '@/components/auth/EmailLoginForm';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3000';

const proofItems = [
  'One AI layer across support, docs, and routing',
  'Setup built for product teams, not services work',
  'Production-ready controls from day one',
];

function LoginPageInner() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const initialStep = searchParams.get('step') === 'code' ? 'code' : 'email';
  const initialEmail = searchParams.get('email') || '';
  const provider = searchParams.get('provider');
  const error = searchParams.get('error');
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialMode);

  return (
    <div className="dashboard-shell min-h-screen">
      <div className="dashboard-grid-two items-stretch">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="section-frame overflow-hidden px-8 py-10"
        >
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="space-y-8">
              <div className="dashboard-kicker">
                <span className="h-2 w-2 rounded-full bg-[var(--accent-raw)]" />
                Konvoq dashboard
              </div>

              <div className="space-y-4">
                <h1 className="dashboard-panel-title max-w-xl">
                  The same Konvoq product feel, now inside the app.
                </h1>
                <p className="dashboard-panel-copy max-w-xl">
                  Log in to manage onboarding, widget setup, knowledge sources, and performance in one polished SaaS workspace.
                </p>
              </div>

              <div className="dashboard-grid-three">
                {[
                  { icon: Bot, title: 'Support AI', text: 'Train one assistant on your website and docs.' },
                  { icon: Layers3, title: 'Structured flow', text: 'Move from setup to dashboard without context loss.' },
                  { icon: ShieldCheck, title: 'Ready to ship', text: 'Designed to look credible in front of real teams.' },
                ].map((item) => (
                  <div key={item.title} className="section-surface px-5 py-5">
                    <item.icon className="mb-4 h-5 w-5 text-[var(--accent-strong)]" />
                    <div className="mb-2 text-sm font-semibold text-[var(--text-1)]">{item.title}</div>
                    <p className="m-0 text-sm leading-6 text-[var(--text-2)]">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {proofItems.map((item) => (
                  <div key={item} className="dashboard-chip">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <a
              href={WEBSITE_URL}
              className="inline-flex w-fit items-center gap-2 text-sm text-[var(--text-2)] no-underline transition-colors hover:text-[var(--text-1)]"
            >
              Back to konvoq.ai
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="section-frame overflow-hidden px-8 py-10"
        >
          <div className="relative z-10 mx-auto flex h-full w-full max-w-[440px] flex-col justify-center">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--grad-btn)] text-sm font-extrabold text-[var(--accent-foreground)] shadow-[var(--shadow-button)]">
                K
              </div>
              <div>
                <div className="text-lg font-extrabold tracking-[-0.03em] text-[var(--text-1)]">
                  Konvoq
                </div>
                <div className="text-sm text-[var(--text-3)]">Dashboard access</div>
              </div>
            </div>

            <div className="mb-6">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="m-0 mb-2 text-[30px] font-extrabold tracking-[-0.05em] text-[var(--text-1)]"
                >
                  {activeTab === 'login' ? 'Welcome back' : 'Create your workspace'}
                </motion.h2>
              </AnimatePresence>
              <p className="m-0 text-sm leading-6 text-[var(--text-2)]">
                {activeTab === 'login'
                  ? 'Use email or Google to get back into your Konvoq workspace.'
                  : 'Start with a secure login, then complete your guided product setup.'}
              </p>

              {provider === 'google' && initialStep === 'code' && initialEmail ? (
                <p className="mt-3 text-sm leading-6 text-[var(--accent-strong)]">
                  Google verified. Enter the one-time code sent to {initialEmail}.
                </p>
              ) : null}

              {error ? (
                <p className="mt-3 text-sm leading-6 text-red-400">
                  Login failed: {error.replaceAll('_', ' ')}
                </p>
              ) : null}
            </div>

            <div className="mb-6 flex rounded-full border border-white/10 bg-[color:var(--surface)] p-1">
              {(['login', 'signup'] as const).map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className="relative flex-1 rounded-full px-4 py-2 text-sm font-semibold"
                    style={{
                      color: active ? 'var(--text-1)' : 'var(--text-3)',
                    }}
                  >
                    {active ? (
                      <motion.span
                        layoutId="auth-tab-pill"
                        className="absolute inset-0 rounded-full border border-white/10 bg-[color:var(--background-elevated)] shadow-[var(--shadow-card)]"
                        transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.7 }}
                      />
                    ) : null}
                    <span className="relative z-10">{tab === 'login' ? 'Log in' : 'Sign up'}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <EmailLoginForm
                  mode={activeTab}
                  initialEmail={initialEmail}
                  initialStep={activeTab === initialMode ? initialStep : 'email'}
                />

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-3)]">
                    or
                  </span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>

                <GoogleLoginButton />
              </motion.div>
            </AnimatePresence>

            <p className="mt-8 text-sm leading-6 text-[var(--text-3)]">
              By continuing, you agree to our{' '}
              <a href={`${WEBSITE_URL}/terms`} className="text-[var(--text-2)] underline underline-offset-4">
                Terms
              </a>{' '}
              and{' '}
              <a href={`${WEBSITE_URL}/privacy`} className="text-[var(--text-2)] underline underline-offset-4">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </motion.section>
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
