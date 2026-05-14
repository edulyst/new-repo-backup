import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
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
import { INDIAN_INSTITUTIONS } from '@/constants/indian-institutions';
import { updateMe } from '@/lib/users-api';
import { useNotification } from '@/lib/notification-service';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;
const BTN = 38;

// ─── Background grid ────────────────────────────────────────────────────────
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

// ─── Nav button ─────────────────────────────────────────────────────────────
function NavBtn({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}>
      <Ionicons name={icon} size={17} color={authColors.text} />
    </Pressable>
  );
}

// ─── Input field with leading icon ──────────────────────────────────────────
function Field({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  hint,
  keyboardType = 'default',
  returnKeyType = 'next',
  maxLength,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  hint?: string;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  returnKeyType?: 'next' | 'done';
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
        <Ionicons name={icon} size={18} color={error ? '#E05252' : authColors.placeholder} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={authColors.placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          maxLength={maxLength}
        />
      </View>
      {error
        ? <Text style={styles.errorText}>{error}</Text>
        : hint
          ? <Text style={styles.hintText}>{hint}</Text>
          : null}
    </View>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Format input as MM/YY, inserting "/" after 2 digits. */
function formatMMYY(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}

const INSTITUTIONS_API = 'https://universities.hipolabs.com/search';

function filterLocalInstitutions(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return INDIAN_INSTITUTIONS
    .filter((name) => name.toLowerCase().includes(q))
    .slice(0, 10);
}

async function fetchIndianInstitutions(query: string): Promise<string[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  const q = query.trim();
  try {
    const res = await fetch(
      `${INSTITUTIONS_API}?country=India&name=${encodeURIComponent(q)}`
    );
    if (!res.ok) return filterLocalInstitutions(q);
    const data = (await res.json()) as Array<{ name: string }>;
    const list = (data ?? []).slice(0, 10).map((i) => i.name);
    return list.length > 0 ? list : filterLocalInstitutions(q);
  } catch {
    return filterLocalInstitutions(q);
  }
}

// ─── Institution autocomplete input ───────────────────────────────────────────
function InstitutionInput({
  label,
  value,
  onChangeText,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchIndianInstitutions(q);
      setSuggestions(list);
      setShowSuggestions(list.length > 0);
    } finally {
      setLoading(false);
    }
  }, []);

  const onTextChange = (text: string) => {
    onChangeText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 400);
  };

  const selectSuggestion = (name: string) => {
    onChangeText(name);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
        <Ionicons name="business-outline" size={18} color={error ? '#E05252' : authColors.placeholder} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="e.g. RSPH, City & Guilds"
          placeholderTextColor={authColors.placeholder}
          value={value}
          onChangeText={onTextChange}
          onFocus={() => {
            if (value.trim().length >= 2) search(value);
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
          returnKeyType="next"
        />
        {loading && <ActivityIndicator size="small" color={authColors.accent} style={styles.inputSpinner} />}
      </View>
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsWrap}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={styles.suggestionsList}
            showsVerticalScrollIndicator={true}
          >
            {suggestions.map((item) => (
              <Pressable
                key={item}
                onPress={() => selectSuggestion(item)}
                style={({ pressed }) => [styles.suggestionItem, pressed && styles.suggestionItemPressed]}
              >
                <Ionicons name="business-outline" size={16} color={authColors.placeholder} />
                <Text style={styles.suggestionText} numberOfLines={1}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────
type FormErrors = { name?: string; org?: string; issueDate?: string };
type FormData = { name: string; org: string; issueDate: string; certId: string };

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function AddTrainingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [form, setForm] = useState<FormData>({ name: '', org: '', issueDate: '', certId: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadPressed, setUploadPressed] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);

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

  const set = (field: keyof FormData) => (val: string) => {
    setForm((p) => ({ ...p, [field]: val }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Enter the certificate or course name';
    if (!form.org.trim()) e.org = 'Enter the issuing organisation or institution';
    if (!form.issueDate.trim()) e.issueDate = 'Enter the issue date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const notification = useNotification();

  const saveAndNext = async (data: Record<string, unknown>) => {
    try {
      await updateMe({ onboardingData: data });
      router.push('/my-training');
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong';
      notification.showError(msg);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!validate()) return;
    await saveAndNext({ training: { ...form, certFile: uploadName } });
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await saveAndNext({});
  };

  const handleUpload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUploadPressed(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setUploadName(result.assets[0].name);
      }
    } catch {
      // User cancelled or error
    } finally {
      setUploadPressed(false);
    }
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
                <Text style={styles.navTitle}>Certifications</Text>
                <View style={styles.stepPill}>
                  <Text style={styles.stepPillText}>Step 5</Text>
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
                <Text style={styles.heading}>
                  Training, certifications{'\n'}& courses
                </Text>
                <Text style={styles.subtitle}>
                  Upload your certificate and fill out some details to boost your profile.
                </Text>
              </Animated.View>

              {/* ── Fields ── */}
              <Animated.View
                style={[styles.fieldsBlock, { opacity: formOpacity, transform: [{ translateY: formY }] }]}
              >
                <Field
                  label="Certificate / Course name"
                  icon="ribbon-outline"
                  placeholder="e.g. Food Safety Level 2"
                  value={form.name}
                  onChangeText={set('name')}
                  error={errors.name}
                />

                <InstitutionInput
                  label="Organisation or institution"
                  value={form.org}
                  onChangeText={set('org')}
                  error={errors.org}
                />

                <View style={styles.field}>
                  <Text style={styles.label}>Issue date</Text>
                  <View style={[styles.inputWrap, !!errors.issueDate && styles.inputWrapError]}>
                    <Ionicons name="calendar-outline" size={18} color={errors.issueDate ? '#E05252' : authColors.placeholder} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="MM / YY"
                      placeholderTextColor={authColors.placeholder}
                      value={form.issueDate}
                      onChangeText={(v) => {
                    setForm((p) => ({ ...p, issueDate: formatMMYY(v) }));
                    setErrors((e) => ({ ...e, issueDate: undefined }));
                  }}
                      keyboardType="number-pad"
                      maxLength={5}
                      returnKeyType="next"
                    />
                  </View>
                  {errors.issueDate
                    ? <Text style={styles.errorText}>{errors.issueDate}</Text>
                    : <Text style={styles.hintText}>Month and year (MM/YY)</Text>}
                </View>

                <Field
                  label="Certificate ID or number"
                  icon="barcode-outline"
                  placeholder="Optional reference number"
                  value={form.certId}
                  onChangeText={set('certId')}
                  hint="Leave blank if not applicable"
                  returnKeyType="done"
                />

                {/* ── Upload zone ── */}
                <Pressable
                  onPress={handleUpload}
                  style={({ pressed }) => [styles.uploadZone, (pressed || uploadPressed) && styles.uploadZonePressed]}
                >
                  <View style={styles.uploadIconWrap}>
                    <Ionicons
                      name={uploadName ? 'document-text' : 'cloud-upload-outline'}
                      size={26}
                      color={uploadName ? authColors.accent : authColors.textSecondary}
                    />
                  </View>
                  <View style={styles.uploadTextCol}>
                    {uploadName ? (
                      <>
                        <Text style={styles.uploadReadyTitle}>Certificate attached</Text>
                        <Text style={styles.uploadReadyName} numberOfLines={1}>{uploadName}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.uploadTitle}>Upload certificate</Text>
                        <Text style={styles.uploadSub}>PDF, JPG or PNG · max 10 MB</Text>
                      </>
                    )}
                  </View>
                  {uploadName && (
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); setUploadName(null); }}
                      hitSlop={8}
                      style={styles.uploadRemove}
                    >
                      <Ionicons name="close-circle" size={20} color={authColors.placeholder} />
                    </Pressable>
                  )}
                </Pressable>

              </Animated.View>
            </ScrollView>

            {/* ── Footer ── */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
              <ProgressBar pct={65} />
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

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { gap: 20 },

  headingBlock: { gap: 5, marginBottom: 4 },
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

  // ── Fields ──
  fieldsBlock: { gap: 16 },
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
  inputSpinner: { marginLeft: 4 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: authFonts.regular,
    color: authColors.text,
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

  suggestionsWrap: {
    marginTop: 4,
    backgroundColor: authColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(92,82,72,0.4)',
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 180,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,82,72,0.2)',
  },
  suggestionItemPressed: { backgroundColor: 'rgba(212,168,75,0.1)' },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: authFonts.regular,
    color: authColors.text,
  },

  // ── Upload zone ──
  uploadZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: authColors.inputBg,
    borderRadius: authLayout.inputRadius,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(212,168,75,0.35)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  uploadZonePressed: { opacity: 0.8 },
  uploadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(212,168,75,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  uploadTextCol: { flex: 1, gap: 3 },
  uploadTitle: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    letterSpacing: 0.1,
  },
  uploadSub: {
    fontSize: 12,
    fontFamily: authFonts.regular,
    color: authColors.placeholder,
  },
  uploadReadyTitle: {
    fontSize: 14,
    fontFamily: authFonts.semiBold,
    color: authColors.text,
  },
  uploadReadyName: {
    fontSize: 12,
    fontFamily: authFonts.regular,
    color: authColors.placeholder,
  },
  uploadRemove: { flexShrink: 0 },

  // ── Footer ──
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
    letterSpacing: 0.4,
  },
});
