import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const kpiSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `kpi_${nanoid(20)}` },
    employer_id: { type: String, required: true, index: true },
    worker_id: { type: String, required: true, index: true },
    period: { type: String, required: true },
    tasks_assigned: { type: Number, default: 0 },
    tasks_completed: { type: Number, default: 0 },
    tasks_on_time: { type: Number, default: 0 },
    attendance_rate: { type: Number, default: 0 },
    quality_score: { type: Number, default: 0 },
    engagement_score: { type: Number, default: 0 },
    overall_score: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

export type KpiDoc = mongoose.InferSchemaType<typeof kpiSchema> & { _id: string }
export const KpiModel = mongoose.model('Kpi', kpiSchema)
