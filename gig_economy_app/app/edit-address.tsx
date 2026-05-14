/**
 * Edit Address screen – Checkout-style with city/state auto-suggestions
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useAppTheme } from '@/contexts/AppThemeContext';
import { authFonts } from '@/constants/auth-theme';
import { getSavedAddress, setSavedAddress } from '@/lib/account-details-storage';
import type { ParsedPlace } from '@/lib/geocoding-api';
import { getDefaultPlaces, getDefaultStates, searchPlaces, searchStatesWithFallback } from '@/lib/geocoding-api';
import { useNotification } from '@/lib/notification-service';

const { width: W, height: H } = Dimensions.get('window');
const GRID_STEP = 36;

const DEBOUNCE_MS = 400;
const SUGGESTION_BOX_MAX_HEIGHT = 280;

// ─── Background ───────────────────────────────────────────────────────────────
function Background({ colors }: { colors: ReturnType<typeof useAppTheme>['colors'] }) {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= W; x += GRID_STEP)
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke={colors.accent + '08'} strokeWidth={1} />);
  for (let y = 0; y <= H; y += GRID_STEP)
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke={colors.accent + '08'} strokeWidth={1} />);
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.background} stopOpacity="0" />
          <Stop offset="50%" stopColor={colors.background} stopOpacity="0.7" />
          <Stop offset="100%" stopColor={colors.background} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="glow" cx="30%" cy="10%" rx="80%" ry="50%">
          <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.07" />
          <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lines}
      <Rect width={W} height={H} fill="url(#bg)" />
      <Rect width={W} height={H} fill="url(#glow)" />
    </Svg>
  );
}

// ─── Floating Label Input (basic, no suggestions) ─────────────────────────────
function FloatInput({
  label, value, onChangeText, placeholder, colors,
  keyboardType, maxLength, autoCapitalize, onClear, half, borderLeft,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; colors: ReturnType<typeof useAppTheme>['colors'];
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  maxLength?: number; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onClear?: () => void; half?: boolean; borderLeft?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: focused || value ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [focused, value]);

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 6] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.placeholder, focused ? colors.accent : colors.textSecondary],
  });

  return (
    <View style={[
      s.floatWrap, half && { flex: 1 },
      borderLeft && { borderLeftWidth: 1, borderLeftColor: colors.border },
      { backgroundColor: colors.inputBg, borderColor: focused ? colors.accent : colors.border },
    ]}>
      <Animated.Text style={[s.floatLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]} pointerEvents="none">
        {label}
      </Animated.Text>
      <TextInput
        value={value} onChangeText={onChangeText}
        placeholder={focused && !value ? placeholder || '' : ''}
        placeholderTextColor={colors.placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        keyboardType={keyboardType || 'default'} maxLength={maxLength}
        autoCapitalize={autoCapitalize || 'sentences'}
        style={[s.floatInput, { color: colors.text }]}
      />
      {onClear && value.length > 0 && (
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClear(); }} hitSlop={8} style={s.clearBtn}>
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Geocode Place Input (Nominatim API) ───────────────────────────────────────
function GeocodePlaceInput({
  label,
  value,
  onChangeText,
  colors,
  onClear,
  onSelectPlace,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onClear?: () => void;
  onSelectPlace: (place: ParsedPlace) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [places, setPlaces] = useState<ParsedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const selectingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<View>(null);
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const suggOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setPlaces([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(value, 10);
        setPlaces(results);
      } catch {
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const defaultPlaces = value.length === 0 && focused ? getDefaultPlaces() : [];
  const displayPlaces = places.length > 0 ? places : defaultPlaces;
  const isVisible = focused && (displayPlaces.length > 0 || loading || (value.length >= 1 && !loading && places.length === 0));
  const showEmpty = focused && value.length >= 1 && !loading && places.length === 0;

  useEffect(() => {
    Animated.timing(anim, { toValue: focused || value ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [focused, value]);

  useEffect(() => {
    Animated.timing(suggOpacity, { toValue: isVisible || showEmpty ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [isVisible, showEmpty]);

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 6] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.placeholder, focused ? colors.accent : colors.textSecondary],
  });

  const pick = (place: ParsedPlace) => {
    selectingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText(place.city);
    onSelectPlace(place);
    setFocused(false);
    Keyboard.dismiss();
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!selectingRef.current) setFocused(false);
      selectingRef.current = false;
    }, 220);
  };

  return (
    <View ref={wrapperRef} style={s.suggestWrapper} onLayout={() => wrapperRef.current?.measureInWindow((x, y, w, h) => setLayout({ x, y, width: w, height: h }))}>
      <View style={[s.floatWrap, { backgroundColor: colors.inputBg, borderColor: focused ? colors.accent : colors.border, borderWidth: focused ? 2 : 1 }]}>
        <Animated.Text style={[s.floatLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]} pointerEvents="none">
          {label}
        </Animated.Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          autoCapitalize="words"
          placeholder={focused && !value ? 'Search city or area…' : ''}
          placeholderTextColor={colors.placeholder}
          style={[s.floatInput, { color: colors.text }]}
        />
        {onClear && value.length > 0 && (
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClear(); }} hitSlop={8} style={s.clearBtn}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
        {!value && <Ionicons name="location-outline" size={18} color={colors.placeholder} style={s.clearBtn} />}
      </View>

      <Modal visible={isVisible || showEmpty} transparent animationType="none" statusBarTranslucent onRequestClose={() => setFocused(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setFocused(false)}>
          <Pressable
            style={[s.suggBoxModal, { top: (layout.width > 0 ? layout.y + layout.height : 120) + 4, left: layout.width > 0 ? layout.x : 20, width: layout.width > 0 ? layout.width : W - 40, backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {}}
          >
            <Animated.View style={{ opacity: suggOpacity }}>
              {loading ? (
                <View style={s.suggEmpty}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[s.suggEmptyText, { color: colors.textSecondary }]}>Searching…</Text>
                </View>
              ) : showEmpty ? (
                <View style={s.suggEmpty}>
                  <Ionicons name="search-outline" size={24} color={colors.textSecondary} />
                  <Text style={[s.suggEmptyText, { color: colors.textSecondary }]}>No places found</Text>
                  <Text style={[s.suggEmptySub, { color: colors.placeholder }]}>Try a different search</Text>
                </View>
              ) : (
                displayPlaces.length > 0 && (
                  <ScrollView style={s.suggScroll} contentContainerStyle={s.suggScrollContent} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {displayPlaces.map((place, idx) => (
                      <Pressable
                        key={`${place.displayText}-${idx}`}
                        onPressIn={() => { selectingRef.current = true; }}
                        onPress={() => pick(place)}
                        style={({ pressed }) => [
                          s.suggItem,
                          idx < displayPlaces.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                          pressed && { backgroundColor: colors.accent + '18' },
                        ]}
                      >
                        <View style={[s.suggItemIcon, { backgroundColor: colors.accent + '22' }]}>
                          <Ionicons name="location" size={14} color={colors.accent} />
                        </View>
                        <Text style={[s.suggText, { color: colors.text }]}>{place.displayText}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )
              )}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Geocode State Input (Nominatim API) ───────────────────────────────────────
function GeocodeStateInput({
  label,
  value,
  onChangeText,
  colors,
  onClear,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onClear?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const selectingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<View>(null);
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const suggOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!focused) return;
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchStatesWithFallback(value);
        setStates(results);
      } catch {
        setStates(getDefaultStates());
      } finally {
        setLoading(false);
      }
    }, value.trim() ? DEBOUNCE_MS : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, focused]);

  const displayStates = states.length > 0 ? states : (focused && !value ? getDefaultStates() : []);
  const isVisible = focused && (displayStates.length > 0 || loading || (value.length >= 1 && !loading && states.length === 0));
  const showEmpty = focused && value.length >= 1 && !loading && states.length === 0;

  useEffect(() => {
    Animated.timing(anim, { toValue: focused || value ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [focused, value]);
  useEffect(() => {
    Animated.timing(suggOpacity, { toValue: isVisible || showEmpty ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [isVisible, showEmpty]);

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 6] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.placeholder, focused ? colors.accent : colors.textSecondary],
  });

  const pick = (s: string) => {
    selectingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText(s);
    setFocused(false);
    Keyboard.dismiss();
  };

  return (
    <View ref={wrapperRef} style={s.suggestWrapper} onLayout={() => wrapperRef.current?.measureInWindow((x, y, w, h) => setLayout({ x, y, width: w, height: h }))}>
      <View style={[s.floatWrap, { backgroundColor: colors.inputBg, borderColor: focused ? colors.accent : colors.border, borderWidth: focused ? 2 : 1 }]}>
        <Animated.Text style={[s.floatLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]} pointerEvents="none">{label}</Animated.Text>
        <TextInput value={value} onChangeText={onChangeText} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => { if (!selectingRef.current) setFocused(false); selectingRef.current = false; }, 220)} autoCapitalize="words" placeholder={focused && !value ? 'Search state…' : ''} placeholderTextColor={colors.placeholder} style={[s.floatInput, { color: colors.text }]} />
        {onClear && value.length > 0 && <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClear(); }} hitSlop={8} style={s.clearBtn}><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></Pressable>}
        {!value && <Ionicons name="flag-outline" size={18} color={colors.placeholder} style={s.clearBtn} />}
      </View>
      <Modal visible={isVisible || showEmpty} transparent animationType="none" statusBarTranslucent onRequestClose={() => setFocused(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setFocused(false)}>
          <Pressable style={[s.suggBoxModal, { top: (layout.width > 0 ? layout.y + layout.height : 180) + 4, left: layout.width > 0 ? layout.x : 20, width: layout.width > 0 ? layout.width : W - 40, backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
            <Animated.View style={{ opacity: suggOpacity }}>
              {loading ? (
                <View style={s.suggEmpty}><ActivityIndicator size="small" color={colors.accent} /><Text style={[s.suggEmptyText, { color: colors.textSecondary }]}>Searching…</Text></View>
              ) : showEmpty ? (
                <View style={s.suggEmpty}>
                  <Ionicons name="search-outline" size={24} color={colors.textSecondary} />
                  <Text style={[s.suggEmptyText, { color: colors.textSecondary }]}>No states found</Text>
                  <Text style={[s.suggEmptySub, { color: colors.placeholder }]}>Try a different search</Text>
                </View>
              ) : (
                <ScrollView style={s.suggScroll} contentContainerStyle={s.suggScrollContent} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {displayStates.map((stateName, idx) => (
                    <Pressable key={stateName} onPressIn={() => { selectingRef.current = true; }} onPress={() => pick(stateName)} style={({ pressed }) => [s.suggItem, idx < displayStates.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pressed && { backgroundColor: colors.accent + '18' }]}>
                      <View style={[s.suggItemIcon, { backgroundColor: colors.accent + '22' }]}><Ionicons name="location" size={14} color={colors.accent} /></View>
                      <Text style={[s.suggText, { color: colors.text }]}>{stateName}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EditAddressScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const notification = useNotification();

  const [addressLine1, setAddressLine1] = useState('Flat 23, Barwell House');
  const [addressLine2, setAddressLine2] = useState('Menotti St');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState('India');

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  const s1Opacity = useRef(new Animated.Value(0)).current;
  const s1Y = useRef(new Animated.Value(16)).current;
  const s2Opacity = useRef(new Animated.Value(0)).current;
  const s2Y = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(s1Opacity, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.timing(s1Y, { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(s2Opacity, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.timing(s2Y, { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadAddress = async () => {
      const saved = await getSavedAddress();
      if (!mounted) return;
      setAddressLine1(saved.line1);
      setAddressLine2(saved.line2);
      setCity(saved.city);
      setState(saved.state);
      setPinCode(saved.pinCode);
      setCountry(saved.country);
    };
    void loadAddress();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={s.safe} edges={['left', 'right', 'bottom']}>

        {/* Header */}
        <Animated.View style={[s.header, { paddingTop: insets.top, opacity: headerOpacity, transform: [{ translateY: headerY }] }]}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            hitSlop={14} style={({ pressed }) => [s.headerBack, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]}>Update Address</Text>
          <View style={{ width: 44 }} />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 48 }]}
            keyboardShouldPersistTaps="always"
          >
            {/* ── Section 1: Street address ─── */}
            <Animated.View style={{ opacity: s1Opacity, transform: [{ translateY: s1Y }] }}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Street address</Text>
              <View style={[s.formBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FloatInput
                  label="Address line 1" value={addressLine1} onChangeText={setAddressLine1}
                  placeholder="House / flat no., street name" colors={colors}
                  autoCapitalize="words" onClear={() => setAddressLine1('')}
                />
                <View style={[s.divider, { backgroundColor: colors.border }]} />
                <FloatInput
                  label="Address line 2  (optional)" value={addressLine2} onChangeText={setAddressLine2}
                  placeholder="Apartment, landmark, area…" colors={colors}
                  autoCapitalize="words" onClear={() => setAddressLine2('')}
                />
              </View>
            </Animated.View>

            {/* ── Section 2: City & region ──── */}
            <Animated.View style={{ opacity: s2Opacity, transform: [{ translateY: s2Y }] }}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>City & region</Text>

              {/* City with suggestions */}
              <View style={[s.formBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <GeocodePlaceInput
                  label="City / Town"
                  value={city}
                  onChangeText={setCity}
                  colors={colors}
                  onClear={() => setCity('')}
                  onSelectPlace={(place) => {
                    setCity(place.city);
                    setState(place.state);
                    if (place.postcode) setPinCode(place.postcode);
                  }}
                />
                <View style={[s.divider, { backgroundColor: colors.border }]} />

                {/* State with suggestions */}
                <GeocodeStateInput
                  label="State"
                  value={state}
                  onChangeText={setState}
                  colors={colors}
                  onClear={() => setState('')}
                />
                <View style={[s.divider, { backgroundColor: colors.border }]} />

                {/* PIN + Country row */}
                <View style={s.rowFields}>
                  <FloatInput
                    label="PIN Code" value={pinCode}
                    onChangeText={(t) => setPinCode(t.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit" colors={colors} keyboardType="numeric" maxLength={6}
                    half onClear={() => setPinCode('')}
                  />
                  <FloatInput
                    label="Country" value={country} onChangeText={setCountry}
                    placeholder="Country" colors={colors} autoCapitalize="words"
                    half borderLeft onClear={() => setCountry('')}
                  />
                </View>
              </View>
            </Animated.View>

            {/* ── Save ─── */}
            <Pressable
              onPress={async () => {
                if (!addressLine1.trim()) {
                  notification.showError('Address line 1 is required.');
                  return;
                }
                await setSavedAddress({
                  line1: addressLine1.trim(),
                  line2: addressLine2.trim(),
                  city: city.trim(),
                  state: state.trim(),
                  pinCode: pinCode.trim(),
                  country: country.trim(),
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                notification.showSuccess('Address saved.');
                router.back();
              }}
              style={({ pressed }) => [s.saveBtn, { backgroundColor: colors.accent, shadowColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#0D0D0D" />
              <Text style={s.saveBtnText}>Save Address</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  headerBack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  headerTitle: { fontSize: 17, fontFamily: authFonts.semiBold, letterSpacing: 0.2 },
  scroll: { paddingHorizontal: 20, paddingTop: 12 },
  sectionTitle: { fontSize: 18, fontFamily: authFonts.bold, marginBottom: 12, marginTop: 24, letterSpacing: 0.1 },
  formBlock: { borderRadius: 14, borderWidth: 1, overflow: 'visible' },
  divider: { height: 1 },
  rowFields: { flexDirection: 'row' },

  // Floating label
  floatWrap: {
    borderWidth: 1, minHeight: 64,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'flex-end', paddingTop: 6,
  },
  floatLabel: { position: 'absolute', left: 16, fontFamily: authFonts.regular },
  floatInput: { flex: 1, fontSize: 15, fontFamily: authFonts.regular, paddingBottom: 12, paddingTop: 20 },
  clearBtn: { paddingBottom: 14, marginLeft: 8 },

  // Suggestions
  suggestWrapper: { position: 'relative' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  suggBoxModal: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 14,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    overflow: 'hidden',
    maxHeight: SUGGESTION_BOX_MAX_HEIGHT,
  },
  suggScroll: { maxHeight: 240 },
  suggScrollContent: { paddingBottom: 12 },
  suggHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  suggHeaderText: { fontSize: 11, fontFamily: authFonts.semiBold, letterSpacing: 0.8, textTransform: 'uppercase' },
  suggItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  suggItemIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  suggText: { fontSize: 15, fontFamily: authFonts.regular },
  suggEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 8,
  },
  suggEmptyText: { fontSize: 15, fontFamily: authFonts.semiBold },
  suggEmptySub: { fontSize: 13, fontFamily: authFonts.regular },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 17, marginTop: 32,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: authFonts.bold, color: '#0D0D0D', letterSpacing: 0.3 },
});
