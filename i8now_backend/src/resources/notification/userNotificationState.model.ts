import { Schema, model, type Document } from 'mongoose'

export interface IUserNotificationState extends Document {
  user_id: string
  notification_id: string
  hidden_at: Date
}

const userNotificationStateSchema = new Schema<IUserNotificationState>(
  {
    user_id: { type: String, required: true, index: true },
    notification_id: { type: String, required: true, index: true },
    hidden_at: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'user_notification_states' },
)

userNotificationStateSchema.index({ user_id: 1, notification_id: 1 }, { unique: true })

export const UserNotificationState = model<IUserNotificationState>(
  'UserNotificationState',
  userNotificationStateSchema,
)

