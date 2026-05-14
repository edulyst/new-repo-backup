/**
 * Emergency Contact screen
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

import { useAppTheme } from '@/contexts/AppThemeContext';
import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';
import { getSavedEmergencyContact, setSavedEmergencyContact } from '@/lib/account-details-storage';
import { useNotification } from '@/lib/notification-service';

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

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  isPhone = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  colors: ReturnType<typeof useAppTheme>['colors'];
  isPhone?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.fieldWrap}>
      <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[s.inputContainer, isPhone && { borderColor: focused ? colors.accent : colors.border, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5 }]}>
        {isPhone && (
          <View style={[s.phonePrefix, { borderRightColor: focused ? colors.accent + '40' : colors.border, backgroundColor: colors.inputBg }]}>
            <Text style={s.phonePrefixFlag}>🇮🇳</Text>
            <Text style={[s.phonePrefixCode, { color: colors.text }]}>+91</Text>
            <View style={[s.phoneDivider, { backgroundColor: focused ? colors.accent + '40' : colors.border }]} />
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={
            isPhone
              ? (text) => {
                  // Remove all non-digit characters
                  const cleaned = text.replace(/\D/g, '');
                  // Always allow setting the value, even if empty (for backspace)
                  // Only limit to 10 digits maximum
                  onChangeText(cleaned.slice(0, 10));
                }
              : onChangeText
          }
          placeholder={placeholder || label}
          placeholderTextColor={colors.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={isPhone ? 'phone-pad' : 'default'}
          maxLength={isPhone ? 10 : undefined}
          returnKeyType={isPhone ? 'done' : 'next'}
          style={[
            s.input,
            isPhone && s.inputWithPrefix,
            {
              backgroundColor: colors.inputBg,
              borderColor: isPhone ? 'transparent' : focused ? colors.accent : colors.border,
              borderWidth: isPhone ? 0 : 1.5,
              color: colors.text,
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function EmergencyContactScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const notification = useNotification();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');

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

  useEffect(() => {
    let mounted = true;
    const loadContact = async () => {
      const saved = await getSavedEmergencyContact();
      if (!mounted) return;
      setName(saved.name);
      setRelationship(saved.relationship);
      setPhone(saved.phone);
    };
    void loadContact();
    return () => {
      mounted = false;
    };
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
          <Text style={s.headerTitle}>Emergency Contact</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[s.notice, { backgroundColor: colors.accent + '14', borderColor: colors.accent + '44' }]}>
                <Ionicons name="alert-circle" size={20} color={colors.accent} />
                <Text style={[s.noticeText, { color: colors.textSecondary }]}>
                  Add a trusted contact who can be reached in case of emergency.
                </Text>
              </View>

              <InputField label="Full Name" value={name} onChangeText={setName} placeholder="Enter full name" colors={colors} />
              <InputField label="Relationship" value={relationship} onChangeText={setRelationship} placeholder="e.g. Spouse, Parent" colors={colors} />
              <InputField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="Enter 10-digit number" colors={colors} isPhone />

              <Pressable
                onPress={async () => {
                  if (!name.trim()) {
                    notification.showError('Contact name is required.');
                    return;
                  }
                  if (phone.length !== 10) {
                    notification.showError('Please enter a valid 10-digit phone number.');
                    return;
                  }
                  await setSavedEmergencyContact({
                    name: name.trim(),
                    relationship: relationship.trim(),
                    phone,
                  });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  notification.showSuccess('Emergency contact saved.');
                  router.back();
                }}
                style={({ pressed }) => [s.saveBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={s.saveBtnText}>Save Contact</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
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
  scrollContent: { paddingHorizontal: authSpacing.lg, paddingTop: 20, gap: 16 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  noticeText: { flex: 1, fontSize: 13, fontFamily: authFonts.regular, lineHeight: 19 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: authFonts.semiBold, letterSpacing: 0.8, textTransform: 'uppercase', color: authColors.textSecondary },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    minWidth: 80,
  },
  phonePrefixFlag: {
    fontSize: 18,
  },
  phonePrefixCode: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    marginLeft: 6,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: authFonts.regular,
    borderRadius: 14,
  },
  inputWithPrefix: {
    borderRadius: 0,
    paddingLeft: 12,
  },
  saveBtn: { borderRadius: 30, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontFamily: authFonts.bold, color: '#0D0D0D', letterSpacing: 0.3 },
});

