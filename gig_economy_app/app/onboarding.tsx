import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { WaveLines } from '@/components/onboarding/wave-lines';
import { authColors, authFonts, authLayout, authSpacing } from '@/constants/auth-theme';
import { onboardingAssets } from '@/constants/onboarding-assets';
import { onboardingContent } from '@/constants/onboarding-content';
import { setOnboardingSeen } from '@/lib/onboarding-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.5;
const CARD_TOP_RADIUS = 28;
const CARD_TEXT = '#1A1A1A';
const CARD_TEXT_SECONDARY = '#5C5248';

/** Separator line between app name and description. */
const SEPARATOR_COLOR = '#E8E4DF';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  const handleGetStarted = useCallback(async () => {
    await setOnboardingSeen();
    router.replace('/(auth)/phone-entry');
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      {/* Image only – no text; light overlay softens any in-image text */}
      <View style={styles.imageWrap}>
        <Image
          source={onboardingAssets.main}
          style={styles.image}
          contentFit="cover"
        />
        <View style={styles.imageOverlay} pointerEvents="none" />
      </View>
      {/* Right-side drop wave decoration */}
      <View style={styles.waveWrap} pointerEvents="none">
        <View style={styles.waveDrop1} />
        <View style={styles.waveDrop2} />
        <View style={styles.waveDrop3} />
      </View>
      {/* White content card – all text lives here only */}
      <View
        style={[
          styles.card,
          { paddingBottom: insets.bottom + authSpacing.sm },
        ]}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{onboardingContent.title}</Text>
          <Text style={styles.appName}>{onboardingContent.appName}</Text>
          <View style={styles.waveCenterWrap}>
            <WaveLines />
          </View>
          <View style={styles.separator} />
          <Text style={styles.description}>{onboardingContent.description}</Text>
          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaLabel}>Get started</Text>
            <Ionicons
              name="arrow-forward"
              size={authLayout.primaryButtonIconSize}
              color={authColors.background}
            />
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: authColors.accent,
  },
  imageWrap: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: authColors.surface,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  waveWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 80,
  },
  waveDrop1: {
    position: 'absolute',
    right: -24,
    top: SCREEN_HEIGHT * 0.18,
    width: 70,
    height: 140,
    borderTopLeftRadius: 70,
    borderBottomLeftRadius: 70,
    backgroundColor: 'rgba(212, 168, 75, 0.12)',
  },
  waveDrop2: {
    position: 'absolute',
    right: -30,
    top: SCREEN_HEIGHT * 0.42,
    width: 80,
    height: 160,
    borderTopLeftRadius: 80,
    borderBottomLeftRadius: 80,
    backgroundColor: 'rgba(212, 168, 75, 0.08)',
  },
  waveDrop3: {
    position: 'absolute',
    right: -20,
    bottom: SCREEN_HEIGHT * 0.22,
    width: 60,
    height: 120,
    borderTopLeftRadius: 60,
    borderBottomLeftRadius: 60,
    backgroundColor: 'rgba(212, 168, 75, 0.1)',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: CARD_TOP_RADIUS,
    borderTopRightRadius: CARD_TOP_RADIUS,
    paddingHorizontal: authSpacing.lg,
    paddingTop: authSpacing.sm,
    marginTop: -CARD_TOP_RADIUS,
    overflow: 'hidden',
    zIndex: 10,
  },
  waveCenterWrap: {
    alignSelf: 'center',
    marginTop: 6,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: authSpacing.sm },
  title: {
    fontSize: 14,
    fontFamily: authFonts.regular,
    color: CARD_TEXT_SECONDARY,
    marginBottom: 2,
  },
  appName: {
    fontSize: 44,
    fontFamily: authFonts.bold,
    color: CARD_TEXT,
    letterSpacing: -0.8,
    marginBottom: 0,
  },
  separator: {
    height: 1,
    backgroundColor: SEPARATOR_COLOR,
    marginTop: authSpacing.sm,
    marginBottom: authSpacing.sm,
  },
  description: {
    fontSize: 15,
    fontFamily: authFonts.regular,
    color: CARD_TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: authSpacing.md,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: authLayout.primaryButtonIconGap,
    backgroundColor: authColors.accent,
    paddingVertical: 18,
    paddingHorizontal: authSpacing.xl,
    borderRadius: authLayout.primaryButtonRadiusSignup,
  },
  ctaPressed: { opacity: 0.9 },
  ctaLabel: {
    fontSize: authLayout.primaryButtonFontSizeSignup,
    fontFamily: authFonts.semiBold,
    color: authColors.background,
  },
});

