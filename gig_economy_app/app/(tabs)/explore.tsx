/**
 * Explore tab – Professional job-shifts feed.
 * Cards use FontAwesome5 category icons. Clean, no color tints.
 */
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmployerLogoTile } from '@/components/shift/EmployerLogoTile';
import { ShiftRouteMap } from '@/components/shift/ShiftRouteMap';
import { ShiftDescriptionHtml } from '@/components/shift/ShiftDescriptionHtml';
import { authColors, authFonts } from '@/constants/auth-theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { openLocationSettings, useWorkerLocation } from '@/contexts/WorkerLocationContext';
import { useNotification } from '@/lib/notification-service';
import type { Shift as ApiShift } from '@/lib/shifts-api';
import { useApplyToShiftMutation, useShiftsQuery } from '@/hooks/use-shifts';
import { formatDistanceKm } from '@/lib/format-distance';
import { openMapsDirections } from '@/lib/open-maps-directions';
import { updateWorkerLocation } from '@/lib/worker-location-api';

const { height: H, width: W } = Dimensions.get('window');

/** Solid card surfaces (no translucent “glass” — avoids milky/frosted look on list tiles). */
/** Detail modal header alignment (points). Main screen uses SafeAreaView `top` edge. */
const HEADER_TOP_OFFSET = 8;

function getGlass(isDark: boolean) {
  return {
    card: isDark ? '#18181A' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
    borderMuted: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    input: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)',
    iconBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    shadow: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)',
  };
}

// ─── Category icon map ────────────────────────────────────────────────────────
const CAT_ICON: Record<string, string> = {
  Hospitality: 'concierge-bell',
  Retail:      'store',
  Logistics:   'truck',
  Events:      'calendar-check',
  Cleaning:    'broom',
  Security:    'shield-alt',
};
function catIcon(cat: string) { return CAT_ICON[cat] ?? 'briefcase'; }

// ─── Shift data ───────────────────────────────────────────────────────────────
type Shift = ApiShift & {
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
};

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((day.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const CATS  = ['All', 'Hospitality', 'Retail', 'Logistics', 'Events', 'Cleaning', 'Security'];
const RADII = [5, 10, 25, 50];

// ─── Urgent horizontal card ───────────────────────────────────────────────────
function UrgentCard({
  item,
  onPress,
  glass,
}: {
  item: Shift;
  onPress: (i: Shift) => void;
  glass: ReturnType<typeof getGlass>;
}) {
  const { colors, isDark } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 3 }).start()}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(item); }}
    >
      <Animated.View
        style={[
          uc.card,
          {
            backgroundColor: glass.card,
            borderColor: glass.border,
            shadowColor: glass.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.22 : 0.08,
            shadowRadius: 8,
            elevation: 2,
            transform: [{ scale }],
          },
        ]}
      >
        <EmployerLogoTile
          uri={item.employerLogoUrl}
          size={40}
          borderColor={glass.borderMuted}
          iconColor={colors.textSecondary}
          contentFit={item.employerLogoFit === 'cover' ? 'cover' : 'contain'}
          backgroundColor={isDark ? 'rgba(255,255,255,0.07)' : '#EBE8E3'}
        />
        <Text style={[uc.pay, { color: colors.text }]}>
          ₹{item.payPerHour}
          <Text style={[uc.payNote, { color: colors.textSecondary }]}>/hr</Text>
        </Text>
        {/* Role */}
        <Text style={[uc.role, { color: colors.text }]} numberOfLines={2}>{item.role}</Text>
        <Text style={[uc.company, { color: colors.textSecondary }]} numberOfLines={1}>{item.company}</Text>
        {/* Footer */}
        <View style={[uc.footer, { borderTopColor: glass.borderMuted }]}>
          <View style={uc.footerDot} />
          <Text style={[uc.footerTxt, { color: '#E05252' }]}>Urgent · {item.spots} left</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const uc = StyleSheet.create({
  card: { width: 162, borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  pay: { fontSize: 19, fontFamily: authFonts.bold },
  payNote: { fontSize: 11, fontFamily: authFonts.regular },
  role: { fontSize: 14, fontFamily: authFonts.semiBold, lineHeight: 19 },
  company: { fontSize: 12, fontFamily: authFonts.regular, opacity: 0.92 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  footerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E05252' },
  footerTxt: { fontSize: 11, fontFamily: authFonts.semiBold },
});

// ─── Main shift card – inspired by reference image 2 ─────────────────────────
function ShiftCard({
  item,
  index,
  onPress,
  glass,
}: {
  item: Shift;
  index: number;
  onPress: (i: Shift) => void;
  glass: ReturnType<typeof getGlass>;
}) {
  const { colors, isDark } = useAppTheme();
  const anim  = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 300, delay: index * 40,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale }] }}>
      <Pressable
        onPressIn={() => Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 50, bounciness: 0 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 3 }).start()}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(item); }}
        style={[
          lc.card,
          {
            backgroundColor: glass.card,
            borderColor: glass.border,
            shadowColor: glass.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.07,
            shadowRadius: 10,
            elevation: 2,
          },
        ]}
      >
        {/* ── Top: employer logo + title + view arrow ── */}
        <View style={lc.topRow}>
          <EmployerLogoTile
            uri={item.employerLogoUrl}
            size={48}
            borderColor={glass.borderMuted}
            iconColor={colors.textSecondary}
            contentFit={item.employerLogoFit === 'cover' ? 'cover' : 'contain'}
            backgroundColor={isDark ? 'rgba(255,255,255,0.07)' : '#EBE8E3'}
          />

          <View style={lc.titleBlock}>
            <View style={lc.roleRow}>
              {item.urgent && <View style={lc.urgentDot} />}
              <Text style={[lc.roleText, { color: colors.text }]} numberOfLines={1}>{item.role}</Text>
            </View>
            <Text style={[lc.companyText, { color: colors.textSecondary }]} numberOfLines={1}>{item.company}</Text>
          </View>

          <View style={[lc.viewBtn, { backgroundColor: glass.iconBg, borderColor: glass.borderMuted }]}>
            <Ionicons name="arrow-forward" size={15} color={colors.textSecondary} />
          </View>
        </View>

        {/* ── Single meta line (replaces chip cluster + body copy in feed) ── */}
        <Text style={[lc.metaLine, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.area} · {item.durationLabel} · {item.category}
        </Text>

        {/* ── Footer: schedule | pay — full description in detail sheet ── */}
        <View style={[lc.footer, { borderTopColor: glass.borderMuted }]}>
          <Text style={[lc.footerDate, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.dateLabel}, {item.timeLabel}
            {item.distanceKm > 0 ? ` · ${formatDistanceKm(item.distanceKm)}` : ''}
          </Text>
          <Text style={[lc.footerPay, { color: colors.text }]}>₹{item.payPerHour}/hr</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const lc = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  titleBlock: { flex: 1, gap: 4, minWidth: 0 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E05252' },
  roleText: { fontSize: 16, fontFamily: authFonts.semiBold, flex: 1, letterSpacing: -0.2 },
  companyText: { fontSize: 13, fontFamily: authFonts.regular, opacity: 0.9 },
  viewBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  metaLine: {
    fontSize: 13,
    fontFamily: authFonts.regular,
    lineHeight: 18,
    letterSpacing: 0.15,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerDate: { fontSize: 12, fontFamily: authFonts.regular, flex: 1, lineHeight: 17 },
  footerPay: { fontSize: 16, fontFamily: authFonts.bold, flexShrink: 0 },
});

// ─── Job detail sheet – one surface, no nested cards; matches Explore safe-area header offset ───
const metricDs = StyleSheet.create({
  metricCell: { flex: 1, alignItems: 'center', gap: 5, minWidth: 0, paddingHorizontal: 2 },
  metricIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: { fontSize: 10, fontFamily: authFonts.regular, textAlign: 'center' },
  metricValue: { fontSize: 13, fontFamily: authFonts.semiBold, textAlign: 'center' },
});

function GlassHeaderBtn({
  onPress,
  isDark,
  children,
}: {
  onPress: () => void;
  isDark: boolean;
  children: ReactNode;
}) {
  const border = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)';
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [gh.btn, { opacity: pressed ? 0.88 : 1, borderColor: border }]}
    >
      <BlurView intensity={46} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={gh.center}>{children}</View>
    </Pressable>
  );
}

const gh = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});

function DetailMetric({
  icon,
  label,
  value,
  valueColor,
  labelColor,
  iconBg,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor: string;
  labelColor: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <View style={metricDs.metricCell}>
      <View style={[metricDs.metricIconRing, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={[metricDs.metricLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[metricDs.metricValue, { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function DetailSheet({
  item,
  visible,
  onClose,
  onApply,
  applying,
}: {
  item: Shift | null;
  visible: boolean;
  onClose: () => void;
  onApply: (shift: Shift) => void;
  applying: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const { coords: userCoords } = useWorkerLocation();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);
  const slideY = useRef(new Animated.Value(H)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) setMoreOpen(false);
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 3, speed: 14 }),
        Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: H, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!item) return null;

  const sheetTint = isDark ? 'rgba(18,18,20,0.92)' : 'rgba(252,252,254,0.94)';
  const htmlPad = 40;
  const iconBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const iconColor = colors.textSecondary;

  const locationLine =
    [item.area, item.city && item.city !== 'City' ? item.city : null].filter(Boolean).join(', ') || 'Location TBD';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[ds.backdrop, { opacity: bgOpacity }]} pointerEvents={visible ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[ds.sheet, { transform: [{ translateY: slideY }] }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <BlurView intensity={isDark ? 22 : 28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[ds.sheetTint, { backgroundColor: sheetTint }]} pointerEvents="none" />

        <View style={[ds.sheetInner, { paddingTop: insets.top + HEADER_TOP_OFFSET }]}>
          <View style={ds.detailHeader}>
            <GlassHeaderBtn onPress={onClose} isDark={isDark}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </GlassHeaderBtn>
            <Text style={[ds.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {item.role}
            </Text>
            <GlassHeaderBtn onPress={() => setMoreOpen(true)} isDark={isDark}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
            </GlassHeaderBtn>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[ds.detailScroll, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={ds.heroRow}>
              <EmployerLogoTile
                uri={item.employerLogoUrl}
                size={72}
                borderColor={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}
                iconColor={colors.textSecondary}
                contentFit={item.employerLogoFit === 'cover' ? 'cover' : 'contain'}
                backgroundColor={isDark ? '#1C1C1E' : '#FFFFFF'}
              />
              <View style={ds.heroText}>
                <Text style={[ds.cardCompany, { color: colors.text }]} numberOfLines={2}>
                  {item.company}
                </Text>
                <Text style={[ds.cardLocation, { color: colors.textSecondary }]} numberOfLines={2}>
                  {locationLine}
                </Text>
                <Text style={[ds.cardTagline, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.role} · {item.category}
                </Text>
                {item.urgent && (
                  <View style={ds.urgentRow}>
                    <View style={ds.urgentDot} />
                    <Text style={[ds.urgentTxt, { color: colors.textSecondary }]}>Urgent hiring</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[ds.metricsRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <DetailMetric
                icon="cash-outline"
                label="Pay rate"
                value={`₹${item.payPerHour}/hr`}
                valueColor={colors.accent}
                labelColor={colors.textSecondary}
                iconBg={iconBg}
                iconColor={iconColor}
              />
              <DetailMetric
                icon="time-outline"
                label="Duration"
                value={item.durationLabel}
                valueColor={colors.text}
                labelColor={colors.textSecondary}
                iconBg={iconBg}
                iconColor={iconColor}
              />
              <DetailMetric
                icon="people-outline"
                label="Spots"
                value={String(item.spots)}
                valueColor={colors.text}
                labelColor={colors.textSecondary}
                iconBg={iconBg}
                iconColor={iconColor}
              />
              <DetailMetric
                icon="navigate-outline"
                label="Distance"
                value={formatDistanceKm(item.distanceKm)}
                valueColor={colors.text}
                labelColor={colors.textSecondary}
                iconBg={iconBg}
                iconColor={iconColor}
              />
            </View>

            <Text style={[ds.sectionHead, { color: colors.text, marginTop: 26 }]}>Schedule & location</Text>
            <View style={ds.inlineRow}>
              <View style={ds.inlineIconCol}>
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={ds.inlineTextBlock}>
                <Text style={[ds.inlineTitle, { color: colors.text }]}>{item.dateLabel}</Text>
                <Text style={[ds.inlineSub, { color: colors.textSecondary }]}>{item.timeLabel}</Text>
              </View>
            </View>
            <View style={[ds.inlineRow, { marginTop: 12 }]}>
              <View style={ds.inlineIconCol}>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={ds.inlineTextBlock}>
                <Text style={[ds.inlineTitle, { color: colors.text }]} numberOfLines={3}>
                  {item.address || item.area || 'Address on request'}
                </Text>
                <Text style={[ds.inlineSub, { color: colors.textSecondary }]}>
                  {item.distanceKm > 0 ? `${formatDistanceKm(item.distanceKm)} away` : 'Nearby'}
                </Text>
              </View>
            </View>

            {item.locationLat != null &&
              item.locationLng != null &&
              Number.isFinite(item.locationLat) &&
              Number.isFinite(item.locationLng) && (
                <>
                  <Text style={[ds.sectionHead, { color: colors.text, marginTop: 22 }]}>Route</Text>
                  <View style={{ marginTop: 6 }}>
                    <ShiftRouteMap
                      jobLat={item.locationLat}
                      jobLng={item.locationLng}
                      jobLabel={item.company}
                      userLat={userCoords?.lat}
                      userLng={userCoords?.lng}
                      accentColor={colors.accent}
                      mutedColor={colors.textSecondary}
                      cardBg={isDark ? 'rgba(28,28,30,0.95)' : 'rgba(0,0,0,0.04)'}
                      borderColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
                      isDark={isDark}
                    />
                  </View>
                </>
              )}

            <Text style={[ds.sectionHead, { color: colors.text, marginTop: 26 }]}>About the role</Text>
            <ShiftDescriptionHtml
              html={item.description}
              textColor={colors.text}
              mutedColor={colors.textSecondary}
              horizontalPadding={htmlPad}
            />

            {item.requirements.length > 0 && (
              <>
                <Text style={[ds.sectionHead, { color: colors.text, marginTop: 26 }]}>Requirements</Text>
                {item.requirements.map((line, i) => (
                  <Text key={i} style={[ds.reqBullet, { color: colors.textSecondary }]}>
                    • {line}
                  </Text>
                ))}
              </>
            )}

            <Pressable
              onPress={() => {
                if (!item || applying || item.applied) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onApply(item);
              }}
              style={({ pressed }) => [
                ds.applyBtn,
                {
                  opacity: pressed || applying ? 0.87 : 1,
                  marginTop: 28,
                  backgroundColor: item.applied
                    ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')
                    : authColors.accent,
                },
              ]}
            >
              <Text
                style={[
                  ds.applyTxt,
                  item.applied && { color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)' },
                ]}
              >
                {item.applied ? 'Already Applied' : applying ? 'Applying…' : 'Apply for this shift'}
              </Text>
              {!item.applied && <Ionicons name="arrow-forward" size={16} color="#0D0D0D" />}
            </Pressable>
          </ScrollView>

          {moreOpen && (
            <>
              <Pressable style={[ds.moreOverlay, { zIndex: 100 }]} onPress={() => setMoreOpen(false)} />
              <View
                style={[
                  ds.moreMenu,
                  {
                    zIndex: 101,
                    top: 48,
                    right: 16,
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <BlurView intensity={48} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View style={ds.moreMenuInner}>
                  <Pressable
                    style={({ pressed }) => [ds.moreRow, { opacity: pressed ? 0.75 : 1 }]}
                    onPress={async () => {
                      setMoreOpen(false);
                      try {
                        await Share.share({
                          message: `${item.role}\n${item.company}\n${item.address || item.area || ''}`.trim(),
                          title: item.role,
                        });
                      } catch {
                        /* user dismissed */
                      }
                    }}
                  >
                    <Ionicons name="share-outline" size={18} color={colors.text} />
                    <Text style={[ds.moreRowTxt, { color: colors.text }]}>Share shift</Text>
                  </Pressable>
                  {item.locationLat != null &&
                    item.locationLng != null &&
                    Number.isFinite(item.locationLat) &&
                    Number.isFinite(item.locationLng) && (
                      <Pressable
                        style={({ pressed }) => [ds.moreRow, { opacity: pressed ? 0.75 : 1 }]}
                        onPress={() => {
                          setMoreOpen(false);
                          void openMapsDirections(
                            item.locationLat!,
                            item.locationLng!,
                            userCoords?.lat,
                            userCoords?.lng,
                          );
                        }}
                      >
                        <Ionicons name="navigate-outline" size={18} color={colors.text} />
                        <Text style={[ds.moreRowTxt, { color: colors.text }]}>Open directions</Text>
                      </Pressable>
                    )}
                  <Pressable
                    style={({ pressed }) => [ds.moreRow, { opacity: pressed ? 0.75 : 1 }]}
                    onPress={() => {
                      setMoreOpen(false);
                      Alert.alert(
                        'Report listing',
                        'Thanks for reporting. Our team will review this shift.',
                        [{ text: 'OK' }],
                      );
                    }}
                  >
                    <Ionicons name="flag-outline" size={18} color={colors.text} />
                    <Text style={[ds.moreRowTxt, { color: colors.text }]}>Report</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const ds = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  sheetTint: { ...StyleSheet.absoluteFillObject },
  sheetInner: { flex: 1 },

  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 44,
    marginBottom: 4,
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: authFonts.semiBold,
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },

  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  moreMenu: {
    position: 'absolute',
    width: 216,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  moreMenuInner: { paddingVertical: 6 },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  moreRowTxt: { fontSize: 15, fontFamily: authFonts.semiBold },

  detailScroll: { paddingHorizontal: 20, paddingTop: 4 },

  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 22 },
  heroText: { flex: 1, minWidth: 0, gap: 4 },

  cardCompany: { fontSize: 22, fontFamily: authFonts.bold, letterSpacing: -0.4, lineHeight: 28 },
  cardLocation: { fontSize: 14, fontFamily: authFonts.regular, lineHeight: 20 },
  cardTagline: { fontSize: 13, fontFamily: authFonts.regular, lineHeight: 19, marginTop: 2 },
  urgentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  urgentDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(128,128,128,0.6)' },
  urgentTxt: { fontSize: 12, fontFamily: authFonts.semiBold },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  sectionHead: { fontSize: 15, fontFamily: authFonts.semiBold, letterSpacing: -0.2, marginBottom: 10 },

  inlineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  inlineIconCol: { width: 24, alignItems: 'center', paddingTop: 2 },
  inlineTextBlock: { flex: 1, gap: 3, paddingLeft: 4 },
  inlineTitle: { fontSize: 15, fontFamily: authFonts.semiBold, lineHeight: 21 },
  inlineSub: { fontSize: 13, fontFamily: authFonts.regular, lineHeight: 19 },

  reqBullet: { fontSize: 14, fontFamily: authFonts.regular, lineHeight: 22, marginBottom: 6 },

  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: authColors.accent,
    paddingVertical: 15,
    borderRadius: 14,
  },
  applyTxt: { fontSize: 15, fontFamily: authFonts.bold, color: '#0D0D0D' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const glass = getGlass(isDark);
  const { token } = useAuth();
  const { coords, status: locStatus, isReady: locationReady, refresh: refreshLocation } = useWorkerLocation();
  const notification = useNotification();
  const { radius: paramRadius } = useLocalSearchParams<{ radius?: string }>();

  const [query,          setQuery]          = useState('');
  const [activeCat,      setActiveCat]      = useState('All');
  const [radius,         setRadius]         = useState(paramRadius ? Number(paramRadius) : 25);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [scopeAllLocations, setScopeAllLocations] = useState(false);
  const [detailItem,     setDetailItem]     = useState<Shift | null>(null);
  const [detailVisible,  setDetailVisible]  = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchExpandAnim = useRef(new Animated.Value(0)).current;

  const shiftsQuery = useShiftsQuery({
    radiusKm: radius,
    category: activeCat as any,
    q: query,
    lat: coords?.lat,
    lng: coords?.lng,
    locationReady,
    allLocations: scopeAllLocations,
  });

  const waitingForLocation = !scopeAllLocations && !locationReady;
  const applyMutation = useApplyToShiftMutation();

  useEffect(() => {
    if (scopeAllLocations || !coords || !token || locStatus !== 'ready') return;
    const id = setTimeout(() => {
      updateWorkerLocation({ lat: coords.lat, lng: coords.lng, radiusKm: radius }).catch(() => {});
    }, 650);
    return () => clearTimeout(id);
  }, [coords, radius, token, locStatus, scopeAllLocations]);

  useEffect(() => {
    Animated.timing(searchExpandAnim, {
      toValue: searchExpanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    let t: ReturnType<typeof setTimeout> | undefined;
    if (searchExpanded) {
      t = setTimeout(() => searchInputRef.current?.focus(), 240);
    } else {
      Keyboard.dismiss();
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [searchExpanded, searchExpandAnim]);

  const headerAnim     = useRef(new Animated.Value(0)).current;
  const headerY        = useRef(new Animated.Value(-6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(headerY,    { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const searchBarHeight = searchExpandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 48] });
  const searchBarOpacity = searchExpandAnim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] });

  const openDetail = (item: Shift) => { setDetailItem(item); setDetailVisible(true); };
  const closeDetail = () => {
    setDetailVisible(false);
    setTimeout(() => setDetailItem(null), 300);
  };

  const filtered: Shift[] = (shiftsQuery.data ?? []).map((s) => ({
    ...s,
    dateLabel: formatDateLabel(s.startAt),
    timeLabel: formatTimeLabel(s.startAt),
    durationLabel: `${s.durationHours} hrs`,
  }));

  const urgentShifts = filtered.filter(s => s.urgent);

  return (
    <View style={[ex.screen, { backgroundColor: isDark ? colors.background : '#ECEFF4' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={ex.safe} edges={['top', 'left', 'right']}>

        <Animated.View style={[ex.header, { paddingTop: 2, opacity: headerAnim, transform: [{ translateY: headerY }] }]}>

          {/* Title row — minimal actions: search + filters */}
          <View style={ex.titleRow}>
            <View style={ex.titleBlock}>
              <Text style={[ex.title, { color: colors.text }]}>Find Shifts</Text>
              <Text style={[ex.subtitle, { color: colors.textSecondary }]}>
                {filtered.length} available
                {scopeAllLocations
                  ? ' · All locations'
                  : ` · ${radius} km${coords ? ' · near you' : locationReady ? ' · all areas' : ''}`}
              </Text>
            </View>
            <View style={ex.headerActions}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchExpanded((v) => !v);
                }}
                style={({ pressed }) => [
                  ex.headerIconBtn,
                  {
                    borderColor: searchExpanded ? colors.border : glass.borderMuted,
                    backgroundColor: searchExpanded ? glass.iconBg : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Ionicons name="search-outline" size={19} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowFilterModal(true);
                }}
                style={({ pressed }) => [
                  ex.headerIconBtn,
                  { borderColor: glass.borderMuted, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Ionicons name="options-outline" size={19} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Expandable search — opens from icon */}
          <Animated.View
            pointerEvents={searchExpanded ? 'auto' : 'none'}
            style={[
              ex.searchExpandShell,
              {
                height: searchBarHeight,
                opacity: searchBarOpacity,
                borderColor: glass.borderMuted,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
              },
            ]}
          >
            <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
            <TextInput
              ref={searchInputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Role, company, area…"
              placeholderTextColor={colors.textSecondary}
              style={[ex.searchExpandInput, { color: colors.text }]}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setSearchExpanded(false);
                  Keyboard.dismiss();
                }}
                hitSlop={10}
              >
                <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </Animated.View>

          {/* Near me vs everywhere — neutral selection */}
          <View style={ex.scopeRow}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setScopeAllLocations(false);
              }}
              style={({ pressed }) => [
                ex.scopeChip,
                {
                  backgroundColor: !scopeAllLocations ? glass.iconBg : 'transparent',
                  borderColor: !scopeAllLocations ? colors.text : glass.borderMuted,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name="navigate-outline"
                size={14}
                color={!scopeAllLocations ? colors.text : colors.textSecondary}
              />
              <Text
                style={[
                  ex.scopeChipTxt,
                  { color: !scopeAllLocations ? colors.text : colors.textSecondary },
                  !scopeAllLocations && { fontFamily: authFonts.semiBold },
                ]}
              >
                Near me
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setScopeAllLocations(true);
              }}
              style={({ pressed }) => [
                ex.scopeChip,
                {
                  backgroundColor: scopeAllLocations ? glass.iconBg : 'transparent',
                  borderColor: scopeAllLocations ? colors.text : glass.borderMuted,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name="earth-outline"
                size={14}
                color={scopeAllLocations ? colors.text : colors.textSecondary}
              />
              <Text
                style={[
                  ex.scopeChipTxt,
                  { color: scopeAllLocations ? colors.text : colors.textSecondary },
                  scopeAllLocations && { fontFamily: authFonts.semiBold },
                ]}
              >
                All locations
              </Text>
            </Pressable>
          </View>

          {locationReady && (locStatus === 'denied' || locStatus === 'unavailable') && (
            <View
              style={[
                ex.locationBanner,
                { backgroundColor: glass.card, borderColor: glass.border },
              ]}
            >
              <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
              <Text style={[ex.locationBannerTxt, { color: colors.textSecondary }]}>
                Location is off — use Retry or Settings to enable nearby shifts. Until then, all open shifts are shown.
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void refreshLocation();
                }}
                hitSlop={8}
              >
                <Text style={[ex.locationBannerAction, { color: colors.text }]}>Retry</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  openLocationSettings();
                }}
                hitSlop={8}
              >
                <Text style={[ex.locationBannerAction, { color: colors.text }]}>Settings</Text>
              </Pressable>
            </View>
          )}

          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ex.chips}>
            {CATS.map(cat => {
              const active = activeCat === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveCat(cat); }}
                  style={({ pressed }) => [
                    ex.chip,
                    {
                      backgroundColor: active ? glass.iconBg : 'transparent',
                      borderColor: active ? colors.text : glass.borderMuted,
                      borderWidth: 1,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      ex.chipTxt,
                      {
                        color: active ? colors.text : colors.textSecondary,
                        fontFamily: active ? authFonts.semiBold : authFonts.regular,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ── List ── */}
        {waitingForLocation || shiftsQuery.isLoading ? (
          <View style={ex.loadingWrap}>
            <ActivityIndicator size="large" color={colors.textSecondary} />
            <Text style={[ex.loadingText, { color: colors.textSecondary }]}>
              {waitingForLocation ? 'Checking location…' : 'Loading shifts…'}
            </Text>
          </View>
        ) : shiftsQuery.isError ? (
          <View style={ex.loadingWrap}>
            <Text style={[ex.loadingTitle, { color: colors.text }]}>Couldn't load shifts</Text>
            <Text style={[ex.loadingText, { color: colors.textSecondary }]}>
              {String((shiftsQuery.error as any)?.message ?? 'Please try again')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[ex.listContent, { paddingBottom: insets.bottom + 120 }]}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            ListHeaderComponent={
              urgentShifts.length > 0 ? (
                <View style={ex.featuredBlock}>
                  <View style={ex.sectionHead}>
                    <View style={ex.urgentIndicator} />
                    <Text style={[ex.sectionHeadTxt, { color: colors.text }]}>Urgent openings</Text>
                    <Text style={[ex.sectionCount, { color: colors.textSecondary }]}>
                      {urgentShifts.length} shifts
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ex.urgentRow}>
                    {urgentShifts.map((s) => (
                      <UrgentCard key={s.id} item={s} onPress={openDetail} glass={glass} />
                    ))}
                  </ScrollView>
                  <View style={ex.allDivider}>
                    <Text style={[ex.allDividerTxt, { color: colors.textSecondary }]}>All shifts</Text>
                    <View style={[ex.allDividerLine, { backgroundColor: colors.border }]} />
                  </View>
                </View>
              ) : (
                <View style={ex.allShiftsOnlyHead}>
                  <Text style={[ex.allDividerTxt, { color: colors.textSecondary }]}>All shifts</Text>
                  <View style={[ex.allDividerLine, { backgroundColor: colors.border }]} />
                </View>
              )
            }
            renderItem={({ item, index }) => (
              <ShiftCard item={item} index={index} onPress={openDetail} glass={glass} />
            )}
            ListEmptyComponent={
              <View style={ex.empty}>
                <View style={[ex.emptyIcon, { backgroundColor: glass.card, borderColor: glass.border }]}>
                  <FontAwesome5 name="briefcase" size={26} color={colors.textSecondary} />
                </View>
                <Text style={[ex.emptyTitle, { color: colors.text }]}>No shifts found</Text>
                <Text style={[ex.emptySub, { color: colors.textSecondary }]}>
                  Try All locations, a wider radius, or another category
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={ex.filterModalRoot}>
          <Pressable style={ex.filterBackdrop} onPress={() => setShowFilterModal(false)} />
          <View style={[ex.filterSheetOuter, { paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }]}>
            <View
              style={[
                ex.filterSheet,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FAFAFA',
                  borderColor: glass.borderMuted,
                },
              ]}
            >
              <View style={ex.filterSheetInner}>
                <Text style={[ex.filterTitle, { color: colors.text }]}>Filters</Text>
                <Text style={[ex.filterLabel, { color: colors.textSecondary }]}>Search radius (Near me)</Text>
                <View style={ex.filterRadiusRow}>
                  {RADII.map((r) => {
                    const on = radius === r;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => {
                          if (scopeAllLocations) {
                            Alert.alert('Near me', 'Choose «Near me» above to filter by distance.');
                            return;
                          }
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setRadius(r);
                        }}
                        style={[
                          ex.filterRadiusChip,
                          {
                            borderColor: on ? colors.text : glass.borderMuted,
                            backgroundColor: on ? glass.iconBg : 'transparent',
                            opacity: scopeAllLocations ? 0.45 : 1,
                          },
                        ]}
                      >
                        <Text style={[ex.filterRadiusTxt, { color: on ? colors.text : colors.textSecondary }]}>{r} km</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={() => {
                    setShowFilterModal(false);
                    router.push({ pathname: '/set-location', params: { returnToExplore: '1' } });
                  }}
                  style={({ pressed }) => [ex.filterLinkRow, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                  <Text style={[ex.filterLinkTxt, { color: colors.text }]}>Saved location</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => setShowFilterModal(false)}
                  style={({ pressed }) => [ex.filterDone, { backgroundColor: glass.iconBg, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={[ex.filterDoneTxt, { color: colors.text }]}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <DetailSheet
        item={detailItem}
        visible={detailVisible}
        onClose={closeDetail}
        applying={applyMutation.isPending}
        onApply={async (shift) => {
          if (!token) {
            notification.showError('Please sign in to apply.');
            router.push('/(auth)/login');
            return;
          }
          if (shift.applied) {
            notification.showError('Already applied for this shift.');
            return;
          }
          try {
            await applyMutation.mutateAsync({ shiftId: shift.id });
            notification.showSuccess('Applied successfully');
            closeDetail();
          } catch (e: unknown) {
            const msg =
              e && typeof e === 'object' && 'message' in e
                ? String((e as { message: string }).message)
                : 'Failed to apply';
            notification.showError(msg);
          }
        }}
      />
    </View>
  );
}

const ex = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },

  header: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titleBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 24, fontFamily: authFonts.bold, letterSpacing: -0.45, lineHeight: 30 },
  subtitle: { fontSize: 12, fontFamily: authFonts.regular, marginTop: 4, opacity: 0.82 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchExpandShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  searchExpandInput: { flex: 1, fontSize: 15, fontFamily: authFonts.regular, paddingVertical: 11, paddingHorizontal: 0 },

  scopeRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  scopeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  scopeChipTxt: { fontSize: 13, fontFamily: authFonts.regular },

  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  locationBannerTxt: { flex: 1, fontSize: 13, fontFamily: authFonts.regular, lineHeight: 18 },
  locationBannerAction: { fontSize: 13, fontFamily: authFonts.semiBold },

  filterModalRoot: { flex: 1 },
  filterBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  filterSheetOuter: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  filterSheet: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  filterSheetInner: { padding: 18, gap: 12, zIndex: 1 },
  filterTitle: { fontSize: 18, fontFamily: authFonts.bold, letterSpacing: -0.35 },
  filterLabel: { fontSize: 12, fontFamily: authFonts.regular, marginTop: 2 },
  filterRadiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterRadiusChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 72,
    alignItems: 'center',
  },
  filterRadiusTxt: { fontSize: 13, fontFamily: authFonts.semiBold },
  filterLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, marginTop: 4 },
  filterLinkTxt: { flex: 1, fontSize: 15, fontFamily: authFonts.semiBold },
  filterDone: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  filterDoneTxt: { fontSize: 15, fontFamily: authFonts.semiBold },

  chips: { gap: 8, paddingRight: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  chipTxt: { fontSize: 13 },

  listContent: { paddingHorizontal: 20, paddingTop: 12 },

  featuredBlock: { marginBottom: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  urgentIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E05252' },
  sectionHeadTxt: { fontSize: 15, fontFamily: authFonts.semiBold, letterSpacing: -0.2 },
  sectionCount: { fontSize: 13, fontFamily: authFonts.regular, marginLeft: 'auto', opacity: 0.85 },
  urgentRow: { gap: 12, paddingRight: 8, paddingBottom: 4 },

  allDivider: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 22, marginBottom: 14 },
  allShiftsOnlyHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  allDividerTxt: { fontSize: 10, fontFamily: authFonts.semiBold, letterSpacing: 0.9, opacity: 0.45 },
  allDividerLine: { flex: 1, height: StyleSheet.hairlineWidth },

  empty: { alignItems: 'center', paddingTop: 56, gap: 12, paddingHorizontal: 20 },
  emptyIcon: { width: 60, height: 60, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: authFonts.bold },
  emptySub: { fontSize: 13, fontFamily: authFonts.regular, textAlign: 'center', lineHeight: 20 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  loadingTitle: { fontSize: 16, fontFamily: authFonts.semiBold },
  loadingText: { fontSize: 13, fontFamily: authFonts.regular, textAlign: 'center', lineHeight: 20 },
});
