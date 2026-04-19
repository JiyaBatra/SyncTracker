"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/context"
import { CyclePhaseCard } from "@/components/dashboard/cycle-phase-card"
import { CountdownCard } from "@/components/dashboard/countdown-card"
import { MiniCalendar } from "@/components/dashboard/mini-calendar"
import { QuickLogCard } from "@/components/dashboard/quick-log-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle, TrendingUp, Activity } from "lucide-react"
import type { CycleInfo, CyclePhase } from "@/lib/cycle/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface DashboardData {
  cycleInfo: CycleInfo & { phase: CyclePhase }
  prediction: {
    pcosRiskScore: number
    irregularityFlags: string[]
  } | null
  recentLogs: Array<{
    date: string
    isPeriodDay: boolean
    symptoms: string[]
    mood: string[]
  }>
  cycles: Array<{
    startDate: string
    cycleLength: number | null
  }>
  averages: {
    cycleLength: number
    periodLength: number
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard")
      if (!response.ok) throw new Error("Failed to load dashboard")
      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (err) {
      setError("Failed to load dashboard data")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogPeriod = async () => {
    try {
      const today = new Date().toISOString().split("T")[0]
      await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: today }),
      })
      // Refresh data
      fetchDashboardData()
    } catch (err) {
      console.error("Failed to log period:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || "Failed to load dashboard"}</AlertDescription>
      </Alert>
    )
  }

  // Parse dates for calendar
  const periodDays = data.recentLogs
    .filter((log) => log.isPeriodDay)
    .map((log) => new Date(log.date))

  const loggedDays = data.recentLogs.map((log) => new Date(log.date))

  // Generate predicted period days (next period)
  const predictedPeriodDays: Date[] = []
  if (data.cycleInfo.nextPeriodDate) {
    const startDate = new Date(data.cycleInfo.nextPeriodDate)
    for (let i = 0; i < data.averages.periodLength; i++) {
      const day = new Date(startDate)
      day.setDate(day.getDate() + i)
      predictedPeriodDays.push(day)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-balance">
          Hello{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-muted-foreground">
          {"Here's"} your cycle overview for today
        </p>
      </div>

      {/* Main grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Cycle Phase Card */}
        <div className="md:col-span-2 lg:col-span-1">
          <CyclePhaseCard
            phase={data.cycleInfo.phase}
            dayOfCycle={data.cycleInfo.dayOfCycle}
            cycleLength={data.averages.cycleLength}
          />
        </div>

        {/* Countdown Card */}
        <CountdownCard
          daysUntilNextPeriod={data.cycleInfo.daysUntilNextPeriod}
          nextPeriodDate={new Date(data.cycleInfo.nextPeriodDate)}
          ovulationDate={data.cycleInfo.ovulationDate ? new Date(data.cycleInfo.ovulationDate) : null}
          isInPeriod={data.cycleInfo.isInPeriod}
        />

        {/* Quick Log */}
        <QuickLogCard
          onLogPeriod={handleLogPeriod}
          isInPeriod={data.cycleInfo.isInPeriod}
        />

        {/* Mini Calendar */}
        <div className="md:col-span-2">
          <MiniCalendar
            periodDays={periodDays}
            predictedPeriodDays={predictedPeriodDays}
            ovulationDate={data.cycleInfo.ovulationDate ? new Date(data.cycleInfo.ovulationDate) : null}
            fertilityWindowStart={data.cycleInfo.fertilityWindowStart ? new Date(data.cycleInfo.fertilityWindowStart) : null}
            fertilityWindowEnd={data.cycleInfo.fertilityWindowEnd ? new Date(data.cycleInfo.fertilityWindowEnd) : null}
            loggedDays={loggedDays}
          />
        </div>

        {/* PCOS Risk Indicator */}
        {data.prediction && data.prediction.pcosRiskScore > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Health Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">PCOS Risk Assessment</span>
                    <span className={`text-sm font-medium ${
                      data.prediction.pcosRiskScore < 30 
                        ? "text-green-600" 
                        : data.prediction.pcosRiskScore < 60 
                        ? "text-yellow-600" 
                        : "text-red-600"
                    }`}>
                      {data.prediction.pcosRiskScore < 30 
                        ? "Low" 
                        : data.prediction.pcosRiskScore < 60 
                        ? "Moderate" 
                        : "Elevated"}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all ${
                        data.prediction.pcosRiskScore < 30 
                          ? "bg-green-500" 
                          : data.prediction.pcosRiskScore < 60 
                          ? "bg-yellow-500" 
                          : "bg-red-500"
                      }`}
                      style={{ width: `${data.prediction.pcosRiskScore}%` }}
                    />
                  </div>
                </div>
                
                {data.prediction.irregularityFlags.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Observations:</p>
                    <ul className="list-disc list-inside">
                      {data.prediction.irregularityFlags.slice(0, 3).map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <Link href="/dashboard/insights">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View Full Insights
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cycle Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Your Averages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {data.averages.cycleLength}
                </p>
                <p className="text-sm text-muted-foreground">Cycle Length</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {data.averages.periodLength}
                </p>
                <p className="text-sm text-muted-foreground">Period Length</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Based on your logged cycles
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
