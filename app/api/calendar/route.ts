import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Cycle, DailyLog, User } from "@/lib/db/models"
import { getAuthTokens, verifyAccessToken } from "@/lib/auth"
import { decrypt } from "@/lib/encryption"

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

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

    await connectToDatabase()

    // Get user for averages
    const user = await User.findById(payload.userId).lean()
    const avgCycleLength = user?.profile.averageCycleLength || 28
    const avgPeriodLength = user?.profile.averagePeriodLength || 5

    // Get cycles that might affect this month
    const cycles = await Cycle.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean()

    // Decrypt cycles
    const decryptedCycles = await Promise.all(
      cycles.map(async (cycle) => ({
        startDate: await decrypt(cycle.startDate),
        endDate: cycle.endDate ? await decrypt(cycle.endDate) : null,
        periodLength: cycle.periodLength || avgPeriodLength,
      }))
    )

    // Get logs for this month (with some buffer)
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0)
    
    // We need to check all logs since we can't query by encrypted date
    // In production, you'd want a more efficient approach
    const allLogs = await DailyLog.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    // Filter and decrypt logs for this month
    const monthLogs = []
    for (const log of allLogs) {
      try {
        const dateStr = await decrypt(log.date)
        const date = new Date(dateStr)
        
        // Check if log is in the requested month (with buffer for display)
        const bufferStart = new Date(startOfMonth)
        bufferStart.setDate(bufferStart.getDate() - 7)
        const bufferEnd = new Date(endOfMonth)
        bufferEnd.setDate(bufferEnd.getDate() + 7)
        
        if (date >= bufferStart && date <= bufferEnd) {
          const symptoms = log.symptoms ? JSON.parse(await decrypt(log.symptoms)) : []
          const mood = log.mood ? JSON.parse(await decrypt(log.mood)) : []
          
          monthLogs.push({
            date: dateStr,
            isPeriodDay: log.isPeriodDay,
            symptoms,
            mood,
          })
        }
      } catch {
        // Skip logs that can't be decrypted
        continue
      }
    }

    // Calculate predictions based on most recent cycle
    let predictions = null
    if (decryptedCycles.length > 0) {
      const latestCycle = decryptedCycles[0]
      const lastPeriodStart = new Date(latestCycle.startDate)
      
      // Calculate next period
      const nextPeriodStart = new Date(lastPeriodStart)
      nextPeriodStart.setDate(nextPeriodStart.getDate() + avgCycleLength)
      
      // If next period is in the past, calculate the current/upcoming one
      const today = new Date()
      while (nextPeriodStart < today) {
        nextPeriodStart.setDate(nextPeriodStart.getDate() + avgCycleLength)
      }
      
      const nextPeriodEnd = new Date(nextPeriodStart)
      nextPeriodEnd.setDate(nextPeriodEnd.getDate() + avgPeriodLength - 1)
      
      // Calculate ovulation (typically 14 days before next period)
      const ovulationDate = new Date(nextPeriodStart)
      ovulationDate.setDate(ovulationDate.getDate() - 14)
      
      // Fertility window: 5 days before ovulation to 1 day after
      const fertilityWindowStart = new Date(ovulationDate)
      fertilityWindowStart.setDate(fertilityWindowStart.getDate() - 5)
      const fertilityWindowEnd = new Date(ovulationDate)
      fertilityWindowEnd.setDate(fertilityWindowEnd.getDate() + 1)
      
      predictions = {
        nextPeriodStart: nextPeriodStart.toISOString().split("T")[0],
        nextPeriodEnd: nextPeriodEnd.toISOString().split("T")[0],
        ovulationDate: ovulationDate.toISOString().split("T")[0],
        fertilityWindowStart: fertilityWindowStart.toISOString().split("T")[0],
        fertilityWindowEnd: fertilityWindowEnd.toISOString().split("T")[0],
      }
    }

    return NextResponse.json({
      cycles: decryptedCycles,
      logs: monthLogs,
      predictions,
      averages: {
        cycleLength: avgCycleLength,
        periodLength: avgPeriodLength,
      },
    })
  } catch (error) {
    console.error("Calendar data error:", error)
    return NextResponse.json({ error: "Failed to get calendar data" }, { status: 500 })
  }
}
