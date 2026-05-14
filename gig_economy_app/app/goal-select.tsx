import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
import Svg, { Defs, Line, LinearGradient as SvgLinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';
import { updateMe } from '@/lib/users-api';
import { useNotification } from '@/lib/notification-service';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;

const IMAGES = {
  profile: require('@/assets/images/illustrations/build-profile.jpg'),
  browse: require('@/assets/images/illustrations/browse-opportunities.gif'),
} as const;

type GoalId = 'profile' | 'browse';

type Goal = {
  id: GoalId;
  image: number;
};

const GOALS: Goal[] = [
  { id: 'profile', image: IMAGES.profile },
  { id: 'browse', image: IMAGES.browse },
];

const LIST_GAP = 14;
const CARD_IMAGE_H = Math.min(240, Math.max(200, Math.round(H * 0.26)));

function Background() {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= W; x += GRID_STEP) {
    lines.push(
      <Line
        key={`v${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={H}
        stroke="rgba(255,255,255,0.035)"
        strokeWidth={1}
      />
    );
  }
  for (let y = 0; y <= H; y += GRID_STEP) {
    lines.push(
      <Line
        key={`h${y}`}
        x1={0}
        y1={y}
        x2={W}
        y2={y}
        stroke="rgba(255,255,255,0.035)"
        strokeWidth={1}
      />
    );
  }

  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id="gridFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={authColors.background} stopOpacity="0" />
          <Stop offset="50%" stopColor={authColors.background} stopOpacity="0.65" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
        </SvgLinearGradient>
        <RadialGradient id="spotL" cx="0%" cy="0%" rx="55%" ry="42%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.06" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="spotR" cx="100%" cy="0%" rx="50%" ry="40%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.04" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lines}
      <Rect width={W} height={H} fill="url(#gridFade)" />
      <Rect width={W} height={H} fill="url(#spotL)" />
      <Rect width={W} height={H} fill="url(#spotR)" />
    </Svg>
  );
}

function GoalCard({
  goal,
  selected,
  disabled,
  onSelect,
  anim,
}: {
  goal: Goal;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  anim: Animated.Value;
}) {
  const cardScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1] });
  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.45)'],
  });

  return (
    <Pressable onPress={onSelect} disabled={disabled} style={styles.cardPressable}>
      <Animated.View style={[styles.cardScaleWrap, { transform: [{ scale: cardScale }] }]}>
        <Animated.View style={[styles.cardOuter, { borderColor }]}>
          <View style={styles.cardMedia}>
            <Image
              source={goal.image}
              style={styles.cardImageFill}
              contentFit="cover"
              contentPosition="center"
              transition={120}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function GoalSelectScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<GoalId | null>(null);
  const [loading, setLoading] = useState(false);
  const notification = useNotification();

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(20)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsY = useRef(new Animated.Value(24)).current;

  const cardAnims = useRef(GOALS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(85, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 440, useNativeDriver: true }),
        Animated.timing(headerY, {
          toValue: 0,
          duration: 440,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardsOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(cardsY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleSelect = async (id: GoalId) => {
    if (loading) return;
    setLoading(true);
    setSelected(id);
    GOALS.forEach((g, i) => {
      Animated.spring(cardAnims[i], {
        toValue: g.id === id ? 1 : 0,
        useNativeDriver: false,
        bounciness: 3,
        speed: 18,
      }).start();
    });
    try {
      await updateMe({ goal: id });
      if (id === 'profile') {
        router.push('/verification');
      } else {
        router.replace('/(tabs)/explore');
      }
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : 'Something went wrong';
      notification.showError(msg);
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.topSafeBar, { height: insets.top }]} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeContent} edges={['left', 'right', 'bottom']}>

        <View style={styles.inner}>
          <View style={styles.topRightIcons}>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              hitSlop={8}>
              <Ionicons name="help-circle-outline" size={18} color={authColors.text} />
            </Pressable>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              hitSlop={8}>
              <Ionicons name="log-out-outline" size={18} color={authColors.text} />
            </Pressable>
          </View>

          <Animated.View
            style={[
              styles.header,
              { opacity: headerOpacity, transform: [{ translateY: headerY }] },
            ]}>
            <Text style={styles.sectionEyebrow}>Get started</Text>
            <Text style={styles.heading}>
              What do you want{'\n'}to do first?
            </Text>
            <Text style={styles.subheading}>
              Pick one to get started — you can change this anytime.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.listWrap,
              { opacity: cardsOpacity, transform: [{ translateY: cardsY }] },
            ]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.listContent, { gap: LIST_GAP }]}
              keyboardShouldPersistTaps="handled">
              {GOALS.map((goal, i) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  selected={selected === goal.id}
                  disabled={loading}
                  onSelect={() => handleSelect(goal.id)}
                  anim={cardAnims[i]}
                />
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  topSafeBar: {
    backgroundColor: authColors.accent,
  },
  safeContent: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: authSpacing.lg,
    paddingTop: 4,
    paddingBottom: authSpacing.md,
  },

  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingTop: 4,
    marginBottom: 4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  header: {
    gap: 8,
    marginBottom: 8,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontFamily: authFonts.semiBold,
    color: 'rgba(250,247,242,0.45)',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 30,
    fontFamily: authFonts.titleBold,
    color: authColors.text,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  subheading: {
    fontSize: 15,
    fontFamily: authFonts.regular,
    color: authColors.textSecondary,
    lineHeight: 22,
    opacity: 0.92,
  },

  listWrap: {
    flex: 1,
    marginVertical: 8,
  },
  listContent: {
    paddingVertical: 6,
    flexGrow: 1,
  },

  cardPressable: {
    borderRadius: 28,
    width: '100%',
  },
  cardScaleWrap: {
    borderRadius: 28,
    width: '100%',
  },
  cardOuter: {
    borderRadius: 28,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: authColors.background,
    width: '100%',
  },
  cardMedia: {
    width: '100%',
    height: CARD_IMAGE_H,
    position: 'relative',
    overflow: 'hidden',
  },
  /** Fills cardMedia edge-to-edge; cover scales to fill width + height */
  cardImageFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});
