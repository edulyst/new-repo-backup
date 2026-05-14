import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const interviewSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `intv_${nanoid(20)}` },
    employer_id: { type: String, required: true, index: true },
    worker_id: { type: String, required: true, index: true },
    shift_id: { type: String, default: null },
    title: { type: String, required: true },
    scheduled_at: { type: Date, required: true },
    duration_min: { type: Number, default: 30 },
    mode: { type: String, enum: ['video', 'phone', 'in_person'], default: 'video' },
    meeting_link: { type: String, default: '' },
    location: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
      index: true,
    },
    outcome: { type: String, enum: ['hired', 'rejected', 'pending', null], default: null },
    feedback: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

export type InterviewDoc = mongoose.InferSchemaType<typeof interviewSchema> & { _id: string }
export const InterviewModel = mongoose.model('Interview', interviewSchema)
