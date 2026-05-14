/**
 * Persist worker GPS coordinates (requires existing worker profile on server).
 */
import { apiRequest } from './api';

export async function updateWorkerLocation(params: {
  lat: number;
  lng: number;
  city?: string;
  radiusKm?: number;
}): Promise<void> {
  await apiRequest('/api/v1/student/me/location', {
    method: 'PATCH',
    body: JSON.stringify({
      lat: params.lat,
      lng: params.lng,
      ...(params.city ? { city: params.city } : {}),
      ...(params.radiusKm != null ? { radius_km: params.radiusKm } : {}),
    }),
  });
}
