/**
 * Phone entry – First step: Enter phone number
 * Flow: Phone → OTP → Goal select → Profile completion
 * Dark, sober design with avatars in circular fashion.
 */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthAvatarRow,
  AuthFormCard,
  AuthFormHeader,
  AuthInput,
  AuthPrimaryButton,
  AuthScreenLayout,
  AuthTermsBanner,
} from '@/components/auth';
import { authAssets } from '@/constants/auth-assets';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/lib/notification-service';
import { authColors, authFonts } from '@/constants/auth-theme';

export default function PhoneEntryScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const inputWrapperRef = useRef<View>(null);
  const { sendOtp } = useAuth();
  const notification = useNotification();

  const handleContinue = useCallback(async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const { maskedTarget } = await sendOtp({ phone: digits });
      router.push({
        pathname: '/(auth)/otp-verify',
        params: { phone: digits, maskedPhone: maskedTarget },
      });
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Failed to send OTP';
      notification.showError(msg);
    } finally {
      setLoading(false);
    }
  }, [phone, sendOtp, notification]);

  const valid = phone.replace(/\D/g, '').length === 10;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="light" />
      <AuthScreenLayout scrollTargetRef={inputWrapperRef}>
        <AuthFormCard>
          <AuthAvatarRow sources={[...authAssets.avatars]} />
          <AuthTermsBanner />

          <AuthFormHeader
            title="Get started"
            subtitle="Enter your number and we'll send a one-time code to verify."
          />

          <View ref={inputWrapperRef}>
            <AuthInput
              placeholder="10-digit mobile number"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            autoFocus
            leftIcon={
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixFlag}>🇮🇳</Text>
                <Text style={styles.phonePrefixCode}>+91</Text>
                <View style={styles.phoneDivider} />
              </View>
            }
            />
          </View>

          <AuthPrimaryButton
            label={loading ? 'Sending…' : 'Continue'}
            onPress={handleContinue}
            disabled={!valid || loading}
          />
        </AuthFormCard>
      </AuthScreenLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    gap: 5,
  },
  phonePrefixFlag: { fontSize: 18, lineHeight: 22 },
  phonePrefixCode: { fontSize: 14, color: authColors.text, fontFamily: authFonts.semiBold },
  phoneDivider: {
    width: 1,
    height: 18,
    backgroundColor: authColors.border,
    marginLeft: 4,
  },
});
