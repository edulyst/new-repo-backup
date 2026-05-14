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
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;

const OPTIONS = [
  {
    id: 'verify',
    icon: 'shield-checkmark' as const,
    title: 'Verify my profile',
    description:
      'Before you can be hired onto a shift, we need to take some bank details and then check you\'re allowed to work. It should only take 5 mins.',
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
          <Stop offset="35%" stopColor={authColors.background} stopOpacity="0.55" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="glow" cx="50%" cy="0%" rx="70%" ry="50%">
          <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.08" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lines}
      <Rect width={W} height={H} fill="url(#bg)" />
      <Rect width={W} height={H} fill="url(#glow)" />
    </Svg>
  );
}

export default function WhatNextScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState('verify');

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(24)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card1Y = useRef(new Animated.Value(20)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card2Y = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(90, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(card1Opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(card1Y, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(card2Opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(card2Y, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(footerOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selected === 'verify') {
      router.push('/(tabs)/profile');
    } else {
      router.push({ pathname: '/set-location', params: { returnToExplore: '1' } });
    }
  };

  const anims = [
    { opacity: card1Opacity, translateY: card1Y },
    { opacity: card2Opacity, translateY: card2Y },
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { height: insets.top }]} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>

        <View style={[styles.inner, { paddingBottom: insets.bottom + 16 }]}>
          {/* ── Confetti / completion badge ── */}
          <Animated.View style={[styles.badgeRow, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}>
            <View style={styles.completeBadge}>
              <Ionicons name="checkmark-circle" size={20} color={authColors.accent} />
              <Text style={styles.completeBadgeText}>Profile complete</Text>
            </View>
          </Animated.View>

          {/* ── Heading ── */}
          <Animated.View
            style={[styles.headingBlock, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
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
                  style={{ opacity: anims[i].opacity, transform: [{ translateY: anims[i].translateY }] }}
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
                    {/* Left icon */}
                    <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                      <Ionicons
                        name={opt.icon}
                        size={22}
                        color={isSelected ? authColors.background : authColors.accent}
                      />
                    </View>

                    {/* Text */}
                    <View style={styles.optionText}>
                      <View style={styles.optionTitleRow}>
                        <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                          {opt.title}
                        </Text>
                        {opt.badge && (
                          <View style={styles.optionBadge}>
                            <Text style={styles.optionBadgeText}>{opt.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>
                        {opt.description}
                      </Text>
                    </View>

                    {/* Check */}
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleFilled]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color={authColors.background} />}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* ── Footer ── */}
          <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
            >
              <Text style={styles.nextLabel}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color={authColors.background} />
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  topBar: { backgroundColor: authColors.accent },
  safe: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: authSpacing.lg,
    justifyContent: 'center',
    gap: 28,
  },

  badgeRow: { alignItems: 'flex-start' },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212,168,75,0.12)',
    borderWidth: 1, borderColor: 'rgba(212,168,75,0.3)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 30,
  },
  completeBadgeText: {
    fontSize: 13, fontFamily: authFonts.semiBold,
    color: authColors.accent, letterSpacing: 0.3,
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
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: authColors.surface,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(92,82,72,0.35)',
    padding: 18,
  },
  optionCardSelected: {
    backgroundColor: authColors.accent,
    borderColor: authColors.accent,
  },
  optionCardPressed: { opacity: 0.88 },

  optionIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(212,168,75,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(212,168,75,0.22)',
  },
  optionIconSelected: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderColor: 'rgba(0,0,0,0.12)',
  },

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
  optionBadgeText: { fontSize: 10, fontFamily: authFonts.semiBold, color: authColors.accent, letterSpacing: 0.3 },

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

  footer: {},
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: authColors.accent,
    borderRadius: 30, paddingVertical: 17,
  },
  nextBtnPressed: { opacity: 0.88 },
  nextLabel: {
    fontSize: 17, fontFamily: authFonts.bold,
    color: authColors.background, letterSpacing: 0.4,
  },
});
