/**
 * Client-side config. Prefer `VITE_API_BASE_URL` (e.g. `http://localhost:3000/api/v1`).
 * Dev server proxies `/api` → backend when using relative paths (see `vite.config.ts`).
 */
const raw = import.meta.env.VITE_API_BASE_URL as string | undefined

export const env = {
  apiBaseUrl: (raw?.replace(/\/$/, '') ?? '/api/v1') as string,
} as const
