/* ═══════════════════════════════════════════════════════════════════════════
 *  env — reads process.env once, validates with Zod, caches the result
 *
 *  If something is missing or too short, the app fails fast at startup instead
 *  of mysteriously failing later during a login.
 * ═══════════════════════════════════════════════════════════════════════════ */

import { z } from 'zod'

const envBool = z.preprocess((value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }
  return value
}, z.boolean())

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  // OTP_PEPPER is used to hash the OTPs before storing in DB, so that if the DB is leaked, the OTPs can't be easily used.
  OTP_PEPPER: z.string().min(16),
  /** If set, startup promotes this existing user’s role to `admin` (dev/bootstrap). */
  ADMIN_PROMOTE_EMAIL: z.string().email().optional(),
  /** Comma-separated browser origins allowed for CORS (e.g. admin Vite dev server). */
  CORS_ORIGINS: z.string().optional(),
  /** Enable BullMQ/Redis queue for notifications. Keep false in local dev without Redis. */
  NOTIFICATIONS_QUEUE_ENABLED: envBool.default(false),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: envBool.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  /** Optional; set for `Authorization: Bearer` on Expo push API (Expo account → access token). */
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

export function loadEnv(): Env {
  if (cached) return cached
  cached = envSchema.parse(process.env)
  return cached
}
