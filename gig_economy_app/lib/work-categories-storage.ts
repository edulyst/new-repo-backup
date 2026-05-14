import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'WORK_CATEGORIES_SELECTED';

/** Get selected work category IDs. Returns empty array if none. */
export async function getSelectedCategoryIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persist selected work category IDs. */
export async function setSelectedCategoryIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}
