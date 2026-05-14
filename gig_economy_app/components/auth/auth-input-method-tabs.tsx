import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';

export type InputMethod = 'email' | 'phone';

type Props = {
  value: InputMethod;
  onChange: (value: InputMethod) => void;
};

const TABS: { key: InputMethod; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

const PADDING = 5;
const RADIUS = authLayout.inputRadius - 2;

/** Sliding pill toggle to switch between Email and Phone login. */
export function AuthInputMethodTabs({ value, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(value === 'email' ? 0 : 1)).current;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: value === 'email' ? 0 : 1,
      useNativeDriver: false,
      bounciness: 0,
      speed: 18,
    }).start();
  }, [value, slideAnim]);

  const sliderLeft = width > 0
    ? slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [PADDING, PADDING + (width - PADDING * 2) / 2],
    })
    : PADDING;

  const sliderWidth = width > 0 ? (width - PADDING * 2) / 2 : 0;

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {width > 0 && (
        <Animated.View
          style={[
            styles.slider,
            {
              left: sliderLeft,
              width: sliderWidth,
              borderRadius: RADIUS,
            },
          ]}
        />
      )}
      {TABS.map((tab) => (
        <Pressable
          key={tab.key}
          style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
          onPress={() => onChange(tab.key)}
        >
          <Text style={[styles.label, value === tab.key && styles.labelActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: authColors.inputBg,
    borderRadius: authLayout.inputRadius,
    padding: PADDING,
    marginBottom: authSpacing.md,
    position: 'relative',
    borderWidth: 1,
    borderColor: authColors.border,
  },
  slider: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    backgroundColor: authColors.surfaceElevated,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: authSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS,
    zIndex: 1,
  },
  tabPressed: {
    opacity: 0.9,
  },
  label: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
    color: authColors.textSecondary,
  },
  labelActive: {
    color: authColors.accent,
  },
});
