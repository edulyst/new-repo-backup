/**
 * Mirrors backend `success` / `paginated` / error shapes (see `docs/gigwork-backend-rules.mdc`).
 * Use these when wiring `fetch` to `/api/v1/*`.
 */

export type ApiSuccess = {
  status: 'success'
  message: string
  data: Record<string, unknown>
}

export type ApiError = {
  status: 'error'
  message: string
  errors: { field: string; message: string }[]
}

export type ApiPaginated = {
  status: 'success'
  message: string
  data: Record<string, unknown>
  meta: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}
