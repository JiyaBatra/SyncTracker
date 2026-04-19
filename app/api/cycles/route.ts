import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Cycle, User } from "@/lib/db/models"
import { getAuthTokens, verifyAccessToken } from "@/lib/auth"
import { encrypt, decrypt } from "@/lib/encryption"

export async function GET(request: NextRequest) {
  try {
    const { accessToken } = await getAuthTokens()
    
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const payload = await verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await connectToDatabase()

    // Get query params for pagination/filtering
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "12")
    
    const cycles = await Cycle.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    // Decrypt cycle data
    const decryptedCycles = await Promise.all(
      cycles.map(async (cycle) => {
        const startDate = await decrypt(cycle.startDate)
        const endDate = cycle.endDate ? await decrypt(cycle.endDate) : null
        
        return {
          id: cycle._id.toString(),
          startDate,
          endDate,
          cycleLength: cycle.cycleLength,
          periodLength: cycle.periodLength,
          flow: cycle.flow,
          isActive: cycle.isActive,
        }
      })
    )

    return NextResponse.json({ cycles: decryptedCycles })
  } catch (error) {
    console.error("Get cycles error:", error)
    return NextResponse.json({ error: "Failed to get cycles" }, { status: 500 })
  }
}

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
    const { startDate, endDate, flow } = body

    await connectToDatabase()

    // Mark any existing active cycle as complete
    await Cycle.updateMany(
      { userId: payload.userId, isActive: true },
      { $set: { isActive: false } }
    )

    // Calculate cycle length if we have a previous cycle
    const previousCycle = await Cycle.findOne({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .lean()

    let cycleLength: number | undefined
    if (previousCycle) {
      const prevStartDate = new Date(await decrypt(previousCycle.startDate))
      const newStartDate = new Date(startDate)
      cycleLength = Math.floor(
        (newStartDate.getTime() - prevStartDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      // Update previous cycle's cycleLength
      await Cycle.findByIdAndUpdate(previousCycle._id, { cycleLength })
    }

    // Get user's average period length
    const user = await User.findById(payload.userId)
    const avgPeriodLength = user?.profile.averagePeriodLength || 5

    // Encrypt dates
    const encryptedStartDate = await encrypt(startDate)
    const encryptedEndDate = endDate ? await encrypt(endDate) : undefined

    // Create new cycle
    const cycle = await Cycle.create({
      userId: payload.userId,
      startDate: encryptedStartDate,
      endDate: encryptedEndDate,
      periodLength: endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : avgPeriodLength,
      flow: flow || "medium",
      isActive: !endDate,
    })

    // Update user's average cycle length
    if (cycleLength && cycleLength >= 21 && cycleLength <= 45) {
      const allCycles = await Cycle.find({ 
        userId: payload.userId, 
        cycleLength: { $gte: 21, $lte: 45 } 
      }).lean()
      
      if (allCycles.length > 0) {
        const avgCycleLength = Math.round(
          allCycles.reduce((sum, c) => sum + (c.cycleLength || 28), 0) / allCycles.length
        )
        await User.findByIdAndUpdate(payload.userId, {
          "profile.averageCycleLength": avgCycleLength,
        })
      }
    }

    return NextResponse.json({
      message: "Cycle created",
      cycle: {
        id: cycle._id.toString(),
        startDate,
        endDate,
        flow: cycle.flow,
        isActive: cycle.isActive,
      },
    })
  } catch (error) {
    console.error("Create cycle error:", error)
    return NextResponse.json({ error: "Failed to create cycle" }, { status: 500 })
  }
}
