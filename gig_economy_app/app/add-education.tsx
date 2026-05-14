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
const CURRENT_YEAR = new Date().getFullYear();

function Background() {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= W; x += GRID_STEP) {
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(212,168,75,0.032)" strokeWidth={1} />);
  }
  for (let y = 0; y <= H; y += GRID_STEP) {
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(212,168,75,0.032)" strokeWidth={1} />);
  }
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
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
    >
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

type EntryErrors = { institution?: string; qualification?: string; startYear?: string; endYear?: string };
type Entry = { institution: string; qualification: string; startYear: string; endYear: string };

export default function AddEducationScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [entry, setEntry] = useState<Entry>({ institution: '', qualification: '', startYear: '', endYear: '' });
  const [errors, setErrors] = useState<EntryErrors>({});

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

  const validate = (): boolean => {
    const e: EntryErrors = {};
    if (!entry.institution.trim()) e.institution = 'Enter the school, university or college name';
    if (!entry.qualification.trim()) e.qualification = 'Enter your degree, A-levels, GCSEs, etc.';
    const sy = parseInt(entry.startYear, 10);
    const ey = parseInt(entry.endYear, 10);
    if (!entry.startYear || isNaN(sy) || sy < 1950 || sy > CURRENT_YEAR) e.startYear = 'Enter a valid year';
    if (!entry.endYear || isNaN(ey) || ey < 1950 || ey > CURRENT_YEAR + 6) {
      e.endYear = 'Enter a valid year';
    } else if (!e.startYear && ey < sy) {
      e.endYear = 'Must be ≥ start year';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const notification = useNotification();

  const saveAndNext = async (data: Record<string, unknown>) => {
    try {
      await updateMe({ onboardingData: data });
      router.push('/add-training');
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong';
      notification.showError(msg);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!validate()) return;
    await saveAndNext({ education: entry });
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await saveAndNext({});
  };

  const set = (field: keyof Entry) => (val: string) => {
    setEntry((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { height: insets.top }]} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>

        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.inner}>

            {/* ── Nav ── */}
            <View style={styles.navBar}>
              <NavBtn icon="chevron-back" onPress={() => router.back()} />
              <View style={styles.navCenter}>
                <Text style={styles.navTitle}>Education</Text>
                <View style={styles.stepPill}>
                  <Text style={styles.stepPillText}>Step 4</Text>
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
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Heading ── */}
              <Animated.View
                style={[styles.headingBlock, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
              >
                <Text style={styles.eyebrow}>Profile builder</Text>
                <Text style={styles.heading}>This is my education</Text>
                <Text style={styles.subtitle}>
                  Share your academic background — it helps hirers find the right fit.
                </Text>
              </Animated.View>

              {/* ── Fields flat in the main container ── */}
              <Animated.View
                style={[styles.fieldsBlock, { opacity: formOpacity, transform: [{ translateY: formY }] }]}
              >
                {/* Institution */}
                <View style={styles.field}>
                  <Text style={styles.label}>Institution</Text>
                  <TextInput
                    style={[styles.input, !!errors.institution && styles.inputError]}
                    placeholder="School, university or college"
                    placeholderTextColor={authColors.placeholder}
                    value={entry.institution}
                    onChangeText={set('institution')}
                    returnKeyType="next"
                  />
                  {errors.institution
                    ? <Text style={styles.errorText}>{errors.institution}</Text>
                    : <Text style={styles.hintText}>The name of the school, university or college</Text>}
                </View>

                {/* Qualification */}
                <View style={styles.field}>
                  <Text style={styles.label}>Qualification</Text>
                  <TextInput
                    style={[styles.input, !!errors.qualification && styles.inputError]}
                    placeholder="Degree, A-levels, GCSEs, etc."
                    placeholderTextColor={authColors.placeholder}
                    value={entry.qualification}
                    onChangeText={set('qualification')}
                    returnKeyType="next"
                  />
                  {errors.qualification
                    ? <Text style={styles.errorText}>{errors.qualification}</Text>
                    : <Text style={styles.hintText}>Degree, A-levels, GCSEs, etc.</Text>}
                </View>

                {/* Year row */}
                <View style={styles.yearRow}>
                  <View style={[styles.field, styles.fieldHalf]}>
                    <Text style={styles.label}>Start year</Text>
                    <View
                      style={[
                        styles.yearInputShell,
                        !!errors.startYear && styles.yearInputShellError,
                      ]}
                    >
                      <TextInput
                        style={styles.yearInputInner}
                        placeholder={String(CURRENT_YEAR - 4)}
                        placeholderTextColor={authColors.placeholder}
                        value={entry.startYear}
                        onChangeText={set('startYear')}
                        keyboardType="number-pad"
                        maxLength={4}
                        returnKeyType="next"
                        selectionColor={authColors.accent}
                      />
                    </View>
                    {errors.startYear && <Text style={styles.errorText}>{errors.startYear}</Text>}
                  </View>

                  <View style={styles.yearDashCol} pointerEvents="none">
                    <Text style={styles.yearDash}>–</Text>
                  </View>

                  <View style={[styles.field, styles.fieldHalf]}>
                    <Text style={styles.label}>End year</Text>
                    <View
                      style={[
                        styles.yearInputShell,
                        !!errors.endYear && styles.yearInputShellError,
                      ]}
                    >
                      <TextInput
                        style={styles.yearInputInner}
                        placeholder={String(CURRENT_YEAR)}
                        placeholderTextColor={authColors.placeholder}
                        value={entry.endYear}
                        onChangeText={set('endYear')}
                        keyboardType="number-pad"
                        maxLength={4}
                        returnKeyType="done"
                        selectionColor={authColors.accent}
                      />
                    </View>
                    {errors.endYear && <Text style={styles.errorText}>{errors.endYear}</Text>}
                  </View>
                </View>
              </Animated.View>
            </ScrollView>

            {/* ── Footer ── */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
              <ProgressBar pct={80} />
              <View style={styles.btnRow}>
                <Pressable
                  onPress={handleSave}
                  android_ripple={
                    Platform.OS === 'android' ? { color: 'rgba(13,13,13,0.2)' } : undefined
                  }
                  style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
                >
                  <Text style={styles.saveLabel}>Save</Text>
                </Pressable>
                <Pressable
                  onPress={handleSkip}
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  android_ripple={
                    Platform.OS === 'android' ? { color: 'rgba(212,168,75,0.2)' } : undefined
                  }
                  style={({ pressed }) => [styles.skipBtn, pressed && styles.skipBtnPressed]}
                >
                  <Text style={styles.skipLabel}>Skip</Text>
                </Pressable>
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
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
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

  scroll: { flex: 1 },
  scrollContent: { gap: 20 },

  headingBlock: {
    gap: 5,
    marginBottom: 4,
  },
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

  fieldsBlock: { gap: 16 },

  field: { gap: 6 },
  fieldHalf: { flex: 1, minWidth: 0 },

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
  },
  inputError: { borderColor: '#E05252' },
  yearInputShell: {
    borderRadius: 16,
    minHeight: 52,
    justifyContent: 'center',
    backgroundColor: 'rgba(212,168,75,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(212,168,75,0.32)',
    ...Platform.select({
      ios: {
        shadowColor: '#D4A84B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  yearInputShellError: {
    borderColor: '#E05252',
    backgroundColor: 'rgba(224,82,82,0.06)',
  },
  yearInputInner: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 23,
    fontFamily: authFonts.title,
    textAlign: 'center',
    letterSpacing: 0.5,
    color: authColors.accent,
    ...Platform.select({
      ios: { fontVariant: ['tabular-nums'] as const },
      default: {},
    }),
  },
  hintText: {
    fontSize: 12,
    fontFamily: authFonts.regular,
    color: authColors.placeholder,
  },
  errorText: {
    fontSize: 12,
    fontFamily: authFonts.semiBold,
    color: '#E05252',
  },

  yearRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  yearDashCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    flexShrink: 0,
  },
  yearDash: {
    fontSize: 20,
    fontFamily: authFonts.title,
    color: 'rgba(212,168,75,0.5)',
    letterSpacing: 0,
    lineHeight: 24,
  },

  footer: {
    paddingTop: 10,
    gap: 8,
  },
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
    overflow: 'hidden',
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
    borderColor: 'rgba(212,168,75,0.28)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  skipBtnPressed: { opacity: 0.7 },
  skipLabel: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
    color: authColors.textSecondary,
    letterSpacing: 0.4,
  },
});
