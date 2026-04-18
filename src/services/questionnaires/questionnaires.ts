/**
 * HUMATRIX QUESTIONNAIRE SERVICE
 * 
 * Manages question sets and validates answers.
 * Converts between JSON question format and scoring format.
 * No database dependency - works with imported JSON data.
 */

import questionsData from '../../lib/sporttyp-questions.json'
import type { ScoringQuestion } from '../scoring/calculate'

// ─── RAW QUESTION FORMAT (from sporttyp-questions.json) ─────────────

interface RawQuestion {
  id: number
  dim: string
  pole: string
  text: string
}

// ─── QUESTIONNAIRE TYPES ────────────────────────────────────────────

export type QuestionnaireKey =
  | 'player_selftest'      // 68 questions
  | 'external_assessment'  // 20 questions (coach rates player)
  | 'trainer_personality'  // 16 questions (coach self-test)
  | 'trainer_coaching'     // 24 questions (coaching style)

export interface Questionnaire {
  key: QuestionnaireKey
  title: string
  description: string
  questionCount: number
  estimatedMinutes: number
  questions: QuestionnaireQuestion[]
}

export interface QuestionnaireQuestion {
  id: number
  dimension: string
  pole: 'A' | 'B'
  text: string
  scaleMin: number
  scaleMax: number
  scaleMinLabel: string
  scaleMaxLabel: string
}

// ─── QUESTIONNAIRE DEFINITIONS ──────────────────────────────────────

const QUESTIONNAIRE_META: Record<QuestionnaireKey, {
  title: string; description: string; estimatedMinutes: number
}> = {
  player_selftest: {
    title: 'Humatrix Sporttyp – Spieler-Selbsttest',
    description: '68 Fragen · 16 Spielertypen · 4 Dimensionen',
    estimatedMinutes: 15,
  },
  external_assessment: {
    title: 'Humatrix – Fremdeinschätzung',
    description: '20 Fragen · Trainer bewertet Spieler',
    estimatedMinutes: 5,
  },
  trainer_personality: {
    title: 'Humatrix – Trainer-Persönlichkeit',
    description: '16 Fragen · Wer bist du als Mensch?',
    estimatedMinutes: 5,
  },
  trainer_coaching: {
    title: 'Humatrix – Coaching-Stil',
    description: '24 Fragen · Wie führst du?',
    estimatedMinutes: 8,
  },
}

// ─── CONVERT RAW QUESTIONS ──────────────────────────────────────────

function rawToQuestionnaire(raws: RawQuestion[]): QuestionnaireQuestion[] {
  return raws.map(q => ({
    id: q.id,
    dimension: q.dim,
    pole: q.pole as 'A' | 'B',
    text: q.text,
    scaleMin: 1,
    scaleMax: 7,
    scaleMinLabel: 'Trifft gar nicht zu',
    scaleMaxLabel: 'Trifft voll zu',
  }))
}

function rawToScoring(raws: RawQuestion[]): ScoringQuestion[] {
  return raws.map(q => ({
    id: q.id,
    dimension: q.dim,
    pole: q.pole as 'A' | 'B',
  }))
}

// ─── PUBLIC API ─────────────────────────────────────────────────────

/** Get a complete questionnaire with questions. */
export function getQuestionnaire(key: QuestionnaireKey): Questionnaire {
  const meta = QUESTIONNAIRE_META[key]
  const raw = (questionsData as Record<string, RawQuestion[]>)[key] || []
  const questions = rawToQuestionnaire(raw)

  return {
    key,
    title: meta.title,
    description: meta.description,
    questionCount: questions.length,
    estimatedMinutes: meta.estimatedMinutes,
    questions,
  }
}

/** Get scoring-format questions (for passing to calculateDimensions). */
export function getScoringQuestions(key: QuestionnaireKey): ScoringQuestion[] {
  const raw = (questionsData as Record<string, RawQuestion[]>)[key] || []
  return rawToScoring(raw)
}

/** Get questions grouped by dimension. */
export function getQuestionsByDimension(key: QuestionnaireKey): Record<string, QuestionnaireQuestion[]> {
  const questionnaire = getQuestionnaire(key)
  const grouped: Record<string, QuestionnaireQuestion[]> = {}

  for (const q of questionnaire.questions) {
    if (!grouped[q.dimension]) grouped[q.dimension] = []
    grouped[q.dimension].push(q)
  }

  return grouped
}

// ─── ANSWER VALIDATION ──────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  answeredCount: number
  totalRequired: number
  missingQuestions: number[]
  outOfRangeQuestions: number[]
  errors: string[]
}

/** Validate answers against a questionnaire. */
export function validateAnswers(
  answers: Record<number, number>,
  key: QuestionnaireKey
): ValidationResult {
  const questionnaire = getQuestionnaire(key)
  const errors: string[] = []
  const missingQuestions: number[] = []
  const outOfRangeQuestions: number[] = []

  for (const q of questionnaire.questions) {
    const val = answers[q.id]
    if (val === undefined || val === null) {
      missingQuestions.push(q.id)
    } else if (val < q.scaleMin || val > q.scaleMax) {
      outOfRangeQuestions.push(q.id)
      errors.push(`Frage ${q.id}: Wert ${val} außerhalb von ${q.scaleMin}-${q.scaleMax}`)
    }
  }

  if (missingQuestions.length > 0) {
    errors.push(`${missingQuestions.length} Fragen nicht beantwortet`)
  }

  return {
    valid: missingQuestions.length === 0 && outOfRangeQuestions.length === 0,
    answeredCount: questionnaire.questionCount - missingQuestions.length,
    totalRequired: questionnaire.questionCount,
    missingQuestions,
    outOfRangeQuestions,
    errors,
  }
}

/** Get completion percentage. */
export function getCompletionPct(
  answers: Record<number, number>,
  key: QuestionnaireKey
): number {
  const q = getQuestionnaire(key)
  const answered = q.questions.filter(q => answers[q.id] !== undefined).length
  return q.questionCount > 0 ? Math.round((answered / q.questionCount) * 100) : 0
}
