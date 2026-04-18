/**
 * HUMATRIX PERSISTENCE SERVICE
 * 
 * The ONLY layer that touches the database.
 * All other services are pure functions.
 * 
 * This service:
 * 1. Creates survey submissions
 * 2. Stores scoring results
 * 3. Triggers comparison when both self + coach exist
 * 4. Reads results for display
 */

// @ts-ignore
import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateType, type ScoringResult, type ScoringQuestion } from '../scoring/calculate'
import { getType } from '../scoring/types'
import { compareAssessments, comparisonToDbJson } from '../comparison/compare'
import { getScoringQuestions, validateAnswers, type QuestionnaireKey } from '../questionnaires/questionnaires'

// ─── DB IDs for questionnaires ──────────────────────────────────────

const QUESTIONNAIRE_DB_IDS: Record<QuestionnaireKey, string> = {
  player_selftest: '00000000-0000-0000-0000-000000000001',
  external_assessment: '00000000-0000-0000-0000-000000000002',
  trainer_personality: '00000000-0000-0000-0000-000000000003',
  trainer_coaching: '00000000-0000-0000-0000-000000000004',
}

// ─── SUBMIT RESULT ──────────────────────────────────────────────────

export interface SubmitResult {
  success: boolean
  submissionId?: string
  scoring?: ScoringResult
  typeCode?: string
  typeName?: string
  error?: string
}

// ─── SUBMIT A TEST ──────────────────────────────────────────────────

/**
 * Complete pipeline: validate → score → save submission → save result → trigger comparison
 * 
 * @param supabase - Authenticated Supabase client
 * @param answers - Map of questionId → answer (1-7)
 * @param questionnaireKey - Which test
 * @param submittedBy - User ID who filled the test
 * @param subjectUserId - User ID the test is ABOUT (same for self-test, different for coach rating)
 * @param teamId - Optional team context
 */
export async function submitTest(
  supabase: SupabaseClient,
  answers: Record<number, number>,
  questionnaireKey: QuestionnaireKey,
  submittedBy: string,
  subjectUserId: string,
  teamId?: string,
): Promise<SubmitResult> {
  try {
    // 1. Validate
    const validation = validateAnswers(answers, questionnaireKey)
    if (!validation.valid) {
      return { success: false, error: `Validierung fehlgeschlagen: ${validation.errors.join(', ')}` }
    }

    // 2. Score
    const scoringQuestions = getScoringQuestions(questionnaireKey)
    const scoring = calculateType(answers, scoringQuestions)
    const typeData = getType(scoring.code)

    // 3. Create submission
    const { data: sub, error: subErr } = await supabase
      .from('survey_submissions')
      .insert({
        questionnaire_id: QUESTIONNAIRE_DB_IDS[questionnaireKey],
        submitted_by: submittedBy,
        subject_user_id: subjectUserId,
        team_id: teamId || null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (subErr || !sub) {
      return { success: false, error: `Submission fehlgeschlagen: ${subErr?.message || 'Unbekannter Fehler'}` }
    }

    // 4. Save type result
    const { error: typeErr } = await supabase
      .from('type_results')
      .insert({
        submission_id: sub.id,
        user_id: subjectUserId,
        result_type: scoring.code,
        result_label: typeData?.name || scoring.code,
        confidence_score: scoring.confidence,
        scoring_json: {
          emoji: typeData?.emoji || '🧬',
          family: scoring.family,
          dimensions: scoring.dimensions,
          answers, // store raw answers for reproducibility
          source: submittedBy === subjectUserId ? 'self' : 'coach',
        },
        category_scores: Object.fromEntries(
          Object.entries(scoring.dimensions).map(([k, v]) => [k, v.pct])
        ),
      })

    if (typeErr) {
      return { success: false, error: `Typ-Speicherung fehlgeschlagen: ${typeErr.message}` }
    }

    // 5. Auto-trigger comparison if this is a coach rating and self-test exists
    if (questionnaireKey === 'external_assessment') {
      await tryCreateComparison(supabase, subjectUserId, sub.id, scoring)
    }

    return {
      success: true,
      submissionId: sub.id,
      scoring,
      typeCode: scoring.code,
      typeName: typeData?.name || scoring.code,
    }

  } catch (err) {
    return { success: false, error: `Unerwarteter Fehler: ${String(err)}` }
  }
}

// ─── AUTO-COMPARISON ────────────────────────────────────────────────

async function tryCreateComparison(
  supabase: SupabaseClient,
  playerId: string,
  coachSubmissionId: string,
  coachScoring: ScoringResult,
) {
  try {
    // Find the player's most recent self-test result
    const { data: selfResults } = await supabase
      .from('type_results')
      .select('submission_id, scoring_json, result_type')
      .eq('user_id', playerId)
      .order('created_at', { ascending: false })

    if (!selfResults?.length) return

    // Find the self-assessment (not coach)
    const selfResult = selfResults.find(r => r.scoring_json?.source === 'self')
    if (!selfResult) return

    const selfDimensions = selfResult.scoring_json?.dimensions
    if (!selfDimensions) return

    // Compare
    const comparison = compareAssessments(
      selfDimensions,
      coachScoring.dimensions,
      selfResult.result_type,
      coachScoring.code,
    )
    const dbData = comparisonToDbJson(comparison)

    // Save comparison
    await supabase.from('assessment_comparisons').insert({
      player_user_id: playerId,
      self_submission_id: selfResult.submission_id,
      coach_submission_id: coachSubmissionId,
      match_score: dbData.match_score,
      differences_json: {
        ...dbData.differences_json,
        summary: comparison.summary,
        sameType: comparison.sameType,
        sameFamily: comparison.sameFamily,
      },
    })
  } catch (err) {
    console.error('Comparison creation failed:', err)
    // Don't fail the main submission for this
  }
}

// ─── READ HELPERS ───────────────────────────────────────────────────

/** Get latest type result for a user. */
export async function getLatestType(
  supabase: SupabaseClient,
  userId: string,
  source?: 'self' | 'coach',
) {
  let query = supabase
    .from('type_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10) // get a few to filter by source

  const { data } = await query
  if (!data?.length) return null

  if (source) {
    const filtered = data.find(r => r.scoring_json?.source === source)
    return filtered || null
  }

  return data[0]
}

/** Get comparison for a player. */
export async function getLatestComparison(
  supabase: SupabaseClient,
  playerId: string,
) {
  const { data } = await supabase
    .from('assessment_comparisons')
    .select('*')
    .eq('player_user_id', playerId)
    .order('created_at', { ascending: false })
    .limit(1)

  return data?.[0] || null
}

/** Get all type results for a user (history). */
export async function getTypeHistory(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from('type_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return data || []
}
