import mongoose, { Schema, Document, Types } from "mongoose"

export type FlowLevel = "light" | "medium" | "heavy" | "spotting"

export interface ICycle extends Document {
  userId: Types.ObjectId
  startDate: string // Encrypted
  endDate?: string // Encrypted
  cycleLength?: number
  periodLength?: number
  flow: FlowLevel
  isActive: boolean // Currently in period
  createdAt: Date
  updatedAt: Date
}

const cycleSchema = new Schema<ICycle>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: String,
    cycleLength: Number,
    periodLength: Number,
    flow: {
      type: String,
      enum: ["light", "medium", "heavy", "spotting"],
      default: "medium",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for efficient querying
cycleSchema.index({ userId: 1, createdAt: -1 })

export const Cycle = mongoose.models.Cycle || mongoose.model<ICycle>("Cycle", cycleSchema)
