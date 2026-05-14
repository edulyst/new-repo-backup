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
const VIDEO_PREVIEW_HEIGHT = Math.min(W * 0.6, 280);

// ─── Background ──────────────────────────────────────────────────────────────
function Background() {
    const lines: React.ReactNode[] = [];
    for (let x = 0; x <= W; x += GRID_STEP)
        lines.push(<Line key={`iv${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(212,168,75,0.022)" strokeWidth={1} />);
    for (let y = 0; y <= H; y += GRID_STEP)
        lines.push(<Line key={`ih${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(212,168,75,0.022)" strokeWidth={1} />);
    return (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
                <LinearGradient id="ivBg" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={authColors.background} stopOpacity="0" />
                    <Stop offset="35%" stopColor={authColors.background} stopOpacity="0.55" />
                    <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
                </LinearGradient>
                <RadialGradient id="ivGlL" cx="0%" cy="0%" rx="75%" ry="45%">
                    <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.1" />
                    <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
                </RadialGradient>
            </Defs>
            {lines}
            <Rect width={W} height={H} fill="url(#ivBg)" />
            <Rect width={W} height={H} fill="url(#ivGlL)" />
        </Svg>
    );
}

export default function IntroVideoScreen() {
    const insets = useSafeAreaInsets();
    const [hasVideo, setHasVideo] = useState(false);
    const [videoUri, setVideoUri] = useState<string | null>(null);

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
        if (hasVideo) {
            Animated.spring(buttonAnim, {
                toValue: 1,
                useNativeDriver: true,
                bounciness: 8,
                speed: 14,
            }).start();
        } else {
            buttonAnim.setValue(0);
        }
    }, [hasVideo]);

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
            setVideoUri(result.assets[0].uri);
            setHasVideo(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const removeVideo = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setVideoUri(null);
        setHasVideo(false);
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
                    <Text style={styles.hTitle}>Intro Video</Text>
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
                                <Ionicons name="information-circle" size={24} color={authColors.accent} />
                            </View>
                            <Text style={styles.cardTitle}>Create Your Intro Video</Text>
                            <Text style={styles.cardSubtitle}>
                                A short video introduction helps hirers connect with you personally and significantly increases your chances of being selected.
                            </Text>

                            <View style={styles.tipsSection}>
                                <View style={styles.tipItem}>
                                    <View style={styles.tipIcon}>
                                        <Ionicons name="time-outline" size={16} color={authColors.accent} />
                                    </View>
                                    <View style={styles.tipContent}>
                                        <Text style={styles.tipTitle}>Keep it concise</Text>
                                        <Text style={styles.tipDesc}>Under 60 seconds works best</Text>
                                    </View>
                                </View>
                                <View style={styles.tipItem}>
                                    <View style={styles.tipIcon}>
                                        <Ionicons name="mic-outline" size={16} color={authColors.accent} />
                                    </View>
                                    <View style={styles.tipContent}>
                                        <Text style={styles.tipTitle}>Speak clearly</Text>
                                        <Text style={styles.tipDesc}>Ensure good audio quality</Text>
                                    </View>
                                </View>
                                <View style={styles.tipItem}>
                                    <View style={styles.tipIcon}>
                                        <Ionicons name="star-outline" size={16} color={authColors.accent} />
                                    </View>
                                    <View style={styles.tipContent}>
                                        <Text style={styles.tipTitle}>Highlight strengths</Text>
                                        <Text style={styles.tipDesc}>Mention your key skills</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* ── Video Upload Card ─────────────────────────────── */}
                    <Animated.View style={fade(card2Anim, 24)}>
                        <View style={styles.uploadCard}>
                            {hasVideo && videoUri ? (
                                <View style={styles.videoWrapper}>
                                    <View style={[styles.videoPreview, { height: VIDEO_PREVIEW_HEIGHT }]}>
                                        <View style={styles.playButtonOverlay}>
                                            <View style={styles.playButton}>
                                                <Ionicons name="play" size={32} color="#FFF" />
                                            </View>
                                        </View>
                                        <View style={styles.videoBadge}>
                                            <Ionicons name="checkmark-circle" size={18} color={authColors.accent} />
                                            <Text style={styles.videoBadgeText}>Uploaded</Text>
                                        </View>
                                    </View>
                                    <Pressable
                                        onPress={removeVideo}
                                        style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={authColors.text} />
                                        <Text style={styles.removeButtonText}>Remove Video</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <Pressable
                                    onPress={pickVideo}
                                    style={({ pressed }) => [styles.uploadArea, pressed && styles.uploadAreaPressed]}
                                >
                                    <View style={styles.uploadCircle}>
                                        <View style={styles.uploadIconBg}>
                                            <Ionicons name="videocam" size={36} color={authColors.accent} />
                                        </View>
                                        <View style={styles.addBadge}>
                                            <Ionicons name="add" size={20} color={authColors.background} />
                                        </View>
                                    </View>
                                    <Text style={styles.uploadTitle}>Upload Intro Video</Text>
                                    <Text style={styles.uploadSubtitle}>Tap to select from your gallery</Text>
                                    <View style={styles.uploadHintBox}>
                                        <Ionicons name="images-outline" size={14} color={authColors.placeholder} />
                                        <Text style={styles.uploadHint}>Video format supported</Text>
                                    </View>
                                </Pressable>
                            )}
                        </View>
                    </Animated.View>

                    {/* ── Save Button ───────────────────────────────────── */}
                    {hasVideo && (
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
    uploadCard: {
        backgroundColor: authColors.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(212,168,75,0.18)',
        padding: 24,
        overflow: 'hidden',
    },
    uploadArea: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 16,
    },
    uploadAreaPressed: {
        opacity: 0.85,
    },
    uploadCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2.5,
        borderColor: authColors.accent,
        borderStyle: 'dashed',
        backgroundColor: `${authColors.accent}08`,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    uploadIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${authColors.accent}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: authColors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: authColors.surface,
    },
    uploadTitle: {
        fontSize: 18,
        fontFamily: authFonts.bold,
        color: authColors.text,
        marginTop: 8,
    },
    uploadSubtitle: {
        fontSize: 14,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
    },
    uploadHintBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: `${authColors.border}20`,
    },
    uploadHint: {
        fontSize: 12,
        fontFamily: authFonts.regular,
        color: authColors.placeholder,
    },
    videoWrapper: {
        gap: 20,
    },
    videoPreview: {
        width: '100%',
        borderRadius: 20,
        backgroundColor: `${authColors.accent}12`,
        borderWidth: 2,
        borderColor: authColors.accent,
        overflow: 'hidden',
        position: 'relative',
    },
    playButtonOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: `${authColors.accent}E6`,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
    },
    videoBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: authColors.surface,
        borderWidth: 1,
        borderColor: authColors.accent,
    },
    videoBadgeText: {
        fontSize: 12,
        fontFamily: authFonts.semiBold,
        color: authColors.accent,
    },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: `${authColors.border}25`,
        borderWidth: 1,
        borderColor: `${authColors.border}40`,
    },
    removeButtonPressed: {
        opacity: 0.7,
        backgroundColor: `${authColors.border}35`,
    },
    removeButtonText: {
        fontSize: 15,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: authColors.accent,
        borderRadius: 18,
        paddingVertical: 18,
        borderWidth: 0,
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
