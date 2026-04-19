// PCOS Risk Assessment Algorithm
// Based on Rotterdam criteria and cycle pattern analysis
// DISCLAIMER: This is for awareness only, not medical diagnosis

export interface PCOSRiskFactors {
  irregularCycles: number      // 0-30 points
  longCycles: number           // 0-25 points
  missedPeriods: number        // 0-25 points
  symptomScore: number         // 0-10 points
  bleedingPattern: number      // 0-10 points
}

export interface PCOSRiskResult {
  score: number                // 0-100
  level: "low" | "moderate" | "elevated"
  factors: PCOSRiskFactors
  recommendations: string[]
  disclaimer: string
}

export interface CycleHistoryItem {
  cycleLength: number
  periodLength: number
  flow: "light" | "medium" | "heavy" | "spotting"
}

export interface SymptomHistory {
  acne: number              // frequency (0-10)
  fatigue: number
  bloating: number
  cravings: number
  hot_flashes: number
}

const DISCLAIMER = "This assessment is for informational purposes only and is not a medical diagnosis. PCOS can only be diagnosed by a healthcare professional through proper examination and testing. If you have concerns, please consult a doctor."

/**
 * Calculate PCOS risk score based on cycle patterns and symptoms
 */
export function calculatePCOSRisk(
  cycles: CycleHistoryItem[],
  symptoms?: SymptomHistory
): PCOSRiskResult {
  if (cycles.length < 3) {
    return {
      score: 0,
      level: "low",
      factors: {
        irregularCycles: 0,
        longCycles: 0,
        missedPeriods: 0,
        symptomScore: 0,
        bleedingPattern: 0,
      },
      recommendations: ["Log at least 3 cycles for a meaningful assessment"],
      disclaimer: DISCLAIMER,
    }
  }

  const factors: PCOSRiskFactors = {
    irregularCycles: calculateIrregularityScore(cycles),
    longCycles: calculateLongCycleScore(cycles),
    missedPeriods: calculateMissedPeriodScore(cycles),
    symptomScore: symptoms ? calculateSymptomScore(symptoms) : 0,
    bleedingPattern: calculateBleedingScore(cycles),
  }

  const totalScore = 
    factors.irregularCycles + 
    factors.longCycles + 
    factors.missedPeriods + 
    factors.symptomScore +
    factors.bleedingPattern

  const level: "low" | "moderate" | "elevated" = 
    totalScore < 30 ? "low" : 
    totalScore < 60 ? "moderate" : 
    "elevated"

  const recommendations = generateRecommendations(factors, level)

  return {
    score: Math.min(100, totalScore),
    level,
    factors,
    recommendations,
    disclaimer: DISCLAIMER,
  }
}

/**
 * Score based on cycle-to-cycle variation (0-30 points)
 * High variation is a key PCOS indicator
 */
function calculateIrregularityScore(cycles: CycleHistoryItem[]): number {
  const lengths = cycles.map((c) => c.cycleLength).filter((l) => l > 0)
  if (lengths.length < 2) return 0

  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length
  const stdDev = Math.sqrt(variance)

  // Score based on standard deviation
  // 0-3 days: 0-10 points
  // 3-7 days: 10-20 points
  // 7+ days: 20-30 points
  if (stdDev <= 3) return Math.round((stdDev / 3) * 10)
  if (stdDev <= 7) return 10 + Math.round(((stdDev - 3) / 4) * 10)
  return Math.min(30, 20 + Math.round(((stdDev - 7) / 7) * 10))
}

/**
 * Score based on consistently long cycles (0-25 points)
 * Cycles > 35 days suggest oligomenorrhea
 */
function calculateLongCycleScore(cycles: CycleHistoryItem[]): number {
  const lengths = cycles.map((c) => c.cycleLength).filter((l) => l > 0)
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length

  // Calculate percentage of cycles > 35 days
  const longCycles = lengths.filter((l) => l > 35).length
  const longCycleRatio = longCycles / lengths.length

  // Score based on average length and ratio
  let score = 0

  // Average cycle length contribution (0-15)
  if (avgLength > 35) {
    score += Math.min(15, Math.round(((avgLength - 35) / 20) * 15))
  }

  // Long cycle ratio contribution (0-10)
  score += Math.round(longCycleRatio * 10)

  return Math.min(25, score)
}

/**
 * Score based on missed periods/very long gaps (0-25 points)
 * Fewer than 8 periods per year is a PCOS criterion
 */
function calculateMissedPeriodScore(cycles: CycleHistoryItem[]): number {
  const lengths = cycles.map((c) => c.cycleLength).filter((l) => l > 0)
  
  // Check for gaps > 45 days (suggests missed period)
  const missedCount = lengths.filter((l) => l > 45).length
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length

  let score = 0

  // Missed period count contribution (0-15)
  score += Math.min(15, missedCount * 5)

  // If average suggests < 8 periods/year (avg > 45.6 days)
  if (avgLength > 45.6) {
    score += 10
  } else if (avgLength > 40) {
    score += 5
  }

  return Math.min(25, score)
}

/**
 * Score based on PCOS-related symptoms (0-10 points)
 */
function calculateSymptomScore(symptoms: SymptomHistory): number {
  // Weighted symptom scoring
  // Acne and fatigue are more indicative
  let score = 0
  
  // Each symptom frequency is 0-10
  score += (symptoms.acne / 10) * 3      // Max 3 points
  score += (symptoms.fatigue / 10) * 2   // Max 2 points
  score += (symptoms.bloating / 10) * 2  // Max 2 points
  score += (symptoms.cravings / 10) * 1  // Max 1 point
  score += (symptoms.hot_flashes / 10) * 2 // Max 2 points

  return Math.round(Math.min(10, score))
}

/**
 * Score based on bleeding patterns (0-10 points)
 * Heavy or prolonged bleeding can indicate hormonal imbalance
 */
function calculateBleedingScore(cycles: CycleHistoryItem[]): number {
  let score = 0

  // Check for heavy flow
  const heavyFlowCount = cycles.filter((c) => c.flow === "heavy").length
  const heavyFlowRatio = heavyFlowCount / cycles.length
  score += Math.round(heavyFlowRatio * 5)

  // Check for prolonged periods (> 7 days)
  const prolongedCount = cycles.filter((c) => c.periodLength > 7).length
  const prolongedRatio = prolongedCount / cycles.length
  score += Math.round(prolongedRatio * 5)

  return Math.min(10, score)
}

/**
 * Generate personalized recommendations based on risk factors
 */
function generateRecommendations(
  factors: PCOSRiskFactors,
  level: "low" | "moderate" | "elevated"
): string[] {
  const recommendations: string[] = []

  if (level === "elevated") {
    recommendations.push(
      "Consider scheduling an appointment with a gynecologist or endocrinologist to discuss your cycle patterns"
    )
  }

  if (factors.irregularCycles > 15) {
    recommendations.push(
      "Your cycles show significant variation. Tracking symptoms and diet may help identify patterns"
    )
  }

  if (factors.longCycles > 10) {
    recommendations.push(
      "Long cycles may indicate hormonal imbalances. A doctor can order tests to check hormone levels"
    )
  }

  if (factors.missedPeriods > 10) {
    recommendations.push(
      "Missed or infrequent periods warrant medical evaluation to rule out underlying conditions"
    )
  }

  if (factors.symptomScore > 5) {
    recommendations.push(
      "The symptoms you're experiencing may be related to hormonal factors. Consider discussing these with a healthcare provider"
    )
  }

  if (factors.bleedingPattern > 5) {
    recommendations.push(
      "Heavy or prolonged periods can sometimes indicate hormonal imbalances or other conditions"
    )
  }

  // Always add general wellness tips
  if (level === "low") {
    recommendations.push(
      "Continue tracking your cycles to maintain awareness of your menstrual health"
    )
  }

  recommendations.push(
    "Maintain a healthy lifestyle with regular exercise, balanced diet, and adequate sleep to support hormonal health"
  )

  return recommendations.slice(0, 4) // Max 4 recommendations
}

/**
 * Get risk level description
 */
export function getRiskLevelDescription(level: "low" | "moderate" | "elevated"): string {
  switch (level) {
    case "low":
      return "Your cycle patterns appear regular and healthy. Continue tracking for ongoing awareness."
    case "moderate":
      return "Some patterns in your cycles may warrant attention. Consider discussing with a healthcare provider if you have concerns."
    case "elevated":
      return "Your cycle patterns show several indicators that may benefit from medical evaluation. Please consult a healthcare professional."
  }
}
