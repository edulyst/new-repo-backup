/**
 * Auth asset sources. All image refs in one place; screens use these constants.
 */
export const authAssets = {
  background: require('@/assets/images/illustrations/auth_01.jpg'),
  avatars: [
    require('@/assets/images/Avatar.png'),
    require('@/assets/images/Avatar2.png'),
    require('@/assets/images/Avatar3.png'),
  ],
  social: {
    google: require('@/assets/images/illustrations/google.png'),
    apple: require('@/assets/images/illustrations/apple-logo.png'),
  },
} as const;

