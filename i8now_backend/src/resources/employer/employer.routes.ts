/* ═══════════════════════════════════════════════════════════════════════════
 *  employer.routes — /api/v1/employer/* for the employer portal
 * ═══════════════════════════════════════════════════════════════════════════ */

import { Router } from 'express'
import { requireAuth, requireRole } from '../auth/auth.middleware.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import * as ctrl from './employer.controller.js'

const router = Router()
router.use(requireAuth, requireRole('employer'))

router.get('/me', asyncHandler(ctrl.getMe))
router.patch('/me/profile', asyncHandler(ctrl.patchProfile))

router.get('/candidates', asyncHandler(ctrl.searchCandidates))
router.get('/candidates/:id', asyncHandler(ctrl.getCandidateProfile))

router.get('/shortlists', asyncHandler(ctrl.listShortlists))
router.post('/shortlists', asyncHandler(ctrl.createShortlist))
router.get('/shortlists/:id', asyncHandler(ctrl.getShortlist))
router.patch('/shortlists/:id', asyncHandler(ctrl.patchShortlist))
router.delete('/shortlists/:id', asyncHandler(ctrl.deleteShortlist))
router.post('/shortlists/:id/candidates/:candidateId', asyncHandler(ctrl.addToShortlist))
router.delete('/shortlists/:id/candidates/:candidateId', asyncHandler(ctrl.removeFromShortlist))

router.get('/conversations', asyncHandler(ctrl.listConversations))
router.post('/conversations', asyncHandler(ctrl.startConversation))
router.get('/conversations/:id/messages', asyncHandler(ctrl.listMessages))
router.post('/conversations/:id/messages', asyncHandler(ctrl.sendMessage))

router.get('/interviews', asyncHandler(ctrl.listInterviews))
router.post('/interviews', asyncHandler(ctrl.createInterview))
router.get('/interviews/:id', asyncHandler(ctrl.getInterview))
router.patch('/interviews/:id', asyncHandler(ctrl.patchInterview))
router.delete('/interviews/:id', asyncHandler(ctrl.cancelInterview))

router.get('/workers', asyncHandler(ctrl.listHiredWorkers))
router.get('/workers/:id', asyncHandler(ctrl.getHiredWorker))
router.post('/workers/:id/rate', asyncHandler(ctrl.rateWorker))
router.post('/workers/:id/feedback', asyncHandler(ctrl.giveFeedback))
router.post('/workers/:id/badges', asyncHandler(ctrl.awardBadge))

router.get('/tasks', asyncHandler(ctrl.listTasks))
router.post('/tasks', asyncHandler(ctrl.createTask))
router.get('/tasks/:id', asyncHandler(ctrl.getTask))
router.patch('/tasks/:id', asyncHandler(ctrl.patchTask))
router.delete('/tasks/:id', asyncHandler(ctrl.deleteTask))

router.get('/kpis', asyncHandler(ctrl.listKpis))
router.get('/kpis/:workerId', asyncHandler(ctrl.getWorkerKpis))

router.get('/wallet', asyncHandler(ctrl.getWallet))
router.get('/wallet/transactions', asyncHandler(ctrl.listTransactions))
router.post('/wallet/pay', asyncHandler(ctrl.payWorker))

router.get('/shifts', asyncHandler(ctrl.listMyShifts))
router.post('/shifts', asyncHandler(ctrl.createShift))
router.get('/shifts/:id', asyncHandler(ctrl.getShift))
router.patch('/shifts/:id', asyncHandler(ctrl.patchShift))
router.get('/shifts/:id/applications', asyncHandler(ctrl.listShiftApplications))
router.patch('/shifts/:id/applications/:appId', asyncHandler(ctrl.reviewApplication))

export { router as employerRouter }
