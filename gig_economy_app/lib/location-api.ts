/**
 * Indian cities and states – fetched from public API with fallback
 * API: https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json
 */

const CITIES_API =
  'https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json';

export type CityStateItem = { id: string; name: string; state: string };

let cachedCities: CityStateItem[] | null = null;
let cachedStates: string[] | null = null;

/** Get unique sorted states from cities data */
function deriveStates(cities: CityStateItem[]): string[] {
  const set = new Set(cities.map((c) => c.state));
  return Array.from(set).sort();
}

/** Fetch cities from API; returns cached data on subsequent calls */
export async function fetchIndianCities(): Promise<CityStateItem[]> {
  if (cachedCities) return cachedCities;
  try {
    const res = await fetch(CITIES_API, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('API request failed');
    const data = (await res.json()) as CityStateItem[];
    const list = Array.isArray(data) ? data : [];
    cachedCities = list;
    return list;
  } catch {
    return getFallbackCities();
  }
}

/** Get Indian states; fetches cities first if needed */
export async function fetchIndianStates(): Promise<string[]> {
  if (cachedStates) return cachedStates;
  const cities = await fetchIndianCities();
  cachedStates = deriveStates(cities);
  return cachedStates;
}

/** Get city names (for autocomplete) */
export async function fetchIndianCityNames(): Promise<string[]> {
  const cities = await fetchIndianCities();
  return cities.map((c) => c.name).filter(Boolean);
}

/** Build city → state map for auto-fill */
export function buildCityToStateMap(cities: CityStateItem[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of cities) {
    if (c.name && c.state) map[c.name] = c.state;
  }
  return map;
}

/** Fallback static data if API fails */
function getFallbackCities(): CityStateItem[] {
  const fallback: CityStateItem[] = [
    { id: '1', name: 'Mumbai', state: 'Maharashtra' },
    { id: '2', name: 'Delhi', state: 'Delhi' },
    { id: '3', name: 'Bengaluru', state: 'Karnataka' },
    { id: '4', name: 'Ahmedabad', state: 'Gujarat' },
    { id: '5', name: 'Hyderabad', state: 'Telangana' },
    { id: '6', name: 'Chennai', state: 'Tamil Nadu' },
    { id: '7', name: 'Kolkata', state: 'West Bengal' },
    { id: '8', name: 'Pune', state: 'Maharashtra' },
    { id: '9', name: 'Jaipur', state: 'Rajasthan' },
    { id: '10', name: 'Surat', state: 'Gujarat' },
  ];
  cachedCities = fallback;
  return fallback;
}
