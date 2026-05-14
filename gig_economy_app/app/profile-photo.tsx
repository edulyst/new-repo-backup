import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';
import { useAuth } from '@/contexts/AuthContext';
import { uploadProfilePhoto } from '@/lib/profile-photo-upload';
import { useNotification } from '@/lib/notification-service';
import { getSelectedCategoryIds } from '@/lib/work-categories-storage';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;
const BTN = 38;
const CIRCLE_SIZE = 260;
const INNER_SIZE = CIRCLE_SIZE - 14;

function Background() {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= W; x += GRID_STEP)
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(212,168,75,0.032)" strokeWidth={1} />);
  for (let y = 0; y <= H; y += GRID_STEP)
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(212,168,75,0.032)" strokeWidth={1} />);
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={authColors.background} stopOpacity="0" />
          <Stop offset="40%" stopColor={authColors.background} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="glL" cx="0%" cy="0%" rx="55%" ry="45%">
          <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.1" />
          <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lines}
      <Rect width={W} height={H} fill="url(#fade)" />
      <Rect width={W} height={H} fill="url(#glL)" />
    </Svg>
  );
}

function DashedRing({ size, hasPhoto }: { size: number; hasPhoto: boolean }) {
  const r = size / 2 - 3;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = 14;
  const gap = 8;
  const animVal = useRef(new Animated.Value(hasPhoto ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(animVal, { toValue: hasPhoto ? 1 : 0, useNativeDriver: false, bounciness: 6 }).start();
  }, [hasPhoto]);

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={hasPhoto ? authColors.accent : 'rgba(212,168,75,0.35)'}
        strokeWidth={hasPhoto ? 3 : 2}
        strokeDasharray={hasPhoto ? undefined : `${dash} ${gap}`}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function NavBtn({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}>
      <Ionicons name={icon} size={17} color={authColors.text} />
    </Pressable>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: pct / 100, useNativeDriver: false, bounciness: 3, speed: 14 }).start();
  }, [pct]);
  const w = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={styles.progressWrap}>
      <Text style={styles.progressLabel}>{pct}%</Text>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: w }]} />
      </View>
    </View>
  );
}

export default function ProfilePhotoScreen() {
  const insets = useSafeAreaInsets();
  const notification = useNotification();
  const { token } = useAuth();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(20)).current;
  const circleScale = useRef(new Animated.Value(0.85)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(photoUri ? 1 : 0)).current;

  useEffect(() => {
    Animated.stagger(70, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 440, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(circleScale, { toValue: 1, useNativeDriver: true, bounciness: 8, speed: 12 }),
        Animated.timing(circleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.timing(footerOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  // Validation gate before using this screen:
  // 1) user must be logged in
  // 2) worker categories should already be selected in onboarding
  useEffect(() => {
    if (!token) {
      notification.showError('Please sign in first.');
      router.replace('/(auth)/login');
      return;
    }
    void (async () => {
      const selected = await getSelectedCategoryIds();
      if (!selected.length) {
        notification.showError('Please complete categories first.');
        router.replace('/work-categories');
      }
    })();
  }, [token, notification]);

  useEffect(() => {
    Animated.spring(badgeAnim, { toValue: photoUri ? 1 : 0, useNativeDriver: true, bounciness: 10, speed: 14 }).start();
  }, [photoUri]);

  const pickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    setUploading(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.92,
    });
    setUploading(false);
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    setUploading(true);
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.92,
    });
    setUploading(false);
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!photoUri) {
      router.replace('/(tabs)');
      return;
    }
    setFinishing(true);
    try {
      await uploadProfilePhoto(photoUri);
      router.replace('/(tabs)');
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Upload failed';
      notification.showError(msg);
    } finally {
      setFinishing(false);
    }
  };

  const hasPhoto = !!photoUri;

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
              <Text style={styles.navTitle}>Profile photo</Text>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>Step 9</Text>
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
            <Text style={styles.eyebrow}>Profile builder</Text>
            <Text style={styles.heading}>And here's my photo</Text>
            <Text style={styles.subtitle}>
              Profiles with a photo get{' '}
              <Text style={styles.subtitleAccent}>3× more views</Text>
              . You can change it anytime.
            </Text>
          </Animated.View>

          {/* ── Photo circle ── */}
          <Animated.View
            style={[
              styles.circleWrap,
              { opacity: circleOpacity, transform: [{ scale: circleScale }] },
            ]}
          >
            <Pressable
              onPress={pickPhoto}
              style={({ pressed }) => [styles.circle, pressed && styles.circlePressed]}
            >
              <DashedRing size={CIRCLE_SIZE} hasPhoto={hasPhoto} />
              {hasPhoto ? (
                <Image source={{ uri: photoUri! }} style={styles.photoImg} />
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons
                    name="camera"
                    size={72}
                    color={authColors.accent}
                    style={{ opacity: uploading ? 0.4 : 1 }}
                  />
                  {!uploading && (
                    <Text style={styles.placeholderLabel}>
                      <Ionicons name="add" size={13} /> Add photo
                    </Text>
                  )}
                  {uploading && (
                    <Text style={styles.placeholderLabel}>Loading…</Text>
                  )}
                </View>
              )}

              {/* Badge for change */}
              <Animated.View
                style={[
                  styles.changeBadge,
                  {
                    opacity: badgeAnim,
                    transform: [{ scale: badgeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                  },
                ]}
              >
                <Ionicons name="camera-outline" size={14} color={authColors.background} />
              </Animated.View>
            </Pressable>

            {/* Quick actions */}
            <View style={styles.tipsRow}>
              <Pressable
                onPress={pickPhoto}
                style={({ pressed }) => [styles.tipBtn, pressed && styles.tipBtnPressed]}
              >
                <Ionicons name="images-outline" size={18} color={authColors.accent} />
                <Text style={styles.tipBtnLabel}>Gallery</Text>
              </Pressable>
              <View style={styles.tipDivider} />
              <Pressable
                onPress={takePhoto}
                style={({ pressed }) => [styles.tipBtn, pressed && styles.tipBtnPressed]}
              >
                <Ionicons name="camera-outline" size={18} color={authColors.accent} />
                <Text style={styles.tipBtnLabel}>Camera</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* ── Footer ── */}
          <Animated.View
            style={[styles.footer, { paddingBottom: insets.bottom + 12, opacity: footerOpacity }]}
          >
            <ProgressBar pct={100} />
            <View style={styles.footerBtns}>
              <Pressable
                onPress={handleNext}
                disabled={finishing}
                style={({ pressed }) => [styles.nextBtn, !hasPhoto && styles.nextBtnDisabled, pressed && styles.nextBtnPressed]}
              >
                <Text style={styles.nextLabel}>{finishing ? 'Uploading…' : 'Finish setup'}</Text>
              </Pressable>
              <Pressable
                onPress={handleNext}
                disabled={finishing}
                style={({ pressed }) => [styles.arrowBtn, !hasPhoto && styles.arrowBtnDisabled, pressed && hasPhoto && styles.arrowBtnPressed]}
              >
                <Ionicons name="arrow-forward" size={22} color={authColors.background} />
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
    justifyContent: 'space-between',
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
  navTitle: { fontSize: 16, fontFamily: authFonts.semiBold, color: authColors.text },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBtn: {
    width: BTN, height: BTN, borderRadius: BTN / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnPressed: { backgroundColor: 'rgba(255,255,255,0.15)' },
  stepPill: {
    backgroundColor: 'rgba(212,168,75,0.15)',
    borderWidth: 1, borderColor: 'rgba(212,168,75,0.28)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  stepPillText: {
    fontSize: 11, fontFamily: authFonts.semiBold,
    color: authColors.accent, letterSpacing: 0.4,
  },

  headingBlock: { gap: 5, marginBottom: 4 },
  eyebrow: {
    fontSize: 11, fontFamily: authFonts.semiBold,
    color: authColors.accent, letterSpacing: 1.6, textTransform: 'uppercase',
  },
  heading: {
    fontSize: 30, fontFamily: authFonts.titleBold,
    color: authColors.text, lineHeight: 38, letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14, fontFamily: authFonts.regular,
    color: authColors.textSecondary, lineHeight: 21,
  },
  subtitleAccent: {
    color: authColors.accent, fontFamily: authFonts.semiBold,
  },

  // ── Photo circle ──
  circleWrap: { alignItems: 'center', gap: 24 },
  circle: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: authColors.surface,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'visible',
  },
  circlePressed: { opacity: 0.85 },
  photoImg: {
    width: INNER_SIZE, height: INNER_SIZE, borderRadius: INNER_SIZE / 2,
  },
  placeholder: { alignItems: 'center', gap: 6 },
  placeholderLabel: {
    fontSize: 13, fontFamily: authFonts.semiBold,
    color: authColors.accent,
  },
  changeBadge: {
    position: 'absolute', bottom: 6, right: 6,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: authColors.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: authColors.background,
  },

  tipsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: authColors.surface,
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(92,82,72,0.3)',
    overflow: 'hidden',
    width: 220,
  },
  tipBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12,
  },
  tipBtnPressed: { backgroundColor: 'rgba(212,168,75,0.12)' },
  tipBtnLabel: { fontSize: 14, fontFamily: authFonts.semiBold, color: authColors.accent },
  tipDivider: { width: 1, height: 28, backgroundColor: 'rgba(92,82,72,0.3)' },

  // ── Tips card ──
  // ── Footer ──
  footer: { gap: 12 },
  progressWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2,
  },
  progressLabel: {
    fontSize: 12, fontFamily: authFonts.semiBold,
    color: authColors.textSecondary, minWidth: 34,
  },
  progressTrack: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: authColors.surface, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: authColors.accent },
  footerBtns: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  arrowBtn: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: authColors.accent,
  },
  arrowBtnDisabled: { opacity: 0.35 },
  arrowBtnPressed: { opacity: 0.88 },
  nextBtn: {
    flex: 2.5, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    backgroundColor: authColors.accent, borderRadius: 30, paddingVertical: 16,
  },
  nextBtnDisabled: { opacity: 0.55 },
  nextBtnPressed: { opacity: 0.88 },
  nextLabel: {
    fontSize: 17, fontFamily: authFonts.bold,
    color: authColors.background, letterSpacing: 0.3,
  },
});
