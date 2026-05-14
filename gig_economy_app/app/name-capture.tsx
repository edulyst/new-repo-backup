import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthFormCard,
  AuthFormHeader,
  AuthInput,
  AuthPrimaryButton,
  AuthScreenLayout,
} from '@/components/auth';
import { authColors, authSpacing } from '@/constants/auth-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/lib/notification-service';
import { updateMe } from '@/lib/users-api';

const INPUT_ICON_SIZE = 20;

export default function NameCaptureScreen() {
  const { user, updateUser } = useAuth();
  const notification = useNotification();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [loading, setLoading] = useState(false);

  const canContinue = firstName.trim().length > 0 && lastName.trim().length > 0 && !loading;

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const cleanFirst = firstName.trim();
      const cleanLast = lastName.trim();
      await updateMe({ firstName: cleanFirst, lastName: cleanLast });
      await updateUser({ firstName: cleanFirst, lastName: cleanLast });
      router.replace('/goal-select');
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : 'Could not save your name';
      notification.showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <AuthScreenLayout>
          <AuthFormCard>
            <AuthFormHeader
              title="What would you like us to call you?"
              subtitle="Please enter your first and last name so your profile is saved correctly."
            />

            <AuthInput
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              leftIcon={<Ionicons name="person-outline" size={INPUT_ICON_SIZE} color={authColors.placeholder} />}
            />

            <AuthInput
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              leftIcon={<Ionicons name="person-outline" size={INPUT_ICON_SIZE} color={authColors.placeholder} />}
            />

            <AuthPrimaryButton
              label={loading ? 'Saving…' : 'Continue'}
              onPress={handleContinue}
              disabled={!canContinue}
            />

            <Pressable onPress={() => router.replace('/(tabs)')} style={({ pressed }) => [styles.skipBtn, pressed && styles.skipPressed]}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </AuthFormCard>
        </AuthScreenLayout>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  flex: { flex: 1 },
  skipBtn: {
    alignSelf: 'center',
    marginTop: authSpacing.md,
    paddingHorizontal: authSpacing.md,
    paddingVertical: 8,
  },
  skipPressed: { opacity: 0.7 },
  skipText: { color: authColors.textSecondary, fontSize: 14 },
});
