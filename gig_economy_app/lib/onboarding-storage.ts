import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ONBOARDING_SEEN';

/** Whether the user has completed onboarding. Persists across app restarts. */
export async function getOnboardingSeen(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function setOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // ignore
  }
}

