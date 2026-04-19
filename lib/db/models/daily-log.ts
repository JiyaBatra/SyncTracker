import mongoose, { Schema, Document, Types } from "mongoose"

export const SYMPTOMS = [
  "cramps",
  "headache",
  "bloating",
  "breast_tenderness",
  "fatigue",
  "acne",
  "backache",
  "nausea",
  "dizziness",
  "insomnia",
  "hot_flashes",
  "cravings",
] as const

export const MOODS = [
  "happy",
  "calm",
  "neutral",
  "sad",
  "anxious",
  "irritable",
  "energetic",
  "tired",
  "stressed",
  "emotional",
] as const

export type Symptom = (typeof SYMPTOMS)[number]
export type Mood = (typeof MOODS)[number]

export interface IDailyLog extends Document {
  userId: Types.ObjectId
  cycleId?: Types.ObjectId
  date: string // Encrypted date string
  dateHash: string // For searching
  isPeriodDay: boolean
  flow?: "light" | "medium" | "heavy" | "spotting"
  symptoms: string // Encrypted JSON array
  mood: string // Encrypted JSON array
  sleepQuality?: number // 1-5
  energyLevel?: number // 1-5
  notes?: string // Encrypted
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
    cycleId: {
      type: Schema.Types.ObjectId,
      ref: "Cycle",
    },
    date: {
      type: String,
      required: true,
    },
    dateHash: {
      type: String,
      required: true,
      index: true,
    },
    isPeriodDay: {
      type: Boolean,
      default: false,
    },
    flow: {
      type: String,
      enum: ["light", "medium", "heavy", "spotting"],
    },
    symptoms: {
      type: String, // Encrypted JSON
      default: "[]",
    },
    mood: {
      type: String, // Encrypted JSON
      default: "[]",
    },
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

// Compound index for efficient user+date lookups
dailyLogSchema.index({ userId: 1, dateHash: 1 }, { unique: true })

export const DailyLog = mongoose.models.DailyLog || mongoose.model<IDailyLog>("DailyLog", dailyLogSchema)
