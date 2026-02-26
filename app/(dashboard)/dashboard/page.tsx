'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useLogout } from '@/lib/auth/auth-hooks';
import { apiClient } from '@/lib/api/axios-instance';

interface OnboardingStatusResponse {
  success: boolean;
  shouldOnboard: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { logout } = useLogout();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkOnboarding = async () => {
      if (isLoading) {
        return;
      }
      if (!user) {
        if (isMounted) {
          setIsCheckingOnboarding(false);
        }
        return;
      }

      try {
        const response = await apiClient.get<OnboardingStatusResponse>('/onboarding/status');
        if (response.data?.shouldOnboard) {
          router.replace('/dashboard/setup');
          return;
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      }

      if (isMounted) {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboarding();

    return () => {
      isMounted = false;
    };
  }, [isLoading, user, router]);

  if (isLoading || (user && isCheckingOnboarding)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Authenticated</CardTitle>
            <CardDescription>Please log in to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back to KonvoqAI</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base font-semibold">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">User ID</p>
                <p className="text-base font-mono text-sm">{user.id}</p>
              </div>
              {user.fullName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-base font-semibold">{user.fullName}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verification Status</p>
                <p className="text-base">
                  {user.isVerified ? (
                    <span className="text-green-600 dark:text-green-400">✓ Verified</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">Pending</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plan Type</p>
                <p className="text-base capitalize">{user.plan_type}</p>
              </div>
              {user.createdAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                  <p className="text-base">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {user.loginCount && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Login Count</p>
                  <p className="text-base">{user.loginCount}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
