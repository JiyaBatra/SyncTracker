import mongoose, { Schema, Document } from "mongoose"

export interface IUser extends Document {
  email: string
  emailHash: string // For searching encrypted emails
  passwordHash: string
  salt: string
  mfaEnabled: boolean
  otpCode?: string
  otpCreatedAt?: Date
  createdAt: Date
  lastLogin: Date
  profile: {
    name?: string
    birthDate?: string // Encrypted
    averageCycleLength: number
    averagePeriodLength: number
    onboardingComplete: boolean
  }
  refreshTokens: Array<{
    token: string
    deviceInfo: string
    createdAt: Date
    expiresAt: Date
  }>
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
    },
    emailHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    mfaEnabled: {
      type: Boolean,
      default: true, // MFA enabled by default for health data
    },
    otpCode: String,
    otpCreatedAt: Date,
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    profile: {
      name: String,
      birthDate: String,
      averageCycleLength: {
        type: Number,
        default: 28,
      },
      averagePeriodLength: {
        type: Number,
        default: 5,
      },
      onboardingComplete: {
        type: Boolean,
        default: false,
      },
    },
    refreshTokens: [
      {
        token: String,
        deviceInfo: String,
        createdAt: Date,
        expiresAt: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
)

// Clean up expired refresh tokens periodically
userSchema.methods.cleanExpiredTokens = function () {
  const now = new Date()
  this.refreshTokens = this.refreshTokens.filter(
    (rt: { expiresAt: Date }) => rt.expiresAt > now
  )
}

export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema)
