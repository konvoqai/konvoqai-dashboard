'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    initialStep === 'code' && initialEmail ? 'code' : 'email'
  );

  const requestCodeMutation = useRequestEmailCode();
  const loginMutation = useLogin();

  useEffect(() => {
    setEmail(initialEmail);
    if (initialStep === 'code' && initialEmail) {
      setStep('code');
      return;
    }
    setStep('email');
    setCode('');
  }, [initialEmail, initialStep]);

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
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send verification code');
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
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Invalid verification code');
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
  };

  if (step === 'code') {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
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
          />
          <p className="text-sm text-muted-foreground">
            We sent a code to {email}
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Verifying...' : 'Verify Code'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={handleBackToEmail}
        >
          Back to email
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestCode} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full" disabled={requestCodeMutation.isPending}>
        {requestCodeMutation.isPending
          ? 'Sending code...'
          : mode === 'login'
          ? 'Continue with Email'
          : 'Sign up with Email'}
      </Button>
    </form>
  );
}
