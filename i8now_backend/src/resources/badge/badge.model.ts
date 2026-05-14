import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const badgeSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `bdg_${nanoid(20)}` },
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    icon: { type: String, default: '🏅' },
    category: {
      type: String,
      enum: ['performance', 'attendance', 'milestone', 'skill', 'special'],
      default: 'performance',
    },
    criteria: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

export type BadgeDoc = mongoose.InferSchemaType<typeof badgeSchema> & { _id: string }
export const BadgeModel = mongoose.model('Badge', badgeSchema)

const userBadgeSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `ubdg_${nanoid(20)}` },
    worker_id: { type: String, required: true, index: true },
    badge_id: { type: String, required: true },
    awarded_by: { type: String, required: true },
    reason: { type: String, default: '' },
    awarded_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

export type UserBadgeDoc = mongoose.InferSchemaType<typeof userBadgeSchema> & { _id: string }
export const UserBadgeModel = mongoose.model('UserBadge', userBadgeSchema)
