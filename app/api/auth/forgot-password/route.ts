import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { User } from "@/lib/db/models"
import { generateOTP } from "@/lib/auth"
import { hashForSearch } from "@/lib/encryption"
import { forgotPasswordSchema } from "@/lib/validations/auth"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validationResult = forgotPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    await connectToDatabase()

    const emailHash = await hashForSearch(email.toLowerCase())
    const user = await User.findOne({ emailHash })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a reset code has been sent.",
      })
    }

    // Generate OTP
    const otp = generateOTP()
    user.otpCode = otp
    user.otpCreatedAt = new Date()
    await user.save()

    // Send reset email
    await sendPasswordResetEmail(email, otp)

    return NextResponse.json({
      message: "If an account exists, a reset code has been sent.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    )
  }
}
