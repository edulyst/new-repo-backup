/**
 * Web: no react-native-maps (native-only on web / avoids Metro web bundle errors).
 */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authFonts } from '@/constants/auth-theme';
import { openMapsDirections } from '@/lib/open-maps-directions';

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
  userLat,
  userLng,
  accentColor,
  mutedColor,
  cardBg,
  borderColor,
}: Props) {
  const onDirections = () => void openMapsDirections(jobLat, jobLng, userLat, userLng);

  return (
    <View style={[styles.fallback, { backgroundColor: cardBg, borderColor }]}>
      <Ionicons name="map-outline" size={22} color={mutedColor} />
      <Text style={[styles.fallbackTitle, { color: mutedColor }]}>Route preview</Text>
      <Text style={[styles.fallbackSub, { color: mutedColor }]}>
        Open directions in your maps app.
      </Text>
      <Pressable onPress={onDirections} style={[styles.fallbackBtn, { borderColor: accentColor }]}>
        <Text style={[styles.fallbackBtnTxt, { color: accentColor }]}>Open in Maps</Text>
        <Ionicons name="open-outline" size={16} color={accentColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  fallbackTitle: { fontSize: 14, fontFamily: authFonts.semiBold },
  fallbackSub: { fontSize: 12, fontFamily: authFonts.regular, textAlign: 'center', lineHeight: 17 },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  fallbackBtnTxt: { fontSize: 14, fontFamily: authFonts.semiBold },
});
