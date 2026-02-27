// User profile data structure matching backend response
export interface User {
  id: string;
  email: string;
  isVerified: boolean;
  plan_type: 'free' | 'basic' | 'enterprise';
  sessionId?: number;
  loginCount?: number;
  fullName?: string | null;
  companyName?: string | null;
  phoneNumber?: string | null;
  country?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  companyWebsite?: string | null;
  profileCompleted?: boolean;
  requiresProfileCompletion?: boolean;
  profilePromptRequiredAt?: string | null;
  profileCompletedAt?: string | null;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
  planLimits?: {
    scrapedPages: number;
    documents: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Authentication tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Login response from backend
export interface LoginResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
  message?: string;
}

// Email authentication
export interface EmailLoginRequest {
  email: string;
}

export interface EmailLoginResponse {
  success: boolean;
  message: string;
  devCode?: string;
  expiresIn?: number;
}

export interface EmailVerifyRequest {
  email: string;
  code: string;
}

// Google OAuth
export interface GoogleAuthResponse {
  success: boolean;
  authUrl: string;
}

// Token refresh
export interface RefreshTokenResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
}

// API error response
export interface ApiError {
  success: false;
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

// API success response wrapper
export interface ApiResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

// Auth state for context
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// User profile response
export interface UserProfileResponse {
  success: boolean;
  user: User;
}

// Logout response
export interface LogoutResponse {
  success: boolean;
  message?: string;
}

// Session data
export interface Session {
  id: number;
  userId: string;
  createdAt: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  isRevoked: boolean;
}

// Usage stats
export interface UsageStats {
  planType: string;
  conversationsUsed: number;
  conversationsLimit: number;
  conversationsRemaining: number;
  resetDate: string;
  isAtLimit: boolean;
}

// Analytics overview
export interface AnalyticsOverview {
  chatSessions: number;
  leads: number;
  sources: number;
  widgetViews: number;
  widgetMessages: number;
  totalRatings: number;
}
