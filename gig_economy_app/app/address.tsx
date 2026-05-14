/**
 * Address screen – View and manage address
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useAppTheme } from '@/contexts/AppThemeContext';
import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';
import type { SavedAddress } from '@/lib/account-details-storage';
import { getSavedAddress } from '@/lib/account-details-storage';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;

function Background({ colors }: { colors: ReturnType<typeof useAppTheme>['colors'] }) {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= W; x += GRID_STEP)
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke={colors.accent + '08'} strokeWidth={1} />);
  for (let y = 0; y <= H; y += GRID_STEP)
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke={colors.accent + '08'} strokeWidth={1} />);
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.background} stopOpacity="0" />
          <Stop offset="40%" stopColor={colors.background} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={colors.background} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="glowL" cx="0%" cy="0%" rx="90%" ry="55%">
          <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.08" />
          <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lines}
      <Rect width={W} height={H} fill="url(#bg)" />
      <Rect width={W} height={H} fill="url(#glowL)" />
    </Svg>
  );
}

// ─── Address row: label + value ───────────────────────────────────────────────
function AddressRow({
  label,
  value,
  colors,
  last,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useAppTheme>['colors'];
  last?: boolean;
}) {
  if (!value?.trim()) return null;
  return (
    <View style={[s.row, !last && s.rowBorder, { borderBottomColor: colors.border }]}>
      <View style={s.rowContent}>
        <Text style={[s.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[s.rowValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function AddressScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const [address, setAddress] = useState<SavedAddress>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pinCode: '',
    country: '',
  });

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const loadAddress = async () => {
        const saved = await getSavedAddress();
        if (mounted) setAddress(saved);
      };
      void loadAddress();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const hasStreet = address.line1 || address.line2;
  const hasRegion = address.city || address.state || address.pinCode || address.country;

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>

        <Animated.View
          style={[
            s.header,
            {
              paddingTop: insets.top,
              backgroundColor: colors.accent,
              opacity: headerOpacity,
              transform: [{ translateY: headerY }],
            },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={14}
            style={({ pressed }) => [s.headerBtn, pressed && s.headerBtnPressed]}
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
          <Text style={s.headerTitle}>Address</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/edit-address');
            }}
            hitSlop={14}
            style={({ pressed }) => [s.headerBtn, pressed && s.headerBtnPressed]}
          >
            <Ionicons name="create-outline" size={22} color="#FFF" />
          </Pressable>
        </Animated.View>

        <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          >
            {/* Street address section */}
            {hasStreet && (
              <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[s.sectionHeader, { borderBottomColor: colors.border }]}>
                  <Ionicons name="home-outline" size={18} color={colors.accent} />
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Street address</Text>
                </View>
                <AddressRow label="Address line 1" value={address.line1} colors={colors} last={!address.line2} />
                <AddressRow label="Address line 2" value={address.line2} colors={colors} last />
              </View>
            )}

            {/* City & region section */}
            {hasRegion && (
              <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[s.sectionHeader, { borderBottomColor: colors.border }]}>
                  <Ionicons name="business-outline" size={18} color={colors.accent} />
                  <Text style={[s.sectionTitle, { color: colors.text }]}>City & region</Text>
                </View>
                <AddressRow label="City" value={address.city} colors={colors} last={!address.state && !address.pinCode && !address.country} />
                <AddressRow label="State" value={address.state} colors={colors} last={!address.pinCode && !address.country} />
                <AddressRow label="PIN Code" value={address.pinCode} colors={colors} last={!address.country} />
                <AddressRow label="Country" value={address.country} colors={colors} last />
              </View>
            )}

            {!hasStreet && !hasRegion && (
              <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={s.emptyState}>
                  <Ionicons name="home-outline" size={24} color={colors.placeholder} />
                  <Text style={[s.emptyStateText, { color: colors.textSecondary }]}>No address saved yet.</Text>
                  <Text style={[s.emptyStateSubText, { color: colors.placeholder }]}>Tap Edit Address to add your details.</Text>
                </View>
              </View>
            )}

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/edit-address');
              }}
              style={({ pressed }) => [s.editBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="create-outline" size={18} color="#0D0D0D" />
              <Text style={s.editBtnText}>Edit Address</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.lg,
    paddingBottom: 14,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerBtnPressed: { opacity: 0.6 },
  headerTitle: { fontSize: 17, fontFamily: authFonts.semiBold, color: '#FFF', letterSpacing: 0.2 },
  scrollContent: { paddingHorizontal: authSpacing.lg, paddingTop: 20, gap: 16 },
  section: {
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 14, fontFamily: authFonts.semiBold, letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 11, fontFamily: authFonts.semiBold, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2 },
  rowValue: { fontSize: 15, fontFamily: authFonts.regular, lineHeight: 22 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 30,
    paddingVertical: 17,
  },
  editBtnText: { fontSize: 16, fontFamily: authFonts.bold, color: '#0D0D0D', letterSpacing: 0.3 },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
  },
  emptyStateSubText: {
    fontSize: 13,
    fontFamily: authFonts.regular,
    textAlign: 'center',
  },
});
