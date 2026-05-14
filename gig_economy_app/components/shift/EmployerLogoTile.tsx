import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

type Props = {
  uri: string | null | undefined;
  size: number;
  borderColor: string;
  iconColor: string;
  /** Feed tiles: `contain` keeps brand marks proportional; `cover` fills (may crop). */
  contentFit?: 'contain' | 'cover';
  backgroundColor?: string;
};

/**
 * Square employer logo tile with inner padding so marks aren’t clipped or stretched at the edges.
 */
export function EmployerLogoTile({
  uri,
  size,
  borderColor,
  iconColor,
  contentFit = 'contain',
  backgroundColor = '#FFFFFF',
}: Props) {
  const inner = size - Math.max(8, Math.round(size * 0.2));
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: Math.max(10, Math.round(size * 0.28)),
          borderColor,
          backgroundColor,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: inner, height: inner }}
          contentFit={contentFit}
          transition={120}
          cachePolicy="memory-disk"
        />
      ) : (
        <Ionicons name="business-outline" size={Math.round(size * 0.38)} color={iconColor} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
