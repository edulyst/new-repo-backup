// Merges app.json and injects `extra.eas.projectId` (required for getExpoPushTokenAsync in SDK 50+).
// Override with EXPO_PUBLIC_EAS_PROJECT_ID or EAS_PROJECT_ID in .env if you use a different EAS project.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('./app.json');

/** Default EAS project (@newexpouserbuild/gig_economy_app on expo.dev). */
const DEFAULT_EAS_PROJECT_ID = '530f38fb-af83-466e-b643-6009526a27ea';
const DEFAULT_ANDROID_PACKAGE = 'com.newexpouserbuild.gig_economy_app';

const projectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
  process.env.EAS_PROJECT_ID ||
  app.expo?.extra?.eas?.projectId ||
  DEFAULT_EAS_PROJECT_ID;

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  ...app,
  expo: {
    ...app.expo,
    android: {
      ...(app.expo.android || {}),
      package: app.expo?.android?.package || DEFAULT_ANDROID_PACKAGE,
    },
    extra: {
      ...(app.expo.extra || {}),
      eas: {
        ...(app.expo.extra?.eas || {}),
        ...(projectId ? { projectId: String(projectId).trim() } : {}),
      },
    },
  },
};
