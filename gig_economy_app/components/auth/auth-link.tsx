import { Pressable, StyleSheet, Text } from 'react-native';

import { authColors, authFonts, authLayout } from '@/constants/auth-theme';

type AuthLinkProps = {
  label: string;
  onPress: () => void;
};

/** Accent-colored pressable link (e.g. Forgot Password). */
export function AuthLink({ label, onPress }: AuthLinkProps) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: authLayout.smallFontSize,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    textDecorationLine: 'underline',
    textDecorationColor: authColors.accent,
  },
});

