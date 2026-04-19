"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import {
  Droplets,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Moon,
  Zap,
} from "lucide-react"
import { SYMPTOMS, MOODS } from "@/lib/db/models/daily-log"
import { formatDateLong } from "@/lib/cycle/utils"

const flowLevels = [
  { id: "spotting", label: "Spotting", intensity: 1 },
  { id: "light", label: "Light", intensity: 2 },
  { id: "medium", label: "Medium", intensity: 3 },
  { id: "heavy", label: "Heavy", intensity: 4 },
] as const

const symptomLabels: Record<string, string> = {
  cramps: "Cramps",
  headache: "Headache",
  bloating: "Bloating",
  breast_tenderness: "Breast Tenderness",
  fatigue: "Fatigue",
  acne: "Acne",
  backache: "Backache",
  nausea: "Nausea",
  dizziness: "Dizziness",
  insomnia: "Insomnia",
  hot_flashes: "Hot Flashes",
  cravings: "Cravings",
}

const moodLabels: Record<string, string> = {
  happy: "Happy",
  calm: "Calm",
  neutral: "Neutral",
  sad: "Sad",
  anxious: "Anxious",
  irritable: "Irritable",
  energetic: "Energetic",
  tired: "Tired",
  stressed: "Stressed",
  emotional: "Emotional",
}

function LogContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const dateParam = searchParams.get("date")

  const [selectedDate, setSelectedDate] = useState(() => {
    if (dateParam) return new Date(dateParam)
    return new Date()
  })
  const [isPeriodDay, setIsPeriodDay] = useState(false)
  const [flow, setFlow] = useState<string | null>(null)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [sleepQuality, setSleepQuality] = useState<number>(3)
  const [energyLevel, setEnergyLevel] = useState<number>(3)
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const dateStr = selectedDate.toISOString().split("T")[0]

  useEffect(() => {
    fetchLogForDate()
  }, [dateStr])

  const fetchLogForDate = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/logs?date=${dateStr}`)
      if (!response.ok) throw new Error("Failed to load log")
      
      const data = await response.json()
      
      if (data.log) {
        setIsPeriodDay(data.log.isPeriodDay || false)
        setFlow(data.log.flow || null)
        setSelectedSymptoms(data.log.symptoms || [])
        setSelectedMoods(data.log.mood || [])
        setSleepQuality(data.log.sleepQuality || 3)
        setEnergyLevel(data.log.energyLevel || 3)
        setNotes(data.log.notes || "")
      } else {
        // Reset form for new date
        setIsPeriodDay(false)
        setFlow(null)
        setSelectedSymptoms([])
        setSelectedMoods([])
        setSleepQuality(3)
        setEnergyLevel(3)
        setNotes("")
      }
    } catch (err) {
      console.error(err)
      setError("Failed to load existing log")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    
    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          isPeriodDay,
          flow: isPeriodDay ? flow : null,
          symptoms: selectedSymptoms,
          mood: selectedMoods,
          sleepQuality,
          energyLevel,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to save")
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      setError("Failed to save log")
    } finally {
      setIsSaving(false)
    }
  }

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
    router.push(`/dashboard/log?date=${newDate.toISOString().split("T")[0]}`)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    if (newDate <= new Date()) {
      setSelectedDate(newDate)
      router.push(`/dashboard/log?date=${newDate.toISOString().split("T")[0]}`)
    }
  }

  const goToToday = () => {
    const today = new Date()
    setSelectedDate(today)
    router.push(`/dashboard/log?date=${today.toISOString().split("T")[0]}`)
  }

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    )
  }

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood)
        ? prev.filter((m) => m !== mood)
        : [...prev, mood]
    )
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()
  const isFuture = selectedDate > new Date()

  return (
    <div className="mx-auto max-w-2xl">
      {/* Date Navigation */}
      <Card className="mb-4">
        <CardContent className="flex items-center justify-between py-4">
          <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold">{formatDateLong(selectedDate)}</h2>
            {!isToday && (
              <Button variant="link" size="sm" onClick={goToToday} className="text-primary">
                Go to Today
              </Button>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDay}
            disabled={isFuture || isToday}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 text-green-700">
              <Check className="h-4 w-4" />
              <AlertDescription>Log saved successfully!</AlertDescription>
            </Alert>
          )}

          {/* Period Toggle */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Droplets className="h-5 w-5 text-period" />
                Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <Button
                  variant={isPeriodDay ? "default" : "outline"}
                  onClick={() => setIsPeriodDay(!isPeriodDay)}
                  className="w-full"
                >
                  {isPeriodDay ? "Period Day" : "No Period"}
                </Button>

                {isPeriodDay && (
                  <div>
                    <Label className="mb-2 block">Flow</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {flowLevels.map((level) => (
                        <Button
                          key={level.id}
                          variant={flow === level.id ? "secondary" : "outline"}
                          onClick={() => setFlow(level.id)}
                          className="flex flex-col gap-1 h-auto py-3"
                        >
                          <div className="flex gap-0.5">
                            {Array.from({ length: level.intensity }).map((_, i) => (
                              <Droplets key={i} className="h-3 w-3 text-period" />
                            ))}
                          </div>
                          <span className="text-xs">{level.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Symptoms */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Symptoms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS.map((symptom) => (
                  <Button
                    key={symptom}
                    variant={selectedSymptoms.includes(symptom) ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleSymptom(symptom)}
                  >
                    {symptomLabels[symptom] || symptom}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mood */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Mood</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((mood) => (
                  <Button
                    key={mood}
                    variant={selectedMoods.includes(mood) ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleMood(mood)}
                  >
                    {moodLabels[mood] || mood}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sleep & Energy */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Wellness</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Sleep Quality
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {sleepQuality}/5
                  </span>
                </div>
                <Slider
                  value={[sleepQuality]}
                  onValueChange={([value]) => setSleepQuality(value)}
                  min={1}
                  max={5}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Energy Level
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {energyLevel}/5
                  </span>
                </div>
                <Slider
                  value={[energyLevel]}
                  onValueChange={([value]) => setEnergyLevel(value)}
                  min={1}
                  max={5}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            className="w-full"
          >
            {isSaving ? <Spinner className="h-4 w-4" /> : "Save Log"}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function LogPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    }>
      <LogContent />
    </Suspense>
  )
}
