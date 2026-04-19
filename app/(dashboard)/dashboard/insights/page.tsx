"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  Info,
  RefreshCw,
  TrendingUp,
} from "lucide-react"
import { getRiskLevelDescription } from "@/lib/ml/pcos-risk"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

interface InsightsData {
  prediction: {
    nextPeriodStart: string
    nextPeriodEnd: string
    ovulationDate: string
    fertilityWindow: {
      start: string
      end: string
    }
    confidence: number
    predictedCycleLength: number
    predictedPeriodLength: number
  } | null
  irregularities: string[]
  pcosRisk: {
    score: number
    level: "low" | "moderate" | "elevated"
    factors: {
      irregularCycles: number
      longCycles: number
      missedPeriods: number
      symptomScore: number
      bleedingPattern: number
    }
    recommendations: string[]
    disclaimer: string
  }
}

interface CycleHistory {
  cycles: Array<{
    startDate: string
    cycleLength: number | null
    periodLength: number
  }>
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [cycleHistory, setCycleHistory] = useState<CycleHistory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInsights()
    fetchCycleHistory()
  }, [])

  const fetchInsights = async () => {
    try {
      const response = await fetch("/api/predictions")
      if (!response.ok) throw new Error("Failed to load insights")
      const insightsData = await response.json()
      setData(insightsData)
    } catch (err) {
      setError("Failed to load insights")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCycleHistory = async () => {
    try {
      const response = await fetch("/api/cycles?limit=12")
      if (response.ok) {
        const historyData = await response.json()
        setCycleHistory(historyData)
      }
    } catch (err) {
      console.error("Failed to fetch cycle history:", err)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchInsights()
    await fetchCycleHistory()
    setIsRefreshing(false)
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
        <AlertDescription>{error || "Failed to load insights"}</AlertDescription>
      </Alert>
    )
  }

  // Prepare chart data
  const chartData = cycleHistory?.cycles
    .filter((c) => c.cycleLength && c.cycleLength > 0)
    .map((cycle, index) => ({
      name: `Cycle ${cycleHistory.cycles.length - index}`,
      length: cycle.cycleLength,
      period: cycle.periodLength,
    }))
    .reverse() || []

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "text-green-600"
      case "moderate": return "text-yellow-600"
      case "elevated": return "text-red-600"
      default: return "text-muted-foreground"
    }
  }

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case "low": return "bg-green-500"
      case "moderate": return "bg-yellow-500"
      case "elevated": return "bg-red-500"
      default: return "bg-muted"
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Health Insights</h1>
          <p className="text-muted-foreground">AI-powered analysis of your cycle patterns</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Prediction Summary */}
        {data.prediction && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Cycle Predictions
              </CardTitle>
              <CardDescription>
                Based on your {chartData.length} logged cycles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-secondary/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Next Period</p>
                  <p className="text-lg font-semibold">
                    {new Date(data.prediction.nextPeriodStart).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Ovulation</p>
                  <p className="text-lg font-semibold">
                    {new Date(data.prediction.ovulationDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Avg Cycle</p>
                  <p className="text-lg font-semibold">
                    {data.prediction.predictedCycleLength} days
                  </p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-lg font-semibold">{data.prediction.confidence}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cycle Length Trend */}
        {chartData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Cycle Length Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      domain={["dataMin - 2", "dataMax + 2"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="length"
                      name="Cycle Length"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PCOS Risk Assessment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              PCOS Risk Assessment
            </CardTitle>
            <CardDescription>
              Based on cycle patterns and symptoms
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Risk Score */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-32 w-32">
                <svg className="h-full w-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="12"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke={
                      data.pcosRisk.level === "low"
                        ? "#22c55e"
                        : data.pcosRisk.level === "moderate"
                        ? "#eab308"
                        : "#ef4444"
                    }
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(data.pcosRisk.score / 100) * 352} 352`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{data.pcosRisk.score}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="text-center">
                <p className={`text-lg font-semibold capitalize ${getRiskColor(data.pcosRisk.level)}`}>
                  {data.pcosRisk.level} Risk
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  {getRiskLevelDescription(data.pcosRisk.level)}
                </p>
              </div>
            </div>

            {/* Risk Factors Breakdown */}
            <div>
              <h4 className="font-medium mb-3">Risk Factor Breakdown</h4>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Cycle Irregularity", value: data.pcosRisk.factors.irregularCycles, max: 30 },
                  { label: "Long Cycles", value: data.pcosRisk.factors.longCycles, max: 25 },
                  { label: "Missed Periods", value: data.pcosRisk.factors.missedPeriods, max: 25 },
                  { label: "Symptom Patterns", value: data.pcosRisk.factors.symptomScore, max: 10 },
                  { label: "Bleeding Pattern", value: data.pcosRisk.factors.bleedingPattern, max: 10 },
                ].map((factor) => (
                  <div key={factor.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{factor.label}</span>
                      <span className="text-muted-foreground">
                        {factor.value}/{factor.max}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all ${getRiskBgColor(
                          factor.value / factor.max < 0.3
                            ? "low"
                            : factor.value / factor.max < 0.6
                            ? "moderate"
                            : "elevated"
                        )}`}
                        style={{ width: `${(factor.value / factor.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {data.pcosRisk.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Recommendations</h4>
                <div className="flex flex-col gap-2">
                  {data.pcosRisk.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3"
                    >
                      <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Important Disclaimer</AlertTitle>
              <AlertDescription className="text-xs">
                {data.pcosRisk.disclaimer}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Irregularities */}
        {data.irregularities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Pattern Observations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {data.irregularities.map((flag, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-yellow-800"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="text-sm">{flag}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
