const BASE = '/api/v1'

function token() {
  return localStorage.getItem('emp_token') ?? ''
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (json.status === 'error') throw new Error(json.message ?? 'Request failed')
  return json
}

export const api = {
  get: <T>(path: string) => req<T>('GET', path),
  post: <T>(path: string, body: unknown) => req<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => req<T>('PATCH', path, body),
  delete: <T>(path: string) => req<T>('DELETE', path),
}

export function setToken(t: string) {
  localStorage.setItem('emp_token', t)
}
export function clearToken() {
  localStorage.removeItem('emp_token')
}
export function getToken() {
  return localStorage.getItem('emp_token')
}
