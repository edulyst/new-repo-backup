import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';

type AuthFormHeaderProps = {
  title: ReactNode;
  subtitle: string;
};

/** Form card title + subtitle block. */
export function AuthFormHeader({ title, subtitle }: AuthFormHeaderProps) {
  const isString = typeof title === 'string';
  return (
    <View style={styles.wrap}>
      {isString ? (
        <Text style={styles.title}>{title}</Text>
      ) : (
        <View style={styles.titleRow}>{title}</View>
      )}
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: authSpacing.lg },
  title: {
    fontSize: authLayout.formTitleSize,
    fontFamily: authFonts.bold,
    color: authColors.text,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: authLayout.formSubtitleSize,
    fontFamily: authFonts.regular,
    color: authColors.textSecondary,
    lineHeight: authLayout.formSubtitleLineHeight,
  },
});

