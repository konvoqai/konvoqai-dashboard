'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin, useRequestEmailCode } from '@/lib/auth/auth-hooks';
import { ArrowLeft, MailOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface EmailLoginFormProps {
  mode: 'login' | 'signup';
  initialEmail?: string;
  initialStep?: 'email' | 'code';
  redirectTo?: string;
}

export function EmailLoginForm({
  mode,
  initialEmail = '',
  initialStep = 'email',
  redirectTo = '/dashboard',
}: EmailLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>(
    initialStep === 'code' && initialEmail ? 'code' : 'email',
  );

  const requestCodeMutation = useRequestEmailCode();
  const loginMutation = useLogin();

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const response = (error as { response?: { data?: { message?: string } } }).response;
      const message = response?.data?.message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }
    return fallback;
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      await requestCodeMutation.mutateAsync({ email });
      toast.success('Verification code sent to your email');
      setStep('code');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to send verification code'));
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code) {
      toast.error('Please enter the verification code');
      return;
    }

    try {
      await loginMutation.mutateAsync({ email, code });
      toast.success(mode === 'login' ? 'Logged in successfully' : 'Account created successfully');
      router.replace(redirectTo);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Invalid verification code'));
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
  };

  const handleOpenGmail = () => {
    window.open('https://mail.google.com/mail/u/0/#inbox', '_blank', 'noopener,noreferrer');
  };

  if (step === 'code') {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div
          className="auth-success-panel rounded-lg border px-4 py-3"
        >
          <p className="text-sm font-semibold text-[var(--text-1)]">Verification code sent</p>
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Enter the 6-digit code sent to <span className="font-medium text-[var(--text-1)]">{email}</span>.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code" className="text-sm font-semibold text-[var(--text-2)]">
            Verification code
          </Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            required
            autoFocus
            className="auth-input h-12 rounded-lg text-center text-base tracking-[0.3em]"
          />
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            className="auth-primary-btn h-12 w-full rounded-lg text-sm font-semibold"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Verifying...' : 'Verify code'}
          </Button>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="auth-secondary-btn h-11 w-full rounded-lg bg-transparent shadow-none"
              onClick={handleOpenGmail}
            >
              <MailOpen className="h-4 w-4" />
              Open Gmail
            </Button>
            <Button
              type="button"
              variant="outline"
              className="auth-secondary-btn h-11 w-full rounded-lg bg-transparent shadow-none"
              onClick={handleBackToEmail}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to email
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestCode} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-semibold text-[var(--text-2)]">
          Business email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="name@work-email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="auth-input h-12 rounded-lg text-base"
        />
      </div>

      <Button
        type="submit"
        className="auth-primary-btn h-12 w-full rounded-lg text-sm font-semibold"
        disabled={requestCodeMutation.isPending}
      >
        {requestCodeMutation.isPending
          ? 'Sending code...'
          : mode === 'login'
            ? 'Log in with email'
            : 'Sign up with email'}
      </Button>
    </form>
  );
}
