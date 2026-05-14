import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { authColors } from '@/constants/auth-theme';

/** Set to false to skip onboarding when returning users. */
const ALWAYS_SHOW_ONBOARDING = false;

export default function IndexScreen() {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const t = setTimeout(() => {
      if (isAuthenticated) {
        const hasName = Boolean(user?.firstName?.trim() && user?.lastName?.trim());
        router.replace(hasName ? '/(tabs)' : '/name-capture');
      } else if (ALWAYS_SHOW_ONBOARDING) {
        router.replace('/onboarding');
      } else {
        router.replace('/(auth)/login');
      }
    }, 0);
    return () => clearTimeout(t);
  }, [isAuthenticated, isLoading, user?.firstName, user?.lastName]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.placeholder} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  placeholder: { flex: 1 },
});
