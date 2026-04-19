"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/cycle/utils"
import { Calendar, Sparkles } from "lucide-react"

interface CountdownCardProps {
  daysUntilNextPeriod: number
  nextPeriodDate: Date
  ovulationDate: Date | null
  isInPeriod: boolean
}

export function CountdownCard({
  daysUntilNextPeriod,
  nextPeriodDate,
  ovulationDate,
  isInPeriod,
}: CountdownCardProps) {
  // Calculate days until ovulation
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysUntilOvulation = ovulationDate
    ? Math.ceil((ovulationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          {isInPeriod ? "Current Period" : "Next Period"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isInPeriod ? (
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">In Progress</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Take care of yourself today
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{daysUntilNextPeriod}</p>
              <p className="text-sm text-muted-foreground">
                {daysUntilNextPeriod === 1 ? "day away" : "days away"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Expected {formatDate(nextPeriodDate)}
              </p>
            </div>
            
            {daysUntilOvulation !== null && daysUntilOvulation > 0 && daysUntilOvulation < daysUntilNextPeriod && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-accent/20 p-3">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-sm">
                  Ovulation in {daysUntilOvulation} {daysUntilOvulation === 1 ? "day" : "days"}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
