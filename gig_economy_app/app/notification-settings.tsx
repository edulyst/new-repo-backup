import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
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

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;

// ─── Static data ─────────────────────────────────────────────────────────────
const NOTIFICATION_DATA = {
    schedule: 'Tuesday, Wednesday, Thursday, Friday, Saturday',
    awayMode: 'OFF',
    categories: 'Waiting, Receptionist, Bar, Formal dining',
    teams: "O'Neill's Clapham 383 High Street",
    type: 'New and upcoming shift notifications, messages',
};

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

// ─── Setting Row Component ───────────────────────────────────────────────────
function SettingRow({
    label,
    value,
    onPress,
}: {
    label?: string;
    value: string;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
        >
            <View style={styles.settingRowContent}>
                {label ? <Text style={styles.settingRowLabel}>{label}</Text> : null}
                <Text style={[styles.settingRowValue, !label && styles.settingRowValueNoLabel]} numberOfLines={2}>
                    {value}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={authColors.placeholder} />
        </Pressable>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationSettingsScreen() {
    const insets = useSafeAreaInsets();

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
                        <Text style={styles.backText}>Account</Text>
                    </Pressable>
                    <Text style={styles.hTitle}>Notification settings</Text>
                    <Pressable
                        hitSlop={14}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/notifications');
                        }}
                        style={({ pressed }) => [styles.hBtn, pressed && { opacity: 0.65 }]}
                    >
                        <Ionicons name="notifications-outline" size={22} color="#FFF" />
                    </Pressable>
                </Animated.View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
                >
                    <Animated.View style={fade(contentAnim, 22)}>
                        {/* ── Notifications Section ──────────────────────── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Notifications</Text>
                            <Text style={styles.sectionDescription}>
                                Stay on top of your limber life. Here you can decide what notifications you want to get from us - you'll still receive important notifications related to your account and security.
                            </Text>
                        </View>

                        {/* ── Availability Section ──────────────────────── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionSubtitle}>Availability</Text>
                            <View style={styles.sectionCard}>
                                <SettingRow
                                    label="Schedule"
                                    value={NOTIFICATION_DATA.schedule}
                                    onPress={() => {
                                        router.push('/notification-schedule');
                                    }}
                                />
                                <View style={styles.divider} />
                                <SettingRow
                                    label="Away mode"
                                    value={NOTIFICATION_DATA.awayMode}
                                    onPress={() => {
                                        router.push('/notification-away-mode');
                                    }}
                                />
                            </View>
                        </View>

                        {/* ── Categories Section ──────────────────────── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionSubtitle}>Categories</Text>
                            <View style={styles.sectionCard}>
                                <SettingRow
                                    value={NOTIFICATION_DATA.categories}
                                    onPress={() => {
                                        router.push('/notification-categories');
                                    }}
                                />
                            </View>
                        </View>

                        {/* ── Teams Section ─────────────────────────────── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionSubtitle}>Teams</Text>
                            <View style={styles.sectionCard}>
                                <SettingRow
                                    value={NOTIFICATION_DATA.teams}
                                    onPress={() => {
                                        router.push('/notification-teams');
                                    }}
                                />
                            </View>
                        </View>

                        {/* ── Type Section ─────────────────────────────── */}
                        <View style={styles.section}>
                            <Text style={styles.sectionSubtitle}>Type</Text>
                            <View style={styles.sectionCard}>
                                <SettingRow
                                    value={NOTIFICATION_DATA.type}
                                    onPress={() => {
                                        router.push('/notification-type');
                                    }}
                                />
                            </View>
                        </View>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 20,
    },
    backText: {
        fontSize: 16,
        fontFamily: authFonts.semiBold,
        color: '#FFF',
    },
    hTitle: {
        fontSize: 17,
        fontFamily: authFonts.semiBold,
        color: '#FFF',
        letterSpacing: 0.2,
        flex: 1,
        textAlign: 'center',
    },
    scroll: {
        paddingTop: 24,
        paddingHorizontal: authSpacing.lg,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 24,
        fontFamily: authFonts.bold,
        color: authColors.text,
        marginBottom: 12,
        letterSpacing: -0.3,
    },
    sectionDescription: {
        fontSize: 15,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
        lineHeight: 22,
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 16,
        fontFamily: authFonts.bold,
        color: authColors.text,
        marginBottom: 12,
    },
    sectionCard: {
        backgroundColor: authColors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(212,168,75,0.18)',
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    settingRowContent: {
        flex: 1,
        gap: 4,
        marginRight: 12,
    },
    settingRowLabel: {
        fontSize: 15,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
    },
    settingRowValue: {
        fontSize: 14,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
        marginTop: 2,
    },
    settingRowValueNoLabel: {
        fontSize: 15,
        fontFamily: authFonts.regular,
        color: authColors.text,
        marginTop: 0,
    },
    divider: {
        height: 1,
        backgroundColor: `${authColors.border}25`,
        marginLeft: 18,
    },
});

