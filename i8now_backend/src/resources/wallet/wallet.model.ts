import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const walletSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `wlt_${nanoid(20)}` },
    user_id: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ['worker', 'employer'], required: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    total_earned: { type: Number, default: 0 },
    total_spent: { type: Number, default: 0 },
    is_frozen: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

export type WalletDoc = mongoose.InferSchemaType<typeof walletSchema> & { _id: string }
export const WalletModel = mongoose.model('Wallet', walletSchema)
