import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { authFonts, authSpacing } from '@/constants/auth-theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'words',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.inputWrap}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.inputBg,
            borderColor: colors.border + '55',
          },
        ]}
      />
    </View>
  );
}

export default function BankDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState('');

  const canSave = useMemo(() => {
    return (
      holderName.trim().length > 1 &&
      bankName.trim().length > 1 &&
      accountNumber.trim().length > 5 &&
      ifscCode.trim().length >= 8
    );
  }, [holderName, bankName, accountNumber, ifscCode]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top,
              backgroundColor: colors.background,
              borderBottomColor: colors.border + '35',
            },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={14}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bank Details</Text>
          <View style={styles.headerBtn} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
          >
            <View style={styles.formSection}>
              <FormInput
                label="Account holder name"
                value={holderName}
                onChangeText={setHolderName}
                placeholder="Enter full name"
              />
              <FormInput
                label="Bank name"
                value={bankName}
                onChangeText={setBankName}
                placeholder="Enter bank name"
              />
              <FormInput
                label="Account number"
                value={accountNumber}
                onChangeText={(v) => setAccountNumber(v.replace(/\D/g, '').slice(0, 18))}
                placeholder="Enter account number"
                keyboardType="numeric"
                autoCapitalize="none"
              />
              <FormInput
                label="IFSC code"
                value={ifscCode}
                onChangeText={(v) => setIfscCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                placeholder="e.g. SBIN0001234"
                autoCapitalize="characters"
              />
              <FormInput
                label="Branch name"
                value={branchName}
                onChangeText={setBranchName}
                placeholder="Enter branch name"
              />
              <FormInput
                label="Branch city"
                value={branchCity}
                onChangeText={setBranchCity}
                placeholder="Enter city"
              />
            </View>

            <Pressable
              disabled={!canSave}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              }}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: canSave ? colors.text : colors.border,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <Text style={[styles.saveText, { color: colors.background }]}>Save Details</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerBtnPressed: { opacity: 0.6 },
  headerTitle: {
    fontSize: 17,
    fontFamily: authFonts.semiBold,
    letterSpacing: 0.2,
  },
  content: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 16,
    gap: 18,
  },
  formSection: { gap: 12 },
  inputWrap: { gap: 6 },
  inputLabel: {
    fontSize: 13,
    fontFamily: authFonts.regular,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: authFonts.regular,
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
    letterSpacing: 0.2,
  },
});
