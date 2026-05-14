/**
 * Expo push: register the device, Android channel, and foreground behavior.
 *
 * **Important:** Do not add a static `import 'expo-notifications'` — loading that module on
 * **Android + Expo Go** (SDK 53+) runs a side effect that logs a red ERROR. We use dynamic
 * `import()` and skip the module entirely on Android in Expo Go.
 *
 * **Sending from your server:** store each user's Expo token, then POST to Expo's push API.
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const ANDROID_DEFAULT_CHANNEL = 'default';

type ExpoNotifications = typeof import('expo-notifications');

function isExpoGoAndroid(): boolean {
  return (
    Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/** Loads expo-notifications without tripping Expo Go Android's push block. */
async function loadNotifications(): Promise<ExpoNotifications | null> {
  if (isExpoGoAndroid()) {
    return null;
  }
  return import('expo-notifications');
}

/**
 * iOS / Android: present **system** notifications (status bar, shade, Notification Center)
 * when a push arrives — same surface as other apps (foreground + background). In-app glass
 * toasts are only for `useNotification().show*`, not for remote pushes.
 */
export function configureExpoNotificationBehavior(): void {
  if (isExpoGoAndroid()) {
    return;
  }
  void loadNotifications().then((Notifications) => {
    if (!Notifications) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  });
}

export async function ensureAndroidNotificationChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL, {
    name: 'General',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#D4A84B',
    sound: 'default',
  });
}

/**
 * @returns Expo push token string, or `null` if not physical device, permission denied, or misconfiguration.
 */
export async function registerForExpoPushAsync(): Promise<string | null> {
  if (isExpoGoAndroid()) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[push] Remote push is unavailable in Expo Go on Android (SDK 53+). Use: npx expo run:android or eas build --profile development',
      );
    }
    return null;
  }

  if (!Device.isDevice) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[push] No Expo token: not a physical device (iOS Simulator / Android AVD have no valid push). Use a real device.',
      );
    }
    return null;
  }

  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  const { status: exist } = await Notifications.getPermissionsAsync();
  let st = exist;
  if (exist !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    st = status;
  }
  if (st !== 'granted') {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[push] No Expo token: notification permission is',
        st,
        '— allow notifications in Settings for this app.',
      );
    }
    return null;
  }

  await ensureAndroidNotificationChannelAsync();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId || String(projectId).trim() === '') {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(
        '[push] Missing EAS projectId. Add it to the app config:\n' +
          '  • Run: npx eas init   (from gig_economy_app), or\n' +
          '  • Set EXPO_PUBLIC_EAS_PROJECT_ID in .env to your project UUID (expo.dev → Project settings).\n' +
          '  Then restart Metro (npx expo start --clear).',
      );
    }
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: String(projectId).trim() });
    return tokenData.data;
  } catch (e) {
    console.warn('[push] getExpoPushTokenAsync', e);
    return null;
  }
}

export function addPushReceivedListener(
  onPayload: (
    title: string | undefined,
    body: string,
    data: Record<string, unknown> | undefined,
  ) => void,
): { remove: () => void } {
  if (isExpoGoAndroid()) {
    return { remove: () => {} };
  }
  const p = loadNotifications().then((Notifications) => {
    if (!Notifications) return null;
    return Notifications.addNotificationReceivedListener((n) => {
      const c = n.request.content;
      onPayload(c.title ?? undefined, c.body ?? '', c.data as Record<string, unknown> | undefined);
    });
  });
  return {
    remove: () => {
      void p.then((sub) => sub?.remove());
    },
  };
}

export function addPushResponseListener(
  onResponse: (data: Record<string, unknown> | undefined) => void,
): { remove: () => void } {
  if (isExpoGoAndroid()) {
    return { remove: () => {} };
  }
  const p = loadNotifications().then((Notifications) => {
    if (!Notifications) return null;
    return Notifications.addNotificationResponseReceivedListener((r) => {
      const d = r.notification.request.content.data as Record<string, unknown> | undefined;
      onResponse(d);
    });
  });
  return {
    remove: () => {
      void p.then((sub) => sub?.remove());
    },
  };
}
