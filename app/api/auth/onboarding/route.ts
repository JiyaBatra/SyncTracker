import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { User, Cycle } from "@/lib/db/models"
import { getAuthTokens, verifyAccessToken } from "@/lib/auth"
import { encrypt } from "@/lib/encryption"
import { onboardingSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await getAuthTokens()
    
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const payload = await verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    
    const validationResult = onboardingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { averageCycleLength, averagePeriodLength, lastPeriodDate } = validationResult.data

    await connectToDatabase()

    // Update user profile
    const updateData: Record<string, unknown> = {
      "profile.averageCycleLength": averageCycleLength,
      "profile.averagePeriodLength": averagePeriodLength,
      "profile.onboardingComplete": true,
    }

    await User.findByIdAndUpdate(payload.userId, { $set: updateData })

    // If last period date provided, create initial cycle entry
    if (lastPeriodDate) {
      const encryptedDate = await encrypt(lastPeriodDate)
      
      // Calculate estimated end date
      const startDate = new Date(lastPeriodDate)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + averagePeriodLength)
      const encryptedEndDate = await encrypt(endDate.toISOString().split("T")[0])

      // Check if we're still in the period
      const today = new Date()
      const isActive = today <= endDate

      await Cycle.create({
        userId: payload.userId,
        startDate: encryptedDate,
        endDate: encryptedEndDate,
        cycleLength: averageCycleLength,
        periodLength: averagePeriodLength,
        flow: "medium",
        isActive,
      })
    }

    return NextResponse.json({
      message: "Onboarding complete",
    })
  } catch (error) {
    console.error("Onboarding error:", error)
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    )
  }
}
