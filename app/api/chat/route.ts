import { NextRequest, NextResponse } from "next/server"
import { getAuthTokens, verifyAccessToken } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db/mongodb"
import { Cycle, DailyLog } from "@/lib/db/models"
import { decrypt } from "@/lib/encryption"
import { detectIrregularities, predictNextCycle, type CycleData } from "@/lib/ml/cycle-predictor"
import { calculatePCOSRisk, type CycleHistoryItem, type SymptomHistory } from "@/lib/ml/pcos-risk"
import { z } from "zod"

const requestSchema = z.object({
  message: z.string().trim().min(1).max(500),
})

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
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid message" },
        { status: 400 }
      )
    }

    await connectToDatabase()

    const [cycles, logs] = await Promise.all([
      Cycle.find({ userId: payload.userId }).sort({ createdAt: -1 }).limit(12).lean(),
      DailyLog.find({ userId: payload.userId }).sort({ createdAt: -1 }).limit(30).lean(),
    ])

    const cycleData: CycleData[] = await Promise.all(
      cycles.map(async (cycle) => ({
        startDate: new Date(await decrypt(cycle.startDate)),
        cycleLength: cycle.cycleLength || 28,
        periodLength: cycle.periodLength || 5,
      }))
    )

    const cycleHistory: CycleHistoryItem[] = cycles.map((cycle) => ({
      cycleLength: cycle.cycleLength || 28,
      periodLength: cycle.periodLength || 5,
      flow: cycle.flow || "medium",
    }))

    const recentLogs = await Promise.all(
      logs.map(async (log) => ({
        date: await decrypt(log.date),
        isPeriodDay: Boolean(log.isPeriodDay),
        flow: log.flow,
        symptoms: log.symptoms ? (JSON.parse(await decrypt(log.symptoms)) as string[]) : [],
        mood: log.mood ? (JSON.parse(await decrypt(log.mood)) as string[]) : [],
        sleepQuality: log.sleepQuality,
        energyLevel: log.energyLevel,
      }))
    )

    const symptomCounts: SymptomHistory = {
      acne: 0,
      fatigue: 0,
      bloating: 0,
      cravings: 0,
      hot_flashes: 0,
    }

    for (const log of recentLogs) {
      if (log.symptoms.includes("acne")) symptomCounts.acne++
      if (log.symptoms.includes("fatigue")) symptomCounts.fatigue++
      if (log.symptoms.includes("bloating")) symptomCounts.bloating++
      if (log.symptoms.includes("cravings")) symptomCounts.cravings++
      if (log.symptoms.includes("hot_flashes")) symptomCounts.hot_flashes++
    }

    const totalLogs = Math.max(recentLogs.length, 1)
    const normalizedSymptoms: SymptomHistory = {
      acne: Math.min(10, Math.round((symptomCounts.acne / totalLogs) * 30)),
      fatigue: Math.min(10, Math.round((symptomCounts.fatigue / totalLogs) * 30)),
      bloating: Math.min(10, Math.round((symptomCounts.bloating / totalLogs) * 30)),
      cravings: Math.min(10, Math.round((symptomCounts.cravings / totalLogs) * 30)),
      hot_flashes: Math.min(10, Math.round((symptomCounts.hot_flashes / totalLogs) * 30)),
    }

    const prediction = cycleData.length ? predictNextCycle(cycleData) : null
    const irregularities = cycleData.length ? detectIrregularities(cycleData) : []
    const pcosRisk = cycleHistory.length >= 3 ? calculatePCOSRisk(cycleHistory, normalizedSymptoms) : null

    const reply = buildChatReply(parsed.data.message, {
      recentLogs,
      prediction,
      irregularities,
      pcosRisk,
    })

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json({ error: "Failed to generate chat response" }, { status: 500 })
  }
}

type ChatContext = {
  recentLogs: Array<{
    date: string
    isPeriodDay: boolean
    flow?: "light" | "medium" | "heavy" | "spotting"
    symptoms: string[]
    mood: string[]
    sleepQuality?: number
    energyLevel?: number
  }>
  prediction: ReturnType<typeof predictNextCycle>
  irregularities: string[]
  pcosRisk: ReturnType<typeof calculatePCOSRisk> | null
}

function buildChatReply(message: string, context: ChatContext) {
  const lowerMessage = message.toLowerCase()
  const { recentLogs, prediction, irregularities, pcosRisk } = context

  const averageSleep = average(recentLogs.map((log) => log.sleepQuality).filter(isNumber))
  const averageEnergy = average(recentLogs.map((log) => log.energyLevel).filter(isNumber))
  const frequentSymptoms = topItems(recentLogs.flatMap((log) => log.symptoms))
  const frequentMoods = topItems(recentLogs.flatMap((log) => log.mood))
  const periodDaysLogged = recentLogs.filter((log) => log.isPeriodDay).length

  if (lowerMessage.includes("period") || lowerMessage.includes("next cycle")) {
    if (!prediction) {
      return "I need a bit more cycle history before I can estimate your next period. Log a few cycles first, then I can give a much better answer."
    }

    return [
      `Based on your recent cycle history, your next period is estimated to start on ${formatDate(prediction.nextPeriodStart)} and last about ${prediction.predictedPeriodLength} days.`,
      `Your current prediction confidence is ${prediction.confidence}%.`,
      irregularities.length ? `I also noticed: ${irregularities.join("; ")}.` : "Your recent cycle pattern looks fairly stable from the data I can see.",
      "This is a tracker-based estimate, not a medical diagnosis.",
    ].join(" ")
  }

  if (lowerMessage.includes("ovulation") || lowerMessage.includes("fertile") || lowerMessage.includes("fertility")) {
    if (!prediction) {
      return "I do not have enough cycle data yet to estimate ovulation or fertile days. Once you log more cycles, I can help with that."
    }

    return `Your estimated ovulation date is ${formatDate(prediction.ovulationDate)}, with a likely fertility window from ${formatDate(prediction.fertilityWindow.start)} to ${formatDate(prediction.fertilityWindow.end)}. Treat this as a planning estimate rather than something exact.`
  }

  if (lowerMessage.includes("pcos") || lowerMessage.includes("risk")) {
    if (!pcosRisk) {
      return "I need at least 3 logged cycles before I can give a useful PCOS risk summary. Keep logging, and I will be able to show a better trend-based assessment."
    }

    return [
      `Your current PCOS risk score is ${pcosRisk.score}/100, which falls in the ${pcosRisk.level} range.`,
      pcosRisk.recommendations.length ? `Top recommendation: ${pcosRisk.recommendations[0]}.` : "",
      pcosRisk.disclaimer,
    ].filter(Boolean).join(" ")
  }

  if (lowerMessage.includes("symptom") || lowerMessage.includes("mood") || lowerMessage.includes("feeling")) {
    const symptomText = frequentSymptoms.length ? `Most frequent symptoms in your recent logs: ${frequentSymptoms.join(", ")}.` : "I do not see enough symptom history yet."
    const moodText = frequentMoods.length ? `Common moods logged: ${frequentMoods.join(", ")}.` : ""
    return [symptomText, moodText].filter(Boolean).join(" ")
  }

  if (lowerMessage.includes("sleep") || lowerMessage.includes("energy") || lowerMessage.includes("tired") || lowerMessage.includes("fatigue")) {
    const sleepText = averageSleep ? `Your average logged sleep quality is ${averageSleep.toFixed(1)}/5.` : "I do not have enough sleep-quality logs yet."
    const energyText = averageEnergy ? `Your average logged energy level is ${averageEnergy.toFixed(1)}/5.` : "I do not have enough energy-level logs yet."
    const symptomText = frequentSymptoms.includes("fatigue") ? "Fatigue is showing up repeatedly in your recent logs too." : ""
    return [sleepText, energyText, symptomText].filter(Boolean).join(" ")
  }

  return [
    "I can help with next period estimates, ovulation timing, symptom patterns, sleep and energy trends, and PCOS risk summaries.",
    prediction ? `Right now I estimate your next period around ${formatDate(prediction.nextPeriodStart)}.` : "I do not have enough cycle history yet for a prediction.",
    periodDaysLogged ? `You have ${periodDaysLogged} recent period-day log entries in your history.` : "I am not seeing recent period-day entries yet.",
  ].join(" ")
}

function average(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function topItems(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([value]) => value.replaceAll("_", " "))
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isNumber(value: number | undefined): value is number {
  return typeof value === "number"
}
