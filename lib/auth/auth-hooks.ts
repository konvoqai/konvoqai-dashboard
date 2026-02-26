'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios-instance';
import { useAuth } from './auth-context';
import type { EmailLoginResponse, GoogleAuthResponse } from '@/lib/types/auth';

/**
 * Hook to get current user data
 */
export function useUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

/**
 * Hook to login with email + code (returns a TanStack mutation object)
 */
export function useLogin() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      await login(email, code);
    },
  });
}

/**
 * Hook to get logout function
 */
export function useLogout() {
  const { logout } = useAuth();
  return { logout };
}

/**
 * Hook to request email verification code
 */
export function useRequestEmailCode() {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const response = await apiClient.post<EmailLoginResponse>('/auth/request-code', {
        email,
      });
      return response.data;
    },
  });
}

/**
 * Hook to get Google OAuth URL
 */
export function useGoogleAuthUrl() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.get<GoogleAuthResponse>('/auth/google');
      return response.data;
    },
  });
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
}

/**
 * Hook to refetch user data
 */
export function useRefetchUser() {
  const { refetch } = useAuth();
  return refetch;
}
