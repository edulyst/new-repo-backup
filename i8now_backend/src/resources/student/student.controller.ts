/* ═══════════════════════════════════════════════════════════════════════════
 *  student.controller — handlers for /api/v1/student/*
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { Request, Response } from 'express'
import { success, paginated, error } from '../../utils/apiResponse.js'
import { setExpoPushToken } from '../user/user.repo.js'
import { expoPushTokenBodySchema } from './student.validator.js'
import { WorkerProfileModel } from '../worker/workerProfile.model.js'
import { ShiftModel } from '../shift/shift.model.js'
import { ShiftApplicationModel } from '../shift/shiftApplication.model.js'
import { EmployerProfileModel } from '../shift/employerProfile.model.js'
import { createSignedGetUrl } from '../../utils/s3.js'
import { InterviewModel } from '../interview/interview.model.js'
import { ConversationModel } from '../messaging/conversation.model.js'
import { MessageModel } from '../messaging/message.model.js'
import { TaskModel } from '../task/task.model.js'
import { WalletModel } from '../wallet/wallet.model.js'
import { TransactionModel } from '../wallet/transaction.model.js'
import { BadgeModel, UserBadgeModel } from '../badge/badge.model.js'
import { KpiModel } from '../kpi/kpi.model.js'
import { haversineKm } from '../../utils/geo.js'
import { NotificationRecord } from '../notification/notification.model.js'
import { UserNotificationState } from '../notification/userNotificationState.model.js'

function extractS3KeyFromUrl(fileUrl: string): string | null {
  try {
    const u = new URL(fileUrl)
    return u.pathname.replace(/^\/+/, '') || null
  } catch {
    return null
  }
}

async function toPreviewUrlIfS3(fileUrl: string | null | undefined): Promise<string | null> {
  if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) return fileUrl ?? null
  const key = extractS3KeyFromUrl(fileUrl)
  if (!key) return fileUrl
  try {
    return await createSignedGetUrl(key, 3600)
  } catch {
    return fileUrl
  }
}

export async function getMe(req: Request, res: Response) {
  const profile = await WorkerProfileModel.findOne({ user_id: req.user!.id }).lean()
  res.json(success({ profile }, 'OK'))
}

/** Worker feed: user-relevant broadcast + worker-targeted notifications. */
export async function listMyNotifications(req: Request, res: Response) {
  const pageRaw = Number(req.query.page ?? 1)
  const limitRaw = Number(req.query.limit ?? 40)
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.trunc(pageRaw)) : 1
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.trunc(limitRaw))) : 40
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = {
    $or: [
      { audience_type: { $in: ['all', 'workers'] } },
      { target_user_ids: req.user!.id },
    ],
  }

  const hiddenRows = await UserNotificationState.find(
    { user_id: req.user!.id },
    { _id: 0, notification_id: 1 },
  ).lean()
  const hiddenIds = hiddenRows.map((r) => r.notification_id).filter(Boolean)
  if (hiddenIds.length > 0) {
    filter._id = { $nin: hiddenIds }
  }

  const [rows, total] = await Promise.all([
    NotificationRecord.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .select({ __v: 0 })
      .lean(),
    NotificationRecord.countDocuments(filter),
  ])

  res.json(paginated(rows, total, page, limit, 'Notifications'))
}

export async function deleteMyNotification(req: Request, res: Response) {
  const id = String(req.params.id || '').trim()
  if (!id) {
    res.status(400).json(error('Notification id is required', []))
    return
  }

  await UserNotificationState.updateOne(
    { user_id: req.user!.id, notification_id: id },
    { $set: { hidden_at: new Date() } },
    { upsert: true },
  )

  res.json(success({ ok: true, id }, 'Notification removed'))
}

/** POST { expo_push_token } — device registers for admin / platform push (Expo). */
export async function registerExpoPushToken(req: Request, res: Response) {
  const parsed = expoPushTokenBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json(error('Invalid body', []))
    return
  }
  await setExpoPushToken(req.user!.id, parsed.data.expo_push_token)
  res.json(success({ ok: true }, 'Push token registered'))
}

export async function patchProfile(req: Request, res: Response) {
  const profile = await WorkerProfileModel.findOneAndUpdate(
    { user_id: req.user!.id },
    { $set: req.body },
    { new: true, upsert: true },
  )
  res.json(success({ profile }, 'Updated'))
}

/** PATCH body: { lat, lng, city?, radius_km? } — updates worker coordinates (requires existing profile). */
export async function updateLocation(req: Request, res: Response) {
  const rawLat = req.body?.lat ?? req.body?.location_lat
  const rawLng = req.body?.lng ?? req.body?.location_lng
  const lat = typeof rawLat === 'number' ? rawLat : parseFloat(String(rawLat ?? ''))
  const lng = typeof rawLng === 'number' ? rawLng : parseFloat(String(rawLng ?? ''))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json(error('Invalid lat/lng', []))
    return
  }
  const city = typeof req.body?.city === 'string' ? req.body.city.trim() : undefined
  let radiusKm: number | undefined
  if (req.body?.radius_km != null && req.body?.radius_km !== '') {
    const rk =
      typeof req.body.radius_km === 'number' ? req.body.radius_km : parseFloat(String(req.body.radius_km))
    if (!Number.isFinite(rk) || rk < 1 || rk > 500) {
      res.status(400).json(error('radius_km must be between 1 and 500', []))
      return
    }
    radiusKm = rk
  }
  const profile = await WorkerProfileModel.findOne({ user_id: req.user!.id })
  if (!profile) {
    res.status(404).json(error('Complete your profile before updating location', []))
    return
  }
  const $set: Record<string, unknown> = { location_lat: lat, location_lng: lng }
  if (city) $set.city = city
  if (radiusKm !== undefined) $set.radius_km = radiusKm
  await WorkerProfileModel.updateOne({ user_id: req.user!.id }, { $set })
  const updated = await WorkerProfileModel.findOne({ user_id: req.user!.id }).lean()
  res.json(success({ profile: updated }, 'Location updated'))
}

export async function listJobs(req: Request, res: Response) {
  const { q = '', category, page = '1', limit = '20' } = req.query as Record<string, string>
  const latQ = req.query.lat as string | undefined
  const lngQ = req.query.lng as string | undefined
  const radiusQ = req.query.radius_km as string | undefined
  const lat = latQ != null && latQ !== '' ? parseFloat(latQ) : NaN
  const lng = lngQ != null && lngQ !== '' ? parseFloat(lngQ) : NaN
  const radiusKm = radiusQ != null && radiusQ !== '' ? parseFloat(radiusQ) : NaN
  const useGeo = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0

  const pg = Math.max(1, parseInt(page))
  const lm = Math.min(100, Math.max(1, parseInt(limit)))
  const filter: Record<string, unknown> = { status: 'open' }
  if (q) filter.title = new RegExp(q, 'i')
  if (category) filter.category_id = category

  if (useGeo) {
    const rKm = radiusKm as number
    const latDelta = rKm / 111
    const cos = Math.cos((lat * Math.PI) / 180)
    const lngDelta = rKm / (111 * Math.max(0.2, Math.abs(cos)))
    filter.location_lat = { $gte: lat - latDelta, $lte: lat + latDelta }
    filter.location_lng = { $gte: lng - lngDelta, $lte: lng + lngDelta }
  }

  let shiftsRaw = await ShiftModel.find(filter).sort({ date: 1 }).lean()

  let shifts: Array<Record<string, unknown> & { distance_km?: number }> = shiftsRaw.map((s) => ({
    ...s,
    distance_km: useGeo ? haversineKm(lat, lng, s.location_lat, s.location_lng) : undefined,
  }))

  if (useGeo) {
    const rKm = radiusKm as number
    shifts = shifts.filter((s) => (s.distance_km ?? 0) <= rKm)
    shifts.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
  }

  const total = shifts.length
  const pageShifts = shifts.slice((pg - 1) * lm, pg * lm)
  const profile = await WorkerProfileModel.findOne({ user_id: req.user!.id }).lean()
  const empIds = [...new Set(pageShifts.map((s) => String(s.employer_id)).filter(Boolean))]
  const employers = empIds.length
    ? await EmployerProfileModel.find({
        $or: [{ _id: { $in: empIds } }, { user_id: { $in: empIds } }],
      }).lean()
    : []
  const employerById = new Map<string, any>()
  for (const e of employers as any[]) {
    employerById.set(String(e._id), e)
    if (e.user_id) employerById.set(String(e.user_id), e)
  }
  let appliedShiftIds = new Set<string>()
  if (profile && pageShifts.length > 0) {
    const apps = await ShiftApplicationModel.find({
      worker_profile_id: profile._id,
      shift_id: { $in: pageShifts.map((s) => s._id) },
    })
      .select({ shift_id: 1 })
      .lean()
    appliedShiftIds = new Set(apps.map((a) => String(a.shift_id)))
  }
  const jobs = await Promise.all(pageShifts.map(async (s) => {
    const employer = employerById.get(String(s.employer_id))
    const logoPreview = employer ? await toPreviewUrlIfS3(employer.logo_url ?? null) : null
    return {
      ...s,
      employer: employer
        ? {
            id: employer._id,
            company_name: employer.company_name,
            logo_url: employer.logo_url ?? null,
            logo_preview_url: logoPreview,
            logo_fit: employer.logo_fit ?? 'contain',
            verified: employer.verified ?? false,
          }
        : null,
      applied: appliedShiftIds.has(String(s._id)),
    }
  }))
  res.json(paginated(jobs, total, pg, lm, 'Jobs'))
}

export async function getJob(req: Request, res: Response) {
  const shift = await ShiftModel.findById(req.params.id).lean()
  if (!shift) { res.status(404).json(error('Not found', [])); return }
  const applied = await ShiftApplicationModel.findOne({ shift_id: req.params.id, worker_id: req.user!.id })
  res.json(success({ shift, applied: !!applied }, 'OK'))
}

export async function applyForJob(req: Request, res: Response) {
  const shift = await ShiftModel.findOne({ _id: req.params.id, status: 'open' })
  if (!shift) { res.status(404).json(error('Shift not found or closed', [])); return }
  const profile = await WorkerProfileModel.findOne({ user_id: req.user!.id })
  if (!profile) { res.status(400).json(error('Complete your profile first', [])); return }
  const exists = await ShiftApplicationModel.findOne({ shift_id: req.params.id, worker_profile_id: profile._id })
  if (exists) { res.status(400).json(error('Already applied', [])); return }
  const app = await ShiftApplicationModel.create({
    shift_id: req.params.id,
    worker_profile_id: profile._id,
    status: 'applied',
  })
  res.status(201).json(success({ application: app }, 'Applied'))
}

export async function listApplications(req: Request, res: Response) {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>
  const pg = Math.max(1, parseInt(page))
  const lm = Math.min(100, Math.max(1, parseInt(limit)))
  const profile = await WorkerProfileModel.findOne({ user_id: req.user!.id })
  if (!profile) { res.json(paginated([], 0, pg, lm, 'Applications')); return }
  const filter: Record<string, unknown> = { worker_profile_id: profile._id }
  if (status) filter.status = status
  const apps = await ShiftApplicationModel.find(filter).sort({ applied_at: -1 }).skip((pg - 1) * lm).limit(lm).lean()
  const shiftIds = [...new Set(apps.map((a) => String(a.shift_id)).filter(Boolean))]
  const shifts = shiftIds.length
    ? await ShiftModel.find({ _id: { $in: shiftIds } }).lean()
    : []
  const shiftById = new Map(shifts.map((s) => [String(s._id), s]))

  const employerIds = [...new Set(shifts.map((s) => String(s.employer_id)).filter(Boolean))]
  const employers = employerIds.length
    ? await EmployerProfileModel.find({
        $or: [{ _id: { $in: employerIds } }, { user_id: { $in: employerIds } }],
      }).lean()
    : []
  const employerById = new Map<string, any>()
  for (const e of employers as any[]) {
    employerById.set(String(e._id), e)
    if (e.user_id) employerById.set(String(e.user_id), e)
  }

  const rows = await Promise.all(
    apps.map(async (app) => {
      const shift = shiftById.get(String(app.shift_id))
      const employer = shift ? employerById.get(String(shift.employer_id)) : null
      const logoPreview = employer ? await toPreviewUrlIfS3(employer.logo_url ?? null) : null
      return {
        ...app,
        shift: shift
          ? {
              id: shift._id,
              title: shift.title,
              description: shift.description ?? '',
              address: shift.address,
              date: shift.date,
              start_time: shift.start_time,
              end_time: shift.end_time,
              hourly_rate: shift.hourly_rate,
              slots_total: shift.slots_total,
              slots_filled: shift.slots_filled,
            }
          : null,
        employer: employer
          ? {
              id: employer._id,
              company_name: employer.company_name,
              logo_url: employer.logo_url ?? null,
              logo_preview_url: logoPreview,
              logo_fit: employer.logo_fit ?? 'contain',
            }
          : null,
      }
    }),
  )
  const total = await ShiftApplicationModel.countDocuments(filter)
  res.json(paginated(rows, total, pg, lm, 'Applications'))
}

export async function getApplication(req: Request, res: Response) {
  const profile = await WorkerProfileModel.findOne({ user_id: req.user!.id })
  if (!profile) { res.status(404).json(error('Not found', [])); return }
  const app = await ShiftApplicationModel.findOne({ _id: req.params.id, worker_profile_id: profile._id }).lean()
  if (!app) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ application: app }, 'OK'))
}

export async function patchApplicationDecision(req: Request, res: Response) {
  const profile = await WorkerProfileModel.findOne({ user_id: req.user!.id })
  if (!profile) { res.status(404).json(error('Worker profile not found', [])); return }

  const app = await ShiftApplicationModel.findOne({ _id: req.params.id, worker_profile_id: profile._id }).exec()
  if (!app) { res.status(404).json(error('Application not found', [])); return }

  const raw = String(req.body?.decision ?? req.body?.status ?? '').trim().toLowerCase()
  const nextStatus =
    raw === 'accept' || raw === 'accepted' || raw === 'confirm' || raw === 'confirmed'
      ? 'confirmed'
      : raw === 'reject' || raw === 'rejected' || raw === 'cancel' || raw === 'cancelled'
        ? 'rejected'
        : null
  if (!nextStatus) {
    res.status(400).json(error('Invalid decision. Use accept/reject', []))
    return
  }
  if (app.status === 'completed' || app.status === 'cancelled') {
    res.status(400).json(error('Application cannot be changed in current status', []))
    return
  }

  app.status = nextStatus
  await app.save()
  res.json(success({ application: app }, 'Application decision updated'))
}

export async function listInterviews(req: Request, res: Response) {
  const interviews = await InterviewModel.find({ worker_id: req.user!.id }).sort({ scheduled_at: 1 }).lean()
  res.json(success({ interviews }, 'OK'))
}

export async function getInterview(req: Request, res: Response) {
  const interview = await InterviewModel.findOne({ _id: req.params.id, worker_id: req.user!.id }).lean()
  if (!interview) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ interview }, 'OK'))
}

export async function listConversations(req: Request, res: Response) {
  const convs = await ConversationModel.find({ worker_id: req.user!.id }).sort({ last_message_at: -1 }).lean()
  res.json(success({ conversations: convs }, 'OK'))
}

export async function listMessages(req: Request, res: Response) {
  const conv = await ConversationModel.findOne({ _id: req.params.id, worker_id: req.user!.id })
  if (!conv) { res.status(404).json(error('Not found', [])); return }
  const msgs = await MessageModel.find({ conversation_id: req.params.id }).sort({ created_at: 1 }).lean()
  await ConversationModel.updateOne({ _id: req.params.id }, { $set: { unread_worker: 0 } })
  res.json(success({ messages: msgs }, 'OK'))
}

export async function sendMessage(req: Request, res: Response) {
  const conv = await ConversationModel.findOne({ _id: req.params.id, worker_id: req.user!.id })
  if (!conv) { res.status(404).json(error('Not found', [])); return }
  const msg = await MessageModel.create({
    conversation_id: req.params.id,
    sender_id: req.user!.id,
    sender_role: 'worker',
    body: req.body.body,
  })
  await ConversationModel.updateOne(
    { _id: req.params.id },
    { $set: { last_message: req.body.body, last_message_at: new Date() }, $inc: { unread_employer: 1 } },
  )
  res.status(201).json(success({ message: msg }, 'Sent'))
}

export async function listTasks(req: Request, res: Response) {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>
  const pg = Math.max(1, parseInt(page))
  const lm = Math.min(100, Math.max(1, parseInt(limit)))
  const filter: Record<string, unknown> = { worker_id: req.user!.id }
  if (status) filter.status = status
  const tasks = await TaskModel.find(filter).sort({ created_at: -1 }).skip((pg - 1) * lm).limit(lm).lean()
  const total = await TaskModel.countDocuments(filter)
  res.json(paginated(tasks, total, pg, lm, 'Tasks'))
}

export async function getTask(req: Request, res: Response) {
  const task = await TaskModel.findOne({ _id: req.params.id, worker_id: req.user!.id }).lean()
  if (!task) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ task }, 'OK'))
}

export async function updateTaskStatus(req: Request, res: Response) {
  const { status, worker_notes } = req.body
  const update: Record<string, unknown> = { status }
  if (worker_notes !== undefined) update.worker_notes = worker_notes
  if (status === 'completed') update.completed_at = new Date()
  const task = await TaskModel.findOneAndUpdate(
    { _id: req.params.id, worker_id: req.user!.id },
    { $set: update },
    { new: true },
  )
  if (!task) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ task }, 'Updated'))
}

export async function listMyBadges(req: Request, res: Response) {
  const userBadges = await UserBadgeModel.find({ worker_id: req.user!.id }).lean()
  const badgeIds = userBadges.map((b) => b.badge_id)
  const badges = await BadgeModel.find({ _id: { $in: badgeIds } }).lean()
  const result = userBadges.map((ub) => ({
    ...ub,
    badge: badges.find((b) => b._id === ub.badge_id),
  }))
  res.json(success({ badges: result }, 'OK'))
}

export async function getWallet(req: Request, res: Response) {
  let wallet = await WalletModel.findOne({ user_id: req.user!.id })
  if (!wallet) wallet = await WalletModel.create({ user_id: req.user!.id, role: 'worker' })
  res.json(success({ wallet }, 'OK'))
}

export async function listTransactions(req: Request, res: Response) {
  const { page = '1', limit = '20' } = req.query as Record<string, string>
  const pg = Math.max(1, parseInt(page))
  const lm = Math.min(100, Math.max(1, parseInt(limit)))
  const wallet = await WalletModel.findOne({ user_id: req.user!.id })
  if (!wallet) { res.json(paginated([], 0, pg, lm, 'Transactions')); return }
  const txns = await TransactionModel.find({ wallet_id: wallet._id }).sort({ created_at: -1 }).skip((pg - 1) * lm).limit(lm).lean()
  const total = await TransactionModel.countDocuments({ wallet_id: wallet._id })
  res.json(paginated(txns, total, pg, lm, 'Transactions'))
}

export async function getMyKpis(req: Request, res: Response) {
  const kpis = await KpiModel.find({ worker_id: req.user!.id }).lean()
  res.json(success({ kpis }, 'OK'))
}
