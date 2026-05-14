import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { authColors, authLayout, authSpacing } from '@/constants/auth-theme';

type AuthFormCardProps = {
  children: ReactNode;
  /** Optional bottom padding (e.g. home indicator). */
  paddingBottom?: number;
};

/** Full-height form card. Edge-to-edge, no rounded corners. */
export function AuthFormCard({ children, paddingBottom = 0 }: AuthFormCardProps) {
  return (
    <View style={[styles.card, paddingBottom > 0 && { paddingBottom }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: authColors.surface,
    paddingHorizontal: authSpacing.lg,
    paddingTop: authSpacing.md,
  },
});

