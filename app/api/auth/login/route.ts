import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { User } from "@/lib/db/models"
import { verifyPassword, generateOTP, createAccessToken, createRefreshToken, setAuthCookies } from "@/lib/auth"
import { hashForSearch } from "@/lib/encryption"
import { loginSchema } from "@/lib/validations/auth"
import { sendOTPEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password } = validationResult.data

    await connectToDatabase()

    // Find user by email hash
    const emailHash = await hashForSearch(email.toLowerCase())
    const user = await User.findOne({ emailHash })

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // If MFA is enabled, send OTP
    if (user.mfaEnabled) {
      const otp = generateOTP()
      user.otpCode = otp
      user.otpCreatedAt = new Date()
      await user.save()

      await sendOTPEmail(email, otp)

      return NextResponse.json({
        message: "Verification code sent to your email",
        requiresOTP: true,
        email: email,
      })
    }

    // If MFA not enabled, create session directly
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
    await user.save()

    await setAuthCookies(accessToken, refreshToken)

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user._id.toString(),
        onboardingComplete: user.profile.onboardingComplete,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    )
  }
}
