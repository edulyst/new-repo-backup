/* ═══════════════════════════════════════════════════════════════════════════
 *  notification.queue — BullMQ Queue singleton
 *
 *  Lazily created so the app starts fine even when Redis is not reachable
 *  during unit tests.  Use `getNotificationQueue()` everywhere.
 * ═══════════════════════════════════════════════════════════════════════════ */

import { Queue } from 'bullmq'
import { loadEnv } from '../../config/env.js'

export const QUEUE_NAME = 'notifications'

export type NotificationJobData = {
  recordId: string
  title: string
  body: string
  channel: 'email' | 'in-app' | 'both'
  audienceType: 'all' | 'workers' | 'employers' | 'unverified'
  recipientsCount: number
  scheduledAt?: string        // ISO string, undefined means immediate
  htmlTemplate?: string       // custom HTML email body; overrides default html
}

let queue: Queue<NotificationJobData> | null = null

export function getNotificationQueue(): Queue<NotificationJobData> {
  if (!queue) {
    const env = loadEnv()
    queue = new Queue<NotificationJobData>(QUEUE_NAME, {
      connection: { host: env.REDIS_HOST, port: env.REDIS_PORT },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 200 },
        removeOnFail:     { count: 100 },
      },
    })
  }
  return queue
}
