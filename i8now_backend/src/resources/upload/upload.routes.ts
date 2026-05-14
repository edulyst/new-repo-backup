import { Router } from 'express'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { requireAuth } from '../auth/auth.middleware.js'
import * as uploadController from './upload.controller.js'

const router = Router()

router.use(requireAuth)
router.post('/presigned-url', asyncHandler(uploadController.getPresignedUrl))
router.post('/presigned-read', asyncHandler(uploadController.getPresignedRead))

export { router as uploadRouter }

