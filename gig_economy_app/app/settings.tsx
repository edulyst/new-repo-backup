/**
 * Settings screen – Professional account management interface.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingItem, SettingsBackground } from '@/components/settings';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getSavedAddress, getSavedEmergencyContact } from '@/lib/account-details-storage';
import { useNotification } from '@/lib/notification-service';
import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { logout, user } = useAuth();
  const notification = useNotification();
  const [addressText, setAddressText] = useState('');
  const [emergencyContactText, setEmergencyContactText] = useState('');

  const displayEmail = user?.email && !user.email.startsWith('p_') ? user.email : '';
  const displayPhone = user?.phone || '';

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const loadSavedDetails = async () => {
        const [savedAddress, savedEmergencyContact] = await Promise.all([
          getSavedAddress(),
          getSavedEmergencyContact(),
        ]);
        if (!mounted) return;
        const addressParts = [
          savedAddress.line1,
          savedAddress.line2,
          savedAddress.city,
          savedAddress.state,
          savedAddress.pinCode,
          savedAddress.country,
        ].filter((part) => part.trim().length > 0);
        const contactParts = [savedEmergencyContact.name, savedEmergencyContact.relationship, savedEmergencyContact.phone].filter(
          (part) => part.trim().length > 0
        );
        setAddressText(addressParts.join(', '));
        setEmergencyContactText(contactParts.join(' - '));
      };
      void loadSavedDetails();
      return () => {
        mounted = false;
      };
    }, [])
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <SettingsBackground colors={colors} />

        <Animated.View
          style={[
            styles.header,
            {
              paddingTop: insets.top,
              backgroundColor: colors.accent,
              opacity: headerOpacity,
              transform: [{ translateY: headerY }],
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
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Account</Text>
          <View style={styles.headerBtn} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={80}
        >
          <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
              keyboardShouldPersistTaps="handled"
            >
              {displayEmail ? (
                <SettingItem
                  label="Email"
                  value={displayEmail}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/edit-email');
                  }}
                  colors={colors}
                />
              ) : null}

              <SettingItem
                label="Phone"
                value={displayPhone || 'Not set'}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/edit-phone');
                }}
                colors={colors}
              />

              <SettingItem
                label="Bank details and Stream"
                subtitle="Tap to manage your bank information"
                badge="NEW"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/bank-details');
                }}
                colors={colors}
              />

              <SettingItem
                label="Money and transactions"
                subtitle="View total balance and work history payouts"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/money');
                }}
                colors={colors}
              />

              <SettingItem
                label="Address"
                value={addressText || undefined}
                subtitle={addressText ? undefined : 'Tap to view your address'}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/address');
                }}
                colors={colors}
              />

              <SettingItem
                label="Emergency contact"
                value={emergencyContactText || undefined}
                subtitle={emergencyContactText ? undefined : 'Tap to add emergency contact details'}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/emergency-contact');
                }}
                colors={colors}
              />

              <View style={[styles.helpSection, { backgroundColor: colors.surface }]}>
                <View style={[styles.helpIcon, { backgroundColor: colors.surfaceElevated }]}>
                  <Ionicons name="help-circle-outline" size={20} color={colors.text} />
                </View>
                <Text style={[styles.helpText, { color: colors.text }]}>Help</Text>
              </View>

              <Pressable
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  await logout();
                  notification.showInfo('Signed out');
                  router.replace('/(auth)');
                }}
                style={({ pressed }) => [
                  styles.signOutBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border + '40', opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="log-out-outline" size={18} color="#E8546A" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
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
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerBtnPressed: { opacity: 0.6 },
  headerTitle: {
    fontSize: 17,
    fontFamily: authFonts.semiBold,
    color: '#FFF',
    letterSpacing: 0.2,
  },
  scrollContent: { paddingTop: 4 },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: authSpacing.lg,
    paddingVertical: 18,
    marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: authColors.border + '40',
  },
  helpIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: { fontSize: 15, fontFamily: authFonts.bold },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: authSpacing.lg,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: authFonts.semiBold,
    color: '#E8546A',
  },
});
