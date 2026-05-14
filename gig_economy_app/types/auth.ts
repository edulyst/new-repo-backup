/**
 * Auth-related types.
 */

export interface StoredUser {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  goal?: 'profile' | 'browse';
  profilePhotoUrl?: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  goal?: 'profile' | 'browse';
  profilePhotoUrl?: string;
}

export interface SendOtpResponse {
  masked_target: string;
}

export interface VerifyOtpResponse {
  access_token?: string;
  refresh_token?: string;
  mfa_required?: boolean;
  mfa_token?: string;
  token_type?: 'Bearer';
  expires_in?: number;
  user: AuthUser;
}

export type AuthResponse = VerifyOtpResponse;

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthContextValue {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sendOtp: (target: { phone?: string; email?: string }) => Promise<{ maskedTarget: string }>;
  verifyOtp: (target: { phone?: string; email?: string }, code: string) => Promise<void>;
  registerWithEmail: (data: RegisterInput) => Promise<void>;
  loginWithEmail: (data: LoginInput) => Promise<void>;
  updateUser: (patch: Partial<StoredUser>) => Promise<void>;
  logout: () => Promise<void>;
}
