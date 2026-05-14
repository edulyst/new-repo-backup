import { StyleSheet, Text, View } from 'react-native';

import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';

type AuthSeparatorProps = {
  label: string;
};

/** "Or login with" / "Or sign up with" line–text–line row. */
export function AuthSeparator({ label }: AuthSeparatorProps) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.text}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: authSpacing.lg,
    marginBottom: authSpacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: authColors.border,
  },
  text: {
    fontSize: authLayout.smallFontSize,
    fontFamily: authFonts.regular,
    color: authColors.textSecondary,
    paddingHorizontal: authSpacing.sm,
  },
});

