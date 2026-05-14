/**
 * Register Expo push token with your API when you add a backend route.
 * Expects: POST /api/v1/student/me/push-token  body: { expo_push_token: string }
 * Remove the try/catch or adjust the path when the endpoint exists.
 */
import { apiRequest } from '@/lib/api';

export async function registerExpoPushTokenWithBackend(expoPushToken: string): Promise<void> {
  try {
    await apiRequest<{ ok: boolean }>('/api/v1/student/me/push-token', {
      method: 'POST',
      body: JSON.stringify({ expo_push_token: expoPushToken }),
    });
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[push-token-api] Expo token saved; admin in-app / bulk pushes can target this user.');
    }
  } catch (e) {
    console.warn(
      '[push-token-api] POST /me/push-token failed — server has no device token; admin notifications will not reach this device.',
      e,
    );
  }
}
