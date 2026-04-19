import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Cycle, DailyLog, Prediction, User } from "@/lib/db/models"
import { getAuthTokens, verifyAccessToken } from "@/lib/auth"
import { decrypt } from "@/lib/encryption"
import { predictNextCycle, detectIrregularities, type CycleData } from "@/lib/ml/cycle-predictor"
import { calculatePCOSRisk, type CycleHistoryItem, type SymptomHistory } from "@/lib/ml/pcos-risk"

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

    // Get user's cycles
    const cycles = await Cycle.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean()

    if (cycles.length === 0) {
      return NextResponse.json({
        prediction: null,
        pcosRisk: null,
        message: "No cycle data available for predictions",
      })
    }

    // Decrypt and format cycle data
    const cycleData: CycleData[] = await Promise.all(
      cycles.map(async (cycle) => ({
        startDate: new Date(await decrypt(cycle.startDate)),
        cycleLength: cycle.cycleLength || 28,
        periodLength: cycle.periodLength || 5,
      }))
    )

    // Get prediction
    const prediction = predictNextCycle(cycleData)
    const irregularities = detectIrregularities(cycleData)

    // Get symptom history for PCOS assessment
    const logs = await DailyLog.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(90) // Last ~3 months
      .lean()

    // Count symptom frequencies
    const symptomCounts: SymptomHistory = {
      acne: 0,
      fatigue: 0,
      bloating: 0,
      cravings: 0,
      hot_flashes: 0,
    }

    for (const log of logs) {
      try {
        const symptomsStr = log.symptoms
        if (symptomsStr) {
          const symptoms = JSON.parse(await decrypt(symptomsStr))
          if (symptoms.includes("acne")) symptomCounts.acne++
          if (symptoms.includes("fatigue")) symptomCounts.fatigue++
          if (symptoms.includes("bloating")) symptomCounts.bloating++
          if (symptoms.includes("cravings")) symptomCounts.cravings++
          if (symptoms.includes("hot_flashes")) symptomCounts.hot_flashes++
        }
      } catch {
        continue
      }
    }

    // Normalize symptom counts to 0-10 scale
    const logCount = Math.max(logs.length, 1)
    const normalizedSymptoms: SymptomHistory = {
      acne: Math.min(10, Math.round((symptomCounts.acne / logCount) * 30)),
      fatigue: Math.min(10, Math.round((symptomCounts.fatigue / logCount) * 30)),
      bloating: Math.min(10, Math.round((symptomCounts.bloating / logCount) * 30)),
      cravings: Math.min(10, Math.round((symptomCounts.cravings / logCount) * 30)),
      hot_flashes: Math.min(10, Math.round((symptomCounts.hot_flashes / logCount) * 30)),
    }

    // Calculate PCOS risk
    const cycleHistory: CycleHistoryItem[] = cycles.map((cycle) => ({
      cycleLength: cycle.cycleLength || 28,
      periodLength: cycle.periodLength || 5,
      flow: cycle.flow || "medium",
    }))

    const pcosRisk = calculatePCOSRisk(cycleHistory, normalizedSymptoms)

    // Save prediction to database
    if (prediction) {
      // Mark existing predictions as not latest
      await Prediction.updateMany(
        { userId: payload.userId, isLatest: true },
        { $set: { isLatest: false } }
      )

      await Prediction.create({
        userId: payload.userId,
        predictedStartDate: prediction.nextPeriodStart,
        predictedEndDate: prediction.nextPeriodEnd,
        predictedOvulation: prediction.ovulationDate,
        fertilityWindow: prediction.fertilityWindow,
        confidence: prediction.confidence,
        irregularityFlags: irregularities,
        pcosRiskScore: pcosRisk.score,
        pcosFactors: pcosRisk.factors,
        isLatest: true,
      })
    }

    return NextResponse.json({
      prediction: prediction ? {
        nextPeriodStart: prediction.nextPeriodStart.toISOString(),
        nextPeriodEnd: prediction.nextPeriodEnd.toISOString(),
        ovulationDate: prediction.ovulationDate.toISOString(),
        fertilityWindow: {
          start: prediction.fertilityWindow.start.toISOString(),
          end: prediction.fertilityWindow.end.toISOString(),
        },
        confidence: prediction.confidence,
        predictedCycleLength: prediction.predictedCycleLength,
        predictedPeriodLength: prediction.predictedPeriodLength,
      } : null,
      irregularities,
      pcosRisk: {
        score: pcosRisk.score,
        level: pcosRisk.level,
        factors: pcosRisk.factors,
        recommendations: pcosRisk.recommendations,
        disclaimer: pcosRisk.disclaimer,
      },
    })
  } catch (error) {
    console.error("Predictions error:", error)
    return NextResponse.json({ error: "Failed to generate predictions" }, { status: 500 })
  }
}
