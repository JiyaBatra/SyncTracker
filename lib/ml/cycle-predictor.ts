// Cycle Prediction using Weighted Moving Average
// More recent cycles are weighted higher for better accuracy

export interface CycleData {
  startDate: Date
  cycleLength: number
  periodLength: number
}

export interface PredictionResult {
  nextPeriodStart: Date
  nextPeriodEnd: Date
  ovulationDate: Date
  fertilityWindow: {
    start: Date
    end: Date
  }
  confidence: number
  predictedCycleLength: number
  predictedPeriodLength: number
}

/**
 * Calculate weighted moving average for cycle prediction
 * More recent cycles have higher weight
 */
export function predictNextCycle(cycles: CycleData[]): PredictionResult | null {
  if (cycles.length === 0) return null

  // Sort by date, most recent first
  const sortedCycles = [...cycles].sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime()
  )

  // Calculate weighted average cycle length
  const weights = calculateWeights(sortedCycles.length)
  let weightedCycleSum = 0
  let weightedPeriodSum = 0
  let totalWeight = 0

  sortedCycles.forEach((cycle, index) => {
    const weight = weights[index]
    // Only include valid cycle lengths (21-45 days)
    if (cycle.cycleLength >= 21 && cycle.cycleLength <= 45) {
      weightedCycleSum += cycle.cycleLength * weight
      totalWeight += weight
    }
    weightedPeriodSum += cycle.periodLength * weight
  })

  // Calculate predicted lengths
  const predictedCycleLength = totalWeight > 0 
    ? Math.round(weightedCycleSum / totalWeight)
    : 28 // Default

  const periodWeight = weights.reduce((a, b) => a + b, 0)
  const predictedPeriodLength = Math.round(weightedPeriodSum / periodWeight)

  // Calculate confidence based on cycle variance
  const variance = calculateVariance(
    sortedCycles.map((c) => c.cycleLength).filter((l) => l >= 21 && l <= 45)
  )
  const confidence = calculateConfidence(variance, sortedCycles.length)

  // Predict next period
  const lastCycle = sortedCycles[0]
  const nextPeriodStart = new Date(lastCycle.startDate)
  nextPeriodStart.setDate(nextPeriodStart.getDate() + predictedCycleLength)

  // If prediction is in the past, adjust
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  while (nextPeriodStart < today) {
    nextPeriodStart.setDate(nextPeriodStart.getDate() + predictedCycleLength)
  }

  const nextPeriodEnd = new Date(nextPeriodStart)
  nextPeriodEnd.setDate(nextPeriodEnd.getDate() + predictedPeriodLength - 1)

  // Calculate ovulation (typically 14 days before next period)
  const ovulationDate = new Date(nextPeriodStart)
  ovulationDate.setDate(ovulationDate.getDate() - 14)

  // Fertility window: 5 days before ovulation to 1 day after
  const fertilityStart = new Date(ovulationDate)
  fertilityStart.setDate(fertilityStart.getDate() - 5)
  const fertilityEnd = new Date(ovulationDate)
  fertilityEnd.setDate(fertilityEnd.getDate() + 1)

  return {
    nextPeriodStart,
    nextPeriodEnd,
    ovulationDate,
    fertilityWindow: {
      start: fertilityStart,
      end: fertilityEnd,
    },
    confidence,
    predictedCycleLength,
    predictedPeriodLength,
  }
}

/**
 * Generate exponentially decaying weights
 * Most recent cycle gets highest weight
 */
function calculateWeights(count: number): number[] {
  const weights: number[] = []
  const decayFactor = 0.8 // Each older cycle is 80% of previous weight
  
  for (let i = 0; i < count; i++) {
    weights.push(Math.pow(decayFactor, i))
  }
  
  return weights
}

/**
 * Calculate variance of cycle lengths
 */
function calculateVariance(cycleLengths: number[]): number {
  if (cycleLengths.length < 2) return 0
  
  const mean = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
  const squaredDiffs = cycleLengths.map((l) => Math.pow(l - mean, 2))
  
  return squaredDiffs.reduce((a, b) => a + b, 0) / cycleLengths.length
}

/**
 * Calculate prediction confidence (0-100)
 * Based on variance and number of data points
 */
function calculateConfidence(variance: number, dataPoints: number): number {
  // Base confidence from data points (more data = more confidence)
  const dataConfidence = Math.min(dataPoints / 6, 1) * 40 // Up to 40 points for 6+ cycles
  
  // Variance penalty (higher variance = lower confidence)
  // Variance of 0 = no penalty, variance of 49 (7 days std dev) = -40 points
  const variancePenalty = Math.min((variance / 49) * 40, 40)
  
  // Base confidence starts at 50
  const confidence = 50 + dataConfidence - variancePenalty
  
  return Math.max(20, Math.min(95, Math.round(confidence)))
}

/**
 * Detect cycle irregularities
 */
export function detectIrregularities(cycles: CycleData[]): string[] {
  const flags: string[] = []
  
  if (cycles.length < 3) return flags
  
  const cycleLengths = cycles
    .map((c) => c.cycleLength)
    .filter((l) => l > 0)

  if (cycleLengths.length < 2) return flags
  
  const avgLength = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
  const variance = calculateVariance(cycleLengths)
  const stdDev = Math.sqrt(variance)
  
  // Check for high variance (irregular cycles)
  if (stdDev > 7) {
    flags.push("High cycle variation detected (std dev > 7 days)")
  }
  
  // Check for very short cycles
  if (cycleLengths.some((l) => l < 21)) {
    flags.push("One or more cycles shorter than 21 days")
  }
  
  // Check for very long cycles
  if (cycleLengths.some((l) => l > 35)) {
    flags.push("One or more cycles longer than 35 days")
  }
  
  // Check for oligomenorrhea (fewer than 8 periods per year pattern)
  if (avgLength > 45) {
    flags.push("Average cycle length suggests fewer than 8 periods per year")
  }
  
  // Check for missed periods (gaps > 45 days)
  if (cycleLengths.some((l) => l > 45)) {
    flags.push("Missed period detected (gap > 45 days)")
  }
  
  return flags
}
