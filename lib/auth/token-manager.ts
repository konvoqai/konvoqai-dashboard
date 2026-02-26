/**
 * Token Manager
 *
 * Note: Token refresh logic is implemented directly in lib/api/axios-instance.ts
 * as an axios interceptor for automatic handling.
 *
 * This file provides utility functions for token management if needed elsewhere.
 */

import { apiClient } from '@/lib/api/axios-instance';

/**
 * Manually trigger a token refresh
 * Usually not needed as axios interceptor handles this automatically
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    await apiClient.post('/auth/refresh');
    return true;
  } catch (error) {
    console.error('Manual token refresh failed:', error);
    return false;
  }
}

/**
 * Check if we have authentication (has cookies)
 * Note: This is a client-side check only
 */
export function hasAuthToken(): boolean {
  // In browser, cookies are HttpOnly so we can't check them directly
  // This function would need to make an API call to /auth/me to verify
  return true; // Placeholder
}

/**
 * Clear auth state (logout)
 */
export async function clearAuthState(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}
