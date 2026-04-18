/**
 * HUMATRIX SCORING SERVICE
 * 
 * Pure functions for type calculation. No database, no side effects.
 * Input: raw answers + question definitions
 * Output: dimension scores, type code, type data, confidence
 * 
 * Based on the validated Sporttyp system:
 * - 4 Dimensions: Antrieb, Energie, Mentalität, Rolle
 * - 2 Poles per dimension (A/B), measured via Likert 1-7
 * - 16 Types derived from 4-letter code (e.g. ESAF)
 * - 4 Families: Strategen, Teamformer, Performer, Anführer
 * 
 * Scoring algorithm (exact replica of Sporttyp doCalc):
 * 1. Separate answers by pole (A vs B) per dimension
 * 2. Normalize each pole: (sum - count) / (count × 6) → 0-1
 * 3. For B-pole: invert values (8 - answer) before normalizing
 * 4. Combine: average of both poles → percentage (0-100)
 * 5. ≥50% = pole A letter, <50% = pole B letter
 * 6. Concatenate 4 letters → type code
 */

// ─── DIMENSION DEFINITIONS ──────────────────────────────────────────

export interface DimensionDef {
  key: string
  label: string
  poleA: { name: string; code: string; color: string }
  poleB: { name: string; code: string; color: string }
}

export const DIMENSIONS: DimensionDef[] = [
  {
    key: 'drive', label: 'Antrieb',
    poleA: { name: 'Entwicklung', code: 'E', color: '#34D399' },
    poleB: { name: 'Wettkampf', code: 'W', color: '#F59E0B' },
  },
  {
    key: 'energy', label: 'Energie',
    poleA: { name: 'Eigenständig', code: 'S', color: '#A78BFA' },
    poleB: { name: 'Teamgebunden', code: 'T', color: '#60A5FA' },
  },
  {
    key: 'mental', label: 'Mentalität',
    poleA: { name: 'Stabil', code: 'A', color: '#2FA7BC' },
    poleB: { name: 'Intensiv', code: 'I', color: '#FB923C' },
  },
  {
    key: 'role', label: 'Rolle',
    poleA: { name: 'Führend', code: 'F', color: '#F87171' },
    poleB: { name: 'Adaptiv', code: 'D', color: '#34D399' },
  },
]

// ─── QUESTION INTERFACE ─────────────────────────────────────────────

export interface ScoringQuestion {
  id: number          // question number (1-68)
  dimension: string   // 'drive' | 'energy' | 'mental' | 'role'
  pole: 'A' | 'B'    // which pole this question measures
}

// ─── DIMENSION SCORE RESULT ─────────────────────────────────────────

export interface DimensionScore {
  /** Percentage 0-100. ≥50 = pole A dominant */
  pct: number
  /** Winning letter code */
  letter: string
  /** Winning pole label */
  label: string
  /** How many A-pole questions were answered */
  aCount: number
  /** How many B-pole questions were answered */
  bCount: number
  /** Raw A-pole normalized score (0-1) */
  aRaw: number
  /** Raw B-pole normalized score (0-1) */
  bRaw: number
}

// ─── FULL SCORING RESULT ────────────────────────────────────────────

export interface ScoringResult {
  /** 4-letter type code, e.g. "ESAF" */
  code: string
  /** Dimension scores with full breakdown */
  dimensions: Record<string, DimensionScore>
  /** Family key: 'str' | 'tfo' | 'per' | 'lea' */
  family: string
  /** Confidence 0-100 (how clearly the type is determined) */
  confidence: number
  /** Number of questions answered */
  answeredCount: number
  /** Total questions expected */
  totalQuestions: number
  /** Timestamp of calculation */
  calculatedAt: string
}

// ─── FAMILY MAPPING ─────────────────────────────────────────────────

const CODE_TO_FAMILY: Record<string, string> = {
  ESAF: 'str', ESAD: 'str', ESIF: 'str', ESID: 'str',
  ETAF: 'tfo', ETAD: 'tfo', ETIF: 'tfo', ETID: 'tfo',
  WSAF: 'per', WSAD: 'per', WSIF: 'per', WSID: 'per',
  WTAF: 'lea', WTAD: 'lea', WTIF: 'lea', WTID: 'lea',
}

export function getFamily(code: string): string {
  return CODE_TO_FAMILY[code] || 'str'
}

// ─── CORE SCORING FUNCTION ──────────────────────────────────────────

/**
 * Calculate dimension scores from raw answers.
 * This is the exact algorithm from Sporttyp (doCalc).
 * 
 * @param answers - Map of questionId → answer value (1-7)
 * @param questions - Question definitions with dimension and pole
 * @returns Dimension scores for all 4 dimensions
 */
export function calculateDimensions(
  answers: Record<number, number>,
  questions: ScoringQuestion[]
): Record<string, DimensionScore> {
  const result: Record<string, DimensionScore> = {}

  for (const dim of DIMENSIONS) {
    const aValues: number[] = []
    const bValues: number[] = []

    for (const q of questions) {
      if (q.dimension !== dim.key) continue
      const val = answers[q.id]
      if (val === undefined || val === null) continue
      if (val < 1 || val > 7) continue // reject out-of-range

      if (q.pole === 'A') aValues.push(val)
      else bValues.push(val)
    }

    // Default: neutral if no data
    if (aValues.length === 0 && bValues.length === 0) {
      result[dim.key] = {
        pct: 50, letter: dim.poleA.code, label: dim.poleA.name,
        aCount: 0, bCount: 0, aRaw: 0.5, bRaw: 0.5,
      }
      continue
    }

    // Normalize pole A: (sum - count) / (count × 6) → 0 to 1
    let aRaw = 0.5
    if (aValues.length > 0) {
      const sum = aValues.reduce((s, v) => s + v, 0)
      aRaw = (sum - aValues.length) / (aValues.length * 6)
    }

    // Normalize pole B (inverted): (sum_of_(8-v) - count) / (count × 6)
    let bRaw = 0.5
    if (bValues.length > 0) {
      const sum = bValues.reduce((s, v) => s + (8 - v), 0)
      bRaw = (sum - bValues.length) / (bValues.length * 6)
    }

    // Combined: average → percentage
    const pct = Math.round(((aRaw + bRaw) / 2) * 100)
    const isA = pct >= 50

    result[dim.key] = {
      pct,
      letter: isA ? dim.poleA.code : dim.poleB.code,
      label: isA ? dim.poleA.name : dim.poleB.name,
      aCount: aValues.length,
      bCount: bValues.length,
      aRaw: Math.round(aRaw * 1000) / 1000,
      bRaw: Math.round(bRaw * 1000) / 1000,
    }
  }

  return result
}

/**
 * Build 4-letter type code from dimension scores.
 * Exact replica of Sporttyp makeCode().
 */
export function makeCode(dimensions: Record<string, DimensionScore>): string {
  return DIMENSIONS.map(d => dimensions[d.key]?.letter || d.poleA.code).join('')
}

/**
 * Calculate confidence score.
 * Higher when dimension percentages are far from 50% (clear distinction).
 * Range: 0 (all dimensions at exactly 50%) to 100 (all at 0% or 100%).
 */
export function calculateConfidence(dimensions: Record<string, DimensionScore>): number {
  const deviations = DIMENSIONS.map(d => {
    const pct = dimensions[d.key]?.pct ?? 50
    return Math.abs(pct - 50) // 0 = ambiguous, 50 = very clear
  })
  const avgDeviation = deviations.reduce((s, d) => s + d, 0) / deviations.length
  return Math.round((avgDeviation / 50) * 100) // normalize to 0-100
}

/**
 * Full scoring pipeline.
 * Takes raw answers + questions, returns complete result.
 */
export function calculateType(
  answers: Record<number, number>,
  questions: ScoringQuestion[]
): ScoringResult {
  const dimensions = calculateDimensions(answers, questions)
  const code = makeCode(dimensions)
  const confidence = calculateConfidence(dimensions)
  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[Number(k)]
    return v !== undefined && v !== null && v >= 1 && v <= 7
  }).length

  return {
    code,
    dimensions,
    family: getFamily(code),
    confidence,
    answeredCount,
    totalQuestions: questions.length,
    calculatedAt: new Date().toISOString(),
  }
}
