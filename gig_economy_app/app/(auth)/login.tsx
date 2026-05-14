import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthAvatarRow,
  AuthCheckbox,
  AuthFormCard,
  AuthFormHeader,
  AuthInput,
  AuthLink,
  AuthPrimaryButton,
  AuthScreenLayout,
  AuthSeparator,
  AuthSocialButton,
  AuthTermsBanner,
} from '@/components/auth';
import { authAssets } from '@/constants/auth-assets';
import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/lib/notification-service';

const INPUT_ICON_SIZE = 20;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const { sendOtp } = useAuth();
  const notification = useNotification();

  const handleSubmit = async () => {
    if (loading) return;
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendOtp({ email: email.trim().toLowerCase() });
      router.push({
        pathname: '/(auth)/otp-verify',
        params: { email: email.trim().toLowerCase(), maskedPhone: email.trim().toLowerCase() },
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : 'Login failed';
      notification.showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="light" />
      <AuthScreenLayout>
        <AuthFormCard>
          <AuthAvatarRow sources={[...authAssets.avatars]} />
          <AuthTermsBanner />

          <AuthFormHeader
            title="Log In"
            subtitle="Enter your email and we'll send a one-time code."
          />

          <AuthInput
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail-outline" size={INPUT_ICON_SIZE} color={authColors.placeholder} />}
          />

          <View style={styles.row}>
            <AuthCheckbox
              label="Remember Me"
              checked={rememberMe}
              onToggle={() => setRememberMe((v) => !v)}
            />
            <AuthLink label="Forgot Password?" onPress={() => { }} />
          </View>

          <AuthPrimaryButton label={loading ? 'Sending OTP…' : 'Send OTP'} onPress={handleSubmit} disabled={loading} />

          <AuthSeparator label="Or login with" />
          <View style={styles.socialRow}>
            <AuthSocialButton source={authAssets.social.google} />
            <AuthSocialButton source={authAssets.social.apple} />
          </View>
        </AuthFormCard>
      </AuthScreenLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: authSpacing.lg,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: authSpacing.lg,
  },
});
