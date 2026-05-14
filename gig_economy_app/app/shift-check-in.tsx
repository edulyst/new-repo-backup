import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { authFonts, authSpacing } from '@/constants/auth-theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useNotification } from '@/lib/notification-service';
import { appendShiftTimelineEvent } from '@/lib/shift-flow-storage';

const CHECKIN_KEY = 'shift_checkin_verified_ids_v1';

function buildOtp(shiftId: string): string {
  let hash = 0;
  for (let i = 0; i < shiftId.length; i += 1) {
    hash = (hash * 31 + shiftId.charCodeAt(i)) % 1000000;
  }
  return String(Math.abs(hash)).padStart(6, '0');
}

export default function ShiftCheckInScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const notification = useNotification();
  const { shiftId = '', role = 'Shift', employer = '', venue = '', time = '' } = useLocalSearchParams<{
    shiftId?: string;
    role?: string;
    employer?: string;
    venue?: string;
    time?: string;
  }>();
  const [inputOtp, setInputOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  const otp = useMemo(() => buildOtp(String(shiftId || 'shift')), [shiftId]);
  const dateLabel = useMemo(() => {
    if (!time) return 'Today';
    const d = new Date(time);
    if (Number.isNaN(d.getTime())) return 'Today';
    return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [time]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: colors.border + '30' }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.65 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Check-in</Text>
          <View style={styles.headerBtn} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
            >
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + '35' }]}>
                <Text style={[styles.role, { color: colors.text }]}>{role}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{employer || 'Employer'}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{venue || 'Venue will be shared'}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{dateLabel}</Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + '35' }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your attendance OTP</Text>
                <Text style={[styles.sectionHint, { color: colors.placeholder }]}>
                  Share this OTP with your employer for attendance verification.
                </Text>
                <Text style={[styles.otpText, { color: colors.text }]}>{otp}</Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + '35' }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Employer verification</Text>
                <TextInput
                  value={inputOtp}
                  onChangeText={(v) => setInputOtp(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  placeholder="Enter OTP confirmed by employer"
                  placeholderTextColor={colors.placeholder}
                  style={[
                    styles.input,
                    { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border + '50' },
                  ]}
                />

                <Pressable
                  disabled={verifying || inputOtp.length !== 6}
                  onPress={async () => {
                    if (verifying) return;
                    setVerifying(true);
                    try {
                      if (inputOtp !== otp) {
                        notification.showError('OTP does not match. Please re-check with employer.', 'Verification failed');
                        return;
                      }
                      const raw = await AsyncStorage.getItem(CHECKIN_KEY);
                      const ids = raw ? (JSON.parse(raw) as string[]) : [];
                      const next = Array.from(new Set([...ids, String(shiftId)]));
                      await AsyncStorage.setItem(CHECKIN_KEY, JSON.stringify(next));
                      await appendShiftTimelineEvent({
                        shiftId: String(shiftId),
                        type: 'checked_in',
                        title: 'Attendance verified',
                        message: 'Employer OTP verification completed.',
                      });
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      notification.showSuccess('Attendance verified successfully.', 'Check-in complete');
                      router.replace('/(tabs)/schedule');
                    } finally {
                      setVerifying(false);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.verifyBtn,
                    { backgroundColor: inputOtp.length === 6 ? '#2563EB' : '#64748B', opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <Text style={styles.verifyTxt}>{verifying ? 'Verifying…' : 'Verify attendance'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: authFonts.semiBold,
  },
  content: {
    padding: authSpacing.lg,
    gap: 12,
    flexGrow: 1,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  role: {
    fontSize: 17,
    fontFamily: authFonts.semiBold,
  },
  meta: {
    fontSize: 13,
    fontFamily: authFonts.regular,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: authFonts.regular,
  },
  otpText: {
    marginTop: 4,
    fontSize: 32,
    letterSpacing: 6,
    fontFamily: authFonts.bold,
  },
  input: {
    marginTop: 6,
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: authFonts.regular,
  },
  verifyBtn: {
    marginTop: 10,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyTxt: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: authFonts.semiBold,
  },
});
