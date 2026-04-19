import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { User } from "@/lib/db/models"
import { hashPassword, generateOTP } from "@/lib/auth"
import { encrypt, hashForSearch } from "@/lib/encryption"
import { registerSchema } from "@/lib/validations/auth"
import { sendOTPEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password, name } = validationResult.data

    await connectToDatabase()

    // Check if user already exists (using email hash for lookup)
    const emailHash = await hashForSearch(email.toLowerCase())
    const existingUser = await User.findOne({ emailHash })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Generate salt for this user
    const salt = crypto.randomBytes(16).toString("hex")

    // Hash password
    const passwordHash = await hashPassword(password)

    // Encrypt sensitive data
    const encryptedEmail = await encrypt(email.toLowerCase())
    const encryptedName = name ? await encrypt(name) : undefined

    // Generate OTP for email verification
    const otp = generateOTP()

    // Create user
    const user = new User({
      email: encryptedEmail,
      emailHash,
      passwordHash,
      salt,
      mfaEnabled: true,
      otpCode: otp,
      otpCreatedAt: new Date(),
      profile: {
        name: encryptedName,
        onboardingComplete: false,
      },
    })

    await user.save()

    // Send OTP email
    await sendOTPEmail(email, otp, name)

    return NextResponse.json({
      message: "Registration successful. Please check your email for verification code.",
      email: email, // Return plain email for OTP verification page
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    )
  }
}
