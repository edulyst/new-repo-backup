/**
 * Single settings row – label, value/subtitle, badge, chevron.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppThemeColors } from '@/contexts/AppThemeContext';
import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';

interface Props {
  label: string;
  value?: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
  colors: AppThemeColors;
  multiline?: boolean;
}

export function SettingItem({ label, value, subtitle, badge, onPress, colors, multiline = false }: Props) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: colors.surface, borderBottomColor: colors.border + '40', opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '44' }]}>
              <Text style={[styles.badgeText, { color: colors.accent }]}>{badge}</Text>
            </View>
          )}
        </View>
        {value ? (
          <Text style={[styles.value, { color: colors.textSecondary }, multiline && styles.valueMultiline]}>{value}</Text>
        ) : subtitle ? (
          <Text style={[styles.subtitle, { color: colors.placeholder }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 18,
    backgroundColor: authColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: { flex: 1, gap: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontFamily: authFonts.bold,
  },
  value: {
    fontSize: 14,
    fontFamily: authFonts.regular,
    marginTop: 2,
  },
  valueMultiline: {
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: authFonts.regular,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: authFonts.bold,
    letterSpacing: 0.3,
  },
});
