import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const LINE_COUNT = 5;
const DURATION = 2000;
const WAVE_AMPLITUDE = 10;

/** Animated wave dots below the Initi8Now text – runs continuously. */
export function WaveLines() {
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, { duration: DURATION, easing: Easing.linear }),
      -1,
      false
    );
  }, [phase]);

  return (
    <View style={styles.wrap}>
      {Array.from({ length: LINE_COUNT }).map((_, i) => (
        <WaveLine key={i} phase={phase} index={i} />
      ))}
    </View>
  );
}

function WaveLine({ phase, index }: { phase: SharedValue<number>; index: number }) {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const t = (phase.value + index * 0.2) % 1;
    const x = Math.sin(t * Math.PI * 2) * WAVE_AMPLITUDE;
    return { transform: [{ translateX: x }] };
  });

  return <Animated.View style={[styles.line, animatedStyle]} />;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  line: {
    width: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D4A84B',
    opacity: 0.8,
  },
});

