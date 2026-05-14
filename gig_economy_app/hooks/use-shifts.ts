import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { applyToShift, getMyShifts, listShifts, respondToShiftDecision, type ShiftCategory, type ShiftDecision } from '@/lib/shifts-api';
import { appendShiftTimelineEvent } from '@/lib/shift-flow-storage';

type CategoryFilter = 'All' | ShiftCategory;

function roundCoord(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

export function useShiftsQuery(params: {
  radiusKm: number;
  category: CategoryFilter;
  q: string;
  lat?: number;
  lng?: number;
  /** When false, skips fetch until location permission flow has settled. */
  locationReady?: boolean;
  /** List every open shift (no distance filter / sort). */
  allLocations?: boolean;
}) {
  const geo =
    params.allLocations
      ? {}
      : params.lat != null &&
          params.lng != null &&
          Number.isFinite(params.lat) &&
          Number.isFinite(params.lng)
        ? { lat: roundCoord(params.lat), lng: roundCoord(params.lng), radiusKm: params.radiusKm }
        : {};

  return useQuery({
    queryKey: queryKeys.shifts({
      radiusKm: params.radiusKm,
      category: params.category,
      q: params.q,
      allLocations: Boolean(params.allLocations),
      ...geo,
    }),
    queryFn: () =>
      listShifts({
        radiusKm: params.allLocations ? undefined : params.radiusKm,
        category: params.category === 'All' ? undefined : params.category,
        q: params.q ? params.q : undefined,
        lat: geo.lat,
        lng: geo.lng,
      }),
    enabled: params.allLocations ? true : params.locationReady !== false,
  });
}

export function useMyShiftsQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.myShifts(),
    queryFn: getMyShifts,
    enabled,
  });
}

export function useApplyToShiftMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, note }: { shiftId: string; note?: string }) => applyToShift(shiftId, note),
    onSuccess: async (_, vars) => {
      await appendShiftTimelineEvent({
        shiftId: vars.shiftId,
        type: 'applied',
        title: 'Shift application submitted',
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.myShifts() }),
        qc.invalidateQueries({ queryKey: ['shifts'] }),
      ]);
    },
  });
}

export function useRespondToShiftMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      decision,
      applicationId,
    }: {
      shiftId: string;
      decision: ShiftDecision;
      applicationId?: string;
    }) => respondToShiftDecision(shiftId, decision, applicationId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.myShifts() }),
        qc.invalidateQueries({ queryKey: ['shifts'] }),
      ]);
    },
  });
}

