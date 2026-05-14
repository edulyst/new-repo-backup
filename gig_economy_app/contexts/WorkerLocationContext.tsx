/**
 * Foreground location permission + coordinates for shift discovery and DB sync.
 * Does not re-prompt after denial until the user enables permission in Settings (we re-check on app resume).
 */
import * as Location from 'expo-location';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, InteractionManager, Linking, Platform } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { updateWorkerLocation } from '@/lib/worker-location-api';
import { useQueryClient } from '@tanstack/react-query';

export type WorkerLocationStatus = 'idle' | 'checking' | 'ready' | 'denied' | 'unavailable';

export interface WorkerLocationContextValue {
  /** Foreground permission result after checks. */
  permission: Location.PermissionStatus | null;
  status: WorkerLocationStatus;
  /** Device coordinates when permission is granted and fix succeeded. */
  coords: { lat: number; lng: number } | null;
  /** Last error syncing to API (coords may still be valid for local queries). */
  syncError: string | null;
  /** Re-run permission + fix + optional DB sync (e.g. after returning from Settings). */
  refresh: () => Promise<void>;
  /** True once initial permission flow finished (granted or denied). */
  isReady: boolean;
}

const Ctx = createContext<WorkerLocationContextValue | null>(null);

export function WorkerLocationProvider({ children }: { children: React.ReactNode }) {
  const { token, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const [status, setStatus] = useState<WorkerLocationStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const readAndSyncPosition = useCallback(
    async (authToken: string | null, radiusKm?: number) => {
      setSyncError(null);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCoords({ lat, lng });

      if (!authToken) return;

      try {
        await updateWorkerLocation({ lat, lng, radiusKm: radiusKm ?? 25 });
        await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Sync failed';
        setSyncError(msg);
      }
    },
    [queryClient],
  );

  const runPermissionFlow = useCallback(async () => {
    setStatus('checking');
    setSyncError(null);

    try {
      // Let the first frame / tab transition finish so the OS can present the permission dialog on top.
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      await new Promise<void>((r) => setTimeout(r, 350));

      /**
       * `requestForegroundPermissionsAsync` can reject on some devices/emulators — never let that crash the app.
       */
      let permStatus: Location.PermissionStatus;
      try {
        const res = await Location.requestForegroundPermissionsAsync();
        permStatus = res.status;
      } catch {
        setPermission(Location.PermissionStatus.DENIED);
        setCoords(null);
        setStatus('denied');
        return;
      }

      setPermission(permStatus);

      if (permStatus !== Location.PermissionStatus.GRANTED) {
        setCoords(null);
        setStatus('denied');
        return;
      }

      let servicesEnabled = true;
      try {
        servicesEnabled = await Location.hasServicesEnabledAsync();
      } catch {
        servicesEnabled = false;
      }
      if (!servicesEnabled) {
        setCoords(null);
        setStatus('unavailable');
        return;
      }

      try {
        await readAndSyncPosition(token);
        setStatus('ready');
      } catch {
        setCoords(null);
        setStatus('unavailable');
      }
    } catch (e) {
      // Any unexpected error — stay usable: list shifts without geo, no redbox
      console.warn('[WorkerLocation] runPermissionFlow', e);
      setCoords(null);
      setStatus('denied');
      setPermission((p) => p ?? Location.PermissionStatus.DENIED);
    }
  }, [readAndSyncPosition, token]);

  const runPermissionFlowRef = useRef(runPermissionFlow);
  runPermissionFlowRef.current = runPermissionFlow;

  /** Initial + when auth finishes / user logs in — deps only [authLoading, token] so the flow is not cancelled mid-request when callbacks change. */
  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setPermission(null);
      setCoords(null);
      setSyncError(null);
      setStatus('idle');
      setIsReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsReady(false);
      try {
        await runPermissionFlowRef.current();
      } catch (e) {
        console.warn('[WorkerLocation] bootstrap', e);
        setCoords(null);
        setStatus('denied');
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, token]);

  /** Re-run when returning from Settings (permission may have changed). */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === 'active' && token && !authLoading) {
        void runPermissionFlowRef.current().catch((e) => console.warn('[WorkerLocation] resume', e));
      }
    });
    return () => sub.remove();
  }, [token, authLoading]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsReady(false);
    try {
      await runPermissionFlow();
    } catch (e) {
      console.warn('[WorkerLocation] refresh', e);
      setCoords(null);
      setStatus('denied');
    } finally {
      setIsReady(true);
    }
  }, [token, runPermissionFlow]);

  const value = useMemo<WorkerLocationContextValue>(
    () => ({
      permission,
      status,
      coords,
      syncError,
      refresh,
      isReady,
    }),
    [permission, status, coords, syncError, refresh, isReady],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkerLocation(): WorkerLocationContextValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useWorkerLocation must be used within WorkerLocationProvider');
  }
  return v;
}

export function openLocationSettings(): void {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}
