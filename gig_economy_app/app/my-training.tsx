import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;
const BTN = 38;
const MAX_CHARS = 140;

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

export default function MyTrainingScreen() {
  const insets = useSafeAreaInsets();
  const [training, setTraining] = useState('');

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

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/add-language');
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add-language');
  };

  const count = training.length;

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
          <Pressable style={styles.keyboardDismissArea} onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* ── Nav ── */}
            <View style={styles.navBar}>
              <NavBtn icon="chevron-back" onPress={() => router.back()} />
              <View style={styles.navCenter}>
                <Text style={styles.navTitle}>My training</Text>
                <View style={styles.stepPill}>
                  <Text style={styles.stepPillText}>Step 6</Text>
                </View>
              </View>
              <View style={styles.navRight}>
                <NavBtn icon="help-circle-outline" onPress={() => {}} />
                <NavBtn icon="log-out-outline" onPress={() => {}} />
              </View>
            </View>

            {/* ── Content ── */}
            <View style={styles.content}>
              <Animated.View
                style={[styles.headingBlock, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
              >
                <Text style={styles.eyebrow}>Profile builder</Text>
                <Text style={styles.heading}>My training</Text>
                <Text style={styles.subtitle}>
                  Summarise your training, courses, or skills in a few words.
                </Text>
              </Animated.View>

              <Animated.View
                style={[styles.formBlock, { opacity: formOpacity, transform: [{ translateY: formY }] }]}
              >
                <View style={styles.field}>
                  <Text style={styles.label}>Training</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Food safety, First aid, Customer service"
                    placeholderTextColor={authColors.placeholder}
                    value={training}
                    onChangeText={(t) => setTraining(t.slice(0, MAX_CHARS))}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text
                    style={[styles.charCount, count >= MAX_CHARS && styles.charCountLimit]}
                  >
                    {count}/{MAX_CHARS}
                  </Text>
                </View>
              </Animated.View>
            </View>

            {/* ── Footer ── */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
              <ProgressBar pct={70} />
              <View style={styles.btnRow}>
                <Pressable
                  onPress={handleSave}
                  style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
                >
                  <Text style={styles.saveLabel}>Save</Text>
                </Pressable>
                <Pressable
                  onPress={handleSkip}
                  style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
                >
                  <Text style={styles.skipLabel}>Skip</Text>
                </Pressable>
              </View>
            </View>
          </View>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  topBar: { backgroundColor: authColors.accent },
  safeContent: { flex: 1 },
  keyboardDismissArea: { flex: 1 },
  keyboard: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: authSpacing.lg,
  },

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
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  navBtnPressed: { backgroundColor: 'rgba(255,255,255,0.15)' },
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

  content: { flex: 1, paddingTop: 8 },
  headingBlock: { gap: 8, marginBottom: 24 },
  eyebrow: {
    fontSize: 11,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 30,
    fontFamily: authFonts.titleBold,
    color: authColors.text,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: authFonts.regular,
    color: authColors.textSecondary,
    lineHeight: 21,
  },

  formBlock: {},
  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontFamily: authFonts.semiBold,
    color: authColors.textSecondary,
  },
  input: {
    backgroundColor: authColors.inputBg,
    borderRadius: authLayout.inputRadius,
    borderWidth: 1.5,
    borderColor: 'rgba(92,82,72,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: authFonts.regular,
    color: authColors.text,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    fontFamily: authFonts.regular,
    color: authColors.placeholder,
    alignSelf: 'flex-end',
  },
  charCountLimit: { color: authColors.accent },

  footer: { paddingTop: 10, gap: 8 },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: authFonts.semiBold,
    color: authColors.textSecondary,
    minWidth: 34,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: authColors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: authColors.accent,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: authSpacing.sm,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: authColors.accent,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: { opacity: 0.88 },
  saveLabel: {
    fontSize: 17,
    fontFamily: authFonts.bold,
    color: authColors.background,
    letterSpacing: 0.4,
  },
  skipBtn: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(92,82,72,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnPressed: { opacity: 0.7 },
  skipLabel: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
    color: authColors.placeholder,
  },
});
