/* ═══════════════════════════════════════════════════════════════════════════
 *  student.validator — Zod for /api/v1/student/*
 * ═══════════════════════════════════════════════════════════════════════════ */

import { z } from 'zod'

export const expoPushTokenBodySchema = z.object({
  expo_push_token: z.string().min(10).max(512).trim(),
})

export type ExpoPushTokenBody = z.infer<typeof expoPushTokenBodySchema>
