"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type CyclePhase, getPhaseInfo } from "@/lib/cycle/utils"
import { Droplets, Sun, Sparkles, Moon } from "lucide-react"

interface CyclePhaseCardProps {
  phase: CyclePhase
  dayOfCycle: number
  cycleLength: number
}

const phaseIcons = {
  menstrual: Droplets,
  follicular: Sun,
  ovulation: Sparkles,
  luteal: Moon,
}

export function CyclePhaseCard({ phase, dayOfCycle, cycleLength }: CyclePhaseCardProps) {
  const phaseInfo = getPhaseInfo(phase)
  const Icon = phaseIcons[phase]
  
  // Calculate progress through cycle
  const progress = (dayOfCycle / cycleLength) * 100

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-${phaseInfo.color}/20`}>
            <Icon className={`h-5 w-5 text-${phaseInfo.color}`} />
          </div>
          <div>
            <span>{phaseInfo.name}</span>
            <p className="text-sm font-normal text-muted-foreground">
              Day {dayOfCycle} of {cycleLength}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{phaseInfo.description}</p>
        
        {/* Cycle progress bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Phase markers */}
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Menstrual</span>
          <span>Follicular</span>
          <span>Ovulation</span>
          <span>Luteal</span>
        </div>
      </CardContent>
    </Card>
  )
}
