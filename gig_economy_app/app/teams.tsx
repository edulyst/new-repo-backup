/**
 * Teams screen
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

export default function TeamsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const [teams] = useState([
    { id: '1', name: 'Warehouse Team A', members: 12, active: true },
    { id: '2', name: 'Delivery Team B', members: 8, active: true },
  ]);

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
          <Text style={s.headerTitle}>Teams</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          >
            {teams.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="people-outline" size={48} color={colors.placeholder} />
                <Text style={[s.emptyText, { color: colors.text }]}>No teams yet</Text>
                <Text style={[s.emptySubtext, { color: colors.placeholder }]}>You'll see your teams here</Text>
              </View>
            ) : (
              teams.map((team) => (
                <Pressable
                  key={team.id}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  style={({ pressed }) => [
                    s.teamCard,
                    { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[s.teamIcon, { backgroundColor: colors.surfaceElevated }]}>
                    <Ionicons name="people" size={20} color={colors.accent} />
                  </View>
                  <View style={s.teamInfo}>
                    <Text style={[s.teamName, { color: colors.text }]}>{team.name}</Text>
                    <Text style={[s.teamMembers, { color: colors.placeholder }]}>{team.members} members</Text>
                  </View>
                  {team.active && (
                    <View style={[s.activeBadge, { backgroundColor: colors.accent + '22' }]}>
                      <Text style={[s.activeBadgeText, { color: colors.accent }]}>Active</Text>
                    </View>
                  )}
                </Pressable>
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
  scrollContent: { paddingHorizontal: authSpacing.lg, paddingTop: 20, gap: 12 },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  teamIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  teamInfo: { flex: 1, gap: 2 },
  teamName: { fontSize: 15, fontFamily: authFonts.bold },
  teamMembers: { fontSize: 13, fontFamily: authFonts.regular },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { fontSize: 11, fontFamily: authFonts.semiBold },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 18, fontFamily: authFonts.bold },
  emptySubtext: { fontSize: 14, fontFamily: authFonts.regular },
});

