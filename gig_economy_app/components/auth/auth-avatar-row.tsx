import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { authColors, authLayout, authSpacing } from '@/constants/auth-theme';

import type { ImageSource } from 'expo-image';

const AVATAR_SIZE = 76;

/** Theme-based avatar background colors. */
const AVATAR_BGS = [
  authColors.avatarBg1,
  authColors.avatarBg2,
  authColors.avatarBg3,
] as const;

type AuthAvatarRowProps = {
  sources: ImageSource[];
};

/**
 * Avatars in staggered circular/diamond layout.
 * Top center, bottom-left, bottom-right. Tighter spacing.
 */
export function AuthAvatarRow({ sources }: AuthAvatarRowProps) {
  const [top, left, right] = sources.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {top && (
          <View style={[styles.avatarWrap, { backgroundColor: AVATAR_BGS[0] }]}>
            <Image source={top} style={styles.avatar} contentFit="cover" />
          </View>
        )}
      </View>
      <View style={styles.bottomRow}>
        {left && (
          <View style={[styles.avatarWrap, { backgroundColor: AVATAR_BGS[1] }]}>
            <Image source={left} style={styles.avatar} contentFit="cover" />
          </View>
        )}
        <View style={styles.spacer} />
        {right && (
          <View style={[styles.avatarWrap, { backgroundColor: AVATAR_BGS[2] }]}>
            <Image source={right} style={styles.avatar} contentFit="cover" />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: authSpacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  spacer: { flex: 1, minWidth: 4 },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: authColors.border,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
});
