'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRequestEmailCode, useLogin } from '@/lib/auth/auth-hooks';
import { toast } from 'sonner';

interface EmailLoginFormProps {
  mode: 'login' | 'signup';
  initialEmail?: string;
  initialStep?: 'email' | 'code';
}

export function EmailLoginForm({
  mode,
  initialEmail = '',
  initialStep = 'email',
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
      router.push('/dashboard');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Invalid verification code'));
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
  };

  if (step === 'code') {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-5">
        <div
          className="inline-flex w-fit items-center gap-2 rounded-lg border px-4 py-2 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--border-strong) 70%, transparent)',
            color: 'var(--text-2)',
            background: 'transparent',
          }}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--text-2)]" />
          Verification code sent
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
            className="h-12 rounded-lg border-[color:var(--border-strong)] bg-transparent text-center text-base tracking-[0.3em] text-[var(--text-1)] shadow-none focus-visible:border-[color:var(--text-1)] focus-visible:ring-black/20 dark:focus-visible:ring-white/20"
          />
          <p className="text-sm text-[var(--text-2)]">
            Enter the code we sent to <span className="font-medium text-[var(--text-1)]">{email}</span>.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            className="h-12 w-full rounded-lg border border-[color:var(--text-1)] bg-[var(--text-1)] text-sm font-semibold text-[var(--background)] shadow-none hover:opacity-90"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Verifying...' : 'Verify code'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-lg bg-transparent shadow-none"
            onClick={handleBackToEmail}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to email
          </Button>
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
          className="h-12 rounded-lg border-[color:var(--border-strong)] bg-transparent text-base text-[var(--text-1)] shadow-none focus-visible:border-[color:var(--text-1)] focus-visible:ring-black/20 dark:focus-visible:ring-white/20"
        />
      </div>

      <Button
        type="submit"
        className="h-12 w-full rounded-lg border border-[color:var(--text-1)] bg-[var(--text-1)] text-sm font-semibold text-[var(--background)] shadow-none hover:opacity-90"
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
