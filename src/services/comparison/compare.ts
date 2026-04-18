/**
 * HUMATRIX COMPARISON SERVICE
 * 
 * Compares Self-Assessment (player) with External Assessment (coach).
 * Produces match score and per-dimension differences.
 * 
 * Algorithm:
 * 1. For each dimension, compute absolute difference in percentages
 * 2. Match score = 100 - (average difference × scaling factor)
 * 3. Flag dimensions with >20% difference as "attention needed"
 * 4. Flag dimensions with >35% difference as "significant gap"
 */

import type { DimensionScore } from '../scoring/calculate'
import { DIMENSIONS } from '../scoring/calculate'

// ─── COMPARISON RESULT ──────────────────────────────────────────────

export interface DimensionDifference {
  dimension: string
  label: string
  selfPct: number
  coachPct: number
  selfLetter: string
  coachLetter: string
  selfLabel: string
  coachLabel: string
  /** Absolute difference in percentage points */
  absDiff: number
  /** Signed difference: positive = coach sees MORE of pole A */
  signedDiff: number
  /** Severity: 'match' | 'attention' | 'gap' */
  severity: 'match' | 'attention' | 'gap'
}

export interface ComparisonResult {
  /** Overall match score 0-100 */
  matchScore: number
  /** Same type code? */
  sameType: boolean
  /** Self type code */
  selfCode: string
  /** Coach type code */
  coachCode: string
  /** Same family? */
  sameFamily: boolean
  /** Per-dimension breakdown */
  differences: DimensionDifference[]
  /** Summary text for trainer */
  summary: string
  /** Calculated timestamp */
  calculatedAt: string
}

// ─── THRESHOLDS ─────────────────────────────────────────────────────

const ATTENTION_THRESHOLD = 20 // >20% difference
const GAP_THRESHOLD = 35       // >35% difference

// ─── COMPARISON FUNCTION ────────────────────────────────────────────

/**
 * Compare self-assessment with coach assessment.
 * Both inputs are dimension score maps from calculateDimensions().
 */
export function compareAssessments(
  selfScores: Record<string, DimensionScore>,
  coachScores: Record<string, DimensionScore>,
  selfCode: string,
  coachCode: string,
): ComparisonResult {
  const differences: DimensionDifference[] = []
  let totalAbsDiff = 0

  for (const dim of DIMENSIONS) {
    const self = selfScores[dim.key]
    const coach = coachScores[dim.key]

    if (!self || !coach) continue

    const absDiff = Math.abs(self.pct - coach.pct)
    const signedDiff = coach.pct - self.pct
    totalAbsDiff += absDiff

    const severity: 'match' | 'attention' | 'gap' =
      absDiff > GAP_THRESHOLD ? 'gap' :
      absDiff > ATTENTION_THRESHOLD ? 'attention' : 'match'

    differences.push({
      dimension: dim.key,
      label: dim.label,
      selfPct: self.pct,
      coachPct: coach.pct,
      selfLetter: self.letter,
      coachLetter: coach.letter,
      selfLabel: self.label,
      coachLabel: coach.label,
      absDiff,
      signedDiff,
      severity,
    })
  }

  // Match score: 100 when all differences are 0
  const maxPossibleDiff = DIMENSIONS.length * 100
  const matchScore = Math.round((1 - totalAbsDiff / maxPossibleDiff) * 100)

  const sameType = selfCode === coachCode
  const sameFamily = selfCode.substring(0, 2) === coachCode.substring(0, 2)

  // Generate summary
  const gaps = differences.filter(d => d.severity === 'gap')
  const attentions = differences.filter(d => d.severity === 'attention')

  let summary: string
  if (matchScore >= 85) {
    summary = 'Sehr hohe Übereinstimmung zwischen Selbst- und Fremdbild. Spieler und Trainer nehmen die Persönlichkeit sehr ähnlich wahr.'
  } else if (matchScore >= 70) {
    summary = `Gute Grundübereinstimmung. ${attentions.length > 0 ? `Leichte Abweichung in: ${attentions.map(a => a.label).join(', ')}.` : ''}`
  } else if (matchScore >= 50) {
    summary = `Deutliche Unterschiede in der Wahrnehmung. ${gaps.map(g =>
      `${g.label}: Spieler sieht sich als ${g.selfLabel}, Trainer als ${g.coachLabel}.`
    ).join(' ')} Empfehlung: Einzelgespräch zur Klärung.`
  } else {
    summary = `Starke Diskrepanz zwischen Selbst- und Fremdbild. ${gaps.length} Dimensionen mit erheblicher Abweichung. Dringendes Reflexionsgespräch empfohlen.`
  }

  return {
    matchScore,
    sameType,
    selfCode,
    coachCode,
    sameFamily,
    differences,
    summary,
    calculatedAt: new Date().toISOString(),
  }
}

/**
 * Build the JSON structure for database storage.
 */
export function comparisonToDbJson(result: ComparisonResult) {
  return {
    match_score: result.matchScore,
    differences_json: Object.fromEntries(
      result.differences.map(d => [d.dimension, {
        selfPct: d.selfPct,
        coachPct: d.coachPct,
        absDiff: d.absDiff,
        severity: d.severity,
      }])
    ),
  }
}
