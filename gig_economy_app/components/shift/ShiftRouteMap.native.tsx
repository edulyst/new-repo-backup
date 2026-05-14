/**
 * Map preview: job site + optional user position, driving route (OSRM) when available.
 * Native (iOS / Android) only — web uses `ShiftRouteMap.web.tsx` so `react-native-maps` is not in the web bundle.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type MapStyleElement, type Region } from 'react-native-maps';

import { authFonts } from '@/constants/auth-theme';
import { fetchDrivingRoutePolyline } from '@/lib/fetch-driving-route';
import { openMapsDirections } from '@/lib/open-maps-directions';

/** Google Maps JSON style — dark, high-contrast roads (Uber-adjacent look on Android). */
const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1720' }] },
];

type Props = {
  jobLat: number;
  jobLng: number;
  jobLabel?: string;
  userLat?: number | null;
  userLng?: number | null;
  accentColor: string;
  mutedColor: string;
  cardBg: string;
  borderColor: string;
  isDark: boolean;
};

export function ShiftRouteMap({
  jobLat,
  jobLng,
  jobLabel = 'Shift',
  userLat,
  userLng,
  accentColor,
  mutedColor,
  cardBg,
  borderColor,
  isDark,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const hasUser =
    userLat != null && userLng != null && Number.isFinite(userLat) && Number.isFinite(userLng);

  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const initialRegion: Region = {
    latitude: jobLat,
    longitude: jobLng,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  useEffect(() => {
    if (!hasUser) {
      setRouteCoords(null);
      setRouteLoading(false);
      return;
    }
    const ac = new AbortController();
    setRouteLoading(true);
    setRouteCoords(null);
    const from = { latitude: userLat as number, longitude: userLng as number };
    const to = { latitude: jobLat, longitude: jobLng };
    void fetchDrivingRoutePolyline(from, to, ac.signal)
      .then((poly) => {
        if (ac.signal.aborted) return;
        setRouteCoords(poly && poly.length >= 2 ? poly : null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setRouteLoading(false);
      });
    return () => ac.abort();
  }, [jobLat, jobLng, userLat, userLng, hasUser]);

  const polylineCoords = useMemo(() => {
    if (!hasUser) return [];
    if (routeCoords && routeCoords.length >= 2) return routeCoords;
    return [
      { latitude: userLat as number, longitude: userLng as number },
      { latitude: jobLat, longitude: jobLng },
    ];
  }, [hasUser, routeCoords, userLat, userLng, jobLat, jobLng]);

  useEffect(() => {
    const id = setTimeout(() => {
      const m = mapRef.current;
      if (!m) return;
      if (!hasUser) {
        m.animateToRegion(
          {
            latitude: jobLat,
            longitude: jobLng,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          },
          300,
        );
        return;
      }
      if (polylineCoords.length < 2) return;
      m.fitToCoordinates(polylineCoords, {
        edgePadding: { top: 48, right: 36, bottom: 36, left: 36 },
        animated: true,
      });
    }, routeCoords && routeCoords.length >= 2 ? 200 : 450);
    return () => clearTimeout(id);
  }, [jobLat, jobLng, hasUser, polylineCoords, routeCoords]);

  const onDirections = () => void openMapsDirections(jobLat, jobLng, userLat, userLng);

  return (
    <View style={[styles.wrap, { borderColor }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapType="standard"
        rotateEnabled={false}
        pitchEnabled={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        customMapStyle={isDark ? DARK_MAP_STYLE : undefined}
      >
        {hasUser && polylineCoords.length >= 2 && (
          <Polyline coordinates={polylineCoords} strokeColor={accentColor} strokeWidth={4} />
        )}
        {hasUser && (
          <Marker
            coordinate={{ latitude: userLat as number, longitude: userLng as number }}
            title="You"
            description="Your location"
            pinColor="#3B82F6"
          />
        )}
        <Marker coordinate={{ latitude: jobLat, longitude: jobLng }} title={jobLabel} description="Worksite" pinColor="#EAB308" />
      </MapView>
      {routeLoading && hasUser && (
        <View style={[styles.routeLoading, { backgroundColor: cardBg, borderColor }]}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={[styles.routeLoadingTxt, { color: mutedColor }]}>Loading route…</Text>
        </View>
      )}
      <Pressable onPress={onDirections} style={[styles.mapsChip, { backgroundColor: cardBg, borderColor }]} hitSlop={8}>
        <Ionicons name="navigate" size={14} color={accentColor} />
        <Text style={[styles.mapsChipTxt, { color: accentColor }]}>Directions</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  map: { ...StyleSheet.absoluteFillObject },
  routeLoading: {
    position: 'absolute',
    left: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  routeLoadingTxt: { fontSize: 11, fontFamily: authFonts.semiBold },
  mapsChip: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapsChipTxt: { fontSize: 13, fontFamily: authFonts.semiBold },
});
