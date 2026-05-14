/**
 * Open turn-by-turn directions in the system maps app, with in-app browser fallback.
 * iOS: Apple Maps (`maps.apple.com`) — avoids Google HTTPS issues in Expo / Simulator.
 * Android: Google Maps app or browser.
 */
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

function googleWebUrl(
  jobLat: number,
  jobLng: number,
  userLat?: number | null,
  userLng?: number | null,
): string {
  const hasUser =
    userLat != null &&
    userLng != null &&
    Number.isFinite(userLat) &&
    Number.isFinite(userLng);
  if (hasUser) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${jobLat},${jobLng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${jobLat},${jobLng}`;
}

export async function openMapsDirections(
  jobLat: number,
  jobLng: number,
  userLat?: number | null,
  userLng?: number | null,
): Promise<void> {
  const fallback = googleWebUrl(jobLat, jobLng, userLat, userLng);
  const hasUser =
    userLat != null &&
    userLng != null &&
    Number.isFinite(userLat) &&
    Number.isFinite(userLng);

  try {
    if (Platform.OS === 'ios') {
      const apple = hasUser
        ? `http://maps.apple.com/?saddr=${encodeURIComponent(`${userLat},${userLng}`)}&daddr=${encodeURIComponent(`${jobLat},${jobLng}`)}`
        : `http://maps.apple.com/?daddr=${encodeURIComponent(`${jobLat},${jobLng}`)}`;
      await Linking.openURL(apple);
      return;
    }
    const g = hasUser
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${jobLat},${jobLng}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${jobLat},${jobLng}`;
    await Linking.openURL(g);
    return;
  } catch (e) {
    console.warn('[openMapsDirections] Linking failed, opening in browser', e);
    try {
      await WebBrowser.openBrowserAsync(fallback);
    } catch (e2) {
      console.warn('[openMapsDirections] WebBrowser failed', e2);
    }
  }
}
