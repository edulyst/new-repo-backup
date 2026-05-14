/**
 * In-app toasts (success/error/info) with app logo. Remote pushes from the server use the **OS**
 * notification sheet (see `configureExpoNotificationBehavior` in push-notifications).
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpoPushRegister } from '@/components/ExpoPushRegister';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { authFonts } from '@/constants/auth-theme';
import {
  addPushReceivedListener,
  addPushResponseListener,
  configureExpoNotificationBehavior,
} from '@/lib/push-notifications';
import type { InAppNotification, NotificationContextValue, NotificationType } from '@/types';
import { useRespondToShiftMutation } from '@/hooks/use-shifts';
import {
  listPendingShiftDecisions,
  removePendingShiftDecision,
  upsertPendingShiftDecision,
  type PendingShiftDecision,
  appendShiftTimelineEvent,
} from '@/lib/shift-flow-storage';

const APP_LOGO = require('../assets/images/icon.png') as number;

const NotificationContext = createContext<NotificationContextValue | null>(null);
const DURATION_MS = 4200;
const DEFAULT_NOTIFICATION_ROUTE = '/notifications';

type PushData = Record<string, unknown> | undefined;

type ShiftDecisionPrompt = PendingShiftDecision;

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function buildNotificationRoute(data: PushData): string {
  if (!data) return DEFAULT_NOTIFICATION_ROUTE;

  const eventType = (stringValue(data.eventType) ?? stringValue(data.type) ?? '').toLowerCase();
  if (eventType.includes('reminder') || eventType.includes('shift_today') || eventType.includes('day_of_shift')) {
    return '/(tabs)/schedule';
  }

  const url = stringValue(data.url);
  if (url) return url;

  const screen = stringValue(data.screen);
  const userId = stringValue(data.userId);
  const shiftId = stringValue(data.shiftId);
  const status = stringValue(data.status);

  if (screen) {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (shiftId) params.set('shiftId', shiftId);
    if (status) params.set('status', status);
    const query = params.toString();
    return query ? `${screen}?${query}` : screen;
  }

  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (shiftId) params.set('shiftId', shiftId);
  if (status) params.set('status', status);
  const query = params.toString();
  return query ? `${DEFAULT_NOTIFICATION_ROUTE}?${query}` : DEFAULT_NOTIFICATION_ROUTE;
}

function buildAwesomeNotification(data: PushData, fallbackTitle?: string, fallbackBody?: string) {
  const title = stringValue(data?.title) ?? fallbackTitle ?? 'Shift update';
  const eventType = stringValue(data?.eventType) ?? stringValue(data?.type) ?? '';
  const status = stringValue(data?.status);
  const shiftId = stringValue(data?.shiftId);
  const userId = stringValue(data?.userId);
  const userName =
    stringValue(data?.userName) ?? stringValue(data?.selectedUserName) ?? stringValue(data?.workerName);
  const customMessage = stringValue(data?.message) ?? fallbackBody;
  const employer = stringValue(data?.employerName) ?? stringValue(data?.employer);
  const venue = stringValue(data?.venue) ?? stringValue(data?.address);
  const timing = stringValue(data?.timing) ?? stringValue(data?.time);

  if (customMessage) {
    return { title, message: customMessage };
  }

  const shiftLabel = shiftId ? `Shift #${shiftId}` : 'Shift';
  const userLabel = userName ?? (userId ? `User #${userId}` : 'the user');

  if (eventType.includes('selected')) {
    return {
      title: 'User selected',
      message: `${userLabel} was selected for ${shiftLabel}. Tap to view details.`,
    };
  }

  if (eventType.includes('reminder') || eventType.includes('shift_today') || eventType.includes('day_of_shift')) {
    const detail = [venue, timing, employer].filter(Boolean).join(' · ');
    return {
      title: 'Shift reminder',
      message: detail
        ? `Please complete your job today. ${detail}`
        : 'Please complete your job today. Check your schedule for details.',
    };
  }

  if (status) {
    return {
      title: 'Shift status updated',
      message: `${shiftLabel} is now ${status.toUpperCase()} for ${userLabel}. Tap to view details.`,
    };
  }

  if (shiftId || userId || userName) {
    return {
      title,
      message: `${shiftLabel} has a new update for ${userLabel}. Tap to open details.`,
    };
  }

  return {
    title,
    message: fallbackBody ?? 'You have a new shift update. Tap to open details.',
  };
}

function eventNotificationType(data: PushData): NotificationType {
  const status = (stringValue(data?.status) ?? '').toLowerCase();
  if (status.includes('cancel') || status.includes('declin') || status.includes('rejected')) return 'error';
  if (status.includes('accept') || status.includes('approved') || status.includes('selected')) return 'success';
  return 'info';
}

function parseShiftDecisionPrompt(data: PushData, fallbackTitle?: string, fallbackBody?: string): ShiftDecisionPrompt | null {
  if (!data) return null;
  const eventType = (stringValue(data.eventType) ?? stringValue(data.type) ?? '').toLowerCase();
  const status = (stringValue(data.status) ?? '').toLowerCase();
  const shiftId = stringValue(data.shiftId) ?? stringValue(data.shift_id);
  const applicationId =
    stringValue(data.applicationId) ?? stringValue(data.application_id) ?? stringValue(data.appId);
  if (!shiftId) return null;

  const isConfirmationEvent =
    eventType.includes('shift_confirmed') ||
    eventType.includes('shift_selected') ||
    eventType.includes('application_confirmed') ||
    status === 'confirmed' ||
    status === 'selected';

  if (!isConfirmationEvent) return null;

  const employer = stringValue(data.employerName) ?? stringValue(data.employer) ?? undefined;
  const venue = stringValue(data.venue) ?? stringValue(data.address) ?? undefined;
  const timing = stringValue(data.timing) ?? stringValue(data.time) ?? undefined;
  const role = stringValue(data.role) ?? 'Shift';

  return {
    shiftId,
    applicationId,
    title: fallbackTitle ?? `${role} confirmed`,
    message: fallbackBody ?? 'Do you want to accept this shift?',
    venue,
    timing,
    employer,
    createdAt: new Date().toISOString(),
  };
}

function typeMeta(type: NotificationType) {
  switch (type) {
    case 'success':
      return { bar: '#22C55E', icon: 'checkmark-circle' as const, haptic: Haptics.NotificationFeedbackType.Success };
    case 'error':
      return { bar: '#EF4444', icon: 'close-circle' as const, haptic: Haptics.NotificationFeedbackType.Error };
    case 'warning':
      return { bar: '#F59E0B', icon: 'warning' as const, haptic: Haptics.NotificationFeedbackType.Warning };
    case 'info':
    default:
      return { bar: '#D4A84B', icon: 'information-circle' as const, haptic: Haptics.NotificationFeedbackType.Success };
  }
}

function InAppNotificationBanner({ notification, onDismiss }: { notification: InAppNotification; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const scheme = useColorScheme();
  const dark = isDark ?? scheme === 'dark';
  const meta = typeMeta(notification.type);
  const tint: 'light' | 'dark' = dark ? 'dark' : 'light';

  useEffect(() => {
    void Haptics.notificationAsync(meta.haptic);
  }, [notification.id, meta.haptic]);

  return (
    <Animated.View
      entering={FadeInDown.duration(220).easing(Easing.out(Easing.cubic))}
      exiting={FadeOutUp.duration(180).easing(Easing.in(Easing.cubic))}
      style={[styles.toastWrap, { marginTop: insets.top + 6 }]}
    >
      <Pressable
        onPress={onDismiss}
        style={({ pressed }) => [pressed && { opacity: 0.95 }]}
      >
        <BlurView intensity={dark ? 48 : 55} tint={tint} style={[styles.blur, { borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
          <View style={[styles.accent, { backgroundColor: meta.bar }]} />
          <View style={styles.toastRow}>
            <View style={styles.logoRing}>
              <Image source={APP_LOGO} style={styles.logo} contentFit="cover" cachePolicy="memory" transition={0} />
            </View>
            <View style={styles.textCol}>
              {notification.title ? (
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {notification.title}
                </Text>
              ) : null}
              <Text
                style={[styles.body, { color: notification.title ? colors.textSecondary : colors.text }]}
                numberOfLines={4}
              >
                {notification.message}
              </Text>
            </View>
            <Ionicons name={meta.icon} size={22} color={meta.bar} style={styles.typeIcon} />
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

function NotificationToasts({
  list,
  onDismiss,
}: {
  list: InAppNotification[];
  onDismiss: (id: string) => void;
}) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {list.map((n) => (
        <InAppNotificationBanner
          key={n.id}
          notification={n}
          onDismiss={() => onDismiss(n.id)}
        />
      ))}
    </View>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [prompt, setPrompt] = useState<ShiftDecisionPrompt | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const respondMutation = useRespondToShiftMutation();

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const add = useCallback(
    (message: string, type: NotificationType, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const entry: InAppNotification = { id, message, type, title };
      setItems((prev) => {
        if (prev.length >= 2) {
          const drop = prev[0];
          const old = timers.current.get(drop.id);
          if (old) clearTimeout(old);
          timers.current.delete(drop.id);
          return [...prev.slice(1), entry];
        }
        return [...prev, entry];
      });
      const timer = setTimeout(() => {
        dismiss(id);
      }, DURATION_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value: NotificationContextValue = {
    showSuccess: (message, title) => add(message, 'success', title),
    showError: (message, title) => add(message, 'error', title),
    showInfo: (message, title) => add(message, 'info', title),
    showWarning: (message, title) => add(message, 'warning', title),
  };

  useEffect(() => {
    configureExpoNotificationBehavior();
  }, []);

  useEffect(() => {
    void (async () => {
      const pending = await listPendingShiftDecisions();
      if (pending.length > 0) setPrompt(pending[0]);
    })();
  }, []);

  useEffect(() => {
    const receivedSub = addPushReceivedListener((title, body, data) => {
      const notification = buildAwesomeNotification(data, title, body);
      add(notification.message, eventNotificationType(data), notification.title);
      const nextPrompt = parseShiftDecisionPrompt(data, title, body);
      if (nextPrompt) {
        setPrompt(nextPrompt);
        void upsertPendingShiftDecision(nextPrompt);
      }
    });

    const { remove } = addPushResponseListener((data) => {
      const notification = buildAwesomeNotification(data);
      add(notification.message, eventNotificationType(data), notification.title);
      const nextPrompt = parseShiftDecisionPrompt(data);
      if (nextPrompt) {
        setPrompt(nextPrompt);
        void upsertPendingShiftDecision(nextPrompt);
        return;
      }
      const route = buildNotificationRoute(data);
      if (route) {
        router.push(route as never);
      }
    });

    return () => {
      receivedSub.remove();
      remove();
    };
  }, []);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ExpoPushRegister />
      <NotificationToasts list={items} onDismiss={dismiss} />
      <Modal
        visible={Boolean(prompt)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!respondMutation.isPending) setPrompt(null);
        }}
      >
        <View style={styles.promptOverlay}>
          <View style={styles.promptCard}>
            <View style={styles.promptIconWrap}>
              <Ionicons name="notifications" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.promptTitle}>{prompt?.title ?? 'Shift confirmed'}</Text>
            <Text style={styles.promptBody}>{prompt?.message ?? ''}</Text>
            {prompt?.employer ? <Text style={styles.promptMeta}>Employer: {prompt.employer}</Text> : null}
            {prompt?.venue ? <Text style={styles.promptMeta}>Venue: {prompt.venue}</Text> : null}
            {prompt?.timing ? <Text style={styles.promptMeta}>Time: {prompt.timing}</Text> : null}

            <View style={styles.promptActions}>
              <Pressable
                disabled={respondMutation.isPending}
                onPress={() => {
                  setPrompt(null);
                }}
                style={({ pressed }) => [styles.promptLaterBtn, (pressed || respondMutation.isPending) && { opacity: 0.8 }]}
              >
                <Text style={styles.promptLaterTxt}>Not now</Text>
              </Pressable>
              <Pressable
                disabled={respondMutation.isPending}
                onPress={async () => {
                  if (!prompt) return;
                  try {
                    await respondMutation.mutateAsync({
                      shiftId: prompt.shiftId,
                      applicationId: prompt.applicationId,
                      decision: 'rejected',
                    });
                    await appendShiftTimelineEvent({
                      shiftId: prompt.shiftId,
                      type: 'rejected',
                      title: 'Shift rejected',
                      message: prompt.title,
                    });
                    add('Shift was rejected.', 'info', 'Shift decision updated');
                    await removePendingShiftDecision(prompt.shiftId);
                    setPrompt(null);
                  } catch (e: unknown) {
                    const msg =
                      e && typeof e === 'object' && 'message' in e
                        ? String((e as { message: string }).message)
                        : 'Failed to reject shift.';
                    add(msg, 'error', 'Action failed');
                    setPrompt(null);
                  }
                }}
                style={({ pressed }) => [styles.promptRejectBtn, (pressed || respondMutation.isPending) && { opacity: 0.8 }]}
              >
                <Text style={styles.promptRejectTxt}>Reject</Text>
              </Pressable>
              <Pressable
                disabled={respondMutation.isPending}
                onPress={async () => {
                  if (!prompt) return;
                  try {
                    await respondMutation.mutateAsync({
                      shiftId: prompt.shiftId,
                      applicationId: prompt.applicationId,
                      decision: 'accepted',
                    });
                    await appendShiftTimelineEvent({
                      shiftId: prompt.shiftId,
                      type: 'accepted',
                      title: 'Shift accepted',
                      message: prompt.title,
                    });
                    add('Shift added to your schedule.', 'success', 'Shift accepted');
                    await removePendingShiftDecision(prompt.shiftId);
                    setPrompt(null);
                    router.push('/(tabs)/schedule');
                  } catch (e: unknown) {
                    const msg =
                      e && typeof e === 'object' && 'message' in e
                        ? String((e as { message: string }).message)
                        : 'Failed to accept shift.';
                    add(msg, 'error', 'Action failed');
                    setPrompt(null);
                  }
                }}
                style={({ pressed }) => [styles.promptAcceptBtn, (pressed || respondMutation.isPending) && { opacity: 0.9 }]}
              >
                {respondMutation.isPending ? (
                  <ActivityIndicator color="#0D0D0D" />
                ) : (
                  <Text style={styles.promptAcceptTxt}>Accept</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      showSuccess: (m: string, t?: string) => console.log('[success]', t, m),
      showError: (m: string, t?: string) => console.warn('[error]', t, m),
      showInfo: (m: string, t?: string) => console.log('[info]', t, m),
      showWarning: (m: string, t?: string) => console.warn('[warning]', t, m),
    };
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 9999,
    gap: 8,
  },
  toastWrap: {},
  blur: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  toastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 11,
    gap: 10,
  },
  logoRing: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  logo: { width: 44, height: 44 },
  textCol: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 15, fontFamily: authFonts.semiBold, letterSpacing: -0.2 },
  body: { fontSize: 13, fontFamily: authFonts.regular, lineHeight: 18 },
  typeIcon: { marginLeft: 4 },
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  promptCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 8,
  },
  promptIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    marginBottom: 4,
  },
  promptTitle: {
    fontSize: 17,
    fontFamily: authFonts.semiBold,
    color: '#0F172A',
  },
  promptBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: authFonts.regular,
    color: '#334155',
  },
  promptMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: authFonts.regular,
    color: '#475569',
  },
  promptActions: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 10,
  },
  promptLaterBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  promptLaterTxt: {
    fontSize: 14,
    fontFamily: authFonts.semiBold,
    color: '#334155',
  },
  promptRejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F8FAFC',
  },
  promptRejectTxt: {
    fontSize: 14,
    fontFamily: authFonts.semiBold,
    color: '#1F2937',
  },
  promptAcceptBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  promptAcceptTxt: {
    fontSize: 14,
    fontFamily: authFonts.semiBold,
    color: '#FFFFFF',
  },
});
