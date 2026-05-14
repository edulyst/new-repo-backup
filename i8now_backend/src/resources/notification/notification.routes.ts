/* ═══════════════════════════════════════════════════════════════════════════
 *  notification.routes — mounts at `/api/v1/admin/notifications`
 *
 *  All routes require admin auth (enforced by admin.routes before mounting).
 * ═══════════════════════════════════════════════════════════════════════════ */

import { Router } from 'express'
import { asyncHandler } from '../../utils/asyncHandler.js'
import * as ctrl from './notification.controller.js'

const router = Router()

router.get('/stats',           asyncHandler(ctrl.getStats))
router.get('/audience-sizes',  asyncHandler(ctrl.getAudienceSizes))
router.post('/send',           asyncHandler(ctrl.postSendNotification))
router.get('/history',         asyncHandler(ctrl.getHistory))
router.get('/history/export',  asyncHandler(ctrl.exportHistory))
router.get('/channels',        asyncHandler(ctrl.getChannels))
router.patch('/channels/:channelId', asyncHandler(ctrl.patchChannel))

export { router as notificationRouter }
