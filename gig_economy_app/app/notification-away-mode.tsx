import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
    Switch,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;

// ─── Background ──────────────────────────────────────────────────────────────
function Background() {
    const lines: React.ReactNode[] = [];
    for (let x = 0; x <= W; x += GRID_STEP)
        lines.push(<Line key={`nsv${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(212,168,75,0.022)" strokeWidth={1} />);
    for (let y = 0; y <= H; y += GRID_STEP)
        lines.push(<Line key={`nsh${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(212,168,75,0.022)" strokeWidth={1} />);
    return (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
                <LinearGradient id="nsBg" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={authColors.background} stopOpacity="0" />
                    <Stop offset="35%" stopColor={authColors.background} stopOpacity="0.55" />
                    <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
                </LinearGradient>
                <RadialGradient id="nsGlL" cx="0%" cy="0%" rx="75%" ry="45%">
                    <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.1" />
                    <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
                </RadialGradient>
            </Defs>
            {lines}
            <Rect width={W} height={H} fill="url(#nsBg)" />
            <Rect width={W} height={H} fill="url(#nsGlL)" />
        </Svg>
    );
}

export default function NotificationAwayModeScreen() {
    const insets = useSafeAreaInsets();
    const [awayMode, setAwayMode] = useState(false);

    const headerAnim = useRef(new Animated.Value(0)).current;
    const contentAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(60, [
            Animated.timing(headerAnim, {
                toValue: 1,
                duration: 320,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(contentAnim, {
                toValue: 1,
                duration: 380,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const fade = (anim: Animated.Value, dy = 18) => ({
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
    });

    const toggleAwayMode = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setAwayMode((prev) => !prev);
    };

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />

            <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
                {/* ── Header ─────────────────────────────────────────────── */}
                <Animated.View style={[styles.header, { paddingTop: insets.top }, fade(headerAnim, -10)]}>
                    <Pressable
                        hitSlop={14}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={({ pressed }) => [styles.hBtn, pressed && { opacity: 0.65 }]}
                    >
                        <Ionicons name="chevron-back" size={22} color="#FFF" />
                    </Pressable>
                    <Text style={styles.hTitle}>Away mode</Text>
                    <View style={styles.hBtn} />
                </Animated.View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
                >
                    <Animated.View style={fade(contentAnim, 22)}>
                        {/* ── Description ───────────────────────────────── */}
                        <View style={styles.section}>
                            <Text style={styles.description}>
                                When away mode is enabled, you'll only receive critical notifications related to your account and security. All other notifications will be paused until you turn away mode off.
                            </Text>
                        </View>

                        {/* ── Toggle ────────────────────────────────────── */}
                        <View style={styles.section}>
                            <View style={styles.sectionCard}>
                                <View style={styles.toggleRow}>
                                    <View style={styles.toggleContent}>
                                        <Text style={styles.toggleLabel}>Away mode</Text>
                                        <Text style={styles.toggleDescription}>
                                            {awayMode
                                                ? 'Only critical notifications will be sent'
                                                : 'You will receive all notifications'}
                                        </Text>
                                    </View>
                                    <Switch
                                        value={awayMode}
                                        onValueChange={toggleAwayMode}
                                        trackColor={{ false: `${authColors.border}60`, true: `${authColors.accent}40` }}
                                        thumbColor={awayMode ? authColors.accent : authColors.placeholder}
                                        ios_backgroundColor={`${authColors.border}60`}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* ── Info ──────────────────────────────────────── */}
                        {awayMode && (
                            <View style={styles.section}>
                                <View style={styles.infoCard}>
                                    <Ionicons name="information-circle" size={20} color={authColors.accent} />
                                    <Text style={styles.infoText}>
                                        While away mode is active, you won't receive notifications about new shifts, messages, or updates. You'll still receive important account and security notifications.
                                    </Text>
                                </View>
                            </View>
                        )}
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: authColors.background,
    },
    safe: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: authSpacing.lg,
        paddingBottom: 14,
        backgroundColor: authColors.accent,
    },
    hBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    hTitle: {
        fontSize: 17,
        fontFamily: authFonts.semiBold,
        color: '#FFF',
        letterSpacing: 0.2,
    },
    scroll: {
        paddingTop: 24,
        paddingHorizontal: authSpacing.lg,
    },
    section: {
        marginBottom: 24,
    },
    description: {
        fontSize: 15,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
        lineHeight: 22,
    },
    sectionCard: {
        backgroundColor: authColors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(212,168,75,0.18)',
        padding: 18,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleContent: {
        flex: 1,
        gap: 4,
        marginRight: 16,
    },
    toggleLabel: {
        fontSize: 16,
        fontFamily: authFonts.bold,
        color: authColors.text,
    },
    toggleDescription: {
        fontSize: 14,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
        marginTop: 4,
    },
    infoCard: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: `${authColors.accent}10`,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${authColors.accent}25`,
        padding: 16,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        fontFamily: authFonts.regular,
        color: authColors.text,
        lineHeight: 20,
    },
});


