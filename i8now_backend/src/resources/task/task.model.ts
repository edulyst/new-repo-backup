import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const taskSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `tsk_${nanoid(20)}` },
    employer_id: { type: String, required: true, index: true },
    worker_id: { type: String, required: true, index: true },
    shift_id: { type: String, default: null },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'review', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    due_date: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    worker_notes: { type: String, default: '' },
    employer_notes: { type: String, default: '' },
    attachments: [{ url: String, name: String }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

export type TaskDoc = mongoose.InferSchemaType<typeof taskSchema> & { _id: string }
export const TaskModel = mongoose.model('Task', taskSchema)
