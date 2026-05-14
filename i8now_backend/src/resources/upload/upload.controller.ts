import type { Request, Response } from 'express'
import { success } from '../../utils/apiResponse.js'
import { AppError } from '../../utils/errors.js'
import { createPresignedPutUrl, createSignedGetUrl } from '../../utils/s3.js'
import { presignedReadSchema, presignedUrlSchema } from './upload.validator.js'

function sanitizeKey(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function extractS3KeyFromPublicUrl(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl)
    return u.pathname.replace(/^\/+/, '')
  } catch {
    return null
  }
}

/** POST /api/v1/uploads/presigned-url */
export async function getPresignedUrl(req: Request, res: Response): Promise<void> {
  const body = presignedUrlSchema.parse(req.body)
  const uid = req.user?.id
  if (!uid) throw new AppError('UNAUTHORIZED', 401, 'Unauthorized')

  const safeName = sanitizeKey(body.key)
  const objectKey = `uploads/${uid}/${Date.now()}-${safeName}`
  const out = await createPresignedPutUrl(objectKey, body.contentType, 300)

  res.status(200).json(
    success(
      {
        uploadUrl: out.upload_url,
        key: objectKey,
        publicUrl: out.file_url,
        expiresIn: out.expires_in,
      },
      'Presigned URL generated',
    ),
  )
}

/** POST /api/v1/uploads/presigned-read */
export async function getPresignedRead(req: Request, res: Response): Promise<void> {
  const body = presignedReadSchema.parse(req.body)
  const uid = req.user?.id
  if (!uid) throw new AppError('UNAUTHORIZED', 401, 'Unauthorized')

  const key = extractS3KeyFromPublicUrl(body.publicUrl)
  if (!key) throw new AppError('UPLOAD_KEY_INVALID', 400, 'Invalid public URL')
  if (!key.startsWith(`uploads/${uid}/`)) {
    throw new AppError('UPLOAD_KEY_FORBIDDEN', 403, 'File does not belong to this user')
  }

  const readUrl = await createSignedGetUrl(key, 3600)
  res.status(200).json(success({ readUrl, expiresIn: 3600 }, 'Read URL generated'))
}

