import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="phone-entry" />
        <Stack.Screen name="otp-verify" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack>
    </ThemeProvider>
  );
}
