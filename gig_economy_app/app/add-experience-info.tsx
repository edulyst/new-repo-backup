import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
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

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;
const BTN = 38;
const MAX_DESC = 280;

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

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

export default function AddExperienceInfoScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const category = params.category ?? 'Receptionist';

  const [businessName, setBusinessName] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentRole, setCurrentRole] = useState(false);
  const [description, setDescription] = useState('');
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end' | null>(null);
  const [tempDate, setTempDate] = useState(new Date());
  const scrollRef = useRef<ScrollView>(null);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(18)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(formY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  const openStartPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempDate(startDate ?? new Date());
    setDatePickerMode('start');
  };

  const openEndPicker = () => {
    if (currentRole) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempDate(endDate ?? startDate ?? new Date());
    setDatePickerMode('end');
  };

  const handleDateChange = useCallback((event: { type: string }, date?: Date) => {
    if (event.type === 'dismissed' || !date) {
      setDatePickerMode(null);
      return;
    }
    if (datePickerMode === 'start') {
      setStartDate(date);
      if (endDate && date > endDate) setEndDate(date);
    } else if (datePickerMode === 'end') {
      setEndDate(date);
    }
    setDatePickerMode(null);
  }, [datePickerMode, endDate]);

  const confirmDatePicker = () => {
    if (datePickerMode === 'start') {
      setStartDate(tempDate);
      if (endDate && tempDate > endDate) setEndDate(tempDate);
    } else if (datePickerMode === 'end') {
      setEndDate(tempDate);
    }
    setDatePickerMode(null);
  };

  const descCount = description.length;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { height: insets.top }]} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>

        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.inner}>

            {/* ── Nav ── */}
            <View style={styles.navBar}>
              <NavBtn icon="chevron-back" onPress={() => router.back()} />
              <Text style={styles.navTitle}>Add experience info</Text>
              <View style={styles.navRight}>
                <NavBtn icon="help-circle-outline" onPress={() => {}} />
                <NavBtn icon="log-out-outline" onPress={() => {}} />
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Heading ── */}
              <Animated.View
                style={[styles.headingBlock, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
              >
                <Text style={styles.heading}>Add experience info</Text>
                <Text style={styles.subtitle}>
                  Try and be specific. Better descriptions of your work experience help hirers understand if you have the right skills.
                </Text>
              </Animated.View>

              {/* ── Category tags ── */}
              <Animated.View
                style={[styles.formBlock, { opacity: formOpacity, transform: [{ translateY: formY }] }]}
              >
                <View style={styles.tagRow}>
                  <View style={styles.tagSelected}>
                    <Ionicons name="checkmark-circle" size={16} color={authColors.background} />
                    <Text style={styles.tagSelectedText}>{category}</Text>
                  </View>
                  <Pressable
                    onPress={() => {}}
                    style={({ pressed }) => [styles.tagAdd, pressed && styles.tagAddPressed]}
                  >
                    <Ionicons name="add" size={16} color={authColors.textSecondary} />
                    <Text style={styles.tagAddText}>Category</Text>
                  </Pressable>
                </View>

                {/* Business name */}
                <View style={styles.field}>
                  <Text style={styles.label}>Business name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tap to input venue"
                    placeholderTextColor={authColors.placeholder}
                    value={businessName}
                    onChangeText={setBusinessName}
                    returnKeyType="next"
                  />
                </View>

                {/* Dates */}
                <View style={styles.row}>
                  <View style={[styles.field, styles.fieldHalf]}>
                    <Text style={styles.label}>Started</Text>
                    <Pressable style={styles.dateInput} onPress={openStartPicker}>
                      <Text style={startDate ? styles.dateInputText : styles.dateInputPlaceholder}>
                        {startDate ? formatDate(startDate) : 'Select date'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={authColors.placeholder} />
                    </Pressable>
                  </View>
                  <View style={[styles.field, styles.fieldHalf]}>
                    <Text style={styles.label}>Ended</Text>
                    <Pressable
                      style={[styles.dateInput, currentRole && styles.dateInputDisabled]}
                      onPress={openEndPicker}
                    >
                      <Text style={(endDate || currentRole) ? styles.dateInputText : styles.dateInputPlaceholder}>
                        {currentRole ? 'Present' : endDate ? formatDate(endDate) : 'Select date'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color={authColors.placeholder} />
                    </Pressable>
                  </View>
                </View>

                {/* Checkbox */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCurrentRole(prev => !prev);
                  }}
                  style={({ pressed }) => [styles.checkRow, pressed && styles.checkRowPressed]}
                >
                  <View style={[styles.checkbox, currentRole && styles.checkboxChecked]}>
                    {currentRole && <Ionicons name="checkmark" size={12} color={authColors.background} />}
                  </View>
                  <Text style={styles.checkLabel}>I'm currently working there</Text>
                </Pressable>

                {/* Experience description */}
                <View style={styles.field}>
                  <Text style={styles.label}>Experience</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe what you did there"
                    placeholderTextColor={authColors.placeholder}
                    value={description}
                    onChangeText={(t) => setDescription(t.slice(0, MAX_DESC))}
                    onFocus={() => {
                      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 400);
                    }}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={styles.charCount}>{descCount}/{MAX_DESC}</Text>
                </View>
              </Animated.View>
            </ScrollView>

            {/* Date picker — iOS modal, Android native dialog */}
            {datePickerMode && (
              Platform.OS === 'ios' ? (
                <Modal visible transparent animationType="slide">
                  <Pressable
                    style={styles.datePickerOverlay}
                    onPress={() => setDatePickerMode(null)}
                  >
                    <Pressable style={styles.datePickerSheet} onPress={(e) => e.stopPropagation()}>
                      <View style={styles.datePickerToolbar}>
                        <Pressable onPress={() => setDatePickerMode(null)} style={styles.datePickerBtn}>
                          <Text style={styles.datePickerCancel}>Cancel</Text>
                        </Pressable>
                        <Text style={styles.datePickerTitle}>
                          {datePickerMode === 'start' ? 'Start date' : 'End date'}
                        </Text>
                        <Pressable onPress={confirmDatePicker} style={styles.datePickerBtn}>
                          <Text style={styles.datePickerDone}>Done</Text>
                        </Pressable>
                      </View>
                      <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display="spinner"
                        onChange={(_, date) => date && setTempDate(date)}
                        maximumDate={new Date()}
                        minimumDate={datePickerMode === 'end' && startDate ? startDate : undefined}
                      />
                    </Pressable>
                  </Pressable>
                </Modal>
              ) : (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={datePickerMode === 'end' && startDate ? startDate : undefined}
                  maximumDate={new Date()}
                />
              )
            )}

            {/* ── Save ── */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
              >
                <Text style={styles.saveLabel}>Save</Text>
              </Pressable>
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
  navTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: authFonts.semiBold,
    color: authColors.text,
    textAlign: 'center',
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

  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 24,
  },

  headingBlock: {
    gap: 6,
    marginBottom: 20,
  },
  heading: {
    fontSize: 34,
    fontFamily: authFonts.titleBold,
    color: authColors.text,
    lineHeight: 42,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: authFonts.regular,
    color: authColors.textSecondary,
    lineHeight: 22,
  },

  formBlock: {
    gap: 16,
  },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: authColors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
  },
  tagSelectedText: {
    fontSize: 14,
    fontFamily: authFonts.semiBold,
    color: authColors.background,
  },
  tagAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: authColors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
  },
  tagAddPressed: { opacity: 0.8 },
  tagAddText: {
    fontSize: 14,
    fontFamily: authFonts.semiBold,
    color: authColors.textSecondary,
  },

  field: {
    gap: 6,
  },
  fieldHalf: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
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
    fontSize: authLayout.inputFontSize,
    fontFamily: authFonts.regular,
    color: authColors.text,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: authColors.inputBg,
    borderRadius: authLayout.inputRadius,
    borderWidth: 1.5,
    borderColor: 'rgba(92,82,72,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateInputDisabled: {
    opacity: 0.6,
  },
  dateInputText: {
    fontSize: authLayout.inputFontSize,
    fontFamily: authFonts.regular,
    color: authColors.text,
  },
  dateInputPlaceholder: {
    fontSize: authLayout.inputFontSize,
    fontFamily: authFonts.regular,
    color: authColors.placeholder,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 11,
    fontFamily: authFonts.regular,
    color: authColors.placeholder,
    alignSelf: 'flex-end',
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  checkRowPressed: { opacity: 0.8 },
  checkbox: {
    width: authLayout.checkboxSize,
    height: authLayout.checkboxSize,
    borderRadius: authLayout.checkboxRadius,
    borderWidth: 2,
    borderColor: authColors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: authColors.accent,
    borderColor: authColors.accent,
  },
  checkLabel: {
    fontSize: 15,
    fontFamily: authFonts.regular,
    color: authColors.text,
  },

  footer: {
    paddingTop: 16,
    paddingHorizontal: 0,
  },
  saveBtn: {
    backgroundColor: authColors.accent,
    borderRadius: authLayout.primaryButtonRadius,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: { opacity: 0.88 },
  saveLabel: {
    fontSize: 17,
    fontFamily: authFonts.bold,
    color: authColors.background,
    letterSpacing: 0.5,
  },

  // ── Date picker modal ──
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerSheet: {
    backgroundColor: authColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,82,72,0.4)',
  },
  datePickerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  datePickerCancel: {
    fontSize: 16,
    fontFamily: authFonts.regular,
    color: authColors.textSecondary,
  },
  datePickerDone: {
    fontSize: 16,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
  },
  datePickerTitle: {
    fontSize: 16,
    fontFamily: authFonts.semiBold,
    color: authColors.text,
  },
});
