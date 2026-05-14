import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthAvatarRow,
  AuthFormCard,
  AuthFormHeader,
  AuthInput,
  AuthPrimaryButton,
  AuthScreenLayout,
  AuthSeparator,
  AuthSocialButton,
  AuthTermsBanner,
} from '@/components/auth';
import { authAssets } from '@/constants/auth-assets';
import { authColors, authLayout, authSpacing } from '@/constants/auth-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/lib/notification-service';

const INPUT_ICON_SIZE = 20;

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { sendOtp } = useAuth();
  const notification = useNotification();

  const handleSubmit = async () => {
    if (loading) return;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) return;
    if (password !== confirmPassword) {
      notification.showError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await sendOtp({ email: normalizedEmail });
      router.push({
        pathname: '/(auth)/otp-verify',
        params: {
          email: normalizedEmail,
          maskedPhone: normalizedEmail,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        },
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : 'Signup failed';
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
            title="Sign Up"
            subtitle="Create an account and verify with OTP."
          />

          <View style={styles.nameRow}>
            <AuthInput
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              style={styles.inputHalf}
              leftIcon={
                <Ionicons name="person-outline" size={INPUT_ICON_SIZE} color={authColors.placeholder} />
              }
            />
            <AuthInput
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              style={styles.inputHalf}
              leftIcon={
                <Ionicons name="person-outline" size={INPUT_ICON_SIZE} color={authColors.placeholder} />
              }
            />
          </View>

          <AuthInput
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={
              <Ionicons name="mail-outline" size={INPUT_ICON_SIZE} color={authColors.placeholder} />
            }
          />
          <AuthInput
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={
              <Ionicons name="lock-closed-outline" size={INPUT_ICON_SIZE} color={authColors.placeholder} />
            }
          />
          <AuthInput
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            leftIcon={
              <Ionicons name="lock-closed-outline" size={INPUT_ICON_SIZE} color={authColors.placeholder} />
            }
          />

          <AuthPrimaryButton
            label={loading ? 'Sending OTP…' : 'Continue'}
            onPress={handleSubmit}
            disabled={loading}
            variant="signup"
            rightIcon={
              <Ionicons
                name="arrow-forward"
                size={authLayout.primaryButtonIconSize}
                color={authColors.background}
              />
            }
          />

          <AuthSeparator label="Or sign up with" />
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
  nameRow: {
    flexDirection: 'row',
    gap: authSpacing.lg,
    marginBottom: 0,
  },
  inputHalf: { flex: 1, minWidth: 0 },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: authSpacing.lg,
  },
});
