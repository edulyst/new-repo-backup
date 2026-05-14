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
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';
import { useAuth } from '@/contexts/AuthContext';
import { uploadProfilePhoto } from '@/lib/profile-photo-upload';
import { useNotification } from '@/lib/notification-service';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;

// ─── Static data ─────────────────────────────────────────────────────────────
const USER = {
    name: 'Alex Johnson',
    role: 'Hospitality Professional',
    initials: 'AJ',
    email: 'alex.johnson@example.com',
    phone: '+1 (555) 123-4567',
    profileStrength: 76,
    profileStrengthLabel: 'Pro',
};

const SKILLS = ['Formal dining', 'Bar', 'Receptionist'];
const INTERESTED_CATEGORIES = ['Front of House'];

const EXPERIENCE = [
    {
        id: '1',
        role: 'Receptionist',
        company: 'The Rochester by Blue Orchid Hotels',
        period: 'Aug 2023 – present',
        approved: true,
        rating: 4.8,
    },
    {
        id: '2',
        role: 'Formal dining',
        company: 'The Wellington by Blue Orchid Hotels',
        period: 'Feb 2023 – present',
        approved: true,
        rating: 4.5,
    },
    {
        id: '3',
        role: 'Bar',
        company: 'Mitchells & Butlers',
        period: 'Oct 2022 – Dec 2022',
        approved: true,
        rating: 4.9,
    },
];

const EDUCATION = [
    {
        id: '1',
        institution: "Regent's University London",
        degree: 'MA',
        period: '2022–2023',
    },
];

const ADDITIONAL_TRAINING = [
    'Maple flow training',
    'Fire marshal training',
    'Food safety level 1, 2',
];

const LANGUAGES = [
    { name: 'English', level: 'Native' },
    { name: 'Spanish', level: 'Intermediate' },
];

const RATINGS = [
    { count: 25, stars: 3 },
    { count: 5, stars: 2 },
    { count: 0, stars: 1 },
];

const SETTINGS = {
    faceId: false,
    showingCoins: false,
    incognitoMode: false,
    language: 'English',
    availability: false,
};

// ─── Background ──────────────────────────────────────────────────────────────
function Background() {
    const lines: React.ReactNode[] = [];
    for (let x = 0; x <= W; x += GRID_STEP)
        lines.push(<Line key={`pv${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(212,168,75,0.024)" strokeWidth={1} />);
    for (let y = 0; y <= H; y += GRID_STEP)
        lines.push(<Line key={`ph${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(212,168,75,0.024)" strokeWidth={1} />);
    return (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
                <LinearGradient id="pBg" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={authColors.background} stopOpacity="0" />
                    <Stop offset="40%" stopColor={authColors.background} stopOpacity="0.6" />
                    <Stop offset="100%" stopColor={authColors.background} stopOpacity="1" />
                </LinearGradient>
                <RadialGradient id="pGlL" cx="0%" cy="0%" rx="80%" ry="48%">
                    <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.11" />
                    <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="pGlR" cx="100%" cy="0%" rx="70%" ry="40%">
                    <Stop offset="0%" stopColor={authColors.accent} stopOpacity="0.07" />
                    <Stop offset="100%" stopColor={authColors.background} stopOpacity="0" />
                </RadialGradient>
            </Defs>
            {lines}
            <Rect width={W} height={H} fill="url(#pBg)" />
            <Rect width={W} height={H} fill="url(#pGlL)" />
            <Rect width={W} height={H} fill="url(#pGlR)" />
        </Svg>
    );
}

// ─── Stars Component ────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    return (
        <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                    key={star}
                    name={star <= fullStars ? 'star' : star === fullStars + 1 && hasHalfStar ? 'star-half' : 'star-outline'}
                    size={14}
                    color={star <= fullStars || (star === fullStars + 1 && hasHalfStar) ? authColors.accent : authColors.border}
                />
            ))}
        </View>
    );
}

// ─── Section Header Component ────────────────────────────────────────────────
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
            {action && (
                <Pressable
                    hitSlop={12}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onAction?.();
                    }}
                    style={({ pressed }) => [pressed && { opacity: 0.55 }]}
                >
                    <Text style={styles.sectionAction}>{action}</Text>
                </Pressable>
            )}
        </View>
    );
}

// ─── Info Row Component ────────────────────────────────────────────────────
function InfoRow({
    icon,
    label,
    value,
    onPress,
    showArrow = true,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    onPress?: () => void;
    showArrow?: boolean;
}) {
    return (
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress?.();
            }}
            style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.7 }]}
        >
            <View style={styles.infoRowLeft}>
                <View style={styles.infoIcon}>
                    <Ionicons name={icon} size={22} color={authColors.text} />
                </View>
                <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoValue}>{value}</Text>
                </View>
            </View>
            {showArrow && <Ionicons name="chevron-forward" size={20} color={authColors.placeholder} />}
        </Pressable>
    );
}

// ─── Toggle Row Component ─────────────────────────────────────────────────────
function ToggleRow({
    icon,
    label,
    description,
    value,
    onValueChange,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}) {
    return (
        <View style={styles.toggleRow}>
            <View style={styles.infoRowLeft}>
                <View style={styles.infoIcon}>
                    <Ionicons name={icon} size={22} color={authColors.text} />
                </View>
                <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoDescription}>{description}</Text>
                </View>
            </View>
            <Switch
                value={value}
                onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onValueChange(val);
                }}
                trackColor={{ false: `${authColors.border}60`, true: `${authColors.accent}40` }}
                thumbColor={value ? authColors.accent : authColors.placeholder}
                ios_backgroundColor={`${authColors.border}60`}
            />
        </View>
    );
}

// ─── Image Picker Modal Component ────────────────────────────────────────────
function ImagePickerModal({
    visible,
    onClose,
    onSelect,
}: {
    visible: boolean;
    onClose: () => void;
    onSelect: (uri: string) => void;
}) {
    const modalAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(modalAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    bounciness: 8,
                    speed: 14,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(modalAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const pickFromGallery = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission to access media library is required!');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.92,
        });
        if (!result.canceled && result.assets[0]) {
            onSelect(result.assets[0].uri);
            onClose();
        }
    };

    const takePhoto = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission to access camera is required!');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.92,
        });
        if (!result.canceled && result.assets[0]) {
            onSelect(result.assets[0].uri);
            onClose();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <Animated.View
                    style={[
                        styles.modalBackdropAnimated,
                        {
                            opacity: backdropAnim,
                        },
                    ]}
                />
            </Pressable>
            <Animated.View
                style={[
                    styles.modalContent,
                    {
                        opacity: modalAnim,
                        transform: [
                            {
                                translateY: modalAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [300, 0],
                                }),
                            },
                        ],
                    },
                ]}
            >
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Select Profile Photo</Text>
                <View style={styles.modalOptions}>
                    <Pressable
                        onPress={takePhoto}
                        style={({ pressed }) => [styles.modalOption, pressed && styles.modalOptionPressed]}
                    >
                        <View style={styles.modalOptionIcon}>
                            <Ionicons name="camera" size={28} color={authColors.accent} />
                        </View>
                        <Text style={styles.modalOptionText}>Take Photo</Text>
                    </Pressable>
                    <Pressable
                        onPress={pickFromGallery}
                        style={({ pressed }) => [styles.modalOption, pressed && styles.modalOptionPressed]}
                    >
                        <View style={styles.modalOptionIcon}>
                            <Ionicons name="images" size={28} color={authColors.accent} />
                        </View>
                        <Text style={styles.modalOptionText}>Choose from Gallery</Text>
                    </Pressable>
                </View>
                <Pressable
                    onPress={onClose}
                    style={({ pressed }) => [styles.modalCancel, pressed && styles.modalCancelPressed]}
                >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
            </Animated.View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const notification = useNotification();
    const [settings, setSettings] = useState(SETTINGS);
    const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);

    const headerAnim = useRef(new Animated.Value(0)).current;
    const profileAnim = useRef(new Animated.Value(0)).current;
    const contentAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let cancelled = false;
        const photoUrl = user?.profilePhotoUrl;
        if (!photoUrl) return;
        (async () => {
          const { resolveProfilePhotoDisplayUrl } = await import('@/lib/profile-photo-display');
          const display = await resolveProfilePhotoDisplayUrl(photoUrl);
          if (!cancelled) setProfileImageUri(display ?? photoUrl);
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.profilePhotoUrl]);

    useEffect(() => {
        Animated.stagger(60, [
            Animated.timing(headerAnim, {
                toValue: 1,
                duration: 320,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(profileAnim, {
                toValue: 1,
                duration: 380,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(contentAnim, {
                toValue: 1,
                duration: 420,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const fade = (anim: Animated.Value, dy = 18) => ({
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
    });

    const handleShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const result = await Share.share({
                message: `Check out ${USER.name}'s profile on Limber!`,
                title: `${USER.name}'s Profile`,
            });
            if (result.action === Share.sharedAction) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            console.warn('Error sharing:', error);
        }
    };

    const handleImageSelect = async (uri: string) => {
        setShowImagePicker(false);
        setUploading(true);
        try {
            const publicUrl = await uploadProfilePhoto(uri);
            const { resolveProfilePhotoDisplayUrl } = await import('@/lib/profile-photo-display');
            const display = await resolveProfilePhotoDisplayUrl(publicUrl);
            setProfileImageUri(display ?? publicUrl);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Failed to upload photo';
            notification.showError(msg);
        } finally {
            setUploading(false);
        }
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
                            router.push('/settings');
                        }}
                        style={({ pressed }) => [styles.hBtn, pressed && { opacity: 0.6 }]}
                    >
                        <Ionicons name="settings-outline" size={22} color="#FFF" />
                    </Pressable>
                    <Text style={styles.hTitle}>Profile</Text>
                    <Pressable
                        hitSlop={14}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/notifications');
                        }}
                        style={({ pressed }) => [styles.hBtn, pressed && { opacity: 0.6 }]}
                    >
                        <Ionicons name="notifications-outline" size={22} color="#FFF" />
                    </Pressable>
                </Animated.View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
                >
                    {/* ── Profile Picture & Name ─────────────────────────── */}
                    <Animated.View style={[styles.profilePicSection, fade(profileAnim)]}>
                        <View style={styles.profilePicContainer}>
                            <View style={styles.profilePic}>
                                {profileImageUri ? (
                                    <Image source={{ uri: profileImageUri }} style={styles.profilePicImage} />
                                ) : (
                                    <Text style={styles.profilePicInitials}>
                                        {user?.firstName && user?.lastName
                                            ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                                            : user?.phone
                                                ? user.phone.slice(-2)
                                                : USER.initials}
                                    </Text>
                                )}
                            </View>
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    if (!uploading) setShowImagePicker(true);
                                }}
                                disabled={uploading}
                                style={({ pressed }) => [styles.editPicBtn, (pressed || uploading) && { opacity: 0.7 }]}
                            >
                                <Ionicons name={uploading ? 'hourglass-outline' : 'camera'} size={16} color={authColors.accent} />
                            </Pressable>
                            <Pressable
                                onPress={handleShare}
                                style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
                            >
                                <Ionicons name="share-social" size={18} color={authColors.accent} />
                            </Pressable>
                        </View>
                        <Text style={styles.profileName}>
                            {user?.firstName && user?.lastName
                                ? `${user.firstName} ${user.lastName}`.trim()
                                : user?.phone ? `User ${user.phone.slice(-4)}` : USER.name}
                        </Text>
                    </Animated.View>

                    {/* ── Profile Strength ──────────────────────────────── */}
                    <Animated.View style={fade(contentAnim, 22)}>
                        <View style={styles.fullWidthCard}>
                            <View style={styles.profileStrengthRow}>
                                <Text style={styles.profileStrengthLabel}>
                                    Profile Strength: <Text style={styles.profileStrengthValue}>{USER.profileStrengthLabel}</Text>
                                </Text>
                            </View>
                            <View style={styles.strengthBar}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((segment) => (
                                    <View
                                        key={segment}
                                        style={[
                                            styles.strengthSegment,
                                            segment <= Math.floor((USER.profileStrength / 100) * 10) && styles.strengthSegmentFilled,
                                        ]}
                                    />
                                ))}
                            </View>
                            <Text style={styles.strengthHint}>
                                Good going! The only things left to add are video content and social links.
                            </Text>
                        </View>

                        {/* ── Intro Video ─────────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader
                                title="Intro video"
                                action="ADD"
                                onAction={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/intro-video');
                                }}
                            />
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/intro-video');
                                }}
                                style={({ pressed }) => [styles.uploadBox, pressed && { opacity: 0.7 }]}
                            >
                                <View style={styles.uploadCircle}>
                                    <Ionicons name="videocam-outline" size={32} color={authColors.accent} />
                                    <Ionicons name="add-circle" size={26} color={authColors.accent} style={styles.addIcon} />
                                </View>
                            </Pressable>
                        </View>

                        {/* ── Skills ─────────────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader
                                title="Skills"
                                action="ADD"
                                onAction={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/work-categories');
                                }}
                            />
                            <View style={styles.chipWrap}>
                                {SKILLS.map((skill) => (
                                    <View key={skill} style={styles.chip}>
                                        <Text style={styles.chipText}>{skill}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* ── Interested Categories ─────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader
                                title="Interested categories"
                                action="EDIT"
                                onAction={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/work-categories');
                                }}
                            />
                            <View style={styles.chipWrap}>
                                {INTERESTED_CATEGORIES.map((category) => (
                                    <View key={category} style={styles.chip}>
                                        <Text style={styles.chipText}>{category}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* ── Skills Showcase ─────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader
                                title="Skills showcase"
                                action="ADD"
                                onAction={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/skills-showcase');
                                }}
                            />
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/skills-showcase');
                                }}
                                style={({ pressed }) => [styles.uploadBox, pressed && { opacity: 0.7 }]}
                            >
                                <View style={styles.uploadCircle}>
                                    <Ionicons name="film-outline" size={32} color={authColors.accent} />
                                    <Ionicons name="add-circle" size={26} color={authColors.accent} style={styles.addIcon} />
                                </View>
                            </Pressable>
                        </View>

                        {/* ── Experience ────────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader
                                title="Experience"
                                action="ADD"
                                onAction={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/add-experience');
                                }}
                            />
                            {EXPERIENCE.map((exp, i) => (
                                <View key={exp.id}>
                                    {i > 0 && <View style={styles.divider} />}
                                    <View style={styles.expRow}>
                                        <View style={styles.expContent}>
                                            <Text style={styles.expRole}>{exp.role}</Text>
                                            <Text style={styles.expCompany}>at {exp.company}</Text>
                                            <Text style={styles.expPeriod}>{exp.period}</Text>
                                            <View style={styles.ratingRow}>
                                                <Stars rating={exp.rating} />
                                                <Text style={styles.ratingText}>{exp.rating}</Text>
                                            </View>
                                        </View>
                                        {exp.approved && (
                                            <View style={styles.approvedBadge}>
                                                <Ionicons name="checkmark-circle" size={18} color={authColors.accent} />
                                                <Text style={styles.approvedText}>Approved</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* ── Training Certificates ──────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader
                                title="Training Certificates"
                                action="ADD"
                                onAction={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/add-training');
                                }}
                            />
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/add-training');
                                }}
                                style={({ pressed }) => [styles.emptyRow, pressed && { opacity: 0.7 }]}
                            >
                                <Ionicons name="ribbon-outline" size={22} color={authColors.placeholder} />
                                <Text style={styles.emptyText}>No certificates added yet</Text>
                            </Pressable>
                        </View>

                        {/* ── Education ───────────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader
                                title="Education"
                                action="ADD"
                                onAction={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/add-education');
                                }}
                            />
                            {EDUCATION.map((edu) => (
                                <View key={edu.id}>
                                    <View style={styles.eduRow}>
                                        <View style={styles.expContent}>
                                            <Text style={styles.eduInstitution}>
                                                {edu.institution}
                                                <Text style={styles.eduDegree}> – {edu.degree}</Text>
                                            </Text>
                                            <Text style={styles.expPeriod}>{edu.period}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* ── Additional Training ────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader
                                title="Additional Training"
                                action="ADD"
                                onAction={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/my-training');
                                }}
                            />
                            {ADDITIONAL_TRAINING.map((training, i) => (
                                <View key={i}>
                                    {i > 0 && <View style={styles.divider} />}
                                    <View style={styles.trainingRow}>
                                        <View style={styles.bullet} />
                                        <Text style={styles.trainingText}>{training}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* ── Language ───────────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader
                                title="Language"
                                action="ADD"
                                onAction={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/add-language');
                                }}
                            />
                            {LANGUAGES.map((lang, i) => (
                                <View key={lang.name}>
                                    {i > 0 && <View style={styles.divider} />}
                                    <View style={styles.langRow}>
                                        <Text style={styles.langName}>{lang.name}</Text>
                                        <Text style={styles.langLevel}>({lang.level})</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* ── Links ──────────────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader
                                title="Links"
                                action="ADD"
                                onAction={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    // Navigate to add links screen or show modal
                                    router.push('/settings');
                                }}
                            />
                            <Pressable
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.push('/settings');
                                }}
                                style={({ pressed }) => [styles.emptyRow, pressed && { opacity: 0.7 }]}
                            >
                                <Ionicons name="link-outline" size={22} color={authColors.placeholder} />
                                <Text style={styles.emptyText}>No links added yet</Text>
                            </Pressable>
                        </View>

                        {/* ── Ratings ─────────────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader title="Ratings" />
                            <View style={styles.ratingsContainer}>
                                {RATINGS.map((rating, i) => (
                                    <View key={i} style={styles.ratingGroup}>
                                        <Text style={styles.ratingCount}>{rating.count}</Text>
                                        <View style={styles.starsRow}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Ionicons
                                                    key={star}
                                                    name={star <= rating.stars ? 'star' : 'star-outline'}
                                                    size={13}
                                                    color={star <= rating.stars ? authColors.accent : authColors.border}
                                                />
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* ── Reliability ────────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader title="Reliability" />
                            <View style={styles.reliabilityWrap}>
                                <View style={styles.reliabilityTrack}>
                                    <View style={[styles.reliabilityFill, { width: '92%' }]} />
                                </View>
                                <Text style={styles.reliabilityLabel}>Excellent</Text>
                            </View>
                        </View>

                        {/* ── Availability ──────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader title="Availability" />
                            <ToggleRow
                                icon="calendar-outline"
                                label="Set your availability"
                                description=""
                                value={settings.availability}
                                onValueChange={(val) => setSettings({ ...settings, availability: val })}
                            />
                        </View>

                        {/* ── Settings ──────────────────────────────────── */}
                        <View style={styles.fullWidthCard}>
                            <SectionHeader title="Settings" />
                            <ToggleRow
                                icon="scan-outline"
                                label="Allow Face ID"
                                description="Use Face ID to enter into the app"
                                value={settings.faceId}
                                onValueChange={(val) => setSettings({ ...settings, faceId: val })}
                            />
                            <View style={styles.divider} />
                            <ToggleRow
                                icon="cash-outline"
                                label="Showing Coins"
                                description=""
                                value={settings.showingCoins}
                                onValueChange={(val) => setSettings({ ...settings, showingCoins: val })}
                            />
                            <View style={styles.divider} />
                            <ToggleRow
                                icon="eye-off-outline"
                                label="Incognito mode"
                                description="The balance will be hidden"
                                value={settings.incognitoMode}
                                onValueChange={(val) => setSettings({ ...settings, incognitoMode: val })}
                            />
                            <View style={styles.divider} />
                            <InfoRow
                                icon="language-outline"
                                label="Language"
                                value={settings.language}
                                onPress={() => router.push('/add-language')}
                            />
      </View>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>

            {/* ── Image Picker Modal ──────────────────────────────────────── */}
            <ImagePickerModal
                visible={showImagePicker}
                onClose={() => setShowImagePicker(false)}
                onSelect={handleImageSelect}
            />
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

    // Header
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

    // Scroll
    scroll: {
        paddingTop: 24,
        gap: 16,
    },

    // Profile Picture
    profilePicSection: {
        alignItems: 'center',
        marginBottom: 8,
    },
    profilePicContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    profilePic: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: authColors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: `${authColors.accent}40`,
    },
    profilePicInitials: {
        fontSize: 36,
        fontFamily: authFonts.bold,
        color: authColors.background,
    },
    profilePicImage: {
        width: '100%',
        height: '100%',
        borderRadius: 47,
    },
    editPicBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: authColors.surface,
        borderWidth: 3,
        borderColor: authColors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareBtn: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: authColors.surface,
        borderWidth: 2,
        borderColor: authColors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    profileName: {
        fontSize: 18,
        fontFamily: authFonts.bold,
        color: authColors.text,
    },

    // Full Width Card
    fullWidthCard: {
        backgroundColor: authColors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(212,168,75,0.2)',
        paddingHorizontal: authSpacing.lg,
        paddingVertical: 20,
    },

    // Profile Strength
    profileStrengthRow: {
        marginBottom: 12,
    },
    profileStrengthLabel: {
        fontSize: 14,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
    },
    profileStrengthValue: {
        color: authColors.accent,
    },
    strengthBar: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 10,
    },
    strengthSegment: {
        flex: 1,
        height: 6,
        backgroundColor: `${authColors.border}40`,
        borderRadius: 3,
    },
    strengthSegmentFilled: {
        backgroundColor: authColors.accent,
    },
    strengthHint: {
        fontSize: 12,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
        lineHeight: 18,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sectionHeaderText: {
        fontSize: 15,
        fontFamily: authFonts.bold,
        color: authColors.text,
    },
    sectionAction: {
        fontSize: 13,
        fontFamily: authFonts.semiBold,
        color: authColors.accent,
        letterSpacing: 0.4,
    },

    // Upload Box
    uploadBox: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    uploadCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: authColors.accent,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${authColors.accent}0D`,
        position: 'relative',
    },
    addIcon: {
        position: 'absolute',
        bottom: 2,
        right: 2,
    },

    // Chips
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: authColors.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    chipText: {
        fontSize: 13,
        fontFamily: authFonts.semiBold,
        color: authColors.background,
    },

    // Experience
    expRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    expContent: {
        flex: 1,
        gap: 4,
    },
    expRole: {
        fontSize: 15,
        fontFamily: authFonts.bold,
        color: authColors.text,
    },
    expCompany: {
        fontSize: 13,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
    },
    expPeriod: {
        fontSize: 12,
        fontFamily: authFonts.regular,
        color: authColors.placeholder,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    ratingText: {
        fontSize: 13,
        fontFamily: authFonts.semiBold,
        color: authColors.accent,
    },
    approvedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
    },
    approvedText: {
        fontSize: 12,
        fontFamily: authFonts.semiBold,
        color: authColors.accent,
    },

    // Education
    eduRow: {
        paddingVertical: 12,
    },
    eduInstitution: {
        fontSize: 15,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
    },
    eduDegree: {
        fontSize: 15,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
    },

    // Training
    trainingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: authColors.accent,
        flexShrink: 0,
    },
    trainingText: {
        fontSize: 13,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
        flex: 1,
    },

    // Language
    langRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    langName: {
        fontSize: 14,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
    },
    langLevel: {
        fontSize: 13,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
    },

    // Empty State
    emptyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    emptyText: {
        fontSize: 13,
        fontFamily: authFonts.regular,
        color: authColors.placeholder,
    },

    // Ratings
    ratingsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 8,
    },
    ratingGroup: {
        alignItems: 'center',
        gap: 6,
    },
    ratingCount: {
        fontSize: 16,
        fontFamily: authFonts.bold,
        color: authColors.text,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
    },

    // Reliability
    reliabilityWrap: {
        gap: 8,
    },
    reliabilityTrack: {
        height: 8,
        backgroundColor: `${authColors.border}40`,
        borderRadius: 4,
        overflow: 'hidden',
    },
    reliabilityFill: {
        height: '100%',
        backgroundColor: authColors.accent,
        borderRadius: 4,
    },
    reliabilityLabel: {
        fontSize: 13,
        fontFamily: authFonts.semiBold,
        color: authColors.accent,
    },

    // Info Row
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    infoRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 14,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${authColors.accent}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContent: {
        flex: 1,
        gap: 3,
    },
    infoLabel: {
        fontSize: 12,
        fontFamily: authFonts.regular,
        color: authColors.textSecondary,
    },
    infoValue: {
        fontSize: 15,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
        marginTop: 2,
    },
    infoDescription: {
        fontSize: 13,
        fontFamily: authFonts.regular,
        color: authColors.text,
        marginTop: 2,
    },

    // Toggle Row
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: `${authColors.border}25`,
        marginVertical: 4,
    },

    // Image Picker Modal
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalBackdropAnimated: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: authColors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingHorizontal: authSpacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 16,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: authColors.border,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: authFonts.bold,
        color: authColors.text,
        marginBottom: 24,
        textAlign: 'center',
    },
    modalOptions: {
        gap: 12,
        marginBottom: 16,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 16,
        backgroundColor: `${authColors.accent}10`,
        borderWidth: 1,
        borderColor: `${authColors.accent}25`,
    },
    modalOptionPressed: {
        opacity: 0.7,
        backgroundColor: `${authColors.accent}18`,
    },
    modalOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${authColors.accent}20`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOptionText: {
        fontSize: 16,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
        flex: 1,
    },
    modalCancel: {
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: `${authColors.border}20`,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    modalCancelPressed: {
        opacity: 0.7,
    },
    modalCancelText: {
        fontSize: 16,
        fontFamily: authFonts.semiBold,
        color: authColors.text,
    },
});
