import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/contexts/AppThemeContext';

export function TabBackground() {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.background,
        { backgroundColor: isDark ? colors.background : '#ECEFF4' },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  background: { opacity: 1 },
});
