import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';

/** Always-visible Terms & Privacy notice shown at the top of auth forms. */
export function AuthTermsBanner() {
  return (
    <View style={styles.wrap}>
      <Ionicons
        name="shield-checkmark-outline"
        size={15}
        color={authColors.accent}
        style={styles.icon}
      />
      <Text style={styles.text} numberOfLines={1}>
        You accept our <Text style={styles.link}>Terms</Text> & <Text style={styles.link}>Privacy Policy</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: authColors.inputBg,
    borderRadius: 10,
    paddingHorizontal: authSpacing.sm,
    paddingVertical: 10,
    marginBottom: authSpacing.md,
    borderWidth: 1,
    borderColor: authColors.border,
  },
  icon: {
    marginRight: 7,
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontFamily: authFonts.regular,
    color: authColors.textSecondary,
    lineHeight: 18,
  },
  link: {
    color: authColors.accent,
    fontFamily: authFonts.semiBold,
    textDecorationLine: 'underline',
    textDecorationColor: authColors.accent,
  },
});
