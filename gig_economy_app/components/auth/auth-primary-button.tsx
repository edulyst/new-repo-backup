import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors, authFonts, authLayout } from '@/constants/auth-theme';

type AuthPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  /** Optional right icon (e.g. arrow for signup). */
  rightIcon?: React.ReactNode;
  /** Use slightly larger radius and font for signup CTA. */
  variant?: 'default' | 'signup';
  disabled?: boolean;
};

/** Primary CTA button for auth forms. */
export function AuthPrimaryButton({
  label,
  onPress,
  rightIcon,
  variant = 'default',
  disabled = false,
}: AuthPrimaryButtonProps) {
  const isSignup = variant === 'signup';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        isSignup && styles.buttonSignup,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          isSignup && styles.labelSignup,
        ]}
      >
        {label}
      </Text>
      {rightIcon != null ? <View style={styles.iconWrap}>{rightIcon}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: authColors.accent,
    paddingVertical: 16,
    borderRadius: authLayout.primaryButtonRadius,
    alignItems: 'center',
  },
  buttonSignup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: authLayout.primaryButtonIconGap,
    paddingVertical: 18,
    borderRadius: authLayout.primaryButtonRadiusSignup,
  },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  label: {
    fontSize: authLayout.primaryButtonFontSize,
    fontFamily: authFonts.semiBold,
    color: authColors.background,
  },
  labelSignup: {
    fontSize: authLayout.primaryButtonFontSizeSignup,
  },
  iconWrap: {},
});

