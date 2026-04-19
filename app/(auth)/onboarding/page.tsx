"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Calendar, Heart, Shield, AlertCircle } from "lucide-react"

const steps = [
  {
    id: "welcome",
    icon: Heart,
    title: "Welcome to CycleSync",
    description: "Let's personalize your experience with a few quick questions about your cycle.",
  },
  {
    id: "cycle",
    icon: Calendar,
    title: "Your cycle details",
    description: "This helps us predict your periods more accurately.",
  },
  {
    id: "privacy",
    icon: Shield,
    title: "Your privacy matters",
    description: "Your health data is encrypted and only you can access it.",
  },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [cycleLength, setCycleLength] = useState("28")
  const [periodLength, setPeriodLength] = useState("5")
  const [lastPeriodDate, setLastPeriodDate] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { refreshUser } = useAuth()
  const router = useRouter()

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          averageCycleLength: parseInt(cycleLength),
          averagePeriodLength: parseInt(periodLength),
          lastPeriodDate: lastPeriodDate || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      await refreshUser()
      router.push("/dashboard")
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const StepIcon = steps[currentStep].icon

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <StepIcon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
        <CardDescription>{steps[currentStep].description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {currentStep === 0 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-secondary/50 p-4">
              <h4 className="font-medium">What CycleSync offers:</h4>
              <ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Accurate period predictions
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Symptom and mood tracking
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  PCOS risk insights
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  AI-powered health assistant
                </li>
              </ul>
            </div>
            <Button onClick={handleNext} className="w-full">
              Get Started
            </Button>
          </div>
        )}

        {currentStep === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cycleLength">Average cycle length (days)</Label>
              <Input
                id="cycleLength"
                type="number"
                min="21"
                max="45"
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                placeholder="28"
              />
              <p className="text-xs text-muted-foreground">
                Typical range: 21-35 days. Not sure? 28 is a good default.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="periodLength">Average period length (days)</Label>
              <Input
                id="periodLength"
                type="number"
                min="2"
                max="10"
                value={periodLength}
                onChange={(e) => setPeriodLength(e.target.value)}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">
                Typical range: 3-7 days.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="lastPeriod">When did your last period start?</Label>
              <Input
                id="lastPeriod"
                type="date"
                value={lastPeriodDate}
                onChange={(e) => setLastPeriodDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground">
                Optional, but helps with initial predictions.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-secondary/50 p-4">
              <ul className="flex flex-col gap-3 text-sm">
                <li className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-4 w-4 text-primary" />
                  <span>All health data is encrypted using AES-256 encryption</span>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-4 w-4 text-primary" />
                  <span>Your data never leaves your control</span>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-4 w-4 text-primary" />
                  <span>Two-factor authentication protects your account</span>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-4 w-4 text-primary" />
                  <span>You can export or delete your data anytime</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handleComplete} className="flex-1" disabled={isLoading}>
                {isLoading ? <Spinner className="h-4 w-4" /> : "Start Tracking"}
              </Button>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="mt-6 flex justify-center gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentStep ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
