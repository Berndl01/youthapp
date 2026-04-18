// ══════════════════════════════════════════════════════════════════
// YOUTH SCORING ADAPTER
// ══════════════════════════════════════════════════════════════════
// Bindet die altersspezifischen Jugend-Fragen an die unveränderte
// Scoring-Engine des Originals. Da die Dimensionen (drive/energy/
// mental/role) und Pole (A/B) identisch sind, kann die gesamte
// Scoring-Logik 1:1 wiederverwendet werden. Die Jugend-Version
// unterscheidet sich nur in Sprache und Alter — nicht im Scoring.
// ══════════════════════════════════════════════════════════════════

import type { AgeGroup } from './constants'
import {
  getPlayerSelftest,
  getExternalAssessment,
  getTrainerPersonality,
  getTrainerCoaching,
  getYouthType,
  YouthQuestion,
} from './constants'
import {
  calculateType,
  ScoringQuestion,
  ScoringResult,
} from '@/services/scoring/calculate'

// ─── FRAGEBOGEN-SCHLÜSSEL (JUGEND) ────────────────────────────────

export type YouthQuestionnaireKey =
  | 'player_selftest'       // 68 Fragen, altersspezifisch
  | 'external_assessment'   // 20 Fragen, altersspezifisch
  | 'trainer_personality'   // 16 Fragen
  | 'trainer_coaching'      // 24 Fragen

// ─── KONVERTIERUNG: YouthQuestion → ScoringQuestion ───────────────

function toScoring(qs: YouthQuestion[]): ScoringQuestion[] {
  return qs.map(q => ({
    id: q.id,
    dimension: q.dim,
    pole: q.pole,
  }))
}

// ─── FRAGEN HOLEN (mit Altersgruppe wo nötig) ─────────────────────

export function getYouthQuestions(
  key: YouthQuestionnaireKey,
  age?: AgeGroup
): YouthQuestion[] {
  switch (key) {
    case 'player_selftest':
      if (!age) throw new Error('age required for player_selftest')
      return getPlayerSelftest(age)
    case 'external_assessment':
      if (!age) throw new Error('age required for external_assessment')
      return getExternalAssessment(age)
    case 'trainer_personality':
      return getTrainerPersonality()
    case 'trainer_coaching':
      return getTrainerCoaching()
  }
}

// ─── SCORING-FRAGEN (für calculateType) ───────────────────────────

export function getYouthScoringQuestions(
  key: YouthQuestionnaireKey,
  age?: AgeGroup
): ScoringQuestion[] {
  return toScoring(getYouthQuestions(key, age))
}

// ─── TYP BERECHNEN ────────────────────────────────────────────────

export interface YouthScoringResult extends ScoringResult {
  ageGroup?: AgeGroup
  typeData: ReturnType<typeof getYouthType>
}

export function calculateYouthType(
  answers: Record<number, number>,
  key: YouthQuestionnaireKey,
  age?: AgeGroup
): YouthScoringResult {
  const questions = getYouthScoringQuestions(key, age)
  const result = calculateType(answers, questions)
  return {
    ...result,
    ageGroup: age,
    typeData: getYouthType(result.code),
  }
}

// ─── VALIDIERUNG ──────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  answeredCount: number
  totalRequired: number
  missingIds: number[]
}

export function validateYouthAnswers(
  answers: Record<number, number>,
  key: YouthQuestionnaireKey,
  age?: AgeGroup
): ValidationResult {
  const questions = getYouthQuestions(key, age)
  const missing: number[] = []
  for (const q of questions) {
    const v = answers[q.id]
    if (v === undefined || v === null || v < 1 || v > 7) missing.push(q.id)
  }
  return {
    valid: missing.length === 0,
    answeredCount: questions.length - missing.length,
    totalRequired: questions.length,
    missingIds: missing,
  }
}

// ─── ALTERSGRUPPE AUS GEBURTSDATUM ─────────────────────────────────

export function ageGroupFromBirthdate(birthdate: string | Date): AgeGroup {
  const bd = typeof birthdate === 'string' ? new Date(birthdate) : birthdate
  const now = new Date()
  let age = now.getFullYear() - bd.getFullYear()
  const m = now.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--

  if (age <= 13) return 'u13'
  if (age <= 16) return 'u16'
  return 'u19'
}

// ─── KONVERSION: ErgebnisCode → Altersübergang ────────────────────
// Nützlich für den Akademie-Lebensweg eines Spielers:
// Der gleiche Code (z.B. WTAF "Der Kapitän") bleibt über alle
// Altersgruppen hinweg gültig — nur die Typ-Texte, Coaching-Tipps
// und selfDev-Punkte werden altersgerecht angepasst. Das heißt
// ein Jugendlicher kann seine "Typ-Identität" über Jahre behalten
// und die Entwicklung ist ablesbar.
