/* ═══════════════════════════════════════════════════════════════════════════
 *  notification.controller — HTTP handlers for `/api/v1/admin/notifications/*`
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { Request, Response } from 'express'
import { success, paginated } from '../../utils/apiResponse.js'
import {
  sendNotificationSchema,
  toggleChannelSchema,
  notificationHistoryQuerySchema,
} from './notification.validator.js'
import {
  sendNotification,
  listChannels,
  toggleChannel,
  listNotificationHistory,
  exportNotificationHistory,
  getNotificationStats,
  listAudienceSizes,
} from './notification.service.js'

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

// GET /admin/notifications/stats
export async function getStats(_req: Request, res: Response) {
  const stats = await getNotificationStats()
  res.json(success(stats, 'Notification stats retrieved'))
}

// GET /admin/notifications/audience-sizes
export async function getAudienceSizes(_req: Request, res: Response) {
  const sizes = await listAudienceSizes()
  res.json(success(sizes, 'Audience sizes retrieved'))
}

// POST /admin/notifications/send
export async function postSendNotification(req: Request, res: Response) {
  const body = sendNotificationSchema.parse(req.body)
  const record = await sendNotification({
    ...body,
    created_by: req.user!.id,
  })
  res.status(202).json(success(record.toObject(), 'Notification queued'))
}

// GET /admin/notifications/history
export async function getHistory(req: Request, res: Response) {
  const query = notificationHistoryQuerySchema.parse(req.query)
  const { records, total, page, limit } = await listNotificationHistory(query)
  res.json(paginated(records, total, page, limit, 'Notification history retrieved'))
}

// GET /admin/notifications/history/export
export async function exportHistory(req: Request, res: Response) {
  const query = notificationHistoryQuerySchema.parse(req.query)
  const rows = await exportNotificationHistory({ status: query.status, search: query.search })
  const headers = ['id', 'created_at', 'sent_at', 'title', 'channel', 'audience_type', 'recipients_count', 'status', 'scheduled_at', 'failure_reason']
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h as keyof typeof row])).join(',')),
  ].join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="notification_history_${Date.now()}.csv"`)
  res.status(200).send(csv)
}

// GET /admin/notifications/channels
export async function getChannels(_req: Request, res: Response) {
  const channels = await listChannels()
  res.json(success({ channels }, 'Channels retrieved'))
}

// PATCH /admin/notifications/channels/:channelId
export async function patchChannel(req: Request, res: Response) {
  const { channelId } = req.params
  const { enabled } = toggleChannelSchema.parse(req.body)
  const ch = await toggleChannel(channelId, enabled)
  res.json(success(ch, `Channel '${channelId}' ${enabled ? 'enabled' : 'disabled'}`))
}
