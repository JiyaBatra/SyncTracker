import mongoose, { Document, Schema, Types } from "mongoose"

export const SYMPTOMS = [
  "acne",
  "bloating",
  "cravings",
  "cramps",
  "fatigue",
  "headache",
  "hot_flashes",
  "nausea",
] as const

export const MOODS = [
  "anxious",
  "calm",
  "emotional",
  "happy",
  "irritable",
  "low",
] as const

export type Symptom = (typeof SYMPTOMS)[number]
export type Mood = (typeof MOODS)[number]

export interface IDailyLog extends Document {
  userId: Types.ObjectId
  date: string
  dateHash: string
  isPeriodDay?: boolean
  flow?: "light" | "medium" | "heavy" | "spotting"
  symptoms?: string
  mood?: string
  sleepQuality?: number
  energyLevel?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const dailyLogSchema = new Schema<IDailyLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
    },
    dateHash: {
      type: String,
      required: true,
    },
    isPeriodDay: Boolean,
    flow: {
      type: String,
      enum: ["light", "medium", "heavy", "spotting"],
    },
    symptoms: String,
    mood: String,
    sleepQuality: {
      type: Number,
      min: 1,
      max: 5,
    },
    energyLevel: {
      type: Number,
      min: 1,
      max: 5,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
)

dailyLogSchema.index({ userId: 1, dateHash: 1 }, { unique: true })
dailyLogSchema.index({ userId: 1, createdAt: -1 })

export const DailyLog =
  mongoose.models.DailyLog || mongoose.model<IDailyLog>("DailyLog", dailyLogSchema)
