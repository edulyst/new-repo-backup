import mongoose from 'mongoose'
import { nanoid } from 'nanoid'

const transactionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => `txn_${nanoid(20)}` },
    wallet_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    category: {
      type: String,
      enum: ['payment', 'refund', 'withdrawal', 'deposit', 'bonus', 'penalty', 'fee'],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    balance_after: { type: Number, required: true },
    reference_id: { type: String, default: null },
    reference_type: { type: String, enum: ['shift', 'task', 'interview', 'manual', null], default: null },
    description: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'reversed'], default: 'completed' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
)

export type TransactionDoc = mongoose.InferSchemaType<typeof transactionSchema> & { _id: string }
export const TransactionModel = mongoose.model('Transaction', transactionSchema)
