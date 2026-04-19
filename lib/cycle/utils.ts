// Cycle phase utilities

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal"

export interface CycleInfo {
  phase: CyclePhase
  dayOfCycle: number
  daysUntilNextPeriod: number
  isInPeriod: boolean
  periodStartDate: Date | null
  periodEndDate: Date | null
  ovulationDate: Date | null
  fertilityWindowStart: Date | null
  fertilityWindowEnd: Date | null
  nextPeriodDate: Date
}

export function getCyclePhase(dayOfCycle: number, cycleLength: number, periodLength: number): CyclePhase {
  if (dayOfCycle <= periodLength) {
    return "menstrual"
  }
  
  const ovulationDay = cycleLength - 14 // Luteal phase is typically 14 days
  
  if (dayOfCycle < ovulationDay - 5) {
    return "follicular"
  }
  
  if (dayOfCycle >= ovulationDay - 2 && dayOfCycle <= ovulationDay + 1) {
    return "ovulation"
  }
  
  return "luteal"
}

export function getPhaseInfo(phase: CyclePhase): { name: string; description: string; color: string } {
  switch (phase) {
    case "menstrual":
      return {
        name: "Menstrual Phase",
        description: "Your period is here. Focus on rest and self-care.",
        color: "period",
      }
    case "follicular":
      return {
        name: "Follicular Phase",
        description: "Energy levels are rising. Great time for new projects.",
        color: "safe",
      }
    case "ovulation":
      return {
        name: "Ovulation Phase",
        description: "Peak fertility window. Energy and mood are high.",
        color: "ovulation",
      }
    case "luteal":
      return {
        name: "Luteal Phase",
        description: "Pre-menstrual phase. You may experience PMS symptoms.",
        color: "fertile",
      }
  }
}

export function calculateCycleInfo(
  lastPeriodStart: Date,
  cycleLength: number,
  periodLength: number
): CycleInfo {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const lastPeriodDate = new Date(lastPeriodStart)
  lastPeriodDate.setHours(0, 0, 0, 0)
  
  // Calculate day of cycle
  const diffTime = today.getTime() - lastPeriodDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const dayOfCycle = (diffDays % cycleLength) + 1
  
  // Calculate next period date
  const cyclesSinceLast = Math.floor(diffDays / cycleLength)
  const nextPeriodDate = new Date(lastPeriodDate)
  nextPeriodDate.setDate(nextPeriodDate.getDate() + (cyclesSinceLast + 1) * cycleLength)
  
  // Calculate days until next period
  const daysUntilNextPeriod = Math.ceil(
    (nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  // Determine if currently in period
  const isInPeriod = dayOfCycle <= periodLength
  
  // Calculate current cycle's period dates
  const currentCycleStart = new Date(lastPeriodDate)
  currentCycleStart.setDate(currentCycleStart.getDate() + cyclesSinceLast * cycleLength)
  
  const periodStartDate = isInPeriod ? currentCycleStart : null
  const periodEndDate = isInPeriod 
    ? new Date(currentCycleStart.getTime() + (periodLength - 1) * 24 * 60 * 60 * 1000)
    : null
  
  // Calculate ovulation date (typically cycleLength - 14)
  const ovulationDay = cycleLength - 14
  const currentOvulationDate = new Date(currentCycleStart)
  currentOvulationDate.setDate(currentOvulationDate.getDate() + ovulationDay - 1)
  
  // Fertility window: 5 days before ovulation + ovulation day
  const fertilityWindowStart = new Date(currentOvulationDate)
  fertilityWindowStart.setDate(fertilityWindowStart.getDate() - 5)
  const fertilityWindowEnd = new Date(currentOvulationDate)
  fertilityWindowEnd.setDate(fertilityWindowEnd.getDate() + 1)
  
  const phase = getCyclePhase(dayOfCycle, cycleLength, periodLength)
  
  return {
    phase,
    dayOfCycle,
    daysUntilNextPeriod,
    isInPeriod,
    periodStartDate,
    periodEndDate,
    ovulationDate: currentOvulationDate,
    fertilityWindowStart,
    fertilityWindowEnd,
    nextPeriodDate,
  }
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

export function isDateInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false
  const d = date.getTime()
  return d >= start.getTime() && d <= end.getTime()
}
