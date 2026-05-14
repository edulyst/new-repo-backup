import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const conversationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `conv_${nanoid(20)}` },
    employer_id: { type: String, required: true, index: true },
    worker_id: { type: String, required: true, index: true },
    last_message: { type: String, default: '' },
    last_message_at: { type: Date, default: null },
    unread_employer: { type: Number, default: 0 },
    unread_worker: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

conversationSchema.index({ employer_id: 1, worker_id: 1 }, { unique: true })

export type ConversationDoc = mongoose.InferSchemaType<typeof conversationSchema> & { _id: string }
export const ConversationModel = mongoose.model('Conversation', conversationSchema)
