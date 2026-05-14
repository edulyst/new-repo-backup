import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
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

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;
const BTN = 38;
const MAX_LANGUAGES = 6;

const CEFR_LEVELS = [
  { id: 'A1', label: 'Elementary/Basic proficiency (A1)' },
  { id: 'A2', label: 'Limited working proficiency (A2)' },
  { id: 'B1', label: 'Working proficiency (B1)' },
  { id: 'B2', label: 'Professional working proficiency (B2)' },
  { id: 'C1', label: 'Full working proficiency (C1)' },
  { id: 'C2', label: 'Native or bilingual proficiency (C2)' },
] as const;

type LanguageEntry = { language: string; level: string };

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

export default function AddLanguageScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [languages, setLanguages] = useState<LanguageEntry[]>([
    { language: 'English', level: 'C1' },
  ]);
  const [levelModalIndex, setLevelModalIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ language?: string; level?: string }>({});

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

  const setLanguage = (index: number, field: 'language' | 'level', value: string) => {
    setLanguages((p) => p.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const addLanguage = () => {
    if (languages.length >= MAX_LANGUAGES) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguages((p) => [...p, { language: '', level: '' }]);
  };

  const removeLanguage = (index: number) => {
    if (index === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguages((p) => p.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const e: { language?: string; level?: string } = {};
    if (!languages[0]?.language.trim()) e.language = 'English is required';
    if (!languages[0]?.level) e.level = 'Select proficiency level';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!validate()) return;
    router.push('/about-me');
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/about-me');
  };

  const openLevelPicker = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLevelModalIndex(index);
  };

  const selectLevel = (levelId: string) => {
    if (levelModalIndex !== null) {
      setLanguage(levelModalIndex, 'level', levelId);
      setLevelModalIndex(null);
    }
  };

  const levelLabel = (id: string) => CEFR_LEVELS.find((l) => l.id === id)?.label ?? 'Select language level';

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { height: insets.top }]} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>

        <View style={styles.inner}>
          {/* ── Nav ── */}
          <View style={styles.navBar}>
            <NavBtn icon="chevron-back" onPress={() => router.back()} />
            <View style={styles.navCenter}>
              <Text style={styles.navTitle}>Languages</Text>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>Step 7</Text>
              </View>
            </View>
            <View style={styles.navRight}>
              <NavBtn icon="help-circle-outline" onPress={() => { }} />
              <NavBtn icon="log-out-outline" onPress={() => { }} />
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
              <View style={styles.iconRow}>
                <View style={styles.globeIconWrap}>
                  <Ionicons name="language" size={26} color={authColors.accent} />
                </View>
              </View>
              <Text style={styles.eyebrow}>Profile builder</Text>
              <Text style={styles.heading}>Add language</Text>
              <Text style={styles.subtitle}>
                Add your proficiency in languages below. English is mandatory, but you can add up to five more.
              </Text>
            </Animated.View>

            {/* ── Language entries ── */}
            <Animated.View
              style={[styles.fieldsBlock, { opacity: formOpacity, transform: [{ translateY: formY }] }]}
            >
              {languages.map((entry, index) => (
                <View key={index} style={styles.entryBlock}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryLabel}>Language {index + 1}</Text>
                    {index > 0 && (
                      <Pressable
                        onPress={() => removeLanguage(index)}
                        hitSlop={8}
                        style={({ pressed }) => [styles.removeLang, pressed && { opacity: 0.7 }]}
                      >
                        <Ionicons name="trash-outline" size={18} color={authColors.placeholder} />
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Language</Text>
                    <View style={[styles.inputWrap, index === 0 && !!errors.language && styles.inputWrapError]}>
                      <Ionicons name="language-outline" size={18} color={authColors.placeholder} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder={index === 0 ? 'English' : 'e.g. Hindi, Spanish'}
                        placeholderTextColor={authColors.placeholder}
                        value={entry.language}
                        onChangeText={(v) => setLanguage(index, 'language', v)}
                        returnKeyType="next"
                      />
                    </View>
                    {index === 0 && errors.language && <Text style={styles.errorText}>{errors.language}</Text>}
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Proficiency level</Text>
                    <Pressable
                      onPress={() => openLevelPicker(index)}
                      style={[styles.levelPicker, !!errors.level && index === 0 && styles.inputWrapError]}
                    >
                      <Ionicons name="stats-chart-outline" size={18} color={authColors.placeholder} style={styles.inputIcon} />
                      <Text
                        style={[
                          styles.levelPickerText,
                          !entry.level && styles.levelPlaceholder,
                        ]}
                      >
                        {entry.level ? levelLabel(entry.level) : 'Select language level'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={authColors.placeholder} />
                    </Pressable>
                    {index === 0 && errors.level && <Text style={styles.errorText}>{errors.level}</Text>}
                  </View>
                </View>
              ))}

              {languages.length < MAX_LANGUAGES && (
                <Pressable
                  onPress={addLanguage}
                  style={({ pressed }) => [styles.addLangBtn, pressed && styles.addLangBtnPressed]}
                >
                  <Ionicons name="add-circle-outline" size={22} color={authColors.accent} />
                  <Text style={styles.addLangText}>Add another language</Text>
                </Pressable>
              )}
            </Animated.View>
          </ScrollView>

          {/* ── Footer ── */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <ProgressBar pct={90} />
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

        {/* ── Level picker modal ── */}
        <Modal
          visible={levelModalIndex !== null}
          transparent
          animationType="slide"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setLevelModalIndex(null)}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select proficiency level</Text>
                <Pressable onPress={() => setLevelModalIndex(null)} hitSlop={12}>
                  <Ionicons name="close" size={24} color={authColors.text} />
                </Pressable>
              </View>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {CEFR_LEVELS.map((level) => (
                  <Pressable
                    key={level.id}
                    onPress={() => selectLevel(level.id)}
                    style={({ pressed }) => [
                      styles.levelOption,
                      pressed && styles.levelOptionPressed,
                      languages[levelModalIndex ?? 0]?.level === level.id && styles.levelOptionSelected,
                    ]}
                  >
                    <Text style={styles.levelOptionText}>{level.label}</Text>
                    {languages[levelModalIndex ?? 0]?.level === level.id && (
                      <Ionicons name="checkmark-circle" size={22} color={authColors.accent} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  topBar: { backgroundColor: authColors.accent },
  safeContent: { flex: 1 },
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

  scroll: { flex: 1 },
  scrollContent: { gap: 20 },

  headingBlock: { gap: 8, marginBottom: 4 },
  iconRow: { marginBottom: 2 },
  globeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(212,168,75,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(212,168,75,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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

  fieldsBlock: { gap: 20 },
  entryBlock: {
    gap: 14,
    paddingBottom: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryLabel: {
    fontSize: 12,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  removeLang: { padding: 4 },
  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: authFonts.semiBold,
    color: authColors.textSecondary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: authColors.inputBg,
    borderRadius: authLayout.inputRadius,
    borderWidth: 1.5,
    borderColor: 'rgba(92,82,72,0.4)',
    paddingHorizontal: 12,
    gap: 10,
  },
  inputWrapError: { borderColor: '#E05252' },
  inputIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: authFonts.regular,
    color: authColors.text,
  },
  levelPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: authColors.inputBg,
    borderRadius: authLayout.inputRadius,
    borderWidth: 1.5,
    borderColor: 'rgba(92,82,72,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
  },
  levelPickerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: authFonts.regular,
    color: authColors.text,
  },
  levelPlaceholder: { color: authColors.placeholder },
  errorText: {
    fontSize: 12,
    fontFamily: authFonts.semiBold,
    color: '#E05252',
  },

  addLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(212,168,75,0.4)',
    borderRadius: 18,
  },
  addLangBtnPressed: { opacity: 0.8 },
  addLangText: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
  },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: authColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,82,72,0.3)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: authFonts.semiBold,
    color: authColors.text,
  },
  modalScroll: { maxHeight: 400 },
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,82,72,0.2)',
  },
  levelOptionPressed: { backgroundColor: 'rgba(212,168,75,0.08)' },
  levelOptionSelected: { backgroundColor: 'rgba(212,168,75,0.1)' },
  levelOptionText: {
    fontSize: 16,
    fontFamily: authFonts.regular,
    color: authColors.text,
    flex: 1,
  },
});
