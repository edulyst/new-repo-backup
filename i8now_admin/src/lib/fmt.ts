/** Shared formatting helpers for admin pages. */

const DATE_FMT = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const DATETIME_FMT = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const TIME_FMT = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try { return DATE_FMT.format(new Date(iso)) } catch { return iso }
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try { return DATETIME_FMT.format(new Date(iso)) } catch { return iso }
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try { return TIME_FMT.format(new Date(iso)) } catch { return iso }
}

export function fmtDuration(hours: number | null | undefined): string {
  if (hours == null) return '—'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function fmtMoney(amount: number | null | undefined, symbol = '₹'): string {
  if (amount == null) return '—'
  return `${symbol}${amount.toFixed(2)}`
}

/** Average star rating (e.g. profile aggregates); never shows NaN. */
export function fmtRating(value: number | null | undefined): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n) || !Number.isFinite(n)) return '—'
  return n.toFixed(1)
}
