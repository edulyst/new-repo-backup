const ACCESS  = 'i8now_admin_access_token'
const REFRESH  = 'i8now_admin_refresh_token'
const ROLE_KEY = 'i8now_user_role'

export function getAccessToken(): string | null {
  try { return localStorage.getItem(ACCESS) } catch { return null }
}

export function getRefreshToken(): string | null {
  try { return localStorage.getItem(REFRESH) } catch { return null }
}

export function getRole(): 'admin' | 'employer' | null {
  try { return localStorage.getItem(ROLE_KEY) as 'admin' | 'employer' | null } catch { return null }
}

export function setTokens(access: string, refresh: string, role: string): void {
  localStorage.setItem(ACCESS, access)
  localStorage.setItem(REFRESH, refresh)
  localStorage.setItem(ROLE_KEY, role)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(REFRESH)
  localStorage.removeItem(ROLE_KEY)
}
