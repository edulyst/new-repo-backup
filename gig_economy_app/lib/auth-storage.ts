import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoredUser } from '@/types';

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';

export async function getStoredAuth(): Promise<{
  token: string;
  user: StoredUser;
} | null> {
  try {
    const [token, userJson] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
    if (!token || !userJson) return null;
    const user = JSON.parse(userJson) as StoredUser;
    return { token, user };
  } catch {
    return null;
  }
}

export async function setStoredAuth(token: string, user: StoredUser): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
  } catch {
    // ignore
  }
}

export async function clearStoredAuth(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  } catch {
    // ignore
  }
}
