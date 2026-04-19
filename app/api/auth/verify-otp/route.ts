import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { User } from "@/lib/db/models"
import { isOTPExpired, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/auth"
import { hashForSearch } from "@/lib/encryption"
import { verifyOTPSchema } from "@/lib/validations/auth"
import { sendWelcomeEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = verifyOTPSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, otp } = validationResult.data

    await connectToDatabase()

    // Find user
    const emailHash = await hashForSearch(email.toLowerCase())
    const user = await User.findOne({ emailHash })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Verify OTP
    if (!user.otpCode || user.otpCode !== otp) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      )
    }

    // Check if OTP is expired
    if (user.otpCreatedAt && isOTPExpired(user.otpCreatedAt)) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Clear OTP
    user.otpCode = undefined
    user.otpCreatedAt = undefined

    // Create tokens
    const accessToken = await createAccessToken({
      userId: user._id.toString(),
      email: email,
      mfaVerified: true,
    })

    const refreshToken = await createRefreshToken({
      userId: user._id.toString(),
      email: email,
    })

    // Store refresh token
    const deviceInfo = request.headers.get("user-agent") || "Unknown"
    user.refreshTokens.push({
      token: refreshToken,
      deviceInfo,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    user.lastLogin = new Date()
    user.cleanExpiredTokens()
    
    // Check if this is first login (send welcome email)
    const isFirstLogin = !user.profile.onboardingComplete
    
    await user.save()
    await setAuthCookies(accessToken, refreshToken)

    // Send welcome email on first verification
    if (isFirstLogin) {
      await sendWelcomeEmail(email)
    }

    return NextResponse.json({
      message: "Verification successful",
      user: {
        id: user._id.toString(),
        onboardingComplete: user.profile.onboardingComplete,
      },
    })
  } catch (error) {
    console.error("OTP verification error:", error)
    return NextResponse.json(
      { error: "An error occurred during verification" },
      { status: 500 }
    )
  }
}
