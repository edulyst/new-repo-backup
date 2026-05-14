import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const messageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `msg_${nanoid(20)}` },
    conversation_id: { type: String, required: true, index: true },
    sender_id: { type: String, required: true },
    sender_role: { type: String, enum: ['employer', 'worker'], required: true },
    body: { type: String, required: true },
    read_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

export type MessageDoc = mongoose.InferSchemaType<typeof messageSchema> & { _id: string }
export const MessageModel = mongoose.model('Message', messageSchema)
