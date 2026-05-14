import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { TabBackground } from '@/components/tab-background';
import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';
import { useAuth } from '@/contexts/AuthContext';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;

const OPTIONS = [
  {
    id: 'verify',
    icon: 'shield-checkmark' as const,
    title: 'Verify my profile',
    description:
      "Before you can be hired onto a shift, we need to take some bank details and then check you're allowed to work. It should only take 5 mins.",
    badge: 'Recommended',
  },
  {
    id: 'browse',
    icon: 'compass' as const,
    title: 'Show me some shifts',
    description:
      "If you're not ready for any admin, you can still browse around. But you will need to verify your profile before you can work.",
    badge: null,
  },
];

function Background() {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= W; x += GRID_STEP)
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(212,168,75,0.028)" strokeWidth={1} />);
  for (let y = 0; y <= H; y += GRID_STEP)
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(212,168,75,0.028)" strokeWidth={1} />);
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={authColors.background} stopOpacity="0" />
          <Stop offset="40%" stopColor={authColors.background} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="glowL" cx="0%" cy="0%" rx="90%" ry="55%">
          <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.1" />
          <Stop offset="60%" stopColor={authColors.accent} stopOpacity="0.03" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="glowR" cx="100%" cy="0%" rx="90%" ry="55%">
          <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.1" />
          <Stop offset="60%" stopColor={authColors.accent} stopOpacity="0.03" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lines}
      <Rect width={W} height={H} fill="url(#bg)" />
      <Rect width={W} height={H} fill="url(#glowL)" />
      <Rect width={W} height={H} fill="url(#glowR)" />
    </Svg>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState('verify');
  const { user } = useAuth();

  const headingOpacity = useRef(new Animated.Value(0)).current;
  const headingY = useRef(new Animated.Value(28)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card1Y = useRef(new Animated.Value(24)).current;
  const card1Scale = useRef(new Animated.Value(0.96)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card2Y = useRef(new Animated.Value(24)).current;
  const card2Scale = useRef(new Animated.Value(0.96)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(headingOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(headingY, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(card1Opacity, { toValue: 1, duration: 440, useNativeDriver: true }),
        Animated.timing(card1Y, { toValue: 0, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(card1Scale, { toValue: 1, useNativeDriver: true, bounciness: 6, speed: 12 }),
      ]),
      Animated.parallel([
        Animated.timing(card2Opacity, { toValue: 1, duration: 440, useNativeDriver: true }),
        Animated.timing(card2Y, { toValue: 0, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(card2Scale, { toValue: 1, useNativeDriver: true, bounciness: 6, speed: 12 }),
      ]),
      Animated.parallel([
        Animated.timing(footerOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(footerY, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    const next = user?.goal === 'browse' ? 'browse' : 'verify';
    setSelected(next);
  }, [user?.goal]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selected === 'verify') {
      router.push('/(tabs)/profile');
    } else {
      router.push({ pathname: '/set-location', params: { returnToExplore: '1' } });
    }
  };

  const anims = [
    { opacity: card1Opacity, translateY: card1Y, scale: card1Scale },
    { opacity: card2Opacity, translateY: card2Y, scale: card2Scale },
  ];

  return (
    <View style={styles.screen}>
      <TabBackground />
      <StatusBar style="light" />
      {/* Header bar with theme color (includes top safe area) */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <Pressable
          hitSlop={12}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/settings');
          }}
          style={({ pressed }) => [styles.headerIcon, pressed && styles.headerIconPressed]}
        >
          <Ionicons name="settings-outline" size={22} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Verification</Text>
        <Pressable
          hitSlop={12}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/notifications');
          }}
          style={({ pressed }) => [styles.headerIcon, pressed && styles.headerIconPressed]}
        >
          <Ionicons name="notifications-outline" size={22} color="#FFF" />
        </Pressable>
      </View>
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.inner,
            { paddingBottom: insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Heading ── */}
          <Animated.View
            style={[styles.headingBlock, { opacity: headingOpacity, transform: [{ translateY: headingY }] }]}
          >
            <Text style={styles.heading}>Great, that's done.{'\n'}What next?</Text>
            <Text style={styles.subtitle}>Choose how you'd like to proceed.</Text>
          </Animated.View>

          {/* ── Options ── */}
          <View style={styles.optionsBlock}>
            {OPTIONS.map((opt, i) => {
              const isSelected = selected === opt.id;
              return (
                <Animated.View
                  key={opt.id}
                  style={{
                    opacity: anims[i].opacity,
                    transform: [{ translateY: anims[i].translateY }, { scale: anims[i].scale }],
                  }}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelected(opt.id);
                    }}
                    style={({ pressed }) => [
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                      pressed && styles.optionCardPressed,
                    ]}
                  >
                    {/* Text block fills the row */}
                    <View style={styles.optionText}>
                      <View style={styles.optionTitleRow}>
                        <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                          {opt.title}
                        </Text>
                        {opt.badge && (
                          <View style={[styles.optionBadge, isSelected && styles.optionBadgeSelected]}>
                            <Text style={[styles.optionBadgeText, isSelected && styles.optionBadgeTextSelected]}>
                              {opt.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>
                        {opt.description}
                      </Text>
                    </View>

                    {/* Checkmark on the right */}
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleFilled]}>
                      {isSelected && <Ionicons name="checkmark" size={15} color={authColors.background} />}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* ── Footer ── */}
          <Animated.View style={[styles.footerRow, { opacity: footerOpacity, transform: [{ translateY: footerY }] }]}>
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
            >
              <Text style={styles.nextLabel}>Next</Text>
            </Pressable>
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [styles.arrowBtn, pressed && styles.arrowBtnPressed]}
            >
              <Ionicons name="arrow-forward" size={22} color={authColors.background} />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.lg,
    paddingBottom: 12,
    backgroundColor: authColors.accent,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerIconPressed: { opacity: 0.7 },
  headerTitle: {
    fontSize: 17,
    fontFamily: authFonts.semiBold,
    color: '#FFF',
    letterSpacing: 0.2,
  },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  inner: {
    flexGrow: 1,
    paddingHorizontal: authSpacing.lg,
    justifyContent: 'center',
    gap: 28,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
  },

  headingBlock: { gap: 8 },
  heading: {
    fontSize: 34, fontFamily: authFonts.titleBold,
    color: authColors.text, lineHeight: 42, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15, fontFamily: authFonts.regular,
    color: authColors.textSecondary, lineHeight: 22,
  },

  optionsBlock: { gap: 14 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: authColors.surface,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(92,82,72,0.35)',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  optionCardSelected: {
    backgroundColor: authColors.accent,
    borderColor: authColors.accent,
  },
  optionCardPressed: { opacity: 0.88 },

  optionText: { flex: 1, gap: 6 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  optionTitle: {
    fontSize: 16, fontFamily: authFonts.bold,
    color: authColors.text,
  },
  optionTitleSelected: { color: authColors.background },
  optionDesc: {
    fontSize: 13, fontFamily: authFonts.regular,
    color: authColors.textSecondary, lineHeight: 20,
  },
  optionDescSelected: { color: 'rgba(13,13,13,0.72)' },

  optionBadge: {
    backgroundColor: 'rgba(212,168,75,0.18)',
    borderWidth: 1, borderColor: 'rgba(212,168,75,0.35)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  optionBadgeSelected: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  optionBadgeText: { fontSize: 10, fontFamily: authFonts.semiBold, color: authColors.accent, letterSpacing: 0.3 },
  optionBadgeTextSelected: { color: authColors.background },

  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(92,82,72,0.45)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  checkCircleFilled: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: 'transparent',
  },

  footerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  nextBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: authColors.accent,
    borderRadius: 30, paddingVertical: 17,
  },
  nextBtnPressed: { opacity: 0.88 },
  arrowBtn: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: authColors.accent,
  },
  arrowBtnPressed: { opacity: 0.88 },
  nextLabel: {
    fontSize: 17, fontFamily: authFonts.bold,
    color: authColors.background, letterSpacing: 0.4,
  },
});
