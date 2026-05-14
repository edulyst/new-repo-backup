import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';
import { useNotification } from '@/lib/notification-service';
import { updateMe } from '@/lib/users-api';

const GRID_STEP = 36;
const BTN = 38; // nav button size

type ExperienceId = 'experienced' | 'keen_to_learn';

type ExperienceOption = {
  id: ExperienceId;
  title: string;
  icon: ImageSourcePropType;
};

const OPTIONS: ExperienceOption[] = [
  {
    id: 'experienced',
    title: 'I have previous experience in hospitality roles.',
    icon: require('../assets/images/experienced.png'),
  },
  {
    id: 'keen_to_learn',
    title: "I don't have previous experience in hospitality, but I'm keen to learn.",
    icon: require('../assets/images/fresher.png'),
  },
];

function Background({ width, height }: { width: number; height: number }) {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= width; x += GRID_STEP) {
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="rgba(212,168,75,0.035)" strokeWidth={1} />);
  }
  for (let y = 0; y <= height; y += GRID_STEP) {
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="rgba(212,168,75,0.035)" strokeWidth={1} />);
  }
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={authColors.background} stopOpacity="0" />
          <Stop offset="50%" stopColor={authColors.background} stopOpacity="0.75" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="glL" cx="0%" cy="0%" rx="65%" ry="50%">
          <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.13" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="glR" cx="100%" cy="12%" rx="55%" ry="42%">
          <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.05" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lines}
      <Rect width={width} height={height} fill="url(#fade)" />
      <Rect width={width} height={height} fill="url(#glL)" />
      <Rect width={width} height={height} fill="url(#glR)" />
    </Svg>
  );
}

/** Fully-circular frosted glass button — matches Apple nav style */
function NavBtn({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
    >
      <Ionicons name={icon} size={17} color={authColors.text} />
    </Pressable>
  );
}

function ExperienceCard({
  option,
  selected,
  onSelect,
  anim,
  entranceAnim,
  isCompact,
  cardMinHeight,
  cardVerticalPadding,
}: {
  option: ExperienceOption;
  selected: boolean;
  onSelect: () => void;
  anim: Animated.Value;
  entranceAnim: { opacity: Animated.Value; translateY: Animated.Value };
  isCompact: boolean;
  cardMinHeight: number;
  cardVerticalPadding: number;
}) {
  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(21, 21, 20, 0.28)', authColors.accent],
  });
  const tintOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const checkScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const checkOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const imageBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#fff', authColors.accent],
  });
  const imageScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { minHeight: cardMinHeight },
        { opacity: entranceAnim.opacity, transform: [{ translateY: entranceAnim.translateY }] },
      ]}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect();
        }}
        style={StyleSheet.absoluteFill}
      />

      {/* Outer glow shadow when selected */}
      <Animated.View style={[styles.cardGlow, { opacity: tintOpacity }]} pointerEvents="none" />

      <Animated.View style={[styles.card, { borderColor }]} pointerEvents="none">
        {/* Gold wash overlay when selected */}
        <Animated.View style={[styles.cardTint, { opacity: tintOpacity }]} />

        <View style={[styles.cardInner, { paddingVertical: cardVerticalPadding }]}>
          {/* Icon */}
          <Animated.View
            style={[
              styles.imageWrap,
              isCompact && styles.imageWrapCompact,
              { backgroundColor: imageBg, transform: [{ scale: imageScale }] },
            ]}
          >
            <Image
              source={option.icon}
              style={[styles.cardImage, isCompact && styles.cardImageCompact]}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Text */}
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, selected && styles.cardTitleActive]}>
              {option.title}
            </Text>

          </View>

          {/* Checkmark — top-right, animated in */}
          <Animated.View
            style={[
              styles.checkCircle,
              selected && styles.checkCircleActive,
              { transform: [{ scale: checkScale }], opacity: checkOpacity },
            ]}
          >
            <Ionicons name="checkmark" size={13} color={selected ? authColors.background : 'transparent'} />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function VerificationScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = height < 760 || width < 370;
  const headingSize = width < 360 ? 38 : width < 410 ? 42 : 46;
  const headingLineHeight = width < 360 ? 32 : width < 410 ? 36 : 40;
  const cardMinHeight = isCompact ? 104 : 116;
  const cardVerticalPadding = isCompact ? 16 : 20;
  const horizontalPadding = width < 360 ? authSpacing.md : authSpacing.lg;

  const [selected, setSelected] = useState<ExperienceId | null>(null);
  const [loading, setLoading] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(20)).current;
  const card0Opacity = useRef(new Animated.Value(0)).current;
  const card0Y = useRef(new Animated.Value(36)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card1Y = useRef(new Animated.Value(36)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnY = useRef(new Animated.Value(16)).current;

  const cardAnims = useRef([new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    Animated.stagger(90, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 460, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(card0Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(card0Y, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(card1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(card1Y, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(btnY, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleSelect = (id: ExperienceId) => {
    setSelected(id);
    OPTIONS.forEach((o, i) => {
      Animated.spring(cardAnims[i], {
        toValue: o.id === id ? 1 : 0,
        useNativeDriver: false,
        bounciness: 3,
        speed: 20,
      }).start();
    });
  };

  const notification = useNotification();

  const handleNext = async () => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await updateMe({ experienceLevel: selected });
      router.push('/work-categories');
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong';
      notification.showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const entranceAnims = [
    { opacity: card0Opacity, translateY: card0Y },
    { opacity: card1Opacity, translateY: card1Y },
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { height: insets.top }]} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>

        <ScrollView
          contentContainerStyle={[
            styles.inner,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: Math.max(authSpacing.sm, insets.bottom + 4),
            },
          ]}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Nav bar ── */}
          <View style={styles.navBar}>
            {/* Left: back */}
            <NavBtn icon="chevron-back" onPress={() => router.back()} />

            {/* Center: title + step badge */}
            <View style={styles.navCenter}>
              <Text style={styles.navTitle}>Verification</Text>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>Step 1</Text>
              </View>
            </View>

            {/* Right: help + logout */}
            <View style={styles.navRight}>
              <NavBtn icon="help-circle-outline" onPress={() => { }} />
              <NavBtn icon="log-out-outline" onPress={() => { }} />
            </View>
          </View>

          {/* ── Question ── */}
          <Animated.View
            style={[
              styles.questionBlock,
              isCompact && styles.questionBlockCompact,
              { opacity: headerOpacity, transform: [{ translateY: headerY }] },
            ]}
          >
            <Text style={styles.eyebrow}>Experience level</Text>
            <Text style={[styles.question, { fontSize: headingSize, marginTop: 10 }]}>
              Tell us about your level of experience.
            </Text>
          </Animated.View>

          {/* ── Cards — equal flex height ── */}
          <View style={styles.cards}>
            {OPTIONS.map((option, i) => (
              <ExperienceCard
                key={option.id}
                option={option}
                selected={selected === option.id}
                onSelect={() => handleSelect(option.id)}
                anim={cardAnims[i]}
                entranceAnim={entranceAnims[i]}
                isCompact={isCompact}
                cardMinHeight={cardMinHeight}
                cardVerticalPadding={cardVerticalPadding}
              />
            ))}
          </View>

          {/* ── CTA ── */}
          <Animated.View
            style={[
              styles.ctaRow,
              isCompact && styles.ctaRowCompact,
              { opacity: btnOpacity, transform: [{ translateY: btnY }] },
            ]}
          >
            <Pressable
              onPress={handleNext}
              disabled={!selected || loading}
              style={({ pressed }) => [
                styles.ctaBtn,
                selected && styles.ctaBtnActive,
                pressed && selected && styles.ctaBtnPressed,
              ]}
            >
              <Text style={[styles.ctaLabel, selected ? styles.ctaLabelActive : styles.ctaLabelDisabled]}>
                {loading ? 'Saving…' : 'Next'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleNext}
              disabled={!selected || loading}
              style={({ pressed }) => [
                styles.ctaArrow,
                selected && styles.ctaArrowActive,
                pressed && selected && styles.ctaArrowPressed,
              ]}
            >
              <Ionicons
                name="arrow-forward"
                size={22}
                color={selected ? authColors.background : authColors.placeholder}
              />
            </Pressable>
          </Animated.View>

          <View style={styles.flexSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  topBar: { backgroundColor: authColors.accent },
  safeContent: { flex: 1 },
  inner: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: authSpacing.sm,
    justifyContent: 'space-between',
  },
  flexSpacer: {
    minHeight: authSpacing.md,
  },

  // ── Nav ──
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 4,
    gap: 8,
  },
  navCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navTitle: {
    fontSize: 16,
    fontFamily: authFonts.semiBold,
    color: authColors.text,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // ── Fully-circular glass button ──
  navBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // ── Step pill ──
  stepPill: {
    backgroundColor: 'rgba(212,168,75,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stepPillText: {
    fontSize: 11,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    letterSpacing: 0.4,
  },

  // ── Question ──
  questionBlock: {
    gap: 6,
    marginBottom: 8,
  },
  questionBlockCompact: {
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  question: {
    fontSize: 38,
    fontFamily: authFonts.titleBold,
    color: authColors.text,
    lineHeight: 40,
    // letterSpacing: -0.4,
  },

  // ── Cards ──
  cards: {
    gap: authSpacing.sm,
  },

  cardWrapper: {
    minHeight: 116,
    borderRadius: 22,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    backgroundColor: 'rgba(21, 21, 20, 0.28)',
    shadowColor: authColors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 0,
  },
  card: {
    backgroundColor: authColors.surface,
    borderRadius: 22,
    borderWidth: 1.5,

    overflow: 'hidden',
  },
  // Subtle gold wash over the whole card when selected
  cardTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(21, 21, 20, 0.28)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  imageWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  imageWrapCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  cardImage: {
    width: 30,
    height: 30,
  },
  cardImageCompact: {
    width: 26,
    height: 26,
  },
  cardText: {
    flex: 1,
    gap: 5,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
    color: authColors.textSecondary,
    lineHeight: 22,
  },
  cardTitleActive: {
    color: authColors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: authFonts.regular,
    color: authColors.placeholder,
    lineHeight: 17,
  },
  cardSubtitleActive: {
    color: authColors.textSecondary,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: authColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'transparent',
  },
  checkCircleActive: {
    backgroundColor: authColors.accent,
    borderColor: authColors.accent,
  },

  // ── CTA ──
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: authSpacing.sm,
    marginTop: authSpacing.sm,
  },
  ctaRowCompact: {
    marginTop: authSpacing.xs,
  },
  ctaBtn: {
    flex: 1,
    backgroundColor: authColors.surfaceElevated,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnActive: { backgroundColor: authColors.accent },
  ctaBtnPressed: { opacity: 0.88 },
  ctaArrow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: authColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowActive: { backgroundColor: authColors.accent },
  ctaArrowPressed: { opacity: 0.88 },
  ctaLabel: {
    fontSize: 18,
    fontFamily: authFonts.bold,
    letterSpacing: 0.2,
  },
  ctaLabelActive: { color: authColors.background },
  ctaLabelDisabled: { color: authColors.placeholder },
});
