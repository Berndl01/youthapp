/**
 * HUMATRIX SERVICES – Public API
 * 
 * Usage in UI components:
 * 
 *   import { submitTest, getQuestionnaire, getType } from '@/services'
 * 
 * Architecture:
 * 
 *   UI Components
 *       ↓
 *   services/index.ts (this file - public API)
 *       ↓
 *   ┌─────────────────────┬──────────────────────┬──────────────────────┐
 *   │  scoring/calculate   │  comparison/compare   │  questionnaires/     │
 *   │  (pure math)         │  (pure math)          │  questionnaires      │
 *   │                      │                       │  (data + validation) │
 *   └──────────┬──────────┴──────────┬───────────┴──────────────────────┘
 *              │                      │
 *              ▼                      ▼
 *         scoring/types          scoring/persistence
 *         (static data)          (Supabase – ONLY DB layer)
 */

// Scoring
export { calculateType, calculateDimensions, makeCode, calculateConfidence, DIMENSIONS }
  from './scoring/calculate'
export type { ScoringResult, DimensionScore, ScoringQuestion, DimensionDef }
  from './scoring/calculate'

// Type definitions
export { getType, getAllTypes, getTypesByFamily, isValidTypeCode, FAMILIES }
  from './scoring/types'
export type { TypeDefinition, FamilyDefinition }
  from './scoring/types'

// Comparison
export { compareAssessments, comparisonToDbJson }
  from './comparison/compare'
export type { ComparisonResult, DimensionDifference }
  from './comparison/compare'

// Questionnaires
export { getQuestionnaire, getScoringQuestions, getQuestionsByDimension, validateAnswers, getCompletionPct }
  from './questionnaires/questionnaires'
export type { Questionnaire, QuestionnaireQuestion, QuestionnaireKey, ValidationResult }
  from './questionnaires/questionnaires'

// Persistence (DB operations)
export { submitTest, getLatestType, getLatestComparison, getTypeHistory }
  from './scoring/persistence'
export type { SubmitResult }
  from './scoring/persistence'
