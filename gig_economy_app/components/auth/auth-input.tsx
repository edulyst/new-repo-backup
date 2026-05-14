import type { ReactNode } from 'react';
import type { TextInputProps, ViewStyle } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';

import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';

export interface AuthInputProps extends TextInputProps {
  /** Optional icon shown on the left inside the input. */
  leftIcon?: ReactNode;
}

/** Themed text input for auth forms; optional left icon and placeholder. */
export function AuthInput({ leftIcon, style, ...props }: AuthInputProps) {
  const inputStyle = [styles.input, style];

  if (leftIcon) {
    return (
      <View style={[styles.wrapper, style as ViewStyle]}>
        <View style={styles.iconWrap}>{leftIcon}</View>
        <TextInput
          placeholderTextColor={authColors.placeholder}
          style={[styles.input, styles.inputWithIcon]}
          {...props}
        />
      </View>
    );
  }

  return (
    <TextInput
      placeholderTextColor={authColors.placeholder}
      style={inputStyle}
      {...props}
    />
  );
}

const ICON_GAP = 12;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: authSpacing.md,
    backgroundColor: authColors.inputBg,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: authLayout.inputRadius,
  },
  iconWrap: {
    paddingLeft: authSpacing.md,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: authSpacing.md,
    fontSize: authLayout.inputFontSize,
    fontFamily: authFonts.regular,
    color: authColors.text,
    marginBottom: authSpacing.md,
  },
  inputWithIcon: {
    paddingLeft: ICON_GAP,
    marginBottom: 0,
  },
});

