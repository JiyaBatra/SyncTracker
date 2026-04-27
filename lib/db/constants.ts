export const SYMPTOMS = [
  "acne",
  "bloating",
  "cravings",
  "cramps",
  "fatigue",
  "headache",
  "hot_flashes",
  "nausea",
] as const;

export const MOODS = [
  "anxious",
  "calm",
  "emotional",
  "happy",
  "irritable",
  "low",
] as const;

export type Symptom = (typeof SYMPTOMS)[number];
export type Mood = (typeof MOODS)[number];
