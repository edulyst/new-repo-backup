export const queryKeys = {
  me: () => ['me'] as const,
  shifts: (params?: {
    radiusKm?: number;
    category?: string;
    q?: string;
    lat?: number;
    lng?: number;
    allLocations?: boolean;
  }) => ['shifts', params ?? {}] as const,
  myShifts: () => ['shifts', 'my'] as const,
} as const;

