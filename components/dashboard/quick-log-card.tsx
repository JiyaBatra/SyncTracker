"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { PenLine, Droplets, Smile, Frown, Meh, Moon, Zap } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const quickSymptoms = [
  { id: "cramps", label: "Cramps", icon: "🤕" },
  { id: "headache", label: "Headache", icon: "🤯" },
  { id: "bloating", label: "Bloating", icon: "😤" },
  { id: "fatigue", label: "Fatigue", icon: "😴" },
]

const quickMoods = [
  { id: "happy", label: "Happy", icon: Smile },
  { id: "neutral", label: "Neutral", icon: Meh },
  { id: "sad", label: "Sad", icon: Frown },
]

interface QuickLogCardProps {
  onLogPeriod?: () => void
  isInPeriod?: boolean
}

export function QuickLogCard({ onLogPeriod, isInPeriod }: QuickLogCardProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [isLogging, setIsLogging] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId)
        ? prev.filter((s) => s !== symptomId)
        : [...prev, symptomId]
    )
  }

  const selectMood = (moodId: string) => {
    setSelectedMood(selectedMood === moodId ? null : moodId)
  }

  const handleQuickLog = async () => {
    if (selectedSymptoms.length === 0 && !selectedMood) return
    
    setIsLogging(true)
    
    try {
      const today = new Date().toISOString().split("T")[0]
      
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          symptoms: selectedSymptoms,
          mood: selectedMood ? [selectedMood] : [],
        }),
      })
      
      setShowSuccess(true)
      setSelectedSymptoms([])
      setSelectedMood(null)
      
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error("Quick log error:", error)
    } finally {
      setIsLogging(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Quick Log
          </span>
          <Link href="/dashboard/log">
            <Button variant="ghost" size="sm">
              Full Log
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Period toggle */}
        <div>
          <Button
            variant={isInPeriod ? "default" : "outline"}
            onClick={onLogPeriod}
            className="w-full gap-2"
          >
            <Droplets className="h-4 w-4" />
            {isInPeriod ? "Period in Progress" : "Log Period Start"}
          </Button>
        </div>

        {/* Quick symptoms */}
        <div>
          <p className="mb-2 text-sm font-medium">How are you feeling?</p>
          <div className="flex flex-wrap gap-2">
            {quickSymptoms.map((symptom) => (
              <Button
                key={symptom.id}
                variant={selectedSymptoms.includes(symptom.id) ? "secondary" : "outline"}
                size="sm"
                onClick={() => toggleSymptom(symptom.id)}
                className="gap-1"
              >
                <span>{symptom.icon}</span>
                {symptom.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Quick mood */}
        <div>
          <p className="mb-2 text-sm font-medium">Mood</p>
          <div className="flex gap-2">
            {quickMoods.map((mood) => {
              const Icon = mood.icon
              return (
                <Button
                  key={mood.id}
                  variant={selectedMood === mood.id ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => selectMood(mood.id)}
                  className="flex-1 gap-1"
                >
                  <Icon className="h-4 w-4" />
                  {mood.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Save button */}
        {(selectedSymptoms.length > 0 || selectedMood) && (
          <Button
            onClick={handleQuickLog}
            disabled={isLogging}
            className="w-full"
          >
            {isLogging ? (
              <Spinner className="h-4 w-4" />
            ) : showSuccess ? (
              "Logged!"
            ) : (
              "Save Quick Log"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
