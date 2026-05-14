import { StyleSheet, Text, View } from 'react-native';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';

const APP_NAME = 'Initiate';
const TAGLINE = 'Your gigs, your schedule, your growth.';

export function AuthHeader() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.appName}>{APP_NAME}</Text>
      <Text style={styles.tagline}>{TAGLINE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: authSpacing.sm,
    paddingBottom: authSpacing.xs,
  },
  appName: {
    fontSize: 30,
    fontFamily: authFonts.bold,
    color: authColors.text,
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 14,
    fontFamily: authFonts.regular,
    color: authColors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
});
