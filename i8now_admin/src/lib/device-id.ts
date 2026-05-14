const KEY = 'i8now_admin_device_id'

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

/** Stable per-browser id for `device_id` on auth requests. */
export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY)
    if (existing && existing.length > 0) return existing
    const next = randomId()
    localStorage.setItem(KEY, next)
    return next
  } catch {
    return randomId()
  }
}
