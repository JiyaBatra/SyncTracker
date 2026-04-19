import mongoose, { Schema, Document, Types } from "mongoose"

export interface IPrediction extends Document {
  userId: Types.ObjectId
  predictedStartDate: Date
  predictedEndDate: Date
  predictedOvulation: Date
  fertilityWindow: {
    start: Date
    end: Date
  }
  confidence: number // 0-100
  irregularityFlags: string[]
  pcosRiskScore: number // 0-100
  pcosFactors: {
    irregularCycles: number
    longCycles: number
    missedPeriods: number
    symptomScore: number
    bleedingPattern: number
  }
  generatedAt: Date
  isLatest: boolean
}

const predictionSchema = new Schema<IPrediction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    predictedStartDate: {
      type: Date,
      required: true,
    },
    predictedEndDate: {
      type: Date,
      required: true,
    },
    predictedOvulation: {
      type: Date,
      required: true,
    },
    fertilityWindow: {
      start: Date,
      end: Date,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 70,
    },
    irregularityFlags: [String],
    pcosRiskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    pcosFactors: {
      irregularCycles: { type: Number, default: 0 },
      longCycles: { type: Number, default: 0 },
      missedPeriods: { type: Number, default: 0 },
      symptomScore: { type: Number, default: 0 },
      bleedingPattern: { type: Number, default: 0 },
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    isLatest: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Ensure only one "latest" prediction per user
predictionSchema.index({ userId: 1, isLatest: 1 })

export const Prediction = mongoose.models.Prediction || mongoose.model<IPrediction>("Prediction", predictionSchema)
