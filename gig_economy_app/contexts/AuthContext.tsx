/**
 * AuthContext – manages auth state (phone OTP flow) and token persistence.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import type { ApiError, AuthContextValue, LoginInput, RegisterInput, StoredUser } from '@/types';
import {
  loginWithEmail as loginWithEmailApi,
  registerWithEmail as registerWithEmailApi,
  sendEmailOtp as sendEmailOtpApi,
  sendOtp as sendOtpApi,
  verifyEmailOtp as verifyEmailOtpApi,
  verifyOtp as verifyOtpApi,
} from '@/lib/auth-api';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '@/lib/auth-storage';
import { queryKeys } from '@/lib/query-keys';
import { getMe } from '@/lib/users-api';

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  sendOtp: async () => ({ maskedTarget: '***' }),
  verifyOtp: async () => {},
  registerWithEmail: async () => {},
  loginWithEmail: async () => {},
  updateUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStoredAuth().then((auth) => {
      if (auth) {
        setToken(auth.token);
        setUser(auth.user);
      }
      setIsLoading(false);
    });
  }, []);

  const sendOtpMutation = useMutation({
    mutationFn: ({ phone, email }: { phone?: string; email?: string }) => {
      if (phone) return sendOtpApi(phone);
      if (email) return sendEmailOtpApi(email);
      throw new Error('Provide phone or email');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: ({ phone, email, code }: { phone?: string; email?: string; code: string }) => {
      if (phone) return verifyOtpApi(phone, code);
      if (email) {
        return verifyEmailOtpApi(email, code);
      }
      throw new Error('Provide phone or email');
    },
    onSuccess: async (res) => {
      const accessToken = res.access_token;
      if (!accessToken) {
        throw new Error('Access token missing in response');
      }
      const userData: StoredUser = {
        id: res.user.id,
        email: res.user.email,
        phone: res.user.phone,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        role: res.user.role,
        goal: res.user.goal,
        profilePhotoUrl: res.user.profilePhotoUrl,
      };
      await setStoredAuth(accessToken, userData);
      setToken(accessToken);
      setUser(userData);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterInput) => registerWithEmailApi(data),
    onSuccess: async (res) => {
      const accessToken = res.access_token;
      if (!accessToken) {
        throw new Error('Password registration is not available. Use OTP flow.');
      }
      const userData: StoredUser = {
        id: res.user.id,
        email: res.user.email,
        phone: res.user.phone,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        role: res.user.role,
        goal: res.user.goal,
        profilePhotoUrl: res.user.profilePhotoUrl,
      };
      await setStoredAuth(accessToken, userData);
      setToken(accessToken);
      setUser(userData);
    },
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) => loginWithEmailApi(data),
    onSuccess: async (res) => {
      const accessToken = res.access_token;
      if (!accessToken) {
        throw new Error('Use OTP flow for this account.');
      }
      const userData: StoredUser = {
        id: res.user.id,
        email: res.user.email,
        phone: res.user.phone,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        role: res.user.role,
        goal: res.user.goal,
        profilePhotoUrl: res.user.profilePhotoUrl,
      };
      await setStoredAuth(accessToken, userData);
      setToken(accessToken);
      setUser(userData);
    },
  });

  const sendOtp = useCallback(
    async (target: { phone?: string; email?: string }) => {
      const res = await sendOtpMutation.mutateAsync(target);
      const maskedTarget = (res as { masked_target?: string }).masked_target ?? '***';
      return { maskedTarget };
    },
    [sendOtpMutation]
  );

  const verifyOtp = useCallback(
    async (target: { phone?: string; email?: string }, code: string) => {
      await verifyOtpMutation.mutateAsync({ ...target, code });
    },
    [verifyOtpMutation]
  );

  const registerWithEmail = useCallback(
    async (data: RegisterInput) => {
      await registerMutation.mutateAsync(data);
    },
    [registerMutation]
  );

  const loginWithEmail = useCallback(
    async (data: LoginInput) => {
      await loginMutation.mutateAsync(data);
    },
    [loginMutation]
  );

  const updateUser = useCallback(
    async (patch: Partial<StoredUser>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const nextUser = { ...prev, ...patch };
        if (token) {
          void setStoredAuth(token, nextUser);
        }
        return nextUser;
      });
    },
    [token]
  );

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await clearStoredAuth();
  }, []);

  const isAuthenticated = Boolean(token && user);

  // Best-effort refresh: if we have a token, sync the latest profile from backend.
  const meQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: getMe,
    enabled: Boolean(token),
    retry: 2,
  });

  useEffect(() => {
    if (!token || !meQuery.data) return;
    const me = meQuery.data;
    const nextUser: StoredUser = {
      id: me.id,
      email: me.email,
      phone: me.phone,
      firstName: me.firstName,
      lastName: me.lastName,
      role: me.role,
      goal: me.goal === 'profile' || me.goal === 'browse' ? me.goal : undefined,
      profilePhotoUrl: me.profilePhotoUrl,
    };
    setUser(nextUser);
    void setStoredAuth(token, nextUser);
  }, [token, meQuery.data]);

  useEffect(() => {
    if (!meQuery.isError) return;
    const statusCode = (meQuery.error as ApiError | null)?.statusCode;
    if (statusCode === 401 || statusCode === 403) {
      // Token is expired/invalid.
      void clearStoredAuth();
      setToken(null);
      setUser(null);
    }
  }, [meQuery.isError, meQuery.error]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated,
      sendOtp,
      verifyOtp,
      registerWithEmail,
      loginWithEmail,
      updateUser,
      logout,
    }),
    [user, token, isLoading, isAuthenticated, sendOtp, verifyOtp, registerWithEmail, loginWithEmail, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
