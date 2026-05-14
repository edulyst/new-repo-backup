import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { authFonts, authSpacing } from '@/constants/auth-theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

type MoneyTransaction = {
  id: string;
  title: string;
  date: string;
  amount: number;
};

const TRANSACTIONS: MoneyTransaction[] = [
  { id: 'tx-1', title: 'Hotel Shift - Friday Night', date: 'Apr 23, 2026', amount: 132.5 },
  { id: 'tx-2', title: 'Coffee Shop Shift', date: 'Apr 21, 2026', amount: 86.0 },
  { id: 'tx-3', title: 'Transport Reimbursement', date: 'Apr 20, 2026', amount: 18.0 },
  { id: 'tx-4', title: 'Payout to Bank', date: 'Apr 19, 2026', amount: -200.0 },
];

function toCurrency(amount: number) {
  const prefix = amount >= 0 ? '+' : '-';
  const value = Math.abs(amount).toFixed(2);
  return `${prefix}£${value}`;
}

export default function MoneyScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const totalIncome = TRANSACTIONS.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const totalPayouts = Math.abs(TRANSACTIONS.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0));
  const totalBalance = totalIncome - totalPayouts;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.accent }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={14}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Money</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        >
          <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border + '40' }]}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Total balance</Text>
            <Text style={[styles.balanceValue, { color: colors.text }]}>£{totalBalance.toFixed(2)}</Text>
            <Text style={[styles.balanceHint, { color: colors.placeholder }]}>From your completed work history</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border + '40' }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Income</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>£{totalIncome.toFixed(2)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border + '40' }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Payouts</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>£{totalPayouts.toFixed(2)}</Text>
            </View>
          </View>

          <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border + '40' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>
            {TRANSACTIONS.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border + '35' }]} /> : null}
                <View style={styles.transactionRow}>
                  <View style={styles.transactionTextBlock}>
                    <Text style={[styles.transactionTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.transactionDate, { color: colors.placeholder }]}>{item.date}</Text>
                  </View>
                  <Text style={[styles.transactionAmount, { color: colors.text }]}>{toCurrency(item.amount)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: authSpacing.lg,
    paddingBottom: 14,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerBtnPressed: { opacity: 0.65 },
  headerTitle: {
    fontSize: 17,
    fontFamily: authFonts.semiBold,
    color: '#FFF',
    letterSpacing: 0.2,
  },
  content: {
    paddingHorizontal: authSpacing.lg,
    paddingTop: 16,
    gap: 14,
  },
  balanceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 6,
  },
  balanceLabel: {
    fontSize: 13,
    fontFamily: authFonts.regular,
  },
  balanceValue: {
    fontSize: 30,
    fontFamily: authFonts.bold,
    letterSpacing: 0.2,
  },
  balanceHint: {
    fontSize: 12,
    fontFamily: authFonts.regular,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: authFonts.regular,
  },
  statValue: {
    fontSize: 20,
    fontFamily: authFonts.semiBold,
  },
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: authFonts.bold,
    marginBottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  transactionTextBlock: {
    flex: 1,
    gap: 3,
  },
  transactionTitle: {
    fontSize: 14,
    fontFamily: authFonts.semiBold,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: authFonts.regular,
  },
  transactionAmount: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
  },
});
