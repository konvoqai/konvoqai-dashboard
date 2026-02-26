'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, clearCsrfToken } from '@/lib/api/axios-instance';
import type { User, UserProfileResponse } from '@/lib/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();

  // Fetch current user from /api/auth/me
  const {
    data: user,
    isLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<UserProfileResponse>('/auth/me');
        if (response.data.success && response.data.user) {
          return response.data.user;
        }
        return null;
      } catch (error) {
        // User not authenticated or error fetching user
        return null;
      }
    },
    retry: false, // Don't retry on 401
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const isAuthenticated = !!user;

  // Login mutation (email verification)
  const loginMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const response = await apiClient.post('/auth/verify', { email, code });
      return response.data;
    },
    onSuccess: () => {
      // Refetch user data after successful login
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      // Clear CSRF token cache so next session fetches a fresh one
      clearCsrfToken();
      // Clear user data
      queryClient.setQueryData(['user'], null);
      queryClient.clear();
    },
  });

  // Context methods
  const login = async (email: string, code: string) => {
    await loginMutation.mutateAsync({ email, code });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refetch = async () => {
    await refetchUser();
  };

  const value: AuthContextType = {
    user: user ?? null,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * Must be used within AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
