import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { deleteNotificationForMe, listNotificationHistory, type NotificationHistoryItem } from '@/lib/notifications-api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MIN_TOP = 84;
const SHEET_CLOSE_THRESHOLD = 120;
const SHEET_COLLAPSED_RATIO = 0.5;
const HIDDEN_KEY = 'notifications_hidden_ids_v1';

type DisplayNotification = {
  id: string;
  title: string;
  message: string;
  status: string;
  channel: string;
  audience: string;
  recipients: number;
  createdAt?: string;
  sentAt?: string;
  scheduledAt?: string;
  failureReason?: string;
};

function toDisplayItem(item: NotificationHistoryItem, index: number): DisplayNotification {
  return {
    id: item._id ?? item.id ?? `notification-${index}`,
    title: item.title ?? 'Notification',
    message: item.body ?? '',
    status: item.status ?? 'queued',
    channel: item.channel ?? 'in-app',
    audience: item.audience_type ?? 'all',
    recipients: item.recipients_count ?? 0,
    createdAt: item.created_at,
    sentAt: item.sent_at,
    scheduledAt: item.scheduled_at,
    failureReason: item.failure_reason,
  };
}

function formatTimeLabel(iso?: string): string {
  if (!iso) return 'Unknown time';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function labelize(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase());
}

export function NotificationsFeed({ showBackButton }: { showBackButton: boolean }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const [items, setItems] = useState<DisplayNotification[]>([]);
  const [query, setQuery] = useState('');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DisplayNotification | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const dragValue = useRef(0);
  const sheetSnapRef = useRef<'collapsed' | 'expanded'>('collapsed');
  const searchAnim = useRef(new Animated.Value(0)).current;

  const surface = isDark ? '#151518' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const muted = isDark ? 'rgba(255,255,255,0.68)' : '#62666D';
  const rowPressed = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)';
  const unreadDot = isDark ? '#D8DCE2' : '#727985';
  const collapsedOffset = Math.max(190, Math.round(SCREEN_HEIGHT * SHEET_COLLAPSED_RATIO) - SHEET_MIN_TOP);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listNotificationHistory(40);
      const mapped = data.map(toDisplayItem).filter((item) => !hiddenIds.has(item.id));
      setItems(mapped);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Failed to load notifications.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hiddenIds]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHiddenIds(new Set(parsed));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: searchOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [searchAnim, searchOpen]);

  const openSheet = useCallback((item: DisplayNotification) => {
    setSelected(item);
    setSheetVisible(true);
    translateY.setValue(SCREEN_HEIGHT);
    sheetSnapRef.current = 'collapsed';
    Animated.spring(translateY, {
      toValue: collapsedOffset,
      useNativeDriver: true,
      bounciness: 4,
      speed: 16,
    }).start();
  }, [collapsedOffset, translateY]);

  const closeSheet = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      setSelected(null);
      dragValue.current = 0;
    });
  }, [translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gesture) => {
          const base = sheetSnapRef.current === 'expanded' ? 0 : collapsedOffset;
          const next = Math.max(0, base + gesture.dy);
          dragValue.current = gesture.dy;
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const base = sheetSnapRef.current === 'expanded' ? 0 : collapsedOffset;
          const next = Math.max(0, base + gesture.dy);
          if (next > collapsedOffset + SHEET_CLOSE_THRESHOLD || gesture.vy > 1.5) {
            closeSheet();
            return;
          }
          const expandTrigger = collapsedOffset * 0.55;
          const toExpanded = next < expandTrigger || gesture.vy < -1;
          sheetSnapRef.current = toExpanded ? 'expanded' : 'collapsed';
          Animated.spring(translateY, {
            toValue: toExpanded ? 0 : collapsedOffset,
            useNativeDriver: true,
            bounciness: 3,
            speed: 18,
          }).start();
        },
      }),
    [closeSheet, collapsedOffset, translateY],
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q),
    );
  }, [items, query]);

  const removeNotification = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((row) => row.id !== id));
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
    try {
      await deleteNotificationForMe(id);
    } catch {
      // Reload source of truth if server delete fails.
      void load();
    }
  }, [load]);

  const searchHeight = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 76] });
  const searchOpacity = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={[styles.screen, { backgroundColor: isDark ? colors.background : '#EEF1F5' }]}>
      {/* Match Home: header bar handles top inset, content safe area excludes top */}
      <View style={[styles.header, { backgroundColor: authColors.accent, paddingTop: insets.top }]}>
          <View style={styles.headerSide}>
            {showBackButton ? (
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.72 }]}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSearchOpen((v) => !v);
            }}
            style={({ pressed }) => [styles.headerSide, pressed && { opacity: 0.72 }]}
          >
            <Ionicons name="search-outline" size={21} color="#FFFFFF" />
          </Pressable>
        </View>
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <Animated.View
          pointerEvents={searchOpen ? 'auto' : 'none'}
          style={{ height: searchHeight, opacity: searchOpacity, overflow: 'hidden' }}
        >
          <View style={[styles.searchShell, { backgroundColor: 'transparent', borderColor: border }]}>
            <Ionicons name="search-outline" size={19} color={muted} style={styles.searchIcon} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search notifications"
              placeholderTextColor={muted}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={muted} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={muted} />
            <Text style={[styles.stateText, { color: muted }]}>Loading notifications...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle-outline" size={28} color={muted} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>Could not load notifications</Text>
            <Text style={[styles.stateText, { color: muted }]}>{error}</Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                void load();
              }}
              style={({ pressed }) => [styles.retryBtn, { borderColor: border, backgroundColor: surface, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={[styles.retryTxt, { color: colors.text }]}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load();
                }}
                tintColor={muted}
              />
            }
            renderItem={({ item }) => (
              <Swipeable
                overshootRight={false}
                rightThreshold={36}
                renderRightActions={() => (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      void removeNotification(item.id);
                    }}
                    style={({ pressed }) => [
                      styles.deleteAction,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                )}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    openSheet(item);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: pressed ? rowPressed : surface,
                      borderBottomColor: border,
                    },
                  ]}
                >
                  <View style={styles.rowText}>
                    <View style={styles.rowTitleLine}>
                      <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={[styles.unreadDot, { backgroundColor: unreadDot }]} />
                    </View>
                    <Text style={[styles.rowMessage, { color: muted }]} numberOfLines={2}>
                      {item.message}
                    </Text>
                    <Text style={[styles.rowTime, { color: muted }]}>{formatTimeLabel(item.sentAt ?? item.createdAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={muted} />
                </Pressable>
              </Swipeable>
            )}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Ionicons name="notifications-off-outline" size={40} color={muted} />
                <Text style={[styles.stateTitle, { color: colors.text }]}>No notifications yet</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet} />
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            {
              top: SHEET_MIN_TOP,
              backgroundColor: surface,
              borderColor: border,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.dragHandleWrap} {...panResponder.panHandlers}>
            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)' }]} />
          </View>
          {selected ? (
            <View style={styles.sheetBody}>
              <View style={styles.sheetTopRow}>
                <Text style={[styles.sheetTopLabel, { color: muted }]}>Notification detail</Text>
                <Pressable
                  onPress={closeSheet}
                  style={({ pressed }) => [styles.sheetCloseBtn, { borderColor: border, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="close" size={16} color={colors.text} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>{selected.title}</Text>
                <Text style={[styles.sheetMessage, { color: muted }]}>{selected.message}</Text>
                <View style={styles.metaCard}>
                  <Text style={[styles.metaLine, { color: muted }]}>Status: {labelize(selected.status)}</Text>
                  <Text style={[styles.metaLine, { color: muted }]}>Channel: {labelize(selected.channel)}</Text>
                  <Text style={[styles.metaLine, { color: muted }]}>Audience: {labelize(selected.audience)}</Text>
                  <Text style={[styles.metaLine, { color: muted }]}>Recipients: {selected.recipients}</Text>
                  {selected.sentAt ? <Text style={[styles.metaLine, { color: muted }]}>Sent: {new Date(selected.sentAt).toLocaleString()}</Text> : null}
                  {selected.scheduledAt ? (
                    <Text style={[styles.metaLine, { color: muted }]}>Scheduled: {new Date(selected.scheduledAt).toLocaleString()}</Text>
                  ) : null}
                  {selected.failureReason ? <Text style={[styles.metaLine, { color: muted }]}>Failure: {selected.failureReason}</Text> : null}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </Animated.View>
      </Modal>
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.lg,
    paddingBottom: 12,
  },
  headerSide: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontFamily: authFonts.semiBold, fontSize: 17, letterSpacing: 0.2 },
  searchShell: {
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 8,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIcon: { marginLeft: -1, alignSelf: 'center' },
  searchInput: {
    flex: 1,
    fontFamily: authFonts.regular,
    fontSize: 16,
    height: 56,
    textAlignVertical: 'center',
    includeFontPadding: false,
    paddingVertical: 0,
  },
  row: {
    minHeight: 84,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowText: { flex: 1, gap: 4 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, fontFamily: authFonts.semiBold, fontSize: 15 },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5 },
  rowMessage: { fontFamily: authFonts.regular, fontSize: 13, lineHeight: 18 },
  rowTime: { fontFamily: authFonts.regular, fontSize: 12, marginTop: 2 },
  deleteAction: {
    width: 92,
    height: '100%',
    backgroundColor: '#B33A3A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  deleteText: { color: '#FFFFFF', fontFamily: authFonts.semiBold, fontSize: 11 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  stateTitle: { fontFamily: authFonts.semiBold, fontSize: 16, textAlign: 'center' },
  stateText: { fontFamily: authFonts.regular, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryTxt: { fontFamily: authFonts.semiBold, fontSize: 13 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.36)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dragHandleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  dragHandle: { width: 48, height: 5, borderRadius: 3 },
  sheetBody: { paddingHorizontal: 18, paddingBottom: 28, gap: 12 },
  sheetTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTopLabel: { fontFamily: authFonts.regular, fontSize: 12 },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontFamily: authFonts.bold, fontSize: 19, lineHeight: 25 },
  sheetMessage: { fontFamily: authFonts.regular, fontSize: 15, lineHeight: 22 },
  metaCard: {
    marginTop: 14,
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 6,
  },
  metaLine: { fontFamily: authFonts.regular, fontSize: 13, lineHeight: 18 },
});

