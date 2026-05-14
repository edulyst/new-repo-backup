/**
 * OTP verification – Second step after phone entry
 * Flow: Phone → OTP → Goal select → Profile completion
 * Dark theme with circular OTP digit boxes.
 */
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthAvatarRow,
  AuthFormCard,
  AuthFormHeader,
  AuthLink,
  AuthPrimaryButton,
  AuthScreenLayout,
} from '@/components/auth';
import { authAssets } from '@/constants/auth-assets';
import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/lib/notification-service';
import { getMe, updateMe } from '@/lib/users-api';

const OTP_LENGTH = 6;
const OTP_BOX_SIZE = 48;

/** Mask phone: show only last 3 digits as ***xyz */
function maskPhone(phone: string): string {
  if (!phone || phone.length < 3) return '***';
  return `***${phone.slice(-3)}`;
}

export default function OtpVerifyScreen() {
  const {
    phone = '',
    email = '',
    maskedPhone: paramMaskedPhone,
    firstName: paramFirstName,
    lastName: paramLastName,
  } = useLocalSearchParams<{ phone?: string; email?: string; maskedPhone?: string; firstName?: string; lastName?: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const otpRowRef = useRef<View>(null);
  const { verifyOtp } = useAuth();
  const notification = useNotification();

  const displayMaskedPhone = useMemo(
    () => paramMaskedPhone || (phone ? maskPhone(phone) : ''),
    [paramMaskedPhone, phone]
  );

  const handleVerify = useCallback(async () => {
    const digits = otp.replace(/\D/g, '');
    if (digits.length !== OTP_LENGTH) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    try {
      await verifyOtp({ phone: phone || undefined, email: email || undefined }, digits);

      let hasName = false;
      try {
        const me = await getMe();
        hasName = Boolean(me.firstName?.trim() && me.lastName?.trim());
      } catch {
        // Profile provisioning can lag briefly after OTP verification.
        hasName = false;
      }

      const firstName = typeof paramFirstName === 'string' ? paramFirstName.trim() : '';
      const lastName = typeof paramLastName === 'string' ? paramLastName.trim() : '';
      if (!hasName && firstName && lastName) {
        try {
          await updateMe({ firstName, lastName });
          hasName = true;
        } catch {
          hasName = false;
        }
      }

      router.replace(hasName ? '/goal-select' : '/name-capture');
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Invalid or expired OTP';
      notification.showError(msg);
    } finally {
      setLoading(false);
    }
  }, [otp, phone, email, verifyOtp, notification, paramFirstName, paramLastName]);

  const handleOtpChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
  };

  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => otp[i] ?? '');
  const valid = otp.replace(/\D/g, '').length === OTP_LENGTH;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="light" />
      <AuthScreenLayout scrollTargetRef={otpRowRef}>
        <AuthFormCard>
          <AuthAvatarRow sources={[...authAssets.avatars]} />
          <AuthFormHeader
            title={
              <>
                <Text style={styles.titleBase}>Enter OTP to </Text>
                <Text style={[styles.titleBase, styles.highlight]}>Verify</Text>
                <Text style={styles.titleBase}> your identity</Text>
              </>
            }
            subtitle={
              displayMaskedPhone
                ? `Code sent to ${displayMaskedPhone}`
                : 'Enter the 6-digit code we sent to your phone.'
            }
          />

          <View ref={otpRowRef} style={styles.otpContainer}>
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              style={styles.hiddenInput}
              autoFocus
            />
            <Pressable
              style={styles.otpRow}
              onPress={() => inputRef.current?.focus()}
            >
              {digits.map((digit, i) => {
                const isActive = i === otp.length;
                return (
                  <View
                    key={i}
                    style={[
                      styles.otpBox,
                      isActive && styles.otpBoxActive,
                    ]}
                  >
                    <Text style={styles.otpDigit}>{digit}</Text>
                  </View>
                );
              })}
            </Pressable>
          </View>

          <View style={styles.changeRow}>
            <AuthLink label="Change number" onPress={() => router.back()} />
          </View>

          <AuthPrimaryButton
            label={loading ? 'Verifying…' : 'Continue'}
            onPress={handleVerify}
            disabled={!valid || loading}
          />
        </AuthFormCard>
      </AuthScreenLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  titleBase: {
    fontSize: authLayout.formTitleSize,
    fontFamily: authFonts.bold,
    color: authColors.text,
  },
  highlight: {
    color: authColors.accent,
  },
  otpContainer: {
    marginBottom: authSpacing.md,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  otpBox: {
    width: OTP_BOX_SIZE,
    height: OTP_BOX_SIZE,
    borderRadius: OTP_BOX_SIZE / 2,
    backgroundColor: authColors.inputBg,
    borderWidth: 1,
    borderColor: authColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: authColors.accent,
    borderWidth: 2,
  },
  otpDigit: {
    fontSize: 20,
    fontFamily: authFonts.semiBold,
    color: authColors.text,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  changeRow: {
    marginBottom: authSpacing.lg,
    alignItems: 'center',
  },
});
