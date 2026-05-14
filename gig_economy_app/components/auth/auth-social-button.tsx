import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

import { authColors, authLayout } from '@/constants/auth-theme';

import type { ImageSource } from 'expo-image';

type AuthSocialButtonProps = {
  source: ImageSource;
  onPress?: () => void;
};

/** Circular social sign-in button (Google, Apple). */
export function AuthSocialButton({ source, onPress }: AuthSocialButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Image source={source} style={styles.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: authLayout.socialButtonSize,
    height: authLayout.socialButtonSize,
    borderRadius: authLayout.socialButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.socialButtonBg,
    padding: 12,
  },
  pressed: { opacity: 0.9 },
  icon: {
    width: authLayout.socialIconSize,
    height: authLayout.socialIconSize,
  },
});

