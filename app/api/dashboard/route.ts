import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Cycle, DailyLog, Prediction, User } from "@/lib/db/models"
import { getAuthTokens, verifyAccessToken } from "@/lib/auth"
import { decrypt } from "@/lib/encryption"
import { calculateCycleInfo, type CycleInfo } from "@/lib/cycle/utils"

export async function GET() {
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

    // Get user profile
    const user = await User.findById(payload.userId).lean()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get most recent cycle
    const latestCycle = await Cycle.findOne({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .lean()

    let cycleInfo: CycleInfo | null = null
    
    if (latestCycle) {
      const startDate = new Date(await decrypt(latestCycle.startDate))
      cycleInfo = calculateCycleInfo(
        startDate,
        user.profile.averageCycleLength || 28,
        user.profile.averagePeriodLength || 5
      )
    } else {
      // No cycles yet, provide default info
      const today = new Date()
      cycleInfo = {
        phase: "follicular",
        dayOfCycle: 1,
        daysUntilNextPeriod: user.profile.averageCycleLength || 28,
        isInPeriod: false,
        periodStartDate: null,
        periodEndDate: null,
        ovulationDate: null,
        fertilityWindowStart: null,
        fertilityWindowEnd: null,
        nextPeriodDate: new Date(today.getTime() + (user.profile.averageCycleLength || 28) * 24 * 60 * 60 * 1000),
      }
    }

    // Get latest prediction
    const prediction = await Prediction.findOne({ 
      userId: payload.userId, 
      isLatest: true 
    }).lean()

    // Get recent logs (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentLogs = await DailyLog.find({
      userId: payload.userId,
      createdAt: { $gte: sevenDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(7)
      .lean()

    // Decrypt recent logs
    const decryptedLogs = await Promise.all(
      recentLogs.map(async (log) => {
        const date = await decrypt(log.date)
        const symptoms = log.symptoms ? JSON.parse(await decrypt(log.symptoms)) : []
        const mood = log.mood ? JSON.parse(await decrypt(log.mood)) : []
        
        return {
          date,
          isPeriodDay: log.isPeriodDay,
          flow: log.flow,
          symptoms,
          mood,
          sleepQuality: log.sleepQuality,
          energyLevel: log.energyLevel,
        }
      })
    )

    // Get cycle history for stats
    const cycles = await Cycle.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean()

    const decryptedCycles = await Promise.all(
      cycles.map(async (cycle) => ({
        startDate: await decrypt(cycle.startDate),
        endDate: cycle.endDate ? await decrypt(cycle.endDate) : null,
        cycleLength: cycle.cycleLength,
        periodLength: cycle.periodLength,
      }))
    )

    return NextResponse.json({
      cycleInfo,
      prediction: prediction ? {
        nextPeriod: prediction.predictedStartDate,
        ovulation: prediction.predictedOvulation,
        fertilityWindow: prediction.fertilityWindow,
        confidence: prediction.confidence,
        pcosRiskScore: prediction.pcosRiskScore,
        irregularityFlags: prediction.irregularityFlags,
      } : null,
      recentLogs: decryptedLogs,
      cycles: decryptedCycles,
      averages: {
        cycleLength: user.profile.averageCycleLength,
        periodLength: user.profile.averagePeriodLength,
      },
    })
  } catch (error) {
    console.error("Dashboard data error:", error)
    return NextResponse.json({ error: "Failed to get dashboard data" }, { status: 500 })
  }
}
