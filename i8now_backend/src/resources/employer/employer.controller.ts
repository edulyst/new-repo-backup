/* ═══════════════════════════════════════════════════════════════════════════
 *  employer.controller — handlers for /api/v1/employer/*
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { Request, Response } from 'express'
import { success, paginated, error } from '../../utils/apiResponse.js'
import { WorkerProfileModel } from '../worker/workerProfile.model.js'
import { EmployerProfileModel } from '../shift/employerProfile.model.js'
import { ShiftModel } from '../shift/shift.model.js'
import { ShiftApplicationModel } from '../shift/shiftApplication.model.js'
import { ShortlistModel } from '../shortlist/shortlist.model.js'
import { ConversationModel } from '../messaging/conversation.model.js'
import { MessageModel } from '../messaging/message.model.js'
import { InterviewModel } from '../interview/interview.model.js'
import { TaskModel } from '../task/task.model.js'
import { WalletModel } from '../wallet/wallet.model.js'
import { TransactionModel } from '../wallet/transaction.model.js'
import { BadgeModel, UserBadgeModel } from '../badge/badge.model.js'
import { KpiModel } from '../kpi/kpi.model.js'

// ── Me ──────────────────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response) {
  const profile = await EmployerProfileModel.findOne({ user_id: req.user!.id })
  res.json(success({ profile }, 'OK'))
}

export async function patchProfile(req: Request, res: Response) {
  const profile = await EmployerProfileModel.findOneAndUpdate(
    { user_id: req.user!.id },
    { $set: req.body },
    { new: true, upsert: true },
  )
  res.json(success({ profile }, 'Profile updated'))
}

// ── Candidates ───────────────────────────────────────────────────────────────

export async function searchCandidates(req: Request, res: Response) {
  const { q = '', kyc_status, page = '1', limit = '20' } = req.query as Record<string, string>
  const pg = Math.max(1, parseInt(page))
  const lm = Math.min(100, Math.max(1, parseInt(limit)))

  const filter: Record<string, unknown> = {}
  if (q) filter.$or = [{ full_name: new RegExp(q, 'i') }, { bio: new RegExp(q, 'i') }]
  if (kyc_status) filter.kyc_status = kyc_status

  const profiles = await WorkerProfileModel.find(filter)
    .skip((pg - 1) * lm)
    .limit(lm)
    .lean()

  const total = await WorkerProfileModel.countDocuments(filter)
  res.json(paginated(profiles, total, pg, lm, 'Candidates'))
}

export async function getCandidateProfile(req: Request, res: Response) {
  const profile = await WorkerProfileModel.findOne({ user_id: req.params.id }).lean()
  if (!profile) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ profile }, 'OK'))
}

// ── Shortlists ───────────────────────────────────────────────────────────────

export async function listShortlists(req: Request, res: Response) {
  const lists = await ShortlistModel.find({ employer_id: req.user!.id }).lean()
  res.json(success({ shortlists: lists }, 'OK'))
}

export async function createShortlist(req: Request, res: Response) {
  const { name, description } = req.body
  const list = await ShortlistModel.create({ employer_id: req.user!.id, name, description })
  res.status(201).json(success({ shortlist: list }, 'Created'))
}

export async function getShortlist(req: Request, res: Response) {
  const list = await ShortlistModel.findOne({ _id: req.params.id, employer_id: req.user!.id }).lean()
  if (!list) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ shortlist: list }, 'OK'))
}

export async function patchShortlist(req: Request, res: Response) {
  const list = await ShortlistModel.findOneAndUpdate(
    { _id: req.params.id, employer_id: req.user!.id },
    { $set: req.body },
    { new: true },
  )
  if (!list) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ shortlist: list }, 'Updated'))
}

export async function deleteShortlist(req: Request, res: Response) {
  await ShortlistModel.deleteOne({ _id: req.params.id, employer_id: req.user!.id })
  res.json(success({}, 'Deleted'))
}

export async function addToShortlist(req: Request, res: Response) {
  const list = await ShortlistModel.findOneAndUpdate(
    { _id: req.params.id, employer_id: req.user!.id },
    { $addToSet: { candidate_ids: req.params.candidateId } },
    { new: true },
  )
  if (!list) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ shortlist: list }, 'Added'))
}

export async function removeFromShortlist(req: Request, res: Response) {
  const list = await ShortlistModel.findOneAndUpdate(
    { _id: req.params.id, employer_id: req.user!.id },
    { $pull: { candidate_ids: req.params.candidateId } },
    { new: true },
  )
  if (!list) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ shortlist: list }, 'Removed'))
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export async function listConversations(req: Request, res: Response) {
  const convs = await ConversationModel.find({ employer_id: req.user!.id }).sort({ last_message_at: -1 }).lean()
  res.json(success({ conversations: convs }, 'OK'))
}

export async function startConversation(req: Request, res: Response) {
  const { worker_id } = req.body
  let conv = await ConversationModel.findOne({ employer_id: req.user!.id, worker_id })
  if (!conv) {
    conv = await ConversationModel.create({ employer_id: req.user!.id, worker_id })
  }
  res.status(201).json(success({ conversation: conv }, 'OK'))
}

export async function listMessages(req: Request, res: Response) {
  const conv = await ConversationModel.findOne({ _id: req.params.id, employer_id: req.user!.id })
  if (!conv) { res.status(404).json(error('Not found', [])); return }
  const msgs = await MessageModel.find({ conversation_id: req.params.id }).sort({ created_at: 1 }).lean()
  await ConversationModel.updateOne({ _id: req.params.id }, { $set: { unread_employer: 0 } })
  res.json(success({ messages: msgs }, 'OK'))
}

export async function sendMessage(req: Request, res: Response) {
  const conv = await ConversationModel.findOne({ _id: req.params.id, employer_id: req.user!.id })
  if (!conv) { res.status(404).json(error('Not found', [])); return }
  const msg = await MessageModel.create({
    conversation_id: req.params.id,
    sender_id: req.user!.id,
    sender_role: 'employer',
    body: req.body.body,
  })
  await ConversationModel.updateOne(
    { _id: req.params.id },
    { $set: { last_message: req.body.body, last_message_at: new Date() }, $inc: { unread_worker: 1 } },
  )
  res.status(201).json(success({ message: msg }, 'Sent'))
}

// ── Interviews ───────────────────────────────────────────────────────────────

export async function listInterviews(req: Request, res: Response) {
  const interviews = await InterviewModel.find({ employer_id: req.user!.id }).sort({ scheduled_at: 1 }).lean()
  res.json(success({ interviews }, 'OK'))
}

export async function createInterview(req: Request, res: Response) {
  const interview = await InterviewModel.create({ ...req.body, employer_id: req.user!.id })
  res.status(201).json(success({ interview }, 'Created'))
}

export async function getInterview(req: Request, res: Response) {
  const interview = await InterviewModel.findOne({ _id: req.params.id, employer_id: req.user!.id }).lean()
  if (!interview) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ interview }, 'OK'))
}

export async function patchInterview(req: Request, res: Response) {
  const interview = await InterviewModel.findOneAndUpdate(
    { _id: req.params.id, employer_id: req.user!.id },
    { $set: req.body },
    { new: true },
  )
  if (!interview) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ interview }, 'Updated'))
}

export async function cancelInterview(req: Request, res: Response) {
  await InterviewModel.findOneAndUpdate(
    { _id: req.params.id, employer_id: req.user!.id },
    { $set: { status: 'cancelled' } },
  )
  res.json(success({}, 'Cancelled'))
}

// ── Hired Workers ─────────────────────────────────────────────────────────────

export async function listHiredWorkers(req: Request, res: Response) {
  const myShifts = await ShiftModel.find({ employer_id: req.user!.id }).select('_id').lean()
  const shiftIds = myShifts.map((s) => s._id)
  const applications = await ShiftApplicationModel.find({ shift_id: { $in: shiftIds }, status: 'confirmed' }).lean()
  const profileIds = [...new Set(applications.map((a) => a.worker_profile_id))]
  const profiles = await WorkerProfileModel.find({ _id: { $in: profileIds } }).lean()
  res.json(success({ workers: profiles }, 'OK'))
}

export async function getHiredWorker(req: Request, res: Response) {
  const profile = await WorkerProfileModel.findOne({ user_id: req.params.id }).lean()
  if (!profile) { res.status(404).json(error('Not found', [])); return }
  const tasks = await TaskModel.find({ employer_id: req.user!.id, worker_id: req.params.id }).lean()
  const badges = await UserBadgeModel.find({ worker_id: req.params.id }).lean()
  const kpis = await KpiModel.find({ employer_id: req.user!.id, worker_id: req.params.id }).lean()
  res.json(success({ profile, tasks, badges, kpis }, 'OK'))
}

export async function rateWorker(req: Request, res: Response) {
  const { rating, comment } = req.body as { rating: number; comment: string }
  res.json(success({ rating, comment }, 'Rating submitted'))
}

export async function giveFeedback(_req: Request, res: Response) {
  res.json(success({}, 'Feedback submitted'))
}

export async function awardBadge(req: Request, res: Response) {
  const { badge_id, reason } = req.body
  const badge = await BadgeModel.findById(badge_id)
  if (!badge) { res.status(404).json(error('Badge not found', [])); return }
  const awarded = await UserBadgeModel.create({
    worker_id: req.params.id,
    badge_id,
    awarded_by: req.user!.id,
    reason,
  })
  res.status(201).json(success({ awarded }, 'Badge awarded'))
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function listTasks(req: Request, res: Response) {
  const { worker_id, status, page = '1', limit = '20' } = req.query as Record<string, string>
  const pg = Math.max(1, parseInt(page))
  const lm = Math.min(100, Math.max(1, parseInt(limit)))
  const filter: Record<string, unknown> = { employer_id: req.user!.id }
  if (worker_id) filter.worker_id = worker_id
  if (status) filter.status = status
  const tasks = await TaskModel.find(filter).sort({ created_at: -1 }).skip((pg - 1) * lm).limit(lm).lean()
  const total = await TaskModel.countDocuments(filter)
  res.json(paginated(tasks, total, pg, lm, 'Tasks'))
}

export async function createTask(req: Request, res: Response) {
  const task = await TaskModel.create({ ...req.body, employer_id: req.user!.id })
  res.status(201).json(success({ task }, 'Created'))
}

export async function getTask(req: Request, res: Response) {
  const task = await TaskModel.findOne({ _id: req.params.id, employer_id: req.user!.id }).lean()
  if (!task) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ task }, 'OK'))
}

export async function patchTask(req: Request, res: Response) {
  const task = await TaskModel.findOneAndUpdate(
    { _id: req.params.id, employer_id: req.user!.id },
    { $set: req.body },
    { new: true },
  )
  if (!task) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ task }, 'Updated'))
}

export async function deleteTask(req: Request, res: Response) {
  await TaskModel.deleteOne({ _id: req.params.id, employer_id: req.user!.id })
  res.json(success({}, 'Deleted'))
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

export async function listKpis(req: Request, res: Response) {
  const kpis = await KpiModel.find({ employer_id: req.user!.id }).lean()
  res.json(success({ kpis }, 'OK'))
}

export async function getWorkerKpis(req: Request, res: Response) {
  const kpis = await KpiModel.find({ employer_id: req.user!.id, worker_id: req.params.workerId }).lean()
  res.json(success({ kpis }, 'OK'))
}

// ── Wallet ───────────────────────────────────────────────────────────────────

export async function getWallet(req: Request, res: Response) {
  let wallet = await WalletModel.findOne({ user_id: req.user!.id })
  if (!wallet) wallet = await WalletModel.create({ user_id: req.user!.id, role: 'employer' })
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

export async function payWorker(req: Request, res: Response) {
  const { worker_id, amount, description, reference_id, reference_type } = req.body

  let empWallet = await WalletModel.findOne({ user_id: req.user!.id })
  if (!empWallet) empWallet = await WalletModel.create({ user_id: req.user!.id, role: 'employer' })
  if (empWallet.balance < amount) { res.status(400).json(error('Insufficient balance', [])); return }

  let workerWallet = await WalletModel.findOne({ user_id: worker_id })
  if (!workerWallet) workerWallet = await WalletModel.create({ user_id: worker_id, role: 'worker' })

  const newEmpBalance = empWallet.balance - amount
  const newWorkerBalance = workerWallet.balance + amount

  await WalletModel.updateOne({ _id: empWallet._id }, { $inc: { balance: -amount, total_spent: amount } })
  await WalletModel.updateOne({ _id: workerWallet._id }, { $inc: { balance: amount, total_earned: amount } })

  await TransactionModel.create({
    wallet_id: empWallet._id, user_id: req.user!.id,
    type: 'debit', category: 'payment', amount, currency: empWallet.currency,
    balance_after: newEmpBalance, reference_id, reference_type, description,
  })
  await TransactionModel.create({
    wallet_id: workerWallet._id, user_id: worker_id,
    type: 'credit', category: 'payment', amount, currency: workerWallet.currency,
    balance_after: newWorkerBalance, reference_id, reference_type, description,
  })

  res.json(success({ amount, worker_id }, 'Payment processed'))
}

// ── Shifts ───────────────────────────────────────────────────────────────────

export async function listMyShifts(req: Request, res: Response) {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>
  const pg = Math.max(1, parseInt(page))
  const lm = Math.min(100, Math.max(1, parseInt(limit)))
  const filter: Record<string, unknown> = { employer_id: req.user!.id }
  if (status) filter.status = status
  const shifts = await ShiftModel.find(filter).sort({ date: -1 }).skip((pg - 1) * lm).limit(lm).lean()
  const total = await ShiftModel.countDocuments(filter)
  res.json(paginated(shifts, total, pg, lm, 'Shifts'))
}

export async function createShift(req: Request, res: Response) {
  const profile = await EmployerProfileModel.findOne({ user_id: req.user!.id })
  if (!profile) { res.status(400).json(error('Complete your profile first', [])); return }
  const shift = await ShiftModel.create({ ...req.body, employer_id: req.user!.id })
  res.status(201).json(success({ shift }, 'Created'))
}

export async function getShift(req: Request, res: Response) {
  const shift = await ShiftModel.findOne({ _id: req.params.id, employer_id: req.user!.id }).lean()
  if (!shift) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ shift }, 'OK'))
}

export async function patchShift(req: Request, res: Response) {
  const shift = await ShiftModel.findOneAndUpdate(
    { _id: req.params.id, employer_id: req.user!.id },
    { $set: req.body },
    { new: true },
  )
  if (!shift) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ shift }, 'Updated'))
}

export async function listShiftApplications(req: Request, res: Response) {
  const shift = await ShiftModel.findOne({ _id: req.params.id, employer_id: req.user!.id })
  if (!shift) { res.status(404).json(error('Not found', [])); return }
  const apps = await ShiftApplicationModel.find({ shift_id: req.params.id }).lean()
  res.json(success({ applications: apps }, 'OK'))
}

export async function reviewApplication(req: Request, res: Response) {
  const { status } = req.body
  const validStatuses = ['applied', 'confirmed', 'rejected', 'completed', 'cancelled']
  if (!validStatuses.includes(status)) { res.status(400).json(error('Invalid status', [])); return }
  const app = await ShiftApplicationModel.findOneAndUpdate(
    { _id: req.params.appId, shift_id: req.params.id },
    { $set: { status } },
    { new: true },
  )
  if (!app) { res.status(404).json(error('Not found', [])); return }
  res.json(success({ application: app }, 'Updated'))
}
