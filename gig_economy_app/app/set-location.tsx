import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
import WebView from 'react-native-webview';

import { authColors, authFonts, authSpacing } from '@/constants/auth-theme';

const MAP_H = 200;
const { width: W, height: SCREEN_H } = Dimensions.get('window');
const BOTTOM_SHEET_H = Math.min(SCREEN_H * 0.78, 580);

function openInGoogleMaps(lat: number, lon: number) {
  Linking.openURL(`https://www.google.com/maps?q=${lat},${lon}`).catch(() => {});
}

type LocationType = 'near' | 'home' | 'other';

const RADIUS_OPTIONS = [
  { value: 5,   label: '5 mi' },
  { value: 10,  label: '10 mi' },
  { value: 25,  label: '25 mi' },
  { value: 50,  label: '50 mi' },
  { value: 100, label: '100 mi' },
];

const TYPE_OPTIONS: { id: LocationType; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
  { id: 'near', icon: 'locate',           label: 'Near me' },
  { id: 'home', icon: 'home-outline',     label: 'Home' },
  { id: 'other', icon: 'location-outline', label: 'Other' },
];

interface Suggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

function mapHtml(lat: number, lon: number, zoom = 13) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#1a1a1a;}</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${lat},${lon}],${zoom});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);
  var icon = L.divIcon({
    html:'<div style="width:20px;height:20px;background:#D4A84B;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.45);"></div>',
    className:'',iconSize:[20,20],iconAnchor:[10,10]
  });
  L.marker([${lat},${lon}],{icon}).addTo(map);
</script>
</body>
</html>`;
}

export default function SetLocationScreen() {
  const insets = useSafeAreaInsets();
  const { returnToExplore } = useLocalSearchParams<{ returnToExplore?: string }>();
  const [locationType, setLocationType] = useState<LocationType>('home');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [radius, setRadius] = useState(25);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fullScreenMap, setFullScreenMap] = useState(false);
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(24)).current;
  const inputBlockY       = useRef(new Animated.Value(30)).current;
  const inputBlockOpacity = useRef(new Animated.Value(0)).current;
  const mapScaleAnim   = useRef(new Animated.Value(0.96)).current;
  const mapOpacityAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim     = useRef(new Animated.Value(0)).current;
  const sheetBackdrop  = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(BOTTOM_SHEET_H)).current;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(status);
        if (status === 'granted') animateBanner(false);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [animateBanner]);

  const animateBanner = useCallback((show: boolean) => {
    Animated.spring(bannerAnim, {
      toValue: show ? 1 : 0,
      bounciness: show ? 6 : 0,
      speed: 14,
      useNativeDriver: true,
    }).start();
  }, [bannerAnim]);

  const ensurePermission = useCallback(async (): Promise<Location.PermissionStatus> => {
    const { status: current } = await Location.getForegroundPermissionsAsync();
    if (current === 'granted') { animateBanner(false); return current; }
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);
    if (status !== 'granted') animateBanner(true);
    else animateBanner(false);
    return status;
  }, [animateBanner]);

  const openAppSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openSettings();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') await ensurePermission();
      else setPermissionStatus(status);
      setLoading(false);
    })();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(inputBlockY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(inputBlockOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const showMap = (lat: number, lon: number) => {
    setCoords({ lat, lon });
    Animated.parallel([
      Animated.spring(mapScaleAnim, { toValue: 1, bounciness: 5, speed: 14, useNativeDriver: true }),
      Animated.timing(mapOpacityAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]).start();
  };

  const getCurrentLocation = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const perm = await ensurePermission();
    if (perm !== 'granted') return;
    setLocating(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lon } = loc.coords;
      const [rev] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      const addr = [rev?.name, rev?.city, rev?.region].filter(Boolean).join(', ')
        || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      setLocationText(addr);
      showMap(lat, lon);
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    } finally {
      setLocating(false);
    }
  }, [ensurePermission]);

  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'GigEconomyApp/1.0' } });
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 350);
  }, []);

  const handleTextChange = (t: string) => {
    setLocationText(t);
    fetchSuggestions(t);
  };

  const selectSuggestion = (s: Suggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocationText(s.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
    showMap(parseFloat(s.lat), parseFloat(s.lon));
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    if (returnToExplore === '1') {
      router.replace({ pathname: '/(tabs)/explore', params: { location: locationText || 'Nearby', radius: String(radius) } });
    } else {
      router.back();
    }
  };

  const openBottomSheet = useCallback(() => {
    if (!coords) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFullScreenMap(true);
    sheetBackdrop.setValue(0);
    sheetTranslateY.setValue(BOTTOM_SHEET_H);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(sheetBackdrop, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    });
  }, [coords, sheetBackdrop, sheetTranslateY]);

  const closeBottomSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(sheetBackdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: BOTTOM_SHEET_H, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setFullScreenMap(false));
  }, [sheetBackdrop, sheetTranslateY]);

  if (loading) {
    return (
      <View style={[st.screen, st.centered]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={authColors.accent} />
      </View>
    );
  }

  const canSave = locationText.length > 0 || locationType === 'near';

  return (
    <View style={st.screen}>
      <StatusBar style="light" />

      {/* ── Custom header ── */}
      <View style={[st.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          hitSlop={16}
          onPress={() => router.back()}
          style={({ pressed }) => [st.headerBackBtn, pressed && { opacity: 0.55 }]}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={st.headerLabel}>Set Location</Text>
        <Pressable
          hitSlop={16}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/notifications'); }}
          style={({ pressed }) => [st.headerIconBtn, pressed && { opacity: 0.55 }]}
        >
          <Ionicons name="notifications-outline" size={20} color="#FFF" />
        </Pressable>
      </View>

      {/* ── Permission banner ── */}
      <Animated.View
        style={[st.permBanner, {
          opacity: bannerAnim,
          transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-52, 0] }) }],
        }]}
        pointerEvents={permissionStatus === 'granted' ? 'none' : 'auto'}
      >
        <Ionicons name="warning-outline" size={15} color={authColors.accent} />
        <Text style={st.permText}>Location access is off.</Text>
        <Pressable onPress={openAppSettings} style={({ pressed }) => [st.permBtn, pressed && { opacity: 0.7 }]}>
          <Text style={st.permBtnLabel}>Open Settings</Text>
        </Pressable>
      </Animated.View>

      <SafeAreaView style={st.safe} edges={['left', 'right', 'bottom']}>
        <KeyboardAvoidingView style={st.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={st.scroll}
            contentContainerStyle={[st.scrollContent, { paddingBottom: 140 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[st.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

              {/* ── Title ── */}
              <Animated.View style={{ opacity: inputBlockOpacity, transform: [{ translateY: inputBlockY }] }}>
                <View style={st.titleArea}>
                  <Text style={st.eyebrow}>Work location</Text>
                  <Text style={st.titleText}>Where do you{'\n'}want to work?</Text>
                  <Text style={st.subtitleText}>Pick a location and radius to see matching shifts.</Text>
                </View>

                {/* ── Location type tabs ── */}
                <View style={st.typeRow}>
                  {TYPE_OPTIONS.map(opt => {
                    const active = locationType === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setLocationType(opt.id);
                          if (opt.id === 'near') getCurrentLocation();
                        }}
                        style={({ pressed }) => [
                          st.typeTab,
                          active && st.typeTabActive,
                          pressed && !active && { opacity: 0.65 },
                        ]}
                      >
                        <View style={[st.typeTabIcon, active && st.typeTabIconActive]}>
                          <Ionicons name={opt.icon} size={15} color={active ? authColors.background : authColors.textSecondary} />
                        </View>
                        <Text style={[st.typeTabLabel, active && st.typeTabLabelActive]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* ── Search input ── */}
                <View style={[st.searchWrap, inputFocused && st.searchWrapFocused]}>
                  <Ionicons name="search-outline" size={17} color={inputFocused ? authColors.accent : authColors.placeholder} />
                  <TextInput
                    style={st.searchInput}
                    placeholder="Search city, suburb or postcode…"
                    placeholderTextColor={authColors.placeholder}
                    value={locationText}
                    onChangeText={handleTextChange}
                    onFocus={() => { setInputFocused(true); if (locationText.length >= 3) setShowSuggestions(true); }}
                    onBlur={() => { setInputFocused(false); setTimeout(() => setShowSuggestions(false), 200); }}
                    returnKeyType="search"
                  />
                  {locating
                    ? <ActivityIndicator size="small" color={authColors.accent} />
                    : (
                      <Pressable onPress={getCurrentLocation} hitSlop={14} style={({ pressed }) => [st.locateBtn, pressed && { opacity: 0.6 }]}>
                        <Ionicons name="locate" size={18} color={authColors.accent} />
                      </Pressable>
                    )
                  }
                </View>
              </Animated.View>

              {/* ── Suggestions ── */}
              {showSuggestions && suggestions.length > 0 && (
                <View style={st.suggestBox}>
                  {suggestions.map((s, i) => (
                    <Pressable
                      key={s.place_id}
                      onPress={() => selectSuggestion(s)}
                      style={({ pressed }) => [
                        st.suggestRow,
                        i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(92,82,72,0.18)' },
                        pressed && { backgroundColor: 'rgba(212,168,75,0.06)' },
                      ]}
                    >
                      <View style={st.suggestDot} />
                      <Text style={st.suggestText} numberOfLines={2}>{s.display_name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* ── Map preview ── */}
              {coords && (
                <Animated.View style={[st.mapCard, { opacity: mapOpacityAnim, transform: [{ scale: mapScaleAnim }] }]}>
                  {/* Address pill over map */}
                  <View style={st.mapAddressBadge}>
                    <Ionicons name="location" size={12} color={authColors.accent} />
                    <Text style={st.mapAddressText} numberOfLines={1}>
                      {locationText || `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`}
                    </Text>
                  </View>
                  <WebView
                    source={{ html: mapHtml(coords.lat, coords.lon) }}
                    style={st.map}
                    scrollEnabled={false}
                    bounces={false}
                    javaScriptEnabled
                    originWhitelist={['*']}
                  />
                  {/* Bottom overlay with coords + actions */}
                  <View style={st.mapBar}>
                    <Text style={st.mapCoords}>{coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}</Text>
                    <View style={st.mapBarActions}>
                      <Pressable
                        onPress={() => openInGoogleMaps(coords.lat, coords.lon)}
                        style={({ pressed }) => [st.mapBarBtn, pressed && { opacity: 0.7 }]}
                      >
                        <Ionicons name="navigate-outline" size={13} color={authColors.accent} />
                        <Text style={st.mapBarBtnLabel}>Open in Maps</Text>
                      </Pressable>
                      <Pressable
                        onPress={openBottomSheet}
                        hitSlop={8}
                        style={({ pressed }) => [st.mapExpandBtn, pressed && { opacity: 0.7 }]}
                      >
                        <Ionicons name="expand-outline" size={17} color={authColors.accent} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Bottom sheet fullscreen map */}
                  <Modal
                    visible={fullScreenMap}
                    transparent
                    animationType="none"
                    statusBarTranslucent
                    onRequestClose={closeBottomSheet}
                  >
                    <View style={st.sheetContainer}>
                      <Animated.View style={[st.sheetBackdrop, { opacity: sheetBackdrop }]}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={closeBottomSheet} />
                      </Animated.View>
                      <Animated.View style={[st.sheetPanel, { height: BOTTOM_SHEET_H, transform: [{ translateY: sheetTranslateY }] }]}>
                        <View style={st.sheetHandle} />
                        <View style={st.sheetHeaderRow}>
                          <View style={st.sheetHeaderLeft}>
                            <Ionicons name="location" size={15} color={authColors.accent} />
                            <Text style={st.sheetTitle} numberOfLines={2}>
                              {locationText || `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`}
                            </Text>
                          </View>
                          <Pressable onPress={closeBottomSheet} hitSlop={12} style={({ pressed }) => [st.sheetCloseBtn, pressed && { opacity: 0.6 }]}>
                            <Ionicons name="close" size={20} color={authColors.textSecondary} />
                          </Pressable>
                        </View>
                        <View style={st.sheetMapWrap}>
                          <WebView
                            source={{ html: mapHtml(coords.lat, coords.lon, 14) }}
                            style={st.sheetMap}
                            scrollEnabled
                            bounces={false}
                            javaScriptEnabled
                            originWhitelist={['*']}
                          />
                        </View>
                        <View style={[st.sheetFooter, { paddingBottom: insets.bottom + 32 }]}>
                          <Text style={st.sheetCoords}>{coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}</Text>
                          <Pressable
                            onPress={() => openInGoogleMaps(coords.lat, coords.lon)}
                            style={({ pressed }) => [st.sheetMapsBtn, pressed && { opacity: 0.88 }]}
                          >
                            <Ionicons name="navigate" size={16} color={authColors.background} />
                            <Text style={st.sheetMapsBtnLabel}>Open in Google Maps</Text>
                          </Pressable>
                        </View>
                      </Animated.View>
                    </View>
                  </Modal>
                </Animated.View>
              )}

              {/* ── Radius picker ── */}
              <View style={st.radiusBlock}>
                <View style={st.radiusHeaderRow}>
                  <Text style={st.radiusLabel}>Search radius</Text>
                  <View style={st.radiusValueBadge}>
                    <Text style={st.radiusValueText}>within {radius} mi</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.radiusChips}>
                  {RADIUS_OPTIONS.map(opt => {
                    const sel = radius === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRadius(opt.value); }}
                        style={[st.radiusChip, sel && st.radiusChipSel]}
                      >
                        <Text style={[st.radiusChipText, sel && st.radiusChipTextSel]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Fixed footer – always visible ── */}
        <View style={[st.fixedFooter, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [st.saveBtn, !canSave && st.saveBtnDisabled, pressed && { opacity: 0.88 }]}
          >
            <Text style={st.saveBtnText}>
              {returnToExplore === '1' ? 'Find shifts nearby' : 'Save location'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={authColors.background} />
          </Pressable>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [st.cancelBtn, pressed && { opacity: 0.5 }]}>
            <Text style={st.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const BORDER = 'rgba(92,82,72,0.28)';

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background, position: 'relative' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },

  // ── Custom header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: authColors.accent,
  },
  headerBackBtn: {
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  headerLabel: { fontSize: 15, fontFamily: authFonts.semiBold, color: '#FFF', letterSpacing: 0.3 },
  headerIconBtn: {
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Permission banner ──
  permBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: authColors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    borderLeftWidth: 3, borderLeftColor: authColors.accent,
  },
  permText: { flex: 1, fontSize: 12, fontFamily: authFonts.regular, color: authColors.textSecondary },
  permBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: authColors.accent, borderRadius: 7 },
  permBtnLabel: { fontSize: 11, fontFamily: authFonts.bold, color: authColors.background },

  // ── Body ──
  body: { gap: 28, paddingTop: 28 },

  // ── Title area ──
  titleArea: { gap: 6, marginBottom: 20 },
  eyebrow: {
    fontSize: 10, fontFamily: authFonts.semiBold, color: authColors.accent,
    letterSpacing: 2.5, textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 30, fontFamily: authFonts.titleBold, color: authColors.text,
    lineHeight: 38, letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13, fontFamily: authFonts.regular, color: authColors.placeholder,
    lineHeight: 20, marginTop: 2,
  },

  // ── Type tabs ──
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 11,
    backgroundColor: authColors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: BORDER,
  },
  typeTabActive: {
    backgroundColor: authColors.accent, borderColor: authColors.accent,
  },
  typeTabIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(212,168,75,0.12)',
  },
  typeTabIconActive: { backgroundColor: 'rgba(13,13,13,0.18)' },
  typeTabLabel: { fontSize: 12, fontFamily: authFonts.semiBold, color: authColors.textSecondary },
  typeTabLabelActive: { color: authColors.background },

  // ── Search input ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 4,
    backgroundColor: authColors.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
  },
  searchWrapFocused: { borderColor: authColors.accent + '70' },
  searchInput: {
    flex: 1, paddingVertical: 13, fontSize: 14,
    fontFamily: authFonts.regular, color: authColors.text,
  },
  locateBtn: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(212,168,75,0.1)',
  },

  // ── Suggestions ──
  suggestBox: {
    backgroundColor: authColors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', marginTop: -14,
  },
  suggestRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  suggestDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: authColors.accent, marginTop: 6 },
  suggestText: { flex: 1, fontSize: 13, fontFamily: authFonts.regular, color: authColors.text, lineHeight: 19 },

  // ── Map ──
  mapCard: {
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    height: MAP_H,
  },
  mapAddressBadge: {
    position: 'absolute', top: 10, left: 10, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(13,13,13,0.82)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,168,75,0.25)',
    maxWidth: W - 80,
  },
  mapAddressText: { fontSize: 11, fontFamily: authFonts.semiBold, color: authColors.text, flex: 1 },
  map: { flex: 1, backgroundColor: '#141414' },
  mapBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: 'rgba(13,13,13,0.82)',
  },
  mapCoords: { fontSize: 10, fontFamily: authFonts.semiBold, color: 'rgba(250,247,242,0.5)' },
  mapBarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapBarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 9,
    borderRadius: 8, backgroundColor: 'rgba(212,168,75,0.1)',
    borderWidth: 1, borderColor: 'rgba(212,168,75,0.22)',
  },
  mapBarBtnLabel: { fontSize: 11, fontFamily: authFonts.semiBold, color: authColors.accent },
  mapExpandBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(212,168,75,0.1)',
    borderWidth: 1, borderColor: 'rgba(212,168,75,0.22)',
  },

  // ── Bottom sheet ──
  sheetContainer: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.62)' },
  sheetPanel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#1C1914',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderWidth: 1, borderColor: BORDER, borderBottomWidth: 0,
    overflow: 'hidden',
  },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(139,115,85,0.45)', marginTop: 10 },
  sheetHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
  },
  sheetHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { flex: 1, fontSize: 14, fontFamily: authFonts.semiBold, color: authColors.text },
  sheetCloseBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sheetMapWrap: { flex: 1, minHeight: 240 },
  sheetMap: { flex: 1, backgroundColor: '#141414' },
  sheetFooter: { paddingHorizontal: 20, paddingTop: 14, gap: 10 },
  sheetCoords: { fontSize: 10, fontFamily: authFonts.regular, color: authColors.placeholder },
  sheetMapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: authColors.accent, borderRadius: 12, paddingVertical: 14,
  },
  sheetMapsBtnLabel: { fontSize: 15, fontFamily: authFonts.bold, color: authColors.background },

  // ── Radius ──
  radiusBlock: { gap: 12 },
  radiusHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  radiusLabel: { fontSize: 10, fontFamily: authFonts.semiBold, color: authColors.placeholder, letterSpacing: 1.5, textTransform: 'uppercase' },
  radiusValueBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(212,168,75,0.12)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,168,75,0.25)',
  },
  radiusValueText: { fontSize: 12, fontFamily: authFonts.bold, color: authColors.accent },
  radiusChips: { flexDirection: 'row', gap: 8 },
  radiusChip: {
    paddingVertical: 11, paddingHorizontal: 22,
    borderRadius: 24, borderWidth: 1,
    backgroundColor: authColors.surface, borderColor: BORDER,
  },
  radiusChipSel: { backgroundColor: authColors.accent, borderColor: authColors.accent },
  radiusChipText: { fontSize: 13, fontFamily: authFonts.semiBold, color: authColors.textSecondary },
  radiusChipTextSel: { color: authColors.background },

  // ── Footer (pinned) ──
  fixedFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingTop: 12,
    backgroundColor: authColors.background,
    borderTopWidth: 1, borderTopColor: 'rgba(92,82,72,0.22)',
    gap: 8,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: authColors.accent, borderRadius: 14, paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontSize: 15, fontFamily: authFonts.bold, color: authColors.background, letterSpacing: 0.2 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 13, fontFamily: authFonts.semiBold, color: authColors.placeholder },
});
