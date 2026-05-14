import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';
import { WORK_CATEGORIES } from '@/constants/work-categories';
import { setSelectedCategoryIds } from '@/lib/work-categories-storage';
import { updateMe } from '@/lib/users-api';
import { useNotification } from '@/lib/notification-service';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;
const BTN = 38;

type Category = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CATEGORIES: Category[] = WORK_CATEGORIES.map((c) => ({
  ...c,
  icon: c.icon as keyof typeof Ionicons.glyphMap,
}));

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

function Chip({
  category,
  selected,
  onPress,
  delay,
}: {
  category: Category;
  selected: boolean;
  onPress: () => void;
  delay: number;
}) {
  const mountAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const selAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 320,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.spring(selAnim, {
      toValue: selected ? 1 : 0,
      useNativeDriver: false,
      bounciness: 5,
      speed: 22,
    }).start();
  }, [selected]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, bounciness: 6 }),
    ]).start();
    onPress();
  };

  const bgColor = selAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [authColors.surface, authColors.accent],
  });
  const borderColor = selAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(92,82,72,0.5)', authColors.accent],
  });
  const textColor = selAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [authColors.textSecondary, authColors.background],
  });
  const iconOpacity = selAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Animated.View
      style={{
        opacity: mountAnim,
        transform: [
          { translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          { scale: pressAnim },
        ],
      }}
    >
      <Pressable onPress={handlePress} style={styles.chipPressable}>
        <Animated.View style={[styles.chip, { backgroundColor: bgColor, borderColor }]}>
          <Animated.Text style={[styles.chipLabel, { color: textColor }]}>
            {category.label}
          </Animated.Text>
          <Animated.View style={{ opacity: iconOpacity }}>
            {selected && (
              <Ionicons name="checkmark-circle" size={14} color={authColors.background} />
            )}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Animated dot for the vertical timeline */
function TimelineDot({ lit, delay }: { lit: boolean; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: lit ? 1 : 0,
      useNativeDriver: false,
      bounciness: 7,
      speed: 18,
    }).start();
  }, [lit]);

  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(92,82,72,0.35)', authColors.accent],
  });
  const size = anim.interpolate({ inputRange: [0, 1], outputRange: [6, 9] });
  const glow = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] });

  return (
    <View style={styles.dotWrap}>
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.dotGlow,
          { opacity: glow, width: size, height: size, borderRadius: 9 },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: bg, width: size, height: size, borderRadius: 9 },
        ]}
      />
    </View>
  );
}

/** Right-side vertical timeline — one dot per category */
function VerticalTimeline({
  count,
  total,
  height,
}: {
  count: number;
  total: number;
  height: number;
}) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: height > 0 ? (count / total) * height : 0,
      useNativeDriver: false,
      bounciness: 3,
      speed: 14,
    }).start();
  }, [count, height]);

  return (
    <View style={[styles.timeline, { height }]}>
      {/* Track */}
      <View style={styles.timelineTrack}>
        <Animated.View style={[styles.timelineFill, { height: fillAnim }]} />
      </View>

      {/* Dots — evenly spaced */}
      {Array.from({ length: total }).map((_, i) => (
        <TimelineDot key={i} lit={i < count} delay={i * 20} />
      ))}

      {/* Labels */}
      <Text style={styles.timelineLabelTop}>{count}</Text>
      <Text style={styles.timelineLabelBot}>{total}</Text>
    </View>
  );
}

export default function WorkCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scrollHeight, setScrollHeight] = useState(0);
  const [loading, setLoading] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(18)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
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
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const MIN_SELECTIONS = 5;

  const notification = useNotification();

  const handleContinue = async () => {
    if (selectedIds.size < MIN_SELECTIONS) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await setSelectedCategoryIds(ids);
      await updateMe({ workCategoryIds: ids });
      router.push('/add-experience');
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong';
      notification.showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const canContinue = selectedIds.size >= MIN_SELECTIONS;

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
              <Text style={styles.navTitle}>Experience</Text>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>Step 2</Text>
              </View>
            </View>
            <View style={styles.navRight}>
              <NavBtn icon="help-circle-outline" onPress={() => { }} />
              <NavBtn icon="log-out-outline" onPress={() => { }} />
            </View>
          </View>

          {/* ── Heading ── */}
          <Animated.View
            style={[styles.headingBlock, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
          >
            <Text style={styles.eyebrow}>Work categories</Text>
            <Text style={styles.heading}>
              Please select the categories of work you're interested in.
            </Text>
          </Animated.View>

          {/* ── Min-selection tooltip ── */}
          {!canContinue && (
            <View style={styles.minTooltip}>
              <Ionicons name="information-circle-outline" size={13} color={authColors.accent} />
              <Text style={styles.minTooltipText}>Select at least 5 categories to proceed</Text>
            </View>
          )}

          {/* ── Chips + right timeline ── */}
          <View
            style={styles.contentRow}
            onLayout={(e) => setScrollHeight(e.nativeEvent.layout.height)}
          >
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.chipGrid}>
                {CATEGORIES.map((cat, i) => (
                  <Chip
                    key={cat.id}
                    category={cat}
                    selected={selectedIds.has(cat.id)}
                    onPress={() => toggle(cat.id)}
                    delay={i * 28}
                  />
                ))}
              </View>
            </ScrollView>

            {/* Vertical timeline */}
            <VerticalTimeline
              count={selectedIds.size}
              total={CATEGORIES.length}
              height={scrollHeight}
            />
          </View>

          {/* ── Bottom ── */}
          <Animated.View
            style={[styles.bottomBlock, { opacity: btnOpacity, transform: [{ translateY: btnY }] }]}
          >
            <View style={styles.ctaRow}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue || loading}
                style={({ pressed }) => [
                  styles.ctaBtn,
                  canContinue && styles.ctaBtnActive,
                  pressed && canContinue && styles.ctaBtnPressed,
                ]}
              >
                <Text style={[styles.ctaLabel, canContinue ? styles.ctaLabelActive : styles.ctaLabelDisabled]}>
                  {loading ? 'Saving…' : 'Continue'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue || loading}
                style={({ pressed }) => [
                  styles.ctaArrow,
                  canContinue && styles.ctaArrowActive,
                  pressed && canContinue && styles.ctaArrowPressed,
                ]}
              >
                <Ionicons
                  name="arrow-forward"
                  size={22}
                  color={canContinue ? authColors.background : authColors.placeholder}
                />
              </Pressable>
            </View>
          </Animated.View>

        </View>
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

  // ── Nav ──
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
  navBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
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

  // ── Heading ──
  headingBlock: {
    gap: 5,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 26,
    fontFamily: authFonts.titleBold,
    color: authColors.text,
    lineHeight: 34,
    letterSpacing: -0.3,
  },

  // ── Content row (scroll + timeline side by side) ──
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 12,
  },

  // ── Chip grid ──
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipPressable: {
    borderRadius: 30,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 30,
    borderWidth: 1.5,
  },
  chipLabel: {
    fontSize: 14,
    fontFamily: authFonts.semiBold,
    letterSpacing: 0.1,
  },

  // ── Vertical timeline ──
  timeline: {
    width: 22,
    alignItems: 'center',
    position: 'relative',
  },
  timelineTrack: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(92,82,72,0.3)',
    overflow: 'hidden',
  },
  timelineFill: {
    width: '100%',
    borderRadius: 1,
    backgroundColor: authColors.accent,
  },
  dotWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotGlow: {
    position: 'absolute',
    backgroundColor: authColors.accent,
    shadowColor: authColors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 0,
  },
  dot: {
    // size animated
  },
  timelineLabelTop: {
    position: 'absolute',
    top: -16,
    fontSize: 10,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    letterSpacing: 0.2,
  },
  timelineLabelBot: {
    position: 'absolute',
    bottom: -16,
    fontSize: 10,
    fontFamily: authFonts.semiBold,
    color: authColors.placeholder,
    letterSpacing: 0.2,
  },

  // ── Bottom block ──
  bottomBlock: {
    paddingTop: 20,
    gap: 12,
  },

  // ── CTA ──
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: authSpacing.sm,
  },
  ctaBtn: {
    flex: 1,
    backgroundColor: authColors.surfaceElevated,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnActive: { backgroundColor: authColors.accent },
  ctaBtnPressed: { opacity: 0.88 },
  ctaArrow: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: authColors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowActive: { backgroundColor: authColors.accent },
  ctaArrowPressed: { opacity: 0.88 },
  ctaLabel: {
    fontSize: 18,
    fontFamily: authFonts.bold,
    letterSpacing: 0.2,
  },
  ctaLabelActive: { color: authColors.background },
  ctaLabelDisabled: { color: authColors.placeholder },

  minTooltip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,168,75,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 6,
  },
  minTooltipText: {
    fontSize: 11,
    fontFamily: authFonts.semiBold,
    color: authColors.accent,
    letterSpacing: 0.2,
  },
});
