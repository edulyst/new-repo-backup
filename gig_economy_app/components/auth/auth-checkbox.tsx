import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';

type AuthCheckboxProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};

/** Checkbox row for "Remember Me" with visible checkmark when checked. */
export function AuthCheckbox({ label, checked, onToggle }: AuthCheckboxProps) {
  return (
    <Pressable onPress={onToggle} style={styles.row} hitSlop={8}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && (
          <Ionicons name="checkmark" size={14} color={authColors.background} />
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  box: {
    width: authLayout.checkboxSize,
    height: authLayout.checkboxSize,
    borderRadius: authLayout.checkboxRadius,
    borderWidth: 1.5,
    borderColor: authColors.border,
    marginRight: authSpacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: authColors.accent,
    borderColor: authColors.accent,
  },
  label: {
    fontSize: authLayout.smallFontSize,
    fontFamily: authFonts.regular,
    color: authColors.text,
  },
});

