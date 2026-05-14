import { z } from 'zod'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export const presignedUrlSchema = z.object({
  key: z.string().min(1).max(200),
  contentType: z.enum(IMAGE_TYPES),
  category: z.enum(['image']).default('image'),
})

export type PresignedUrlBody = z.infer<typeof presignedUrlSchema>

export const presignedReadSchema = z.object({
  publicUrl: z.string().url(),
})

export type PresignedReadBody = z.infer<typeof presignedReadSchema>

