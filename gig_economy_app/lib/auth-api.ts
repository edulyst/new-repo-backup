/**
 * Auth API – send/verify OTP and email auth.
 */
import { apiRequest } from './api';
import type { AuthResponse, LoginInput, RegisterInput, SendOtpResponse, VerifyOtpResponse } from '@/types';

export async function sendOtp(phone: string): Promise<SendOtpResponse> {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Phone number must be 10-15 digits');
  }
  return apiRequest<SendOtpResponse>('/api/v1/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: `+${digits}`, device_id: `mob_${digits}` }),
    skipAuth: true,
  });
}

export async function sendEmailOtp(email: string): Promise<SendOtpResponse> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) {
    throw new Error('Enter a valid email');
  }
  return apiRequest<SendOtpResponse>('/api/v1/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email: normalized, device_id: `mob_${normalized}` }),
    skipAuth: true,
  });
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const digits = phone.replace(/\D/g, '');
  const codeDigits = code.replace(/\D/g, '').slice(0, 6);
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Phone number must be 10-15 digits');
  }
  if (codeDigits.length !== 6) {
    throw new Error('OTP must be 6 digits');
  }
  return apiRequest<VerifyOtpResponse>('/api/v1/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: `+${digits}`, otp: codeDigits, device_id: `mob_${digits}` }),
    skipAuth: true,
  });
}

export async function verifyEmailOtp(email: string, code: string): Promise<VerifyOtpResponse> {
  const normalized = email.trim().toLowerCase();
  const codeDigits = code.replace(/\D/g, '').slice(0, 6);
  if (!normalized.includes('@')) {
    throw new Error('Enter a valid email');
  }
  if (codeDigits.length !== 6) {
    throw new Error('OTP must be 6 digits');
  }
  return apiRequest<VerifyOtpResponse>('/api/v1/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email: normalized, otp: codeDigits, device_id: `mob_${normalized}` }),
    skipAuth: true,
  });
}

export async function registerWithEmail(data: RegisterInput): Promise<AuthResponse> {
  const email = data.email.trim().toLowerCase();
  return apiRequest<AuthResponse>('/api/v1/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email, device_id: `mob_${email}` }),
    skipAuth: true,
  });
}

export async function loginWithEmail(data: LoginInput): Promise<AuthResponse> {
  const email = data.email.trim().toLowerCase();
  return apiRequest<AuthResponse>('/api/v1/auth/login-password', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: data.password,
      device_id: `mob_${email}`,
    }),
    skipAuth: true,
  });
}
