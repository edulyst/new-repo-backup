import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';
import { updateMe } from '@/lib/users-api';
import { useNotification } from '@/lib/notification-service';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;
const BTN = 38;
const MAX_CHARS = 400;

const INSPIRATION = [
  'Write about your previous experience',
  'Highlight your area of expertise or top skills',
  'Talk about what makes you the right person for the job',
  'List your best qualities & traits',
];

function Background() {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= W; x += GRID_STEP)
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(212,168,75,0.032)" strokeWidth={1} />);
  for (let y = 0; y <= H; y += GRID_STEP)
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(212,168,75,0.032)" strokeWidth={1} />);
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={authColors.background} stopOpacity="0" />
          <Stop offset="45%" stopColor={authColors.background} stopOpacity="0.65" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="glL" cx="0%" cy="0%" rx="60%" ry="46%">
          <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.12" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="glR" cx="100%" cy="10%" rx="52%" ry="38%">
          <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.05" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lines}
      <Rect width={W} height={H} fill="url(#fade)" />
      <Rect width={W} height={H} fill="url(#glL)" />
      <Rect width={W} height={H} fill="url(#glR)" />
    </Svg>
  );
}

function NavBtn({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}>
      <Ionicons name={icon} size={17} color={authColors.text} />
    </Pressable>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: pct / 100, useNativeDriver: false, bounciness: 3, speed: 14 }).start();
  }, [pct]);
  const w = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={styles.progressWrap}>
      <Text style={styles.progressLabel}>{pct}%</Text>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: w }]} />
      </View>
    </View>
  );
}

export default function AboutMeScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [bio, setBio] = useState('');

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(18)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 440, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(formY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const notification = useNotification();

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateMe({ onboardingData: { aboutMe: bio } });
      router.push('/profile-photo');
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong';
      notification.showError(msg);
    }
  };

  const count = bio.length;
  const fillStars = count === 0 ? 0 : count < 100 ? 1 : count < 250 ? 2 : 3;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { height: insets.top }]} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>

        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.flex}>
            <View style={styles.inner}>
              {/* ── Nav ── */}
              <View style={styles.navBar}>
                <NavBtn icon="chevron-back" onPress={() => router.back()} />
                <View style={styles.navCenter}>
                  <Text style={styles.navTitle}>About me</Text>
                  <View style={styles.stepPill}>
                    <Text style={styles.stepPillText}>Step 8</Text>
                  </View>
                </View>
                <View style={styles.navRight}>
                  <NavBtn icon="help-circle-outline" onPress={() => {}} />
                  <NavBtn icon="log-out-outline" onPress={() => {}} />
                </View>
              </View>

              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: insets.bottom + 100, flexGrow: 1 },
                ]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
              >
                {/* ── Heading ── */}
                <Animated.View
                  style={[styles.headingBlock, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
                >
                  <Text style={styles.eyebrow}>Profile builder</Text>
                  <Text style={styles.heading}>Something about me</Text>
                  <Text style={styles.subtitle}>
                    A strong bio helps hirers understand who you are and why you're the right fit.
                  </Text>
                </Animated.View>

                {/* ── Bio area ── */}
                <Animated.View
                  style={[styles.formBlock, { opacity: formOpacity, transform: [{ translateY: formY }] }]}
                >
                  <Text style={styles.label}>Bio</Text>
                  <Pressable onPress={() => {}} style={styles.textAreaWrap}>
                    <TextInput
                      style={styles.textArea}
                      placeholder={`If you're unsure what to write in here, check out some of our ideas below`}
                      placeholderTextColor={authColors.placeholder}
                      value={bio}
                      onChangeText={(t) => setBio(t.slice(0, MAX_CHARS))}
                      multiline
                      textAlignVertical="top"
                      onFocus={() => {
                        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 200);
                      }}
                    />
                    {/* Stars quality indicator */}
                    <View style={styles.textAreaFooter}>
                      <View style={styles.starsRow}>
                        {[0, 1, 2].map((i) => (
                          <Ionicons
                            key={i}
                            name={i < fillStars ? 'star' : 'star-outline'}
                            size={18}
                            color={i < fillStars ? authColors.accent : 'rgba(92,82,72,0.4)'}
                          />
                        ))}
                      </View>
                      <Text style={[styles.charCount, count >= MAX_CHARS && styles.charCountMax]}>
                        {count}/{MAX_CHARS}
                      </Text>
                    </View>
                  </Pressable>

                  {/* ── Inspiration box ── */}
                  <View style={styles.inspirationCard}>
                    <View style={styles.inspirationHeader}>
                      <Ionicons name="sparkles" size={16} color="rgba(0,0,0,0.65)" />
                      <Text style={styles.inspirationTitle}>Inspiration</Text>
                    </View>
                    {INSPIRATION.map((tip, i) => (
                      <View key={i} style={styles.inspirationRow}>
                        <View style={styles.inspirationBullet}>
                          <View style={styles.inspirationDot} />
                        </View>
                        <Text style={styles.inspirationTip}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              </ScrollView>

              {/* ── Footer ── */}
              <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                <ProgressBar pct={90} />
                <View style={styles.footerRow}>
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
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  topBar: { backgroundColor: authColors.accent },
  safeContent: { flex: 1 },
  keyboard: { flex: 1 },
  flex: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: authSpacing.lg },

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
  navTitle: { fontSize: 16, fontFamily: authFonts.semiBold, color: authColors.text },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtn: {
    width: BTN, height: BTN, borderRadius: BTN / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnPressed: { backgroundColor: 'rgba(255,255,255,0.15)' },
  stepPill: {
    backgroundColor: 'rgba(212,168,75,0.15)',
    borderWidth: 1, borderColor: 'rgba(212,168,75,0.28)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  stepPillText: {
    fontSize: 11, fontFamily: authFonts.semiBold,
    color: authColors.accent, letterSpacing: 0.4,
  },

  scroll: { flex: 1 },
  scrollContent: { gap: 20 },

  headingBlock: { gap: 5, marginBottom: 4 },
  eyebrow: {
    fontSize: 11, fontFamily: authFonts.semiBold,
    color: authColors.accent, letterSpacing: 1.6, textTransform: 'uppercase',
  },
  heading: {
    fontSize: 30, fontFamily: authFonts.titleBold,
    color: authColors.text, lineHeight: 38, letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14, fontFamily: authFonts.regular,
    color: authColors.textSecondary, lineHeight: 21,
  },

  formBlock: { gap: 12 },
  label: { fontSize: 13, fontFamily: authFonts.semiBold, color: authColors.textSecondary },

  textAreaWrap: {
    backgroundColor: authColors.inputBg,
    borderRadius: authLayout.inputRadius,
    borderWidth: 1.5,
    borderColor: 'rgba(92,82,72,0.4)',
    overflow: 'hidden',
  },
  textArea: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    fontSize: 16,
    fontFamily: authFonts.regular,
    color: authColors.text,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  textAreaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  starsRow: { flexDirection: 'row', gap: 4 },
  charCount: { fontSize: 12, fontFamily: authFonts.regular, color: authColors.placeholder },
  charCountMax: { color: authColors.accent },

  // ── Inspiration card ──
  inspirationCard: {
    borderRadius: 18,
    backgroundColor: authColors.accent,
    overflow: 'hidden',
    paddingBottom: 4,
  },
  inspirationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  inspirationTitle: {
    fontSize: 16,
    fontFamily: authFonts.bold,
    color: authColors.background,
  },
  inspirationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  inspirationBullet: {
    width: 20,
    alignItems: 'center',
    marginTop: 6,
  },
  inspirationDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  inspirationTip: {
    flex: 1,
    fontSize: 14,
    fontFamily: authFonts.regular,
    color: authColors.background,
    lineHeight: 20,
  },

  // ── Footer ──
  footer: { paddingTop: 10, gap: 10 },
  footerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  progressWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2,
  },
  progressLabel: {
    fontSize: 12, fontFamily: authFonts.semiBold,
    color: authColors.textSecondary, minWidth: 34,
  },
  progressTrack: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: authColors.surface, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: authColors.accent },
  nextBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: authColors.accent,
    borderRadius: 30,
    paddingVertical: 17,
  },
  arrowBtn: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: authColors.accent,
  },
  arrowBtnPressed: { opacity: 0.88 },
  nextBtnPressed: { opacity: 0.88 },
  nextLabel: {
    fontSize: 17, fontFamily: authFonts.bold,
    color: authColors.background, letterSpacing: 0.4,
  },
});
