/**
 * Referrals screen
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const [referrals] = useState([
    { id: '1', name: 'Jane Smith', status: 'Active', joined: '2 weeks ago' },
    { id: '2', name: 'Mike Johnson', status: 'Pending', joined: '1 week ago' },
  ]);
  const referralCode = 'REF2024XYZ';

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
          <Text style={s.headerTitle}>Referrals</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          >
            <View style={[s.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.codeLabel, { color: colors.textSecondary }]}>Your Referral Code</Text>
              <Text style={[s.codeValue, { color: colors.accent }]}>{referralCode}</Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Copy to clipboard
                }}
                style={({ pressed }) => [s.copyBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="copy-outline" size={16} color="#0D0D0D" />
                <Text style={s.copyBtnText}>Copy Code</Text>
              </Pressable>
            </View>

            <Text style={[s.sectionTitle, { color: colors.text }]}>Your Referrals</Text>

            {referrals.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="gift-outline" size={48} color={colors.placeholder} />
                <Text style={[s.emptyText, { color: colors.text }]}>No referrals yet</Text>
                <Text style={[s.emptySubtext, { color: colors.placeholder }]}>Share your code to earn rewards</Text>
              </View>
            ) : (
              referrals.map((ref) => (
                <View key={ref.id} style={[s.referralCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[s.referralIcon, { backgroundColor: colors.surfaceElevated }]}>
                    <Ionicons name="person" size={20} color={colors.accent} />
                  </View>
                  <View style={s.referralInfo}>
                    <Text style={[s.referralName, { color: colors.text }]}>{ref.name}</Text>
                    <Text style={[s.referralJoined, { color: colors.placeholder }]}>{ref.joined}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: ref.status === 'Active' ? colors.accent + '22' : colors.border + '44' }]}>
                    <Text style={[s.statusText, { color: ref.status === 'Active' ? colors.accent : colors.placeholder }]}>
                      {ref.status}
                    </Text>
                  </View>
                </View>
              ))
            )}
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
  codeCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  codeLabel: { fontSize: 12, fontFamily: authFonts.semiBold, letterSpacing: 0.8, textTransform: 'uppercase' },
  codeValue: { fontSize: 24, fontFamily: authFonts.bold, letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  copyBtnText: { fontSize: 14, fontFamily: authFonts.bold, color: '#0D0D0D' },
  sectionTitle: { fontSize: 15, fontFamily: authFonts.bold, marginTop: 8 },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  referralIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  referralInfo: { flex: 1, gap: 2 },
  referralName: { fontSize: 15, fontFamily: authFonts.bold },
  referralJoined: { fontSize: 13, fontFamily: authFonts.regular },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontFamily: authFonts.semiBold },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 18, fontFamily: authFonts.bold },
  emptySubtext: { fontSize: 14, fontFamily: authFonts.regular },
});

