import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';

export type AuthSegment = 'login' | 'signup';

type Props = {
  value: AuthSegment;
  onChange: (value: AuthSegment) => void;
};

export function AuthSegmentTabs({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => onChange('login')}
        style={[styles.tab, value === 'login' && styles.tabActive]}
      >
        <Text style={[styles.tabText, value === 'login' && styles.tabTextActive]}>Login</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('signup')}
        style={[styles.tab, value === 'signup' && styles.tabActive]}
      >
        <Text style={[styles.tabText, value === 'signup' && styles.tabTextActive]}>Sign up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: authColors.inputBg,
    borderRadius: 14,
    padding: 4,
    marginBottom: authSpacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: authColors.surfaceElevated,
    shadowColor: authColors.background,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
    color: authColors.textSecondary,
  },
  tabTextActive: {
    color: authColors.accent,
  },
});
