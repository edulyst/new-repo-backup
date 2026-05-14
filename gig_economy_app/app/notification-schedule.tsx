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

const DAYS = [
    { id: 'monday', label: 'Monday', short: 'Mon' },
    { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { id: 'thursday', label: 'Thursday', short: 'Thu' },
    { id: 'friday', label: 'Friday', short: 'Fri' },
    { id: 'saturday', label: 'Saturday', short: 'Sat' },
    { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

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

export default function NotificationScheduleScreen() {
    const insets = useSafeAreaInsets();
    const [selectedDays, setSelectedDays] = useState<Set<string>>(
        new Set(['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
    );

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

    const toggleDay = (dayId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDays((prev) => {
            const next = new Set(prev);
            if (next.has(dayId)) {
                next.delete(dayId);
            } else {
                next.add(dayId);
            }
            return next;
        });
    };

    const selectedDaysArray = Array.from(selectedDays).sort();
    const displayValue =
        selectedDaysArray.length === 0
            ? 'None selected'
            : selectedDaysArray.length === 7
              ? 'Every day'
              : selectedDaysArray
                  .map((id) => DAYS.find((d) => d.id === id)?.short)
                  .filter(Boolean)
                  .join(', ');

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
                    <Text style={styles.hTitle}>Schedule</Text>
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
                                Select the days when you want to receive notification updates about available shifts and opportunities.
                            </Text>
                        </View>

                        {/* ── Days List ─────────────────────────────────── */}
                        <View style={styles.section}>
                            <View style={styles.sectionCard}>
                                {DAYS.map((day, index) => {
                                    const isSelected = selectedDays.has(day.id);
                                    return (
                                        <View key={day.id}>
                                            {index > 0 && <View style={styles.divider} />}
                                            <Pressable
                                                onPress={() => toggleDay(day.id)}
                                                style={({ pressed }) => [
                                                    styles.dayRow,
                                                    pressed && { opacity: 0.7 },
                                                ]}
                                            >
                                                <Text style={styles.dayLabel}>{day.label}</Text>
                                                <Switch
                                                    value={isSelected}
                                                    onValueChange={() => toggleDay(day.id)}
                                                    trackColor={{ false: `${authColors.border}60`, true: `${authColors.accent}40` }}
                                                    thumbColor={isSelected ? authColors.accent : authColors.placeholder}
                                                    ios_backgroundColor={`${authColors.border}60`}
                                                />
                                            </Pressable>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* ── Summary ───────────────────────────────────── */}
                        <View style={styles.section}>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryLabel}>Selected days</Text>
                                <Text style={styles.summaryValue}>{displayValue}</Text>
                            </View>
                        </View>
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
        overflow: 'hidden',
    },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    dayLabel: {
        fontSize: 15,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
    },
    divider: {
        height: 1,
        backgroundColor: `${authColors.border}25`,
        marginLeft: 18,
    },
    summaryCard: {
        backgroundColor: authColors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(212,168,75,0.18)',
        padding: 18,
        gap: 8,
    },
    summaryLabel: {
        fontSize: 13,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
    },
    summaryValue: {
        fontSize: 15,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
    },
});


