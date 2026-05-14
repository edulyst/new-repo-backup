import { Image } from 'expo-image';
import { Dimensions, StyleSheet, View } from 'react-native';

import { authAssets } from '@/constants/auth-assets';
import { authColors } from '@/constants/auth-theme';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
export const PARALLAX_IMAGE_HEIGHT = WINDOW_HEIGHT;

/** Static background image (no parallax). */
export function ParallaxBackground() {
  return (
    <View style={styles.wrap}>
      <Image source={authAssets.background} style={styles.image} contentFit="cover" />
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: PARALLAX_IMAGE_HEIGHT,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: authColors.overlay,
  },
});
