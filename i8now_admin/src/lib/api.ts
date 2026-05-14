import { env } from '@/config/env'
import { getAccessToken } from '@/lib/auth-storage'

type ErrorJson = {
  status: 'error'
  message: string
  code?: string
  errors?: { field: string; message: string }[]
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public code?: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

function joinUrl(path: string): string {
  const base = env.apiBaseUrl.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ApiRequestError('Invalid JSON from server', res.status)
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function toErrorMessage(e: ErrorJson): string {
  const details = Array.isArray(e.errors) ? e.errors : []
  if (!details.length) return e.message
  const first = details[0]
  if (e.message === 'Validation failed') {
    return `${first.field}: ${first.message}`
  }
  return `${e.message} (${first.field}: ${first.message})`
}

function throwFromBody(body: Record<string, unknown>, status: number): never {
  const e = body as unknown as ErrorJson
  throw new ApiRequestError(toErrorMessage(e), status, e.code, e.errors)
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(joinUrl(path), {
    headers: {
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
      Accept: 'application/json',
    },
  })
  const body = await parseJson(res)
  if (!isRecord(body)) {
    throw new ApiRequestError('Empty response', res.status)
  }
  if (body.status === 'error') {
    throwFromBody(body, res.status)
  }
  if (!res.ok) {
    throw new ApiRequestError('Request failed', res.status)
  }
  return body as T
}

export async function apiDelete(path: string): Promise<unknown> {
  const res = await fetch(joinUrl(path), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
      Accept: 'application/json',
    },
  })
  const body = await parseJson(res)
  if (!isRecord(body)) {
    throw new ApiRequestError('Empty response', res.status)
  }
  if (body.status === 'error') {
    throwFromBody(body, res.status)
  }
  if (!res.ok) {
    throw new ApiRequestError('Request failed', res.status)
  }
  return body
}

export async function apiDeleteJson(path: string, json: object): Promise<unknown> {
  const res = await fetch(joinUrl(path), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(json),
  })
  const body = await parseJson(res)
  if (!isRecord(body)) {
    throw new ApiRequestError('Empty response', res.status)
  }
  if (body.status === 'error') {
    throwFromBody(body, res.status)
  }
  if (!res.ok) {
    throw new ApiRequestError('Request failed', res.status)
  }
  return body
}

export async function apiPatch(path: string, json: object): Promise<unknown> {
  const res = await fetch(joinUrl(path), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(json),
  })
  const body = await parseJson(res)
  if (!isRecord(body)) {
    throw new ApiRequestError('Empty response', res.status)
  }
  if (body.status === 'error') {
    throwFromBody(body, res.status)
  }
  if (!res.ok) {
    throw new ApiRequestError('Request failed', res.status)
  }
  return body
}

export async function apiPost(path: string, json: object): Promise<unknown> {
  const res = await fetch(joinUrl(path), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(json),
  })
  const body = await parseJson(res)
  if (!isRecord(body)) {
    throw new ApiRequestError('Empty response', res.status)
  }
  if (body.status === 'error') {
    throwFromBody(body, res.status)
  }
  if (!res.ok) {
    throw new ApiRequestError('Request failed', res.status)
  }
  return body
}

export async function apiPostForm(path: string, form: FormData): Promise<unknown> {
  const res = await fetch(joinUrl(path), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
      Accept: 'application/json',
    },
    body: form,
  })
  const body = await parseJson(res)
  if (!isRecord(body)) {
    throw new ApiRequestError('Empty response', res.status)
  }
  if (body.status === 'error') {
    throwFromBody(body, res.status)
  }
  if (!res.ok) {
    throw new ApiRequestError('Request failed', res.status)
  }
  return body
}

/** Auth endpoints (no bearer). */
export async function publicPost(path: string, json: object): Promise<unknown> {
  const res = await fetch(joinUrl(path), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(json),
  })
  const body = await parseJson(res)
  if (!isRecord(body)) {
    throw new ApiRequestError('Empty response', res.status)
  }
  if (body.status === 'error') {
    throwFromBody(body, res.status)
  }
  if (!res.ok) {
    throw new ApiRequestError('Request failed', res.status)
  }
  return body
}

export async function apiGetBlob(path: string): Promise<Blob> {
  const res = await fetch(joinUrl(path), {
    headers: {
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
      Accept: '*/*',
    },
  })
  if (!res.ok) {
    let msg = 'Request failed'
    try {
      const body = await parseJson(res)
      if (isRecord(body) && body.status === 'error') {
        const e = body as unknown as ErrorJson
        msg = toErrorMessage(e)
      }
    } catch {
      // Ignore parse errors and keep default message.
    }
    throw new ApiRequestError(msg, res.status)
  }
  return res.blob()
}
