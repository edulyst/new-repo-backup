import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { authColors, authFonts } from '@/constants/auth-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useMyShiftsQuery, useRespondToShiftMutation } from '@/hooks/use-shifts';
import { useNotification } from '@/lib/notification-service';
import {
  listPendingShiftDecisions,
  removePendingShiftDecision,
  type PendingShiftDecision,
} from '@/lib/shift-flow-storage';

const CHECKIN_KEY = 'shift_checkin_verified_ids_v1';
const W = Dimensions.get('window').width;

// ─── Design tokens ────────────────────────────────────────────────────────────
const Y = authColors.accent;           // yellow — sole accent colour
const YS = 'rgba(250,204,21,0.11)';     // yellow soft fill
const YB = 'rgba(250,204,21,0.28)';     // yellow border

const C = {
  bg: '#0A0A0B',
  card: '#131316',
  cardBrd: 'rgba(255,255,255,0.07)',
  line: 'rgba(255,255,255,0.06)',
  surface: '#1A1A1E',
  text: '#EFEFEF',
  sub: '#8C8C97',
  muted: '#4A4A55',
  ok: '#22C55E',                   // green — semantic (completed only)
  okS: 'rgba(34,197,94,0.12)',
  okB: 'rgba(34,197,94,0.28)',
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const notification = useNotification();
  const myShiftsQuery = useMyShiftsQuery(Boolean(token));
  const respondMutation = useRespondToShiftMutation();
  const shifts = myShiftsQuery.data ?? [];

  const [pendingDecisions, setPendingDecisions] = useState<PendingShiftDecision[]>([]);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'confirmed' | 'completed'>('confirmed');
  const pagerRef = useRef<ScrollView>(null);
  const tabAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [pending, raw] = await Promise.all([
          listPendingShiftDecisions(),
          AsyncStorage.getItem(CHECKIN_KEY),
        ]);
        if (!alive) return;
        setPendingDecisions(pending);
        setCheckedInIds(new Set(raw ? (JSON.parse(raw) as string[]) : []));
      })();
      return () => { alive = false; };
    }, []),
  );

  const confirmed = shifts.filter((s) => String(s.status).toLowerCase() === 'accepted');
  const completed = shifts.filter((s) => String(s.status).toLowerCase() === 'completed');

  // ── Tab helpers ──
  const spring = (page: number) =>
    Animated.spring(tabAnim, { toValue: page, useNativeDriver: true, tension: 280, friction: 28 }).start();

  const goTab = (tab: 'confirmed' | 'completed') => {
    const page = tab === 'completed' ? 1 : 0;
    setActiveTab(tab);
    spring(page);
    pagerRef.current?.scrollTo({ x: page * W, animated: true });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / W);
    const tab = page === 1 ? 'completed' : 'confirmed';
    setActiveTab(tab);
    spring(page);
  };

  const underlineX = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, W / 2] });

  // ── Pending decision ──
  const handleDecision = async (decision: 'accepted' | 'rejected') => {
    const item = pendingDecisions[0];
    if (!item) return;
    const matched = shifts.find((s) => s.id === item.shiftId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await respondMutation.mutateAsync({
        shiftId: item.shiftId,
        applicationId: item.applicationId ?? matched?.applicationId,
        decision,
      });
      await removePendingShiftDecision(item.shiftId);
      setPendingDecisions((p) => p.filter((x) => x.shiftId !== item.shiftId));
      if (decision === 'accepted') {
        notification.showSuccess('Shift accepted', 'Decision saved');
        void myShiftsQuery.refetch();
      } else {
        notification.showInfo('Shift declined', 'Decision saved');
      }
    } catch (e: unknown) {
      notification.showError(
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : `Could not ${decision} shift`,
      );
    }
  };

  // ── Shift card ──
  const renderCard = (item: (typeof shifts)[number]) => {
    const done = String(item.status).toLowerCase() === 'completed';
    const checkedIn = checkedInIds.has(item.id);

    return (
      <Pressable
        key={`${item.id}-${item.status}`}
        onPress={() =>
          router.push({
            pathname: '/shift-check-in',
            params: {
              shiftId: item.id, role: item.role, employer: item.company,
              venue: item.address || item.area || '',
              time: new Date(item.startAt).toISOString(),
            },
          })
        }
        style={({ pressed }) => [st.card, pressed && { opacity: 0.82 }]}
      >
        {/* Row 1 — role + company */}
        <View style={st.cardTop}>
          <View style={st.cardMeta}>
            <Text style={st.cardRole} numberOfLines={1}>{item.role}</Text>
            <Text style={st.cardCo} numberOfLines={1}>
              {item.company}{item.area ? `  ·  ${item.area}` : ''}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={st.cardLine} />

        {/* Row 2 — simple details */}
        <View style={st.detailsWrap}>
          <Text style={st.detailLine} numberOfLines={1}>
            {fmtDate(item.startAt)} · {fmtTime(item.startAt)}
          </Text>
          <Text style={st.detailLine} numberOfLines={1}>
            {item.payPerHour > 0 ? `₹${item.payPerHour}/hr` : 'Pay TBD'}
          </Text>
          <Text style={st.detailLine} numberOfLines={2}>
            {item.address || item.area || 'Venue TBD'}
          </Text>
        </View>

        {/* Divider */}
        <View style={st.cardLine} />

        {/* Row 3 — applied date + CTA */}
        <View style={st.cardFooter}>
          <Text style={st.applied}>
            Applied {new Date(item.appliedAt).toLocaleDateString()}
          </Text>

          {done ? (
            <Text style={st.doneTxt}>Completed</Text>
          ) : (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/shift-check-in',
                  params: {
                    shiftId: item.id, role: item.role, employer: item.company,
                    venue: item.address || item.area || '',
                    time: new Date(item.startAt).toISOString(),
                  },
                })
              }
              style={({ pressed }) => [
                st.checkInBtn,
                checkedIn && st.checkInBtnDone,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[st.checkInTxt, checkedIn && st.checkInTxtDone]}>
                {checkedIn ? 'Checked In' : 'Check In'}
              </Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  // ── JSX ──
  return (
    <View style={st.screen}>

      {/* ══ Header ══ */}
      <View style={[st.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={st.eyebrow}>SCHEDULE</Text>
          <Text style={st.title}>My Shifts</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            myShiftsQuery.refetch();
          }}
          style={({ pressed }) => [st.refreshBtn, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="refresh-outline" size={18} color={C.sub} />
        </Pressable>
      </View>

      {/* ══ Stats strip ══ */}
      {shifts.length > 0 && (
        <View style={st.statsStrip}>
          <StatCell n={confirmed.length} label="Upcoming" />
          <View style={st.statSep} />
          <StatCell n={completed.length} label="Completed" />
          <View style={st.statSep} />
          <StatCell n={shifts.length} label="Total" />
        </View>
      )}

      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>

        {/* ══ Pending banner ══ */}
        {pendingDecisions.length > 0 && (
          <View style={st.pendingWrap}>
            <View style={st.pendingCard}>
              <View style={st.pendingRow}>
                <View style={st.pendingDot} />
                <View style={{ flex: 1 }}>
                  <Text style={st.pendingHead}>Action needed</Text>
                  <Text style={st.pendingBody} numberOfLines={2}>
                    {pendingDecisions[0].title}: {pendingDecisions[0].message}
                  </Text>
                </View>
              </View>
              <View style={st.pendingBtns}>
                <Pressable
                  disabled={respondMutation.isPending}
                  onPress={() => handleDecision('rejected')}
                  style={({ pressed }) => [st.btnOutline, pressed && { opacity: 0.6 }]}
                >
                  <Text style={st.btnOutlineTxt}>Decline</Text>
                </Pressable>
                <Pressable
                  disabled={respondMutation.isPending}
                  onPress={() => handleDecision('accepted')}
                  style={({ pressed }) => [st.btnFill, pressed && { opacity: 0.8 }]}
                >
                  <Text style={st.btnFillTxt}>Accept Shift</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ══ Body ══ */}
        {!token ? (
          <EmptyState icon="lock-closed-outline" title="Sign in to continue" sub="Your shift applications will appear here once you sign in." />
        ) : myShiftsQuery.isLoading ? (
          <View style={st.center}>
            <ActivityIndicator size="large" color={Y} />
            <Text style={st.loadTxt}>Loading shifts…</Text>
          </View>
        ) : myShiftsQuery.isError ? (
          <View style={st.center}>
            <Ionicons name="cloud-offline-outline" size={36} color={C.muted} />
            <Text style={st.errTitle}>Couldn't load shifts</Text>
            <Text style={st.errSub}>{String((myShiftsQuery.error as any)?.message ?? 'Please try again.')}</Text>
            <Pressable onPress={() => myShiftsQuery.refetch()} style={st.retryBtn}>
              <Text style={st.retryTxt}>Try again</Text>
            </Pressable>
          </View>
        ) : shifts.length > 0 ? (
          <>
            {/* ── Tabs with underline indicator ── */}
            <View style={st.tabsBar}>
              <Pressable onPress={() => goTab('confirmed')} style={st.tabBtn}>
                <Text style={[st.tabTxt, activeTab === 'confirmed' && st.tabTxtOn]}>
                  Upcoming{confirmed.length > 0 ? `   ${confirmed.length}` : ''}
                </Text>
              </Pressable>
              <Pressable onPress={() => goTab('completed')} style={st.tabBtn}>
                <Text style={[st.tabTxt, activeTab === 'completed' && st.tabTxtOn]}>
                  Completed{completed.length > 0 ? `   ${completed.length}` : ''}
                </Text>
              </Pressable>
              <Animated.View style={[st.tabUnderline, { transform: [{ translateX: underlineX }] }]} />
            </View>

            {/* ── Swipeable pages ── */}
            <ScrollView
              ref={pagerRef}
              horizontal pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
              style={{ flex: 1 }}
            >
              <View style={st.page}>
                <ScrollView contentContainerStyle={st.list} showsVerticalScrollIndicator={false}>
                  {confirmed.length > 0
                    ? confirmed.map(renderCard)
                    : <EmptyState icon="calendar-outline" title="No upcoming shifts" sub="Apply from Search — confirmed shifts appear here." compact />
                  }
                </ScrollView>
              </View>
              <View style={st.page}>
                <ScrollView contentContainerStyle={st.list} showsVerticalScrollIndicator={false}>
                  {completed.length > 0
                    ? completed.map(renderCard)
                    : <EmptyState icon="checkmark-done-outline" title="No completed shifts" sub="Finished shifts will appear here automatically." compact />
                  }
                </ScrollView>
              </View>
            </ScrollView>
          </>
        ) : (
          <EmptyState icon="calendar-outline" title="No applications yet" sub="Apply from Search and your shift requests will appear here." />
        )}

      </SafeAreaView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({ n, label }: { n: number; label: string }) {
  return (
    <View style={st.statCell}>
      <Text style={st.statN}>{n}</Text>
      <Text style={st.statLbl}>{label}</Text>
    </View>
  );
}

function EmptyState({ icon, title, sub, compact = false }: {
  icon: string; title: string; sub: string; compact?: boolean;
}) {
  return (
    <View style={[st.emptyWrap, compact && st.emptyCompact]}>
      <View style={st.emptyIcon}>
        <Ionicons name={icon as any} size={24} color={Y} />
      </View>
      <Text style={st.emptyTitle}>{title}</Text>
      <Text style={st.emptySub}>{sub}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.6,
    color: Y,
    fontFamily: authFonts.semiBold,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: authFonts.bold,
    color: C.text,
    letterSpacing: -0.4,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.cardBrd,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  statCell: { flex: 1, paddingVertical: 14, alignItems: 'center', gap: 3 },
  statN: { fontSize: 22, fontFamily: authFonts.bold, color: C.text },
  statLbl: { fontSize: 11, color: C.muted, fontFamily: authFonts.regular },
  statSep: { width: StyleSheet.hairlineWidth, backgroundColor: C.line, marginVertical: 12 },

  // Pending
  pendingWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  pendingCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: YB,
    padding: 14,
    gap: 12,
  },
  pendingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pendingDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: Y, marginTop: 4 },
  pendingHead: { fontSize: 13, fontFamily: authFonts.semiBold, color: Y, marginBottom: 3 },
  pendingBody: { fontSize: 12, color: C.sub, fontFamily: authFonts.regular, lineHeight: 18 },
  pendingBtns: { flexDirection: 'row', gap: 8 },

  btnOutline: {
    flex: 1, height: 40, borderRadius: 999,
    borderWidth: 1, borderColor: C.cardBrd,
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineTxt: { fontSize: 13, color: C.sub, fontFamily: authFonts.semiBold },
  btnFill: {
    flex: 1.5, height: 40, borderRadius: 999,
    backgroundColor: Y,
    alignItems: 'center', justifyContent: 'center',
  },
  btnFillTxt: { fontSize: 13, color: '#000', fontFamily: authFonts.semiBold },

  // Tabs
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    position: 'relative',
  },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabTxt: { fontSize: 13, color: C.sub, fontFamily: authFonts.regular },
  tabTxtOn: { color: C.text, fontFamily: authFonts.semiBold },
  tabUnderline: {
    position: 'absolute', bottom: -1, left: 0,
    width: W / 2, height: 2,
    backgroundColor: Y, borderRadius: 999,
  },

  // Pager
  page: { width: W, flex: 1 },
  list: { padding: 16, gap: 10, paddingBottom: 36 },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBrd,
  },
  cardTop: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  cardMeta: { flex: 1 },
  cardRole: { fontSize: 15, fontFamily: authFonts.semiBold, color: C.text, marginBottom: 2 },
  cardCo: { fontSize: 12, color: C.sub, fontFamily: authFonts.regular },
  cardLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.line,
  },
  detailsWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  detailLine: { fontSize: 12, color: C.sub, fontFamily: authFonts.regular, lineHeight: 17 },
  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  applied: { fontSize: 11, color: C.muted, fontFamily: authFonts.regular, flexShrink: 1, marginRight: 8 },
  checkInBtn: {
    backgroundColor: Y,
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  checkInBtnDone: {
    backgroundColor: C.okS,
    borderWidth: 1, borderColor: C.okB,
  },
  checkInTxt: { fontSize: 12, color: '#000', fontFamily: authFonts.semiBold },
  checkInTxtDone: { color: C.ok },
  doneTxt: { fontSize: 12, color: C.ok, fontFamily: authFonts.semiBold },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  loadTxt: { fontSize: 13, color: C.sub, fontFamily: authFonts.regular },
  errTitle: { fontSize: 16, fontFamily: authFonts.semiBold, color: C.text, textAlign: 'center' },
  errSub: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 20, fontFamily: authFonts.regular },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 22, paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: YS,
    borderWidth: 1, borderColor: YB,
  },
  retryTxt: { fontSize: 13, color: Y, fontFamily: authFonts.semiBold },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  emptyCompact: { flex: 0, paddingVertical: 48 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: YS,
    borderWidth: 1, borderColor: YB,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: authFonts.bold, color: C.text, textAlign: 'center' },
  emptySub: { fontSize: 13, color: C.sub, textAlign: 'center', lineHeight: 20, fontFamily: authFonts.regular },
});