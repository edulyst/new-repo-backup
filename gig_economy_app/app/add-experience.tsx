import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';
import { WORK_CATEGORIES } from '@/constants/work-categories';
import { getSelectedCategoryIds } from '@/lib/work-categories-storage';
import { updateMe } from '@/lib/users-api';
import { useNotification } from '@/lib/notification-service';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;
const BTN = 38;
const MAX_ROLES = 20;

type RoleItem = { label: string; isUserAdded: boolean };

function Background() {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= W; x += GRID_STEP) {
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(212,168,75,0.032)" strokeWidth={1} />);
  }
  for (let y = 0; y <= H; y += GRID_STEP) {
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(212,168,75,0.032)" strokeWidth={1} />);
  }
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={authColors.background} stopOpacity="0" />
          <Stop offset="45%" stopColor={authColors.background} stopOpacity="0.65" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="glL" cx="0%" cy="0%" rx="60%" ry="46%">
          <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.12" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="glR" cx="100%" cy="10%" rx="52%" ry="38%">
          <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.05" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lines}
      <Rect width={W} height={H} fill="url(#fade)" />
      <Rect width={W} height={H} fill="url(#glL)" />
      <Rect width={W} height={H} fill="url(#glR)" />
    </Svg>
  );
}

function NavBtn({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
    >
      <Ionicons name={icon} size={17} color={authColors.text} />
    </Pressable>
  );
}

function RoleRadioRow({
  label,
  onRemove,
  onPress,
  index,
  showRemove,
}: {
  label: string;
  onRemove: () => void;
  onPress: () => void;
  index: number;
  showRemove: boolean;
}) {
  const mountAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 360,
      delay: index * 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: mountAnim,
        transform: [
          {
            translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
          },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        accessibilityRole="button"
        accessibilityHint="Opens details for this role"
        android_ripple={
          Platform.OS === 'android' ? { color: 'rgba(212,168,75,0.28)', borderless: false } : undefined
        }
        style={({ pressed }) => [
          styles.roleRowWrap,
          pressed && styles.roleRowWrapPressed,
          Platform.OS === 'ios' && pressed && styles.roleRowWrapPressedIos,
        ]}
      >
        <View style={styles.radioOuter}>
          <View style={styles.radioInner} />
        </View>
        <Text style={styles.roleLabel} numberOfLines={2}>
          {typeof label === 'string' ? label : String(label ?? '')}
        </Text>
        {showRemove ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRemove();
            }}
            style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Remove role"
          >
            <Ionicons name="close-circle" size={22} color={authColors.placeholder} />
          </Pressable>
        ) : (
          <View style={styles.rowChevron} pointerEvents="none">
            <Ionicons name="chevron-forward" size={20} color="rgba(212,168,75,0.65)" />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function ProgressBar({ count, total }: { count: number; total: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: total > 0 ? count / total : 0,
      useNativeDriver: false,
      bounciness: 3,
      speed: 14,
    }).start();
  }, [count, total]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <View style={styles.progressWrap}>
      <Text style={styles.progressLabel}>{pct}%</Text>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width }]} />
      </View>
    </View>
  );
}

export default function AddExperienceScreen() {
  const insets = useSafeAreaInsets();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [ready, setReady] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(18)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    (async () => {
      const ids = await getSelectedCategoryIds();
      const labels = ids
        .map((id) => WORK_CATEGORIES.find((c) => c.id === id)?.label)
        .filter((l): l is string => !!l);
      setRoles(labels.map((label) => ({ label, isUserAdded: false })));
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 440, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(btnY, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, [ready]);

  const addRole = () => {
    if (roles.length >= MAX_ROLES) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRoles((prev) => [...prev, { label: 'New role', isUserAdded: true }]);
  };

  const removeRole = (index: number) => {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const openRename = (index: number, currentLabel: string) => {
    setRenameIndex(index);
    setRenameValue(currentLabel);
  };

  const applyRename = () => {
    if (renameIndex === null) return;
    const v = renameValue.trim() || 'New role';
    setRoles((prev) =>
      prev.map((r, i) => (i === renameIndex ? { ...r, label: v } : r))
    );
    setRenameIndex(null);
    setRenameValue('');
  };

  const handleCardPress = (item: RoleItem, index: number) => {
    if (item.isUserAdded && item.label === 'New role') {
      openRename(index, item.label);
    } else {
      router.push({ pathname: '/add-experience-info', params: { category: item.label } });
    }
  };

  const notification = useNotification();

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateMe({
        onboardingData: {
          experienceRoles: roles.map((r) => r.label),
        },
      });
      router.push('/add-education');
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong';
      notification.showError(msg);
    }
  };

  const progress = roles.length / MAX_ROLES;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { height: insets.top }]} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>

        <View style={styles.inner}>

          {/* ── Nav ── */}
          <View style={styles.navBar}>
            <NavBtn icon="chevron-back" onPress={() => router.back()} />
            <View style={styles.navCenter}>
              <Text style={styles.navTitle}>Add experience</Text>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>Step 3</Text>
              </View>
            </View>
            <View style={styles.navRight}>
              <NavBtn icon="help-circle-outline" onPress={() => {}} />
              <NavBtn icon="log-out-outline" onPress={() => {}} />
            </View>
          </View>

          {/* ── Heading ── */}
          <Animated.View
            style={[styles.headingBlock, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
          >
            <Text style={styles.heading}>Add your experience</Text>
            <Text style={styles.subtitle}>
              The more experience you can add to your profile, the better your chances of being hired for shifts.
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.requiredHint}>* indicates required</Text>
              <Text style={styles.roleCount}>{roles.length}/{MAX_ROLES} roles</Text>
            </View>
          </Animated.View>

          {/* ── Role list (radio-style rows) ── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {roles.map((item, i) => {
              const roleLabel = typeof item === 'object' && item && 'label' in item ? item.label : '';
              return (
              <RoleRadioRow
                key={`${String(roleLabel)}-${i}`}
                label={typeof roleLabel === 'string' ? roleLabel : ''}
                onRemove={() => removeRole(i)}
                onPress={() => handleCardPress(item, i)}
                index={i}
                showRemove={!!(typeof item === 'object' && item && item.isUserAdded)}
              />
            );})}

            {/* Theme-colored add button on the right */}
            {ready && roles.length < MAX_ROLES && (
              <Pressable
                onPress={addRole}
                style={({ pressed }) => [styles.addButtonWrap, pressed && styles.addCardPressed]}
              >
                <View style={styles.addIconTheme}>
                  <Ionicons name="add" size={28} color={authColors.background} />
                </View>
              </Pressable>
            )}
          </ScrollView>

          {/* ── Bottom ── */}
          <Animated.View
            style={[styles.bottomBlock, { opacity: btnOpacity, transform: [{ translateY: btnY }] }]}
          >
            <ProgressBar count={roles.length} total={MAX_ROLES} />

            <View style={styles.ctaRow}>
              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
              >
                <Text style={styles.ctaLabel}>Continue</Text>
              </Pressable>
              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => [styles.ctaArrow, pressed && styles.ctaArrowPressed]}
              >
                <Ionicons name="arrow-forward" size={22} color={authColors.background} />
              </Pressable>
            </View>
          </Animated.View>

        </View>

        {/* Rename modal for "New role" cards */}
        <Modal
          visible={renameIndex !== null}
          transparent
          animationType="fade"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setRenameIndex(null)}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Edit role name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter custom role"
                placeholderTextColor={authColors.placeholder}
                value={renameValue}
                onChangeText={setRenameValue}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={applyRename}
                selectTextOnFocus
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [styles.modalBtn, styles.modalBtnCancel, pressed && styles.modalBtnPressed]}
                  onPress={() => setRenameIndex(null)}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.modalBtn, styles.modalBtnSave, pressed && styles.modalBtnPressed]}
                  onPress={applyRename}
                >
                  <Text style={styles.modalBtnSaveText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  topBar: { backgroundColor: authColors.accent },
  safeContent: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: authSpacing.lg,
    paddingTop: 0,
    paddingBottom: authSpacing.sm,
  },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 4,
    gap: 8,
  },
  navCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navTitle: {
    fontSize: 16,
    fontFamily: authFonts.semiBold,
    color: authColors.text,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPressed: { backgroundColor: 'rgba(255,255,255,0.15)' },
  stepPill: {
    backgroundColor: 'rgba(212,168,75,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stepPillText: {
    fontSize: 11,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    letterSpacing: 0.4,
  },

  headingBlock: {
    gap: 6,
    marginBottom: 16,
  },
  heading: {
    fontSize: 34,
    fontFamily: authFonts.titleBold,
    color: authColors.text,
    lineHeight: 42,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: authFonts.regular,
    color: authColors.textSecondary,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  requiredHint: {
    fontSize: 12,
    fontFamily: authFonts.regular,
    color: authColors.placeholder,
  },
  roleCount: {
    fontSize: 12,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    letterSpacing: 0.2,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 12,
    gap: 10,
  },

  roleRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.22)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#D4A84B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  roleRowWrapPressed: {
    borderColor: 'rgba(212,168,75,0.42)',
    backgroundColor: 'rgba(212,168,75,0.09)',
  },
  roleRowWrapPressedIos: {
    transform: [{ scale: 0.992 }],
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: authColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,168,75,0.08)',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: authColors.accent,
  },
  roleLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: authFonts.semiBold,
    color: authColors.text,
    letterSpacing: 0.15,
    lineHeight: 22,
  },
  rowChevron: {
    marginLeft: 4,
    opacity: 0.95,
  },
  removeBtn: {
    padding: 2,
  },
  removeBtnPressed: { opacity: 0.7 },

  addButtonWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  addIconTheme: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: authColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardPressed: { opacity: 0.85 },

  bottomBlock: {
    paddingTop: 16,
    gap: 12,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: authFonts.semiBold,
    color: authColors.textSecondary,
    minWidth: 32,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: authColors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: authColors.accent,
  },

  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: authSpacing.sm,
  },
  ctaBtn: {
    flex: 1,
    backgroundColor: authColors.accent,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnPressed: { opacity: 0.88 },
  ctaArrow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: authColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowPressed: { opacity: 0.88 },
  ctaLabel: {
    fontSize: 18,
    fontFamily: authFonts.bold,
    color: authColors.background,
    letterSpacing: 0.2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: authSpacing.lg,
  },
  modalSheet: {
    backgroundColor: authColors.surface,
    borderRadius: 20,
    padding: authSpacing.lg,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: authFonts.semiBold,
    color: authColors.text,
  },
  modalInput: {
    backgroundColor: authColors.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(92,82,72,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: authFonts.regular,
    color: authColors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalBtnCancel: {
    backgroundColor: 'transparent',
  },
  modalBtnCancelText: {
    fontSize: 16,
    fontFamily: authFonts.regular,
    color: authColors.textSecondary,
  },
  modalBtnSave: {
    backgroundColor: authColors.accent,
  },
  modalBtnSaveText: {
    fontSize: 16,
    fontFamily: authFonts.semiBold,
    color: authColors.background,
  },
  modalBtnPressed: { opacity: 0.85 },
});
