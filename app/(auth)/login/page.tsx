'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailLoginForm } from '@/components/auth/EmailLoginForm';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const initialStep = searchParams.get('step') === 'code' ? 'code' : 'email';
  const initialEmail = searchParams.get('email') || '';
  const provider = searchParams.get('provider');
  const error = searchParams.get('error');
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialMode);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">KonvoqAI</CardTitle>
          <CardDescription>
            {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
          </CardDescription>
          {provider === 'google' && initialStep === 'code' && initialEmail && (
            <p className="text-sm text-muted-foreground">
              Google verified. Enter the OTP sent to {initialEmail}.
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">Login failed: {error.replaceAll('_', ' ')}</p>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4">
              <EmailLoginForm
                mode="login"
                initialEmail={initialEmail}
                initialStep={initialStep}
              />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <GoogleLoginButton />
            </TabsContent>
            <TabsContent value="signup" className="space-y-4">
              <EmailLoginForm mode="signup" />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <GoogleLoginButton />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
