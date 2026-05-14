/* ═══════════════════════════════════════════════════════════════════════════
 *  notification.validator — Zod schemas for notification endpoints
 * ═══════════════════════════════════════════════════════════════════════════ */

import { z } from 'zod'

export const sendNotificationSchema = z.object({
  title:         z.string().min(1).max(300),
  body:          z.string().min(1).max(5000),
  channel:       z.enum(['email', 'in-app', 'both']),
  audience_type: z.enum(['all', 'workers', 'employers', 'unverified']),
  scheduled_at:  z.string().datetime({ offset: true }).optional(),
  html_template: z.string().min(1).optional(),
})

export type SendNotificationBody = z.infer<typeof sendNotificationSchema>

export const toggleChannelSchema = z.object({
  enabled: z.boolean(),
})

export const notificationHistoryQuerySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
})
