/**
 * Driving-route geometry (follows roads) via OSRM public demo server.
 * Falls back to null on failure — caller may draw a straight line instead.
 * For production, use your own OSRM / Mapbox / Google Directions behind your API.
 */
export type RouteCoordinate = { latitude: number; longitude: number };

export async function fetchDrivingRoutePolyline(
  from: RouteCoordinate,
  to: RouteCoordinate,
  signal?: AbortSignal,
): Promise<RouteCoordinate[] | null> {
  const a = `${from.longitude},${from.latitude}`;
  const b = `${to.longitude},${to.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${a};${b}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
    };
    const coords = json?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    return coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  } catch {
    return null;
  }
}
