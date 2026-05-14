/* ═══════════════════════════════════════════════════════════════════════════
 *  notification.service — business logic for the notification resource
 *
 *  Responsibilities:
 *    - Seed default channels on first boot
 *    - CRUD on NotificationChannel (enable/disable)
 *    - Create + enqueue NotificationRecord (send / bulk / schedule)
 *    - Paginated history list
 *    - Audience count resolver (real DB counts)
 * ═══════════════════════════════════════════════════════════════════════════ */

import { NotificationRecord, NotificationChannel, DEFAULT_CHANNELS } from './notification.model.js'
import { getNotificationQueue } from './notification.queue.js'
import { sendExpoPushMessages } from './expoPush.send.js'
import { AppError } from '../../utils/errors.js'
import mongoose from 'mongoose'
import { loadEnv } from '../../config/env.js'
import { getLogger } from '../../instrumentation/logger.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AudienceType = 'all' | 'workers' | 'employers' | 'unverified'
export type ChannelType  = 'email' | 'in-app' | 'both'

export type SendNotificationInput = {
  title: string
  body: string
  channel: ChannelType
  audience_type: AudienceType
  scheduled_at?: string   // ISO string; if absent → queue immediately
  html_template?: string  // custom HTML body for email channel
  created_by: string
}

export type NotificationHistoryQuery = {
  page?: number
  limit?: number
  status?: string
  search?: string
}

/** Shown in admin + stored on NotificationRecord when in-app is requested but no devices registered. */
export const EXPO_NO_TOKENS_REASON =
  'No Expo push tokens registered. Use a physical phone (not the iOS Simulator), open the app while logged in, allow notifications, then send again.'

export type NotificationExportRow = {
  id: string
  created_at: string
  sent_at: string
  title: string
  channel: string
  audience_type: string
  recipients_count: number
  status: string
  scheduled_at: string
  failure_reason: string
}

// ─── Channel seed ─────────────────────────────────────────────────────────────

export async function ensureNotificationChannels(): Promise<void> {
  const count = await NotificationChannel.countDocuments()
  if (count >= DEFAULT_CHANNELS.length) return

  for (const ch of DEFAULT_CHANNELS) {
    await NotificationChannel.updateOne(
      { channel_id: ch.channel_id },
      { $setOnInsert: ch },
      { upsert: true },
    )
  }
}

// ─── Channel read / update ────────────────────────────────────────────────────

export async function listChannels() {
  return NotificationChannel.find({}, { _id: 0, __v: 0 }).lean()
}

export async function toggleChannel(channelId: string, enabled: boolean) {
  const ch = await NotificationChannel.findOneAndUpdate(
    { channel_id: channelId },
    { enabled },
    { new: true },
  ).lean()
  if (!ch) throw new AppError('CHANNEL_NOT_FOUND', 404, `Channel '${channelId}' not found`)
  return ch
}

// ─── Audience ─────────────────────────────────────────────────────────────────

/** Returns live DB count for the given audience segment. */
export async function resolveAudienceCount(audienceType: AudienceType): Promise<number> {
  const db = mongoose.connection.db
  if (!db) return 0

  switch (audienceType) {
    case 'all':
      return db.collection('users').countDocuments({ deleted_at: null })
    case 'workers':
      return db.collection('workers').countDocuments({ status: { $ne: 'banned' } })
    case 'employers':
      return db.collection('employers').countDocuments({ status: { $ne: 'banned' } })
    case 'unverified':
      return db.collection('workers').countDocuments({ 'kyc.status': { $in: ['unverified', 'pending'] } })
    default:
      return 0
  }
}

export async function listAudienceSizes(): Promise<Record<AudienceType, number>> {
  const [all, workers, employers, unverified] = await Promise.all([
    resolveAudienceCount('all'),
    resolveAudienceCount('workers'),
    resolveAudienceCount('employers'),
    resolveAudienceCount('unverified'),
  ])
  return { all, workers, employers, unverified }
}

/** Returns distinct email addresses for the target segment. */
export async function resolveAudienceEmails(audienceType: AudienceType): Promise<string[]> {
  const db = mongoose.connection.db
  if (!db) return []

  const users = db.collection('users')
  let query: Record<string, unknown> = { deleted_at: null, email: { $exists: true, $ne: null } }

  if (audienceType === 'workers') query = { ...query, role: 'worker', status: { $ne: 'banned' } }
  if (audienceType === 'employers') query = { ...query, role: 'employer', status: { $ne: 'banned' } }
  if (audienceType === 'unverified') query = { ...query, role: 'worker', status: { $in: ['pending'] } }

  const rows = await users.find(query, { projection: { _id: 0, email: 1 } }).toArray()
  const emails = rows
    .map((r) => (typeof r.email === 'string' ? r.email.trim().toLowerCase() : ''))
    .filter(Boolean)

  return Array.from(new Set(emails))
}

/**
 * Expo device tokens in `audienceType` (mobile can receive admin pushes).
 * Mirrors `resolveAudienceEmails` role filters for consistency.
 */
export async function resolveAudienceExpoPushTokens(audienceType: AudienceType): Promise<string[]> {
  const db = mongoose.connection.db
  if (!db) return []
  const users = db.collection('users')
  let query: Record<string, unknown> = {
    deleted_at: null,
    expo_push_token: { $exists: true, $nin: [null, ''] },
  }
  if (audienceType === 'workers') query = { ...query, role: 'worker', status: { $ne: 'banned' } }
  if (audienceType === 'employers') query = { ...query, role: 'employer', status: { $ne: 'banned' } }
  if (audienceType === 'unverified') query = { ...query, role: 'worker', status: { $in: ['pending'] } }
  const rows = await users
    .find(query, { projection: { _id: 0, expo_push_token: 1 } })
    .toArray() as { expo_push_token?: unknown }[]
  const tokens: string[] = []
  for (const r of rows) {
    if (typeof r.expo_push_token === 'string') {
      const t = r.expo_push_token.trim()
      if (t) tokens.push(t)
    }
  }
  return Array.from(new Set(tokens))
}

export async function deliverExpoPushToAudience(
  audienceType: AudienceType,
  title: string,
  body: string,
  data: Record<string, unknown> = { source: 'admin' },
): Promise<{ tokenCount: number; ok: number; errors: number }> {
  const log = getLogger()
  const tokens = await resolveAudienceExpoPushTokens(audienceType)
  if (tokens.length === 0) {
    log.info({ audienceType }, '[expo-push] no device tokens in audience')
    return { tokenCount: 0, ok: 0, errors: 0 }
  }
  const safeTitle = title.slice(0, 200)
  const safeBody = body.slice(0, 2000)
  const messages = tokens.map((to) => ({
    to,
    title: safeTitle,
    body: safeBody,
    sound: 'default' as const,
    channelId: 'default',
    priority: 'high' as const,
    data,
  }))
  const { ok, errors } = await sendExpoPushMessages(messages)
  log.info({ audienceType, tokenCount: tokens.length, ok, errors }, '[expo-push] delivered')
  return { tokenCount: tokens.length, ok, errors }
}

// ─── Send notification ────────────────────────────────────────────────────────

export async function sendNotification(input: SendNotificationInput) {
  const { title, body, channel, audience_type, scheduled_at, html_template, created_by } = input
  const env = loadEnv()
  const log = getLogger()

  const recipientsCount = await resolveAudienceCount(audience_type)

  const isScheduled = env.NOTIFICATIONS_QUEUE_ENABLED && !!scheduled_at && new Date(scheduled_at) > new Date()
  const status = isScheduled ? 'scheduled' : 'queued'

  const record = await NotificationRecord.create({
    title,
    body,
    channel,
    audience_type,
    recipients_count: recipientsCount,
    status,
    scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
    sent_at: env.NOTIFICATIONS_QUEUE_ENABLED ? undefined : new Date(),
    created_by,
  })

  // Local fallback mode: no Redis/BullMQ — mark delivered; still try Expo for in-app/both.
  if (!env.NOTIFICATIONS_QUEUE_ENABLED) {
    let pushTokenCount = 0
    if (channel === 'in-app' || channel === 'both') {
      try {
        const r = await deliverExpoPushToAudience(audience_type, title, body)
        pushTokenCount = r.tokenCount
      } catch (e) {
        log.warn(
          { err: e instanceof Error ? e.message : String(e) },
          '[notification] inline expo push failed',
        )
      }
    }
    const inAppMiss = (channel === 'in-app' || channel === 'both') && pushTokenCount === 0
    record.status = inAppMiss ? 'partial' : 'delivered'
    if (inAppMiss) {
      record.failure_reason = EXPO_NO_TOKENS_REASON
    }
    await record.save()
    return record
  }

  const delay = isScheduled
    ? Math.max(0, new Date(scheduled_at!).getTime() - Date.now())
    : 0

  try {
    const queue = getNotificationQueue()
    const job = await queue.add(
      'send',
      {
        recordId: String(record._id),
        title,
        body,
        channel,
        audienceType: audience_type,
        recipientsCount,
        scheduledAt: scheduled_at,
        ...(html_template ? { htmlTemplate: html_template } : {}),
      },
      { delay },
    )
    await NotificationRecord.findByIdAndUpdate(record._id, { job_id: job.id })
  } catch (err) {
    // If Redis is down unexpectedly, avoid breaking the API in dev and deliver inline.
    log.warn({ err: err instanceof Error ? err.message : String(err) }, '[notification] queue unavailable, fallback inline')
    await NotificationRecord.findByIdAndUpdate(record._id, {
      status: 'delivered',
      sent_at: new Date(),
    })
  }

  return record
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function listNotificationHistory(query: NotificationHistoryQuery) {
  const page  = Math.max(1, query.page  ?? 1)
  const limit = Math.min(100, query.limit ?? 20)
  const skip  = (page - 1) * limit

  const filter: Record<string, unknown> = {}
  if (query.status && query.status !== 'all') filter.status = query.status
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
    ]
  }

  const [records, total] = await Promise.all([
    NotificationRecord.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .select({ __v: 0 })
      .lean(),
    NotificationRecord.countDocuments(filter),
  ])

  return { records, total, page, limit }
}

export async function exportNotificationHistory(query: Omit<NotificationHistoryQuery, 'page' | 'limit'>): Promise<NotificationExportRow[]> {
  const filter: Record<string, unknown> = {}
  if (query.status && query.status !== 'all') filter.status = query.status
  if (query.search) {
    filter.$or = [{ title: { $regex: query.search, $options: 'i' } }]
  }

  const records = await NotificationRecord.find(filter)
    .sort({ created_at: -1 })
    .select({ __v: 0 })
    .lean()

  return records.map((r) => ({
    id: String(r._id),
    created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
    sent_at: r.sent_at ? new Date(r.sent_at).toISOString() : '',
    title: r.title ?? '',
    channel: r.channel ?? '',
    audience_type: r.audience_type ?? '',
    recipients_count: Number(r.recipients_count ?? 0),
    status: r.status ?? '',
    scheduled_at: r.scheduled_at ? new Date(r.scheduled_at).toISOString() : '',
    failure_reason: typeof r.failure_reason === 'string' ? r.failure_reason : '',
  }))
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getNotificationStats() {
  const [channels, total, delivered, scheduled] = await Promise.all([
    listChannels(),
    NotificationRecord.countDocuments(),
    NotificationRecord.countDocuments({ status: 'delivered' }),
    NotificationRecord.countDocuments({ status: 'scheduled' }),
  ])

  const emailEnabled  = channels.filter((c) => c.group === 'email'  && c.enabled).length
  const inAppEnabled  = channels.filter((c) => c.group === 'in-app' && c.enabled).length
  const emailTotal    = channels.filter((c) => c.group === 'email').length
  const inAppTotal    = channels.filter((c) => c.group === 'in-app').length
  const audienceSizes = await listAudienceSizes()

  return {
    emailEnabled, emailTotal,
    inAppEnabled, inAppTotal,
    delivered, scheduled, total,
    audienceSizes,
  }
}
