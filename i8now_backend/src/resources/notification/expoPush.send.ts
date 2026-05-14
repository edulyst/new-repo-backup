/* ═══════════════════════════════════════════════════════════════════════════
 *  expoPush.send — call Expo’s HTTP push API (https://expo.dev/push)
 *  Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 * ═══════════════════════════════════════════════════════════════════════════ */

import { loadEnv } from '../../config/env.js'
import { getLogger } from '../../instrumentation/logger.js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type ExpoMessage = {
  to: string
  title: string
  body: string
  sound?: 'default' | null
  data?: Record<string, unknown>
  /** Android: must match a channel the app created (`default` in gig_economy_app). */
  channelId?: string
  /** FCM: helps heads-up on Android when the device allows it. */
  priority?: 'default' | 'normal' | 'high'
}

type ExpoTicket = { status: 'ok' | 'error'; id?: string; message?: string }

/**
 * Send one or more push messages. Body is a JSON **array** of message objects
 * (Expo batch form).
 */
export async function sendExpoPushMessages(messages: ExpoMessage[]): Promise<{ ok: number; errors: number }> {
  const env = loadEnv()
  const log = getLogger()
  if (messages.length === 0) return { ok: 0, errors: 0 }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${env.EXPO_ACCESS_TOKEN}`
  }

  let ok = 0
  let errors = 0
  const chunkSize = 100
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize)
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    })
    if (!res.ok) {
      const text = await res.text()
      log.warn({ status: res.status, text: text.slice(0, 500) }, '[expo-push] batch HTTP error')
      errors += chunk.length
      continue
    }
    const json = (await res.json()) as { data?: ExpoTicket[] }
    const tickets = Array.isArray(json.data) ? json.data : []
    for (const t of tickets) {
      if (t && t.status === 'ok') ok++
      else {
        errors++
        if (t?.message) log.debug({ err: t.message }, '[expo-push] ticket error')
      }
    }
  }
  return { ok, errors }
}
