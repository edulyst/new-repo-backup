import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const shortlistSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `sl_${nanoid(20)}` },
    employer_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    candidate_ids: [{ type: String }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

export type ShortlistDoc = mongoose.InferSchemaType<typeof shortlistSchema> & { _id: string }
export const ShortlistModel = mongoose.model('Shortlist', shortlistSchema)
