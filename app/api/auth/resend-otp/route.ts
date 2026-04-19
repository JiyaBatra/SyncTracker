import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { User } from "@/lib/db/models"
import { generateOTP } from "@/lib/auth"
import { hashForSearch } from "@/lib/encryption"
import { sendOTPEmail } from "@/lib/email"
import { z } from "zod"

const resendSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validationResult = resendSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    await connectToDatabase()

    const emailHash = await hashForSearch(email.toLowerCase())
    const user = await User.findOne({ emailHash })

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({
        message: "If an account exists, a verification code has been sent.",
      })
    }

    // Rate limit: only allow resend after 60 seconds
    if (user.otpCreatedAt) {
      const timeSinceLastOTP = Date.now() - user.otpCreatedAt.getTime()
      if (timeSinceLastOTP < 60000) {
        const secondsRemaining = Math.ceil((60000 - timeSinceLastOTP) / 1000)
        return NextResponse.json(
          { error: `Please wait ${secondsRemaining} seconds before requesting a new code` },
          { status: 429 }
        )
      }
    }

    const otp = generateOTP()
    user.otpCode = otp
    user.otpCreatedAt = new Date()
    await user.save()

    await sendOTPEmail(email, otp)

    return NextResponse.json({
      message: "Verification code sent",
    })
  } catch (error) {
    console.error("Resend OTP error:", error)
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    )
  }
}
