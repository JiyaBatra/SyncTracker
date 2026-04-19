import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { DailyLog } from "@/lib/db/models"
import { getAuthTokens, verifyAccessToken } from "@/lib/auth"
import { encrypt, decrypt, hashForSearch } from "@/lib/encryption"
import { z } from "zod"

const logSchema = z.object({
  date: z.string(),
  isPeriodDay: z.boolean().optional(),
  flow: z.enum(["light", "medium", "heavy", "spotting"]).optional(),
  symptoms: z.array(z.string()).optional(),
  mood: z.array(z.string()).optional(),
  sleepQuality: z.number().min(1).max(5).optional(),
  energyLevel: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
})

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
    const date = searchParams.get("date")

    await connectToDatabase()

    if (date) {
      // Get specific day's log
      const dateHash = await hashForSearch(date)
      const log = await DailyLog.findOne({ 
        userId: payload.userId, 
        dateHash 
      }).lean()

      if (!log) {
        return NextResponse.json({ log: null })
      }

      // Decrypt log data
      const decryptedLog = {
        date: await decrypt(log.date),
        isPeriodDay: log.isPeriodDay,
        flow: log.flow,
        symptoms: log.symptoms ? JSON.parse(await decrypt(log.symptoms)) : [],
        mood: log.mood ? JSON.parse(await decrypt(log.mood)) : [],
        sleepQuality: log.sleepQuality,
        energyLevel: log.energyLevel,
        notes: log.notes ? await decrypt(log.notes) : null,
      }

      return NextResponse.json({ log: decryptedLog })
    }

    // Get recent logs
    const logs = await DailyLog.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()

    const decryptedLogs = await Promise.all(
      logs.map(async (log) => ({
        date: await decrypt(log.date),
        isPeriodDay: log.isPeriodDay,
        flow: log.flow,
        symptoms: log.symptoms ? JSON.parse(await decrypt(log.symptoms)) : [],
        mood: log.mood ? JSON.parse(await decrypt(log.mood)) : [],
        sleepQuality: log.sleepQuality,
        energyLevel: log.energyLevel,
      }))
    )

    return NextResponse.json({ logs: decryptedLogs })
  } catch (error) {
    console.error("Get logs error:", error)
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 })
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
    
    const validationResult = logSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { date, isPeriodDay, flow, symptoms, mood, sleepQuality, energyLevel, notes } = validationResult.data

    await connectToDatabase()

    // Hash date for lookup
    const dateHash = await hashForSearch(date)

    // Encrypt data
    const encryptedDate = await encrypt(date)
    const encryptedSymptoms = symptoms?.length ? await encrypt(JSON.stringify(symptoms)) : undefined
    const encryptedMood = mood?.length ? await encrypt(JSON.stringify(mood)) : undefined
    const encryptedNotes = notes ? await encrypt(notes) : undefined

    // Upsert log
    const updateData: Record<string, unknown> = {
      userId: payload.userId,
      date: encryptedDate,
      dateHash,
    }

    if (isPeriodDay !== undefined) updateData.isPeriodDay = isPeriodDay
    if (flow) updateData.flow = flow
    if (encryptedSymptoms) updateData.symptoms = encryptedSymptoms
    if (encryptedMood) updateData.mood = encryptedMood
    if (sleepQuality) updateData.sleepQuality = sleepQuality
    if (energyLevel) updateData.energyLevel = energyLevel
    if (encryptedNotes) updateData.notes = encryptedNotes

    await DailyLog.findOneAndUpdate(
      { userId: payload.userId, dateHash },
      { $set: updateData },
      { upsert: true, new: true }
    )

    return NextResponse.json({ message: "Log saved" })
  } catch (error) {
    console.error("Save log error:", error)
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 })
  }
}
