/**
 * Free geocoding via OpenStreetMap Nominatim
 * https://nominatim.org/release-docs/develop/api/Search/
 * No API key required. Use respectfully (max 1 req/sec).
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export type GeocodePlace = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string>;
};

export type ParsedPlace = {
  city: string;
  state: string;
  postcode: string;
  displayText: string;
};

function parsePlace(p: GeocodePlace): ParsedPlace {
  const addr = p.address || {};
  const city =
    addr.city || addr.town || addr.village || addr.municipality ||
    addr.county || addr.suburb || addr.neighbourhood || p.name || '';
  const state = addr.state || addr.state_district || '';
  const postcode = addr.postcode || '';
  const displayText = [city, state].filter(Boolean).join(', ') || p.display_name;
  return { city, state, postcode, displayText };
}

/** Fallback when API fails or returns empty */
const FALLBACK_PLACES: ParsedPlace[] = [
  { city: 'Mumbai', state: 'Maharashtra', postcode: '', displayText: 'Mumbai, Maharashtra' },
  { city: 'Delhi', state: 'Delhi', postcode: '', displayText: 'Delhi, Delhi' },
  { city: 'Bengaluru', state: 'Karnataka', postcode: '', displayText: 'Bengaluru, Karnataka' },
  { city: 'Chennai', state: 'Tamil Nadu', postcode: '', displayText: 'Chennai, Tamil Nadu' },
  { city: 'Hyderabad', state: 'Telangana', postcode: '', displayText: 'Hyderabad, Telangana' },
  { city: 'Pune', state: 'Maharashtra', postcode: '', displayText: 'Pune, Maharashtra' },
  { city: 'Kolkata', state: 'West Bengal', postcode: '', displayText: 'Kolkata, West Bengal' },
  { city: 'Ahmedabad', state: 'Gujarat', postcode: '', displayText: 'Ahmedabad, Gujarat' },
];

/** Search places in India via Nominatim */
export async function searchPlaces(query: string, limit = 10): Promise<ParsedPlace[]> {
  const q = query.trim();
  if (!q || q.length < 1) return [];
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}, India&format=json&limit=${limit}&addressdetails=1&countrycodes=in`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'GigEconomyApp/1.0 (contact@example.com)',
      },
    });
    if (!res.ok) return filterFallback(q);
    const data = (await res.json()) as GeocodePlace[];
    const seen = new Set<string>();
    const result: ParsedPlace[] = [];
    for (const p of data || []) {
      const parsed = parsePlace(p);
      if (!parsed.displayText) continue;
      const key = parsed.displayText.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(parsed);
      }
    }
    return result.length > 0 ? result : filterFallback(q);
  } catch {
    return filterFallback(query);
  }
}

function filterFallback(query: string): ParsedPlace[] {
  const q = query.trim().toLowerCase();
  if (!q) return FALLBACK_PLACES;
  return FALLBACK_PLACES.filter(
    (p) => p.city.toLowerCase().includes(q) || p.state.toLowerCase().includes(q),
  ).slice(0, 8);
}

/** Popular places shown when field is focused with empty value */
export function getDefaultPlaces(): ParsedPlace[] {
  return FALLBACK_PLACES;
}

/** Default states shown when State field is focused with empty value */
const DEFAULT_STATES = [
  'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat', 'Rajasthan',
  'Uttar Pradesh', 'West Bengal', 'Andhra Pradesh', 'Kerala', 'Madhya Pradesh',
];

export function getDefaultStates(): string[] {
  return DEFAULT_STATES;
}

/** Search for state names in India (extracts unique states from place results) */
export async function searchStates(query: string, limit = 8): Promise<string[]> {
  const places = await searchPlaces(query, 12);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of places) {
    if (p.state && !seen.has(p.state)) {
      seen.add(p.state);
      result.push(p.state);
      if (result.length >= limit) break;
    }
  }
  return result;
}

/** States with fallback: API first, then filtered defaults */
export async function searchStatesWithFallback(query: string): Promise<string[]> {
  const q = query.trim().toLowerCase();
  if (!q) return DEFAULT_STATES;
  try {
    const results = await searchStates(query, 10);
    if (results.length > 0) return results;
    return DEFAULT_STATES.filter((s) => s.toLowerCase().includes(q));
  } catch {
    return DEFAULT_STATES.filter((s) => s.toLowerCase().includes(q));
  }
}
