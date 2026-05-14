/* ═══════════════════════════════════════════════════════════════════════════
 *  student.routes — /api/v1/student/* for the student/worker portal
 * ═══════════════════════════════════════════════════════════════════════════ */

import { Router } from 'express'
import { requireAuth, requireRole } from '../auth/auth.middleware.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import * as ctrl from './student.controller.js'

const router = Router()
router.use(requireAuth, requireRole('worker'))

router.get('/me', asyncHandler(ctrl.getMe))
router.post('/me/push-token', asyncHandler(ctrl.registerExpoPushToken))
router.patch('/me/profile', asyncHandler(ctrl.patchProfile))
router.patch('/me/location', asyncHandler(ctrl.updateLocation))
router.get('/notifications', asyncHandler(ctrl.listMyNotifications))
router.delete('/notifications/:id', asyncHandler(ctrl.deleteMyNotification))

router.get('/jobs', asyncHandler(ctrl.listJobs))
router.get('/jobs/:id', asyncHandler(ctrl.getJob))
router.post('/jobs/:id/apply', asyncHandler(ctrl.applyForJob))

router.get('/applications', asyncHandler(ctrl.listApplications))
router.get('/applications/:id', asyncHandler(ctrl.getApplication))
router.patch('/applications/:id/decision', asyncHandler(ctrl.patchApplicationDecision))

router.get('/interviews', asyncHandler(ctrl.listInterviews))
router.get('/interviews/:id', asyncHandler(ctrl.getInterview))

router.get('/conversations', asyncHandler(ctrl.listConversations))
router.get('/conversations/:id/messages', asyncHandler(ctrl.listMessages))
router.post('/conversations/:id/messages', asyncHandler(ctrl.sendMessage))

router.get('/tasks', asyncHandler(ctrl.listTasks))
router.get('/tasks/:id', asyncHandler(ctrl.getTask))
router.patch('/tasks/:id/status', asyncHandler(ctrl.updateTaskStatus))

router.get('/badges', asyncHandler(ctrl.listMyBadges))

router.get('/wallet', asyncHandler(ctrl.getWallet))
router.get('/wallet/transactions', asyncHandler(ctrl.listTransactions))

router.get('/kpis', asyncHandler(ctrl.getMyKpis))

export { router as studentRouter }
