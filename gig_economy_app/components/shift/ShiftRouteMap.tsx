/**
 * Metro uses `ShiftRouteMap.web` / `ShiftRouteMap.native` when bundling.
 * This re-export fixes TypeScript path resolution and must not import `react-native-maps` directly.
 */
export { ShiftRouteMap } from './ShiftRouteMap.native';
