import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { registerExpoPushTokenWithBackend } from '@/lib/push-token-api';
import { registerForExpoPushAsync } from '@/lib/push-notifications';

/**
 * Registers the device for Expo push after login. Safe to mount once under AuthProvider.
 */
export function ExpoPushRegister() {
  const { token, isLoading } = useAuth();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || !token) return;
    let cancelled = false;
    (async () => {
      const expo = await registerForExpoPushAsync();
      if (cancelled || !expo || expo === lastSent.current) return;
      lastSent.current = expo;
      if (__DEV__) {
        // Copy from Metro logs to test POST https://exp.host/--/api/v2/push/send
        console.log('[ExpoPushRegister] token:', expo);
      }
      await registerExpoPushTokenWithBackend(expo);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isLoading]);

  return null;
}
