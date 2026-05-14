/* ═══════════════════════════════════════════════════════════════════════════
 *  notification.model — Mongoose schemas for notifications
 *
 *  NotificationRecord  — one log entry per send/bulk action
 *  NotificationChannel — per-channel on/off settings (email + in-app groups)
 * ═══════════════════════════════════════════════════════════════════════════ */

import { Schema, model, type Document } from 'mongoose'

// ─── NotificationRecord ───────────────────────────────────────────────────────

export interface INotificationRecord extends Document {
  title: string
  body: string
  channel: 'email' | 'in-app' | 'both'
  audience_type: 'all' | 'workers' | 'employers' | 'unverified'
  /** Optional direct targeting for specific users (by user id). */
  target_user_ids?: string[]
  recipients_count: number
  status: 'queued' | 'processing' | 'delivered' | 'partial' | 'failed' | 'scheduled'
  scheduled_at?: Date
  sent_at?: Date
  job_id?: string
  failure_reason?: string
  open_count: number
  created_by: string
  created_at: Date
}

const notificationRecordSchema = new Schema<INotificationRecord>(
  {
    title:           { type: String, required: true, maxlength: 300 },
    body:            { type: String, required: true, maxlength: 2000 },
    channel:         { type: String, enum: ['email', 'in-app', 'both'], required: true },
    audience_type:   { type: String, enum: ['all', 'workers', 'employers', 'unverified'], required: true },
    target_user_ids: [{ type: String, index: true }],
    recipients_count:{ type: Number, default: 0 },
    status:          { type: String, enum: ['queued', 'processing', 'delivered', 'partial', 'failed', 'scheduled'], default: 'queued' },
    scheduled_at:    { type: Date },
    sent_at:         { type: Date },
    job_id:          { type: String },
    failure_reason:  { type: String },
    open_count:      { type: Number, default: 0 },
    created_by:      { type: String, required: true },
    created_at:      { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'notification_records' },
)

export const NotificationRecord = model<INotificationRecord>('NotificationRecord', notificationRecordSchema)

// ─── NotificationChannel ──────────────────────────────────────────────────────

export interface INotificationChannel extends Document {
  channel_id: string
  group: 'email' | 'in-app'
  title: string
  description: string
  tag: string
  enabled: boolean
}

const notificationChannelSchema = new Schema<INotificationChannel>(
  {
    channel_id:  { type: String, required: true, unique: true },
    group:       { type: String, enum: ['email', 'in-app'], required: true },
    title:       { type: String, required: true },
    description: { type: String, required: true },
    tag:         { type: String, required: true },
    enabled:     { type: Boolean, default: true },
  },
  { timestamps: false, collection: 'notification_channels' },
)

export const NotificationChannel = model<INotificationChannel>('NotificationChannel', notificationChannelSchema)

// ─── Seed defaults ─────────────────────────────────────────────────────────────

export const DEFAULT_CHANNELS: Omit<INotificationChannel, keyof Document>[] = [
  { channel_id: 'new-user',         group: 'email',  title: 'New user onboarding',      description: 'Welcome sequence and setup reminders sent to newly created accounts.',            tag: 'Lifecycle',     enabled: true  },
  { channel_id: 'security-alerts',  group: 'email',  title: 'Security alerts',           description: 'Suspicious login attempts, password resets, and account lock events.',           tag: 'Security',      enabled: true  },
  { channel_id: 'weekly-digest',    group: 'email',  title: 'Weekly digest',             description: 'A weekly summary of signups, active workers, and employer activity.',            tag: 'Analytics',     enabled: false },
  { channel_id: 'otp',              group: 'email',  title: 'OTP & authentication codes',description: 'One-time passwords and login verification codes delivered via email.',            tag: 'Auth',          enabled: true  },
  { channel_id: 'approval-updates', group: 'in-app', title: 'Approval updates',          description: 'Notify admins when documents, shifts, or payouts are waiting for approval.',     tag: 'Workflow',      enabled: true  },
  { channel_id: 'task-reminders',   group: 'in-app', title: 'Task reminders',            description: 'Surface reminders inside the panel for open items approaching their due date.', tag: 'Productivity',  enabled: true  },
  { channel_id: 'system-banner',    group: 'in-app', title: 'System announcements',      description: 'Broadcast maintenance windows and product release updates in-app.',              tag: 'Platform',      enabled: true  },
  { channel_id: 'direct-messages',  group: 'in-app', title: 'Direct messages',           description: 'Receive in-app notifications when a worker or employer sends a message.',        tag: 'Communication', enabled: false },
]
