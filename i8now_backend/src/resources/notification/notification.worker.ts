/* ═══════════════════════════════════════════════════════════════════════════
 *  notification.worker — BullMQ Worker that processes notification jobs
 *
 *  Each job:
 *    1. Resolves the real recipients list from MongoDB
 *    2. "Sends" email  → console log / swap in Nodemailer / SendGrid / SES
 *    3. "Sends" in-app → write InAppNotification documents to MongoDB
 *    4. Updates the NotificationRecord status in MongoDB
 *
 *  Start via `startNotificationWorker()` in server.ts — runs in the same
 *  process on a separate async event loop tick (BullMQ handles concurrency).
 * ═══════════════════════════════════════════════════════════════════════════ */

import { Worker, type Job } from 'bullmq'
import nodemailer, { type Transporter } from 'nodemailer'
import { loadEnv } from '../../config/env.js'
import { NotificationRecord } from './notification.model.js'
import { QUEUE_NAME, type NotificationJobData } from './notification.queue.js'
import {
  resolveAudienceCount,
  resolveAudienceEmails,
  deliverExpoPushToAudience,
  EXPO_NO_TOKENS_REASON,
} from './notification.service.js'
import { getLogger } from '../../instrumentation/logger.js'

let transporter: Transporter | null = null

function getTransporter() {
  const env = loadEnv()
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  }
  return transporter
}

export function startNotificationWorker(): Worker<NotificationJobData> {
  const env = loadEnv()
  const log = getLogger()

  const worker = new Worker<NotificationJobData>(
    QUEUE_NAME,
    async (job: Job<NotificationJobData>) => {
      const { recordId, title, body, channel, audienceType, recipientsCount, htmlTemplate } = job.data
      log.info({ recordId, audienceType, channel }, '[notification-worker] processing job')

      // Mark as processing
      await NotificationRecord.findByIdAndUpdate(recordId, { status: 'processing' })

      // ── Step 1: resolve real audience count (live from DB) ────────────────
      const liveCount = recipientsCount > 0 ? recipientsCount : await resolveAudienceCount(audienceType)

      // ── Step 2: "deliver" the notification ────────────────────────────────
      //
      //  EMAIL: Replace the stub below with Nodemailer / SendGrid / SES.
      //  IN-APP: Insert documents into a "user_notifications" collection or
      //          push via WebSocket / FCM — plug in your real provider here.
      //
      if (channel === 'email' || channel === 'both') {
        const smtp = getTransporter()
        if (!smtp) {
          log.warn('[notification-worker] SMTP not configured, skipping email send')
        } else {
          const recipients = await resolveAudienceEmails(audienceType)
          if (recipients.length === 0) {
            log.info({ to: audienceType }, '[notification-worker] [EMAIL] no recipients')
          } else {
            const from = env.SMTP_FROM || env.SMTP_USER || 'no-reply@i8now.local'
            await smtp.sendMail({
              from,
              bcc: recipients,
              subject: title,
              text: body,
              html: htmlTemplate ?? `<h3>${title}</h3><p>${body}</p>`,
            })
            log.info({ to: audienceType, count: recipients.length, subject: title }, '[notification-worker] [EMAIL] sent')
          }
        }
      }

      let expoTokenCount: number | undefined
      if (channel === 'in-app' || channel === 'both') {
        log.info({ to: audienceType, count: liveCount }, '[notification-worker] [IN-APP] delivering via Expo')
        const r = await deliverExpoPushToAudience(audienceType, title, body)
        expoTokenCount = r.tokenCount
      }

      // Simulate slight async work (remove in production)
      await new Promise((r) => setTimeout(r, 200))

      const inAppWithNoTokens =
        (channel === 'in-app' || channel === 'both') && (expoTokenCount === undefined || expoTokenCount === 0)

      // ── Step 3: mark as delivered (or partial if nobody had a device token to push to) ──
      await NotificationRecord.findByIdAndUpdate(recordId, {
        status: inAppWithNoTokens ? 'partial' : 'delivered',
        sent_at: new Date(),
        recipients_count: liveCount,
        job_id: job.id,
        failure_reason: inAppWithNoTokens ? EXPO_NO_TOKENS_REASON : null,
      })

      log.info({ recordId, liveCount }, '[notification-worker] job completed')
    },
    {
      connection: { host: env.REDIS_HOST, port: env.REDIS_PORT },
      concurrency: 5,
    },
  )

  worker.on('failed', async (job, err) => {
    if (job) {
      log.error({ recordId: job.data.recordId, err: err.message }, '[notification-worker] job FAILED')
      await NotificationRecord.findByIdAndUpdate(job.data.recordId, {
        status: 'failed',
        failure_reason: err.message,
      }).catch(() => null)
    }
  })

  worker.on('error', (err) => {
    log.error({ err: err.message }, '[notification-worker] worker error')
  })

  log.info('[notification-worker] started')
  return worker
}
