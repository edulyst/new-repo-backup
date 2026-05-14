/**
 * Edit Email screen – Professional account management
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
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/lib/notification-service';
import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';

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

export default function EditEmailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { user, updateUser } = useAuth();
  const notification = useNotification();
  const [email, setEmail] = useState(user?.email ?? '');
  const [focused, setFocused] = useState(false);

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

  const handleSave = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!emailOk) {
      notification.showError('Please enter a valid email address.');
      return;
    }
    await updateUser({ email: trimmedEmail });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    notification.showSuccess('Email address saved.');
    router.back();
  };

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
          <Text style={s.headerTitle}>Email</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[s.iconWrap, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons name="mail" size={32} color={colors.accent} />
              </View>

              <Text style={[s.title, { color: colors.text }]}>Update Email Address</Text>
              <Text style={[s.subtitle, { color: colors.textSecondary }]}>
                Enter your new email address. We'll send a verification email to confirm.
              </Text>

              <View style={s.fieldWrap}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  placeholderTextColor={colors.placeholder}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={[
                    s.input,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: focused ? colors.accent : colors.border,
                      color: colors.text,
                    },
                  ]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [s.saveBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={s.saveBtnText}>Save Changes</Text>
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
  scrollContent: { paddingHorizontal: authSpacing.lg, paddingTop: 20, alignItems: 'center', gap: 20 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  title: { fontSize: 24, fontFamily: authFonts.bold, textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 14, fontFamily: authFonts.regular, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  fieldWrap: { width: '100%', gap: 8, marginTop: 8 },
  fieldLabel: { fontSize: 12, fontFamily: authFonts.semiBold, letterSpacing: 0.8, textTransform: 'uppercase' },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: authFonts.regular,
  },
  saveBtn: { width: '100%', borderRadius: 30, paddingVertical: 17, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontFamily: authFonts.bold, color: '#0D0D0D', letterSpacing: 0.3 },
});

