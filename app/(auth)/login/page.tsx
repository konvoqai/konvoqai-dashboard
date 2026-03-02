'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { EmailLoginForm } from '@/components/auth/EmailLoginForm';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3000';

function LoginPageInner() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const initialStep = searchParams.get('step') === 'code' ? 'code' : 'email';
  const initialEmail = searchParams.get('email') || '';
  const provider = searchParams.get('provider');
  const error = searchParams.get('error');
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialMode);

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
      }}
    >
      {/* Animated card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          maxWidth: 420,
          position: 'relative',
          background:
            'linear-gradient(155deg, color-mix(in srgb, var(--surface-2) 88%, transparent) 0%, color-mix(in srgb, var(--surface) 52%, transparent) 100%)',
          border: '1px solid color-mix(in srgb, var(--border-strong) 65%, transparent)',
          borderRadius: 'var(--radius-kv-xl)',
          boxShadow:
            'var(--shadow-card), 0 0 0 1px rgba(91, 140, 255, 0.08), 0 0 80px rgba(91, 140, 255, 0.06)',
          backdropFilter: 'blur(24px)',
          overflow: 'hidden',
          padding: '32px',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'var(--grad-btn)',
          }}
        />

        {/* Top radial glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at top, rgba(91, 140, 255, 0.12), transparent 52%)',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative' }}>
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                background: 'var(--grad-btn)',
                color: '#ffffff',
                boxShadow: 'var(--shadow-button)',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                flexShrink: 0,
              }}
            >
              K
            </div>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--foreground-raw)',
              }}
            >
              Konvoq
            </span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 24 }}>
            <AnimatePresence mode="wait">
              <motion.h1
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                style={{
                  margin: '0 0 6px',
                  fontSize: 22,
                  fontWeight: 760,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.1,
                  color: 'var(--foreground-raw)',
                }}
              >
                {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
              </motion.h1>
            </AnimatePresence>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--foreground-muted)',
                lineHeight: 1.6,
              }}
            >
              {activeTab === 'login'
                ? 'Sign in to continue to your workspace.'
                : 'Start free — no credit card required.'}
            </p>

            {provider === 'google' && initialStep === 'code' && initialEmail && (
              <p
                style={{
                  margin: '10px 0 0',
                  fontSize: 13,
                  color: 'var(--accent-raw)',
                  lineHeight: 1.5,
                }}
              >
                Google verified. Enter the OTP sent to {initialEmail}.
              </p>
            )}
            {error && (
              <p
                style={{
                  margin: '10px 0 0',
                  fontSize: 13,
                  color: 'var(--danger)',
                  lineHeight: 1.5,
                }}
              >
                Login failed: {error.replaceAll('_', ' ')}
              </p>
            )}
          </div>

          {/* Tab switcher — animated pill */}
          <div
            style={{
              display: 'flex',
              background: 'color-mix(in srgb, var(--surface-2) 80%, transparent)',
              border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
              borderRadius: 999,
              padding: 3,
              gap: 2,
              marginBottom: 22,
            }}
          >
            {(['login', 'signup'] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <motion.button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1,
                    position: 'relative',
                    border: 0,
                    background: 'transparent',
                    color: active ? 'var(--foreground-raw)' : 'var(--foreground-subtle)',
                    borderRadius: 999,
                    padding: '9px 16px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '-0.01em',
                    fontFamily: 'inherit',
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="auth-tab-pill"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 999,
                        background: 'var(--background-elevated)',
                        border: '1px solid color-mix(in srgb, var(--border-strong) 65%, transparent)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                      }}
                      transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.7 }}
                    />
                  )}
                  <span style={{ position: 'relative' }}>
                    {tab === 'login' ? 'Log in' : 'Sign up'}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Form content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ marginBottom: 16 }}>
                <EmailLoginForm
                  mode={activeTab}
                  initialEmail={initialEmail}
                  initialStep={activeTab === initialMode ? initialStep : 'email'}
                />
              </div>

              {/* Divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  margin: '18px 0',
                }}
              >
                <div style={{ flex: 1, height: 1, background: 'color-mix(in srgb, var(--border-strong) 60%, transparent)' }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--foreground-subtle)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  or
                </span>
                <div style={{ flex: 1, height: 1, background: 'color-mix(in srgb, var(--border-strong) 60%, transparent)' }} />
              </div>

              <GoogleLoginButton />
            </motion.div>
          </AnimatePresence>

          {/* Back to website */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
              textAlign: 'center',
            }}
          >
            <a
              href={WEBSITE_URL}
              style={{
                fontSize: 13,
                color: 'var(--foreground-subtle)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'color 200ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--foreground-muted)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--foreground-subtle)';
              }}
            >
              <span style={{ fontSize: 12 }}>←</span>
              Back to konvoq.ai
            </a>
          </div>
        </div>
      </motion.div>

      {/* Bottom text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{
          marginTop: 20,
          fontSize: 12,
          color: 'var(--foreground-subtle)',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        By continuing, you agree to our{' '}
        <a href={`${WEBSITE_URL}/terms`} style={{ color: 'var(--foreground-muted)', textDecoration: 'underline' }}>
          Terms
        </a>{' '}
        and{' '}
        <a href={`${WEBSITE_URL}/privacy`} style={{ color: 'var(--foreground-muted)', textDecoration: 'underline' }}>
          Privacy Policy
        </a>
        .
      </motion.p>
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
