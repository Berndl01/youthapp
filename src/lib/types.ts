export type UserRole = 'player' | 'coach' | 'admin'
export type TeamRole = 'player' | 'coach'
export type QuestionnaireType = 'player_selftest' | 'coach_player_rating' | 'coach_selftest'
export type QuestionType = 'scale' | 'single_choice' | 'multiple_choice' | 'text'
export type SubmissionStatus = 'draft' | 'submitted'
export type PlayerTypeCode =
  | 'ESAF' | 'ESAD' | 'ESIF' | 'ESID'
  | 'ETAF' | 'ETAD' | 'ETIF' | 'ETID'
  | 'WSAF' | 'WSAD' | 'WSIF' | 'WSID'
  | 'WTAF' | 'WTAD' | 'WTIF' | 'WTID'

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Club {
  id: string
  name: string
  logo_url?: string
  created_at: string
}

export interface Team {
  id: string
  club_id: string
  name: string
  season: string
  created_at: string
  club?: Club
}

export interface TeamMembership {
  id: string
  user_id: string
  team_id: string
  role_in_team: TeamRole
  joined_at: string
  profile?: Profile
  team?: Team
}

export interface PlayerProfile {
  id: string
  user_id: string
  club_id: string
  team_id: string
  birth_date?: string
  position?: string
  jersey_number?: number
  is_active: boolean
  created_at: string
  profile?: Profile
}

export interface Questionnaire {
  id: string
  title: string
  description?: string
  type: QuestionnaireType
  version: number
  is_active: boolean
  created_at: string
  questions?: Question[]
}

export interface Question {
  id: string
  questionnaire_id: string
  text: string
  category: string
  question_type: QuestionType
  scale_min: number
  scale_max: number
  scale_min_label: string
  scale_max_label: string
  is_reversed: boolean
  sort_order: number
  is_required: boolean
  options?: QuestionOption[]
}

export interface QuestionOption {
  id: string
  question_id: string
  label: string
  value: number
  sort_order: number
}

export interface SurveySubmission {
  id: string
  questionnaire_id: string
  submitted_by: string
  subject_user_id: string
  team_id?: string
  status: SubmissionStatus
  submitted_at?: string
  created_at: string
  answers?: SurveyAnswer[]
  type_result?: TypeResult
}

export interface SurveyAnswer {
  id: string
  submission_id: string
  question_id: string
  answer_value?: number
  answer_text?: string
}

export interface TypeResult {
  id: string
  submission_id: string
  user_id: string
  result_type: PlayerTypeCode
  result_label: string
  confidence_score?: number
  scoring_json: Record<string, number>
  category_scores: Record<string, number>
  created_at: string
}

export interface CoachFeedback {
  id: string
  player_user_id: string
  coach_user_id: string
  team_id?: string
  title?: string
  feedback_text: string
  is_visible_to_player: boolean
  created_at: string
}

export interface PlayerTypeDefinition {
  code: PlayerTypeCode
  label: string
  emoji: string
  color: string
  description: string
  big_five_pattern?: string
  motivation_pattern?: string
  coaching_tips: string[]
  warning_signs: string[]
}

export interface AssessmentComparison {
  id: string
  player_user_id: string
  self_submission_id?: string
  coach_submission_id?: string
  match_score?: number
  differences_json: Record<string, number>
  created_at: string
}

// Extended types for UI
export interface PlayerWithProfile extends Profile {
  player_profile?: PlayerProfile
  latest_type?: TypeResult
  self_test_status?: 'none' | 'draft' | 'submitted'
  coach_rating_status?: 'none' | 'draft' | 'submitted'
}
