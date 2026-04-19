"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { isSameDay, isDateInRange } from "@/lib/cycle/utils"
import Link from "next/link"

interface MiniCalendarProps {
  periodDays: Date[]
  predictedPeriodDays: Date[]
  ovulationDate: Date | null
  fertilityWindowStart: Date | null
  fertilityWindowEnd: Date | null
  loggedDays: Date[]
}

export function MiniCalendar({
  periodDays,
  predictedPeriodDays,
  ovulationDate,
  fertilityWindowStart,
  fertilityWindowEnd,
  loggedDays,
}: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()
  
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }
  
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const getDayClass = (day: number): string => {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    
    const isPeriod = periodDays.some((d) => isSameDay(d, date))
    const isPredictedPeriod = predictedPeriodDays.some((d) => isSameDay(d, date))
    const isOvulation = ovulationDate && isSameDay(ovulationDate, date)
    const isFertile = isDateInRange(date, fertilityWindowStart, fertilityWindowEnd)
    const isLogged = loggedDays.some((d) => isSameDay(d, date))
    const isToday = isSameDay(date, today)
    
    let classes = "h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors"
    
    if (isToday) {
      classes += " ring-2 ring-primary ring-offset-1"
    }
    
    if (isPeriod) {
      classes += " bg-period text-white"
    } else if (isPredictedPeriod) {
      classes += " bg-period/30 text-period"
    } else if (isOvulation) {
      classes += " bg-ovulation text-white"
    } else if (isFertile) {
      classes += " bg-fertile/30 text-fertile"
    } else if (isLogged) {
      classes += " bg-safe/30"
    } else {
      classes += " hover:bg-secondary"
    }
    
    return classes
  }
  
  // Generate calendar grid
  const calendarDays: (number | null)[] = []
  
  // Add empty cells for days before the first of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{monthName}</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {weekDays.map((day) => (
            <div key={day} className="h-8 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div key={index} className="flex items-center justify-center">
              {day ? (
                <Link href={`/dashboard/calendar?date=${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`}>
                  <div className={getDayClass(day)}>{day}</div>
                </Link>
              ) : (
                <div className="h-8 w-8" />
              )}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-period" />
            <span>Period</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-fertile" />
            <span>Fertile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-ovulation" />
            <span>Ovulation</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
