"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { 
  ChevronLeft, 
  ChevronRight, 
  Droplets, 
  Sparkles,
  Circle,
  PenLine
} from "lucide-react"
import { isSameDay, isDateInRange, formatDateLong } from "@/lib/cycle/utils"
import Link from "next/link"

interface CalendarData {
  cycles: Array<{
    startDate: string
    endDate: string | null
    periodLength: number
  }>
  logs: Array<{
    date: string
    isPeriodDay: boolean
    symptoms: string[]
    mood: string[]
  }>
  predictions: {
    nextPeriodStart: string
    nextPeriodEnd: string
    ovulationDate: string
    fertilityWindowStart: string
    fertilityWindowEnd: string
  }
  averages: {
    cycleLength: number
    periodLength: number
  }
}

function CalendarContent() {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get("date")
  
  const [currentDate, setCurrentDate] = useState(() => {
    if (dateParam) {
      return new Date(dateParam)
    }
    return new Date()
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (dateParam) {
      return new Date(dateParam)
    }
    return null
  })
  const [data, setData] = useState<CalendarData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    fetchCalendarData()
  }, [month, year])

  const fetchCalendarData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/calendar?month=${month + 1}&year=${year}`)
      if (response.ok) {
        const calendarData = await response.json()
        setData(calendarData)
      }
    } catch (err) {
      console.error("Failed to fetch calendar data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const monthName = currentDate.toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  })
  
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Parse data for calendar rendering
  const periodDays: Date[] = []
  const predictedPeriodDays: Date[] = []
  const fertileDays: Date[] = []
  let ovulationDate: Date | null = null
  const loggedDays: Map<string, { symptoms: string[]; mood: string[]; isPeriodDay: boolean }> = new Map()

  if (data) {
    // Add logged period days
    data.logs.forEach((log) => {
      const date = new Date(log.date)
      if (log.isPeriodDay) {
        periodDays.push(date)
      }
      loggedDays.set(log.date, {
        symptoms: log.symptoms,
        mood: log.mood,
        isPeriodDay: log.isPeriodDay,
      })
    })

    // Add cycle period days
    data.cycles.forEach((cycle) => {
      const start = new Date(cycle.startDate)
      const length = cycle.periodLength || data.averages.periodLength
      for (let i = 0; i < length; i++) {
        const day = new Date(start)
        day.setDate(day.getDate() + i)
        if (!periodDays.some((d) => isSameDay(d, day))) {
          periodDays.push(day)
        }
      }
    })

    // Add predictions
    if (data.predictions) {
      const predStart = new Date(data.predictions.nextPeriodStart)
      const predEnd = new Date(data.predictions.nextPeriodEnd)
      for (let d = new Date(predStart); d <= predEnd; d.setDate(d.getDate() + 1)) {
        if (!periodDays.some((pd) => isSameDay(pd, d))) {
          predictedPeriodDays.push(new Date(d))
        }
      }

      ovulationDate = new Date(data.predictions.ovulationDate)
      
      const fertileStart = new Date(data.predictions.fertilityWindowStart)
      const fertileEnd = new Date(data.predictions.fertilityWindowEnd)
      for (let d = new Date(fertileStart); d <= fertileEnd; d.setDate(d.getDate() + 1)) {
        fertileDays.push(new Date(d))
      }
    }
  }

  const getDayInfo = (day: number) => {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    
    const isPeriod = periodDays.some((d) => isSameDay(d, date))
    const isPredictedPeriod = predictedPeriodDays.some((d) => isSameDay(d, date))
    const isOvulation = ovulationDate && isSameDay(ovulationDate, date)
    const isFertile = fertileDays.some((d) => isSameDay(d, date))
    const dateStr = date.toISOString().split("T")[0]
    const hasLog = loggedDays.has(dateStr)
    const isToday = isSameDay(date, today)
    const isSelected = selectedDate && isSameDay(date, selectedDate)
    
    return { 
      isPeriod, 
      isPredictedPeriod, 
      isOvulation, 
      isFertile, 
      hasLog, 
      isToday,
      isSelected,
      log: loggedDays.get(dateStr)
    }
  }

  const getDayClass = (day: number): string => {
    const info = getDayInfo(day)
    
    let classes = "relative flex h-12 w-full flex-col items-center justify-center rounded-lg text-sm transition-all cursor-pointer hover:ring-2 hover:ring-primary/50"
    
    if (info.isSelected) {
      classes += " ring-2 ring-primary"
    }
    
    if (info.isToday) {
      classes += " font-bold"
    }
    
    if (info.isPeriod) {
      classes += " bg-period text-white"
    } else if (info.isPredictedPeriod) {
      classes += " bg-period/20 text-period"
    } else if (info.isOvulation) {
      classes += " bg-ovulation text-white"
    } else if (info.isFertile) {
      classes += " bg-fertile/20 text-fertile"
    } else {
      classes += " hover:bg-secondary"
    }
    
    return classes
  }

  // Generate calendar grid
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Get selected day details
  const selectedDayInfo = selectedDate ? getDayInfo(selectedDate.getDate()) : null
  const selectedDateStr = selectedDate?.toISOString().split("T")[0]
  const selectedLog = selectedDateStr ? loggedDays.get(selectedDateStr) : null

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cycle Calendar</h1>
        <Button variant="outline" onClick={goToToday}>
          Today
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-xl">{monthName}</CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <>
                {/* Week headers */}
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
                  {weekDays.map((day) => (
                    <div key={day} className="py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => (
                    <div key={index} className="aspect-square p-0.5">
                      {day ? (
                        <button
                          onClick={() => setSelectedDate(new Date(year, month, day))}
                          className={getDayClass(day)}
                        >
                          <span>{day}</span>
                          {getDayInfo(day).hasLog && (
                            <Circle className="absolute bottom-1 h-1.5 w-1.5 fill-current" />
                          )}
                        </button>
                      ) : (
                        <div className="h-12" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-period" />
                    <span>Period</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-period/20 border border-period" />
                    <span>Predicted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-ovulation" />
                    <span>Ovulation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-fertile/20 border border-fertile" />
                    <span>Fertile</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Day Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? formatDateLong(selectedDate) : "Select a Day"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="flex flex-col gap-4">
                {/* Day status */}
                {selectedDayInfo?.isPeriod && (
                  <div className="flex items-center gap-2 rounded-lg bg-period/10 p-3">
                    <Droplets className="h-5 w-5 text-period" />
                    <span className="font-medium text-period">Period Day</span>
                  </div>
                )}
                {selectedDayInfo?.isPredictedPeriod && (
                  <div className="flex items-center gap-2 rounded-lg bg-period/10 p-3">
                    <Droplets className="h-5 w-5 text-period" />
                    <span className="text-period">Predicted Period</span>
                  </div>
                )}
                {selectedDayInfo?.isOvulation && (
                  <div className="flex items-center gap-2 rounded-lg bg-ovulation/10 p-3">
                    <Sparkles className="h-5 w-5 text-ovulation" />
                    <span className="text-ovulation">Ovulation Day</span>
                  </div>
                )}
                {selectedDayInfo?.isFertile && !selectedDayInfo?.isOvulation && (
                  <div className="flex items-center gap-2 rounded-lg bg-fertile/10 p-3">
                    <Sparkles className="h-5 w-5 text-fertile" />
                    <span className="text-fertile">Fertile Window</span>
                  </div>
                )}

                {/* Logged data */}
                {selectedLog && (
                  <div className="flex flex-col gap-3">
                    {selectedLog.symptoms.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Symptoms</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedLog.symptoms.map((symptom) => (
                            <span 
                              key={symptom}
                              className="rounded-full bg-secondary px-2 py-1 text-xs"
                            >
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedLog.mood.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Mood</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedLog.mood.map((m) => (
                            <span 
                              key={m}
                              className="rounded-full bg-secondary px-2 py-1 text-xs"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Log button */}
                <Link href={`/dashboard/log?date=${selectedDateStr}`}>
                  <Button className="w-full gap-2">
                    <PenLine className="h-4 w-4" />
                    {selectedLog ? "Edit Log" : "Add Log"}
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Click on a day to see details
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    }>
      <CalendarContent />
    </Suspense>
  )
}
