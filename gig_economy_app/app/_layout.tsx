import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppThemeProvider } from '@/contexts/AppThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { WorkerLocationProvider } from '@/contexts/WorkerLocationContext';
import { AppQueryProvider } from '@/lib/query-client';
import { NotificationProvider } from '@/lib/notification-service';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppQueryProvider>
        <AppThemeProvider>
          <AuthProvider>
            <WorkerLocationProvider>
            <NotificationProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="goal-select" />
            <Stack.Screen name="name-capture" />
            <Stack.Screen name="verification" />
            <Stack.Screen name="work-categories" />
            <Stack.Screen name="add-experience" />
            <Stack.Screen name="add-experience-info" />
            <Stack.Screen name="add-education" />
            <Stack.Screen name="add-training" />
            <Stack.Screen name="my-training" />
            <Stack.Screen name="add-language" />
            <Stack.Screen name="about-me" />
            <Stack.Screen name="profile-photo" />
            <Stack.Screen name="intro-video" />
            <Stack.Screen name="skills-showcase" />
            <Stack.Screen name="what-next" />
            <Stack.Screen name="set-location" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="notification-settings" />
            <Stack.Screen name="notification-schedule" />
            <Stack.Screen name="notification-away-mode" />
            <Stack.Screen name="notification-categories" />
            <Stack.Screen name="notification-teams" />
            <Stack.Screen name="notification-type" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="bank-details" />
            <Stack.Screen name="emergency-contact" />
            <Stack.Screen name="teams" />
            <Stack.Screen name="referrals" />
            <Stack.Screen name="edit-email" />
            <Stack.Screen name="edit-phone" />
            <Stack.Screen name="edit-address" />
            <Stack.Screen name="address" />
            <Stack.Screen name="money" />
            <Stack.Screen name="shift-check-in" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
              </ThemeProvider>
            </NotificationProvider>
            </WorkerLocationProvider>
          </AuthProvider>
        </AppThemeProvider>
      </AppQueryProvider>
    </SafeAreaProvider>
  );
}
