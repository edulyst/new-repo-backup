import { apiRequest } from './api';

export type ShiftCategory =
  | 'Hospitality'
  | 'Retail'
  | 'Logistics'
  | 'Events'
  | 'Cleaning'
  | 'Security';

export interface Shift {
  id: string;
  company: string;
  employerLogoUrl?: string | null;
  employerLogoFit?: 'contain' | 'cover';
  role: string;
  category: ShiftCategory;
  address: string;
  area: string;
  city: string;
  payPerHour: number;
  startAt: string; // ISO
  durationHours: number;
  distanceKm: number;
  /** Shift worksite coordinates (from API) — used for map / route preview. */
  locationLat?: number;
  locationLng?: number;
  urgent: boolean;
  spots: number;
  requirements: string[];
  description: string;
  applied?: boolean;
}

export interface MyShift extends Shift {
  applicationId?: string;
  status: 'applied' | 'accepted' | 'cancelled';
  appliedAt: string; // ISO
}

export type ShiftDecision = 'accepted' | 'rejected';

export async function listShifts(params?: {
  radiusKm?: number;
  category?: ShiftCategory;
  q?: string;
  lat?: number;
  lng?: number;
}): Promise<Shift[]> {
  const qs = new URLSearchParams();
  if (params?.category) {
    const categoryMap: Record<ShiftCategory, string> = {
      Hospitality: 'cat_01',
      Retail: 'cat_02',
      Events: 'cat_03',
      Logistics: 'cat_04',
      Cleaning: 'cat_06',
      Security: 'cat_07',
    };
    qs.set('category', categoryMap[params.category]);
  }
  if (params?.q) qs.set('q', params.q);
  if (
    params?.lat != null &&
    params?.lng != null &&
    params?.radiusKm != null &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lng) &&
    Number.isFinite(params.radiusKm)
  ) {
    qs.set('lat', String(params.lat));
    qs.set('lng', String(params.lng));
    qs.set('radius_km', String(params.radiusKm));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const rows = await apiRequest<any[]>(`/api/v1/student/jobs${suffix}`, { method: 'GET' });
  return rows.map((s) => {
    const startIso = s?.date ? new Date(s.date).toISOString() : new Date().toISOString();
    const categoryById: Record<string, ShiftCategory> = {
      cat_01: 'Hospitality',
      cat_02: 'Retail',
      cat_03: 'Events',
      cat_04: 'Logistics',
      cat_05: 'Logistics',
      cat_06: 'Cleaning',
      cat_07: 'Security',
    };
    return {
      id: String(s?._id ?? ''),
      company: String(s?.employer?.company_name ?? 'Employer'),
      employerLogoUrl: (s?.employer?.logo_preview_url as string | null | undefined)
        ?? (s?.employer?.logo_url as string | null | undefined)
        ?? null,
      employerLogoFit: (s?.employer?.logo_fit as 'contain' | 'cover' | undefined) ?? 'contain',
      role: String(s?.title ?? 'Shift'),
      category: categoryById[String(s?.category_id ?? '')] ?? 'Hospitality',
      address: String(s?.address ?? ''),
      area: String(s?.address ?? '').split(',')[0] ?? '',
      city: 'City',
      payPerHour: Number(s?.hourly_rate ?? 0),
      startAt: startIso,
      durationHours: 4,
      distanceKm: typeof s?.distance_km === 'number' ? s.distance_km : 0,
      locationLat: typeof s?.location_lat === 'number' ? s.location_lat : undefined,
      locationLng: typeof s?.location_lng === 'number' ? s.location_lng : undefined,
      urgent: false,
      spots: Math.max(1, Number((s?.slots_total ?? 1) - (s?.slots_filled ?? 0))),
      requirements: [],
      description: String(s?.description ?? ''),
      applied: Boolean(s?.applied),
    } as Shift;
  });
}

export async function getMyShifts(): Promise<MyShift[]> {
  const rows = await apiRequest<any[]>('/api/v1/student/applications', { method: 'GET' });
  return rows.map((a) => ({
    // Try all known payload shapes before falling back.
    // This avoids showing a misleading generic "Employer" label.
    id: String(a?.shift?.id ?? a?.shift_id ?? a?._id ?? ''),
    applicationId: String(a?._id ?? a?.id ?? ''),
    company: String(
      a?.employer?.company_name ??
      a?.employer_name ??
      a?.company_name ??
      a?.shift?.employer_name ??
      'Company unavailable'
    ),
    employerLogoUrl: (a?.employer?.logo_preview_url as string | undefined) ?? (a?.employer?.logo_url as string | undefined),
    employerLogoFit: (a?.employer?.logo_fit as 'contain' | 'cover' | undefined) ?? 'contain',
    role: String(a?.shift?.title ?? 'Applied Shift'),
    category: 'Hospitality',
    address: String(a?.shift?.address ?? ''),
    area: String(a?.shift?.address ?? '').split(',')[0] ?? '',
    city: '',
    payPerHour: Number(a?.shift?.hourly_rate ?? 0),
    startAt: a?.shift?.date ? new Date(a.shift.date).toISOString() : String(a?.applied_at ?? new Date().toISOString()),
    durationHours: 0,
    distanceKm: 0,
    urgent: false,
    spots: Math.max(0, Number((a?.shift?.slots_total ?? 0) - (a?.shift?.slots_filled ?? 0))),
    requirements: [],
    description: String(a?.shift?.description ?? ''),
    status: ((a?.status ?? 'applied') === 'confirmed' ? 'accepted' : a?.status ?? 'applied') as MyShift['status'],
    appliedAt: String(a?.applied_at ?? new Date().toISOString()),
  }));
}

export async function applyToShift(shiftId: string, note?: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/v1/student/jobs/${encodeURIComponent(shiftId)}/apply`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function respondToShiftDecision(
  shiftId: string,
  decision: ShiftDecision,
  applicationId?: string,
): Promise<{ message: string }> {
  if (applicationId) {
    const encodedAppId = encodeURIComponent(applicationId);
    try {
      return await apiRequest<{ message: string }>(`/api/v1/student/applications/${encodedAppId}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({ decision }),
      });
    } catch {
      // Fall through to discovery-based fallback.
    }
  }

  const rows = await apiRequest<any[]>('/api/v1/student/applications', { method: 'GET' });
  const byIds = rows.find((a) => {
    const candidateShiftId = String(a?.shift?.id ?? a?.shift_id ?? '');
    const candidateApplicationId = String(a?._id ?? a?.id ?? '');
    if (applicationId) {
      return candidateShiftId === shiftId && candidateApplicationId === applicationId;
    }
    return candidateShiftId === shiftId;
  });

  const resolvedShiftId = String(byIds?.shift?.id ?? byIds?.shift_id ?? shiftId ?? '');
  const resolvedApplicationId = String(byIds?._id ?? byIds?.id ?? applicationId ?? '');
  if (!resolvedShiftId || !resolvedApplicationId) {
    throw new Error('Could not find this shift application. It may already be processed.');
  }

  const encodedShiftId = encodeURIComponent(resolvedShiftId);
  const encodedApplicationId = encodeURIComponent(resolvedApplicationId);
  const statusesToTry = decision === 'accepted' ? ['confirmed', 'accepted'] : ['rejected', 'cancelled'];

  let lastError: unknown = null;
  for (const status of statusesToTry) {
    try {
      return await apiRequest<{ message: string }>(`/api/v1/student/applications/${encodedApplicationId}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      lastError = error;
    }
    try {
      return await apiRequest<{ message: string }>(`/shifts/${encodedShiftId}/applications/${encodedApplicationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      lastError = error;
    }
    try {
      return await apiRequest<{ message: string }>(`/api/v1/shifts/${encodedShiftId}/applications/${encodedApplicationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Unable to update shift decision.');
}

