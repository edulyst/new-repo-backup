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
    Platform,
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
const CARD_PADDING = authSpacing.lg;
const VIDEO_ITEM_WIDTH = (W - CARD_PADDING * 2 - 24 - 16) / 2; // Account for gap and padding

// ─── Background ──────────────────────────────────────────────────────────────
function Background() {
    const lines: React.ReactNode[] = [];
    for (let x = 0; x <= W; x += GRID_STEP)
        lines.push(<Line key={`sv${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(212,168,75,0.022)" strokeWidth={1} />);
    for (let y = 0; y <= H; y += GRID_STEP)
        lines.push(<Line key={`sh${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(212,168,75,0.022)" strokeWidth={1} />);
    return (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
                <LinearGradient id="svBg" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={authColors.background} stopOpacity="0" />
                    <Stop offset="35%" stopColor={authColors.background} stopOpacity="0.55" />
                    <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
                </LinearGradient>
                <RadialGradient id="svGlL" cx="0%" cy="0%" rx="75%" ry="45%">
                    <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.1" />
                    <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
                </RadialGradient>
            </Defs>
            {lines}
            <Rect width={W} height={H} fill="url(#svBg)" />
            <Rect width={W} height={H} fill="url(#svGlL)" />
        </Svg>
    );
}

export default function SkillsShowcaseScreen() {
    const insets = useSafeAreaInsets();
    const [videos, setVideos] = useState<string[]>([]);

    const headerAnim = useRef(new Animated.Value(0)).current;
    const card1Anim = useRef(new Animated.Value(0)).current;
    const card2Anim = useRef(new Animated.Value(0)).current;
    const buttonAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(80, [
            Animated.timing(headerAnim, {
                toValue: 1,
                duration: 360,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(card1Anim, {
                toValue: 1,
                duration: 420,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(card2Anim, {
                toValue: 1,
                duration: 420,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    useEffect(() => {
        if (videos.length > 0) {
            Animated.spring(buttonAnim, {
                toValue: 1,
                useNativeDriver: true,
                bounciness: 8,
                speed: 14,
            }).start();
        } else {
            buttonAnim.setValue(0);
        }
    }, [videos.length]);

    const fade = (anim: Animated.Value, dy = 20) => ({
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
    });

    const pickVideo = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission to access media library is required!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            setVideos([...videos, result.assets[0].uri]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const removeVideo = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setVideos(videos.filter((_, i) => i !== index));
    };

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />

            <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
                {/* ── Header ─────────────────────────────────────────────── */}
                <Animated.View style={[styles.header, { paddingTop: insets.top }, fade(headerAnim, -12)]}>
                    <Pressable
                        hitSlop={14}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={({ pressed }) => [styles.hBtn, pressed && { opacity: 0.65 }]}
                    >
                        <Ionicons name="arrow-back" size={22} color="#FFF" />
                    </Pressable>
                    <Text style={styles.hTitle}>Skills Showcase</Text>
                    <View style={styles.hBtn} />
                </Animated.View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scroll,
                        { paddingBottom: Math.max(insets.bottom, 20) + 24 },
                    ]}
                >
                    {/* ── Instructions Card ──────────────────────────────── */}
                    <Animated.View style={fade(card1Anim, 24)}>
                        <View style={styles.instructionCard}>
                            <View style={styles.iconBadge}>
                                <Ionicons name="film" size={24} color={authColors.accent} />
                            </View>
                            <Text style={styles.cardTitle}>Showcase Your Skills</Text>
                            <Text style={styles.cardSubtitle}>
                                Upload videos demonstrating your hospitality skills in action. Show hirers what you can do through real examples of your work.
                            </Text>

                            <View style={styles.tipsSection}>
                                <View style={styles.tipItem}>
                                    <View style={styles.tipIcon}>
                                        <Ionicons name="trophy-outline" size={16} color={authColors.accent} />
                                    </View>
                                    <View style={styles.tipContent}>
                                        <Text style={styles.tipTitle}>Show your best work</Text>
                                        <Text style={styles.tipDesc}>Highlight your strongest skills</Text>
                                    </View>
                                </View>
                                <View style={styles.tipItem}>
                                    <View style={styles.tipIcon}>
                                        <Ionicons name="time-outline" size={16} color={authColors.accent} />
                                    </View>
                                    <View style={styles.tipContent}>
                                        <Text style={styles.tipTitle}>Keep it brief</Text>
                                        <Text style={styles.tipDesc}>Under 2 minutes per video</Text>
                                    </View>
                                </View>
                                <View style={styles.tipItem}>
                                    <View style={styles.tipIcon}>
                                        <Ionicons name="layers-outline" size={16} color={authColors.accent} />
                                    </View>
                                    <View style={styles.tipContent}>
                                        <Text style={styles.tipTitle}>Multiple videos</Text>
                                        <Text style={styles.tipDesc}>Add as many as you like</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* ── Videos Grid Card ───────────────────────────────── */}
                    {videos.length > 0 && (
                        <Animated.View style={fade(card2Anim, 24)}>
                            <View style={styles.videosCard}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Your Videos</Text>
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countText}>{videos.length}</Text>
                                    </View>
                                </View>
                                <View style={styles.videosGrid}>
                                    {videos.map((video, index) => (
                                        <Animated.View
                                            key={index}
                                            style={[
                                                styles.videoItem,
                                                {
                                                    opacity: card2Anim,
                                                    transform: [
                                                        {
                                                            scale: card2Anim.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [0.9, 1],
                                                            }),
                                                        },
                                                    ],
                                                },
                                            ]}
                                        >
                                            <View style={styles.videoThumbnail}>
                                                <View style={styles.playOverlay}>
                                                    <View style={styles.playIcon}>
                                                        <Ionicons name="play" size={20} color="#FFF" />
                                                    </View>
                                                </View>
                                                <View style={styles.videoNumber}>
                                                    <Text style={styles.videoNumberText}>{index + 1}</Text>
                                                </View>
                                            </View>
                                            <Pressable
                                                onPress={() => removeVideo(index)}
                                                style={({ pressed }) => [
                                                    styles.deleteButton,
                                                    pressed && styles.deleteButtonPressed,
                                                ]}
                                            >
                                                <Ionicons name="close-circle" size={22} color={authColors.text} />
                                            </Pressable>
                                        </Animated.View>
                                    ))}
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    {/* ── Add Video Card ────────────────────────────────── */}
                    <Animated.View style={fade(card2Anim, 24)}>
                        <Pressable
                            onPress={pickVideo}
                            style={({ pressed }) => [
                                styles.addCard,
                                pressed && styles.addCardPressed,
                            ]}
                        >
                            <View style={styles.addCircle}>
                                <View style={styles.addIconBg}>
                                    <Ionicons name="film" size={32} color={authColors.accent} />
                                </View>
                                <View style={styles.addBadge}>
                                    <Ionicons name="add" size={18} color={authColors.background} />
                                </View>
                            </View>
                            <Text style={styles.addTitle}>Add Skills Video</Text>
                            <Text style={styles.addSubtitle}>Tap to upload from your gallery</Text>
                            {videos.length > 0 && (
                                <View style={styles.addHintBox}>
                                    <Ionicons name="add-circle-outline" size={14} color={authColors.placeholder} />
                                    <Text style={styles.addHint}>Add another video</Text>
                                </View>
                            )}
                        </Pressable>
                    </Animated.View>

                    {/* ── Save Button ───────────────────────────────────── */}
                    {videos.length > 0 && (
                        <Animated.View style={[fade(buttonAnim, 16), { marginTop: 8 }]}>
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    router.back();
                                }}
                                style={({ pressed }) => [
                                    styles.saveButton,
                                    pressed && styles.saveButtonPressed,
                                ]}
                            >
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                                <Ionicons name="checkmark-circle" size={20} color={authColors.background} />
                            </Pressable>
                        </Animated.View>
                    )}
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
        paddingHorizontal: CARD_PADDING,
        paddingBottom: 16,
        backgroundColor: authColors.accent,
    },
    hBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
    },
    hTitle: {
        fontSize: 18,
        fontFamily: authFonts.semiBold,
        color: '#FFF',
        letterSpacing: 0.3,
    },
    scroll: {
        paddingTop: 20,
        paddingHorizontal: CARD_PADDING,
        gap: 20,
    },
    instructionCard: {
        backgroundColor: authColors.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(212,168,75,0.18)',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 28,
        overflow: 'hidden',
    },
    iconBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${authColors.accent}18`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 22,
        fontFamily: authFonts.bold,
        color: authColors.text,
        marginBottom: 10,
        letterSpacing: -0.3,
    },
    cardSubtitle: {
        fontSize: 15,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
        lineHeight: 22,
        marginBottom: 24,
    },
    tipsSection: {
        gap: 16,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    tipIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${authColors.accent}12`,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    tipContent: {
        flex: 1,
        gap: 3,
    },
    tipTitle: {
        fontSize: 14,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
    },
    tipDesc: {
        fontSize: 13,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
        lineHeight: 18,
    },
    videosCard: {
        backgroundColor: authColors.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(212,168,75,0.18)',
        padding: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: authFonts.bold,
        color: authColors.text,
    },
    countBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: `${authColors.accent}20`,
    },
    countText: {
        fontSize: 13,
        fontFamily: authFonts.bold,
        color: authColors.accent,
    },
    videosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    videoItem: {
        width: VIDEO_ITEM_WIDTH,
        position: 'relative',
    },
    videoThumbnail: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 16,
        backgroundColor: `${authColors.accent}12`,
        borderWidth: 2,
        borderColor: authColors.accent,
        overflow: 'hidden',
        position: 'relative',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    playIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${authColors.accent}E6`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoNumber: {
        position: 'absolute',
        top: 8,
        left: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: authColors.surface,
        borderWidth: 1.5,
        borderColor: authColors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoNumberText: {
        fontSize: 12,
        fontFamily: authFonts.bold,
        color: authColors.accent,
    },
    deleteButton: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: authColors.surface,
        borderWidth: 2,
        borderColor: authColors.border,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    deleteButtonPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.9 }],
    },
    addCard: {
        backgroundColor: authColors.surface,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: authColors.accent,
        borderStyle: 'dashed',
        padding: 32,
        alignItems: 'center',
        gap: 14,
    },
    addCardPressed: {
        opacity: 0.85,
        backgroundColor: `${authColors.accent}08`,
    },
    addCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2.5,
        borderColor: authColors.accent,
        borderStyle: 'dashed',
        backgroundColor: `${authColors.accent}08`,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    addIconBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: `${authColors.accent}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBadge: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: authColors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: authColors.surface,
    },
    addTitle: {
        fontSize: 17,
        fontFamily: authFonts.bold,
        color: authColors.text,
        marginTop: 4,
    },
    addSubtitle: {
        fontSize: 14,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
    },
    addHintBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        backgroundColor: `${authColors.border}20`,
    },
    addHint: {
        fontSize: 12,
        fontFamily: authFonts.regular,
        color: authColors.placeholder,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: authColors.accent,
        borderRadius: 18,
        paddingVertical: 18,
    },
    saveButtonPressed: {
        opacity: 0.88,
        transform: [{ scale: 0.98 }],
    },
    saveButtonText: {
        fontSize: 17,
        fontFamily: authFonts.bold,
        color: authColors.background,
        letterSpacing: 0.4,
    },
});
