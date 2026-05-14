/**
 * API configuration.
 * Set EXPO_PUBLIC_API_URL in .env for your environment.
 * - Web / iOS Simulator: http://localhost:3000
 * - Android Emulator: http://10.0.2.2:3000
 * - Physical device: http://YOUR_IP:3000
 */
export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) || 'http://localhost:3000';
