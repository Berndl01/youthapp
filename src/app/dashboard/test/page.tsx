'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AGE_GROUP_META,
  DIMENSION_META,
  getYouthType,
  FAMILY_META,
  type AgeGroup,
} from '@/lib/youth/constants'
import {
  getYouthQuestions,
  getYouthScoringQuestions,
  ageGroupFromBirthdate,
} from '@/lib/youth/scoring'
import { calculateType, DIMENSIONS } from '@/services/scoring/calculate'

const DIM_ORDER = ['drive', 'energy', 'mental', 'role'] as const

// Blocktitel passend zum Preview (Icon + Youth-Sprache)
const BLOCK_META: Record<string, { icon: string; color: string; youth: string; coach: string }> = {
  drive:  { icon: '🎯', color: '#34D399', youth: 'Was treibt dich?',          coach: 'Antrieb' },
  energy: { icon: '⚡', color: '#A78BFA', youth: 'Woher kommt deine Energie?', coach: 'Energie' },
  mental: { icon: '🧠', color: '#2FA7BC', youth: 'Wie tickst du innen?',       coach: 'Mentalität' },
  role:   { icon: '👑', color: '#F87171', youth: 'Deine Rolle.',               coach: 'Rolle' },
}

export default function YouthTestPage() {
  const [answers, setAnswers] = useState<Record<number, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('humatrix_youth_test_draft')
        if (saved) return JSON.parse(saved)
      } catch {}
    }
    return {}
  })

  const [currentDim, setCurrentDim] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isCoach, setIsCoach] = useState(false)
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  function setAnswerAndSave(qId: number, val: number) {
    setAnswers(prev => {
      const next = { ...prev, [qId]: val }
      try { localStorage.setItem('humatrix_youth_test_draft', JSON.stringify(next)) } catch {}
      return next
    })
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (prof) setProfile(prof)

        const { data: cm } = await supabase.from('team_memberships').select('id')
          .eq('user_id', user.id).eq('role_in_team', 'coach').limit(1)
        const coach = !!(cm && cm.length > 0)
        setIsCoach(coach)

        if (!coach) {
          const { data: pp } = await supabase.from('player_profiles').select('age_group')
            .eq('user_id', user.id).single()
          if (pp?.age_group) {
            setAgeGroup(pp.age_group as AgeGroup)
          } else if (prof?.birth_date) {
            setAgeGroup(ageGroupFromBirthdate(prof.birth_date))
          } else {
            setAgeGroup('u16')
          }
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Wird geladen…</div>
    </div>
  )

  const questions = isCoach
    ? getYouthQuestions('trainer_personality')
    : getYouthQuestions('player_selftest', ageGroup!)

  const dim = DIM_ORDER[currentDim]
  const dimMeta = DIMENSION_META[dim]
  const blockMeta = BLOCK_META[dim]
  const dimQuestions = questions.filter(q => q.dim === dim)
  const totalDims = DIM_ORDER.length

  const answeredInDim = dimQuestions.filter(q => answers[q.id] !== undefined).length
  const allAnsweredInDim = answeredInDim === dimQuestions.length
  const totalAnswered = Object.keys(answers).length

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSubmitting(false); return }

      const scoringQs = isCoach
        ? getYouthScoringQuestions('trainer_personality')
        : getYouthScoringQuestions('player_selftest', ageGroup!)
      const scoring = calculateType(answers, scoringQs)
      const code = scoring.code
      const typeData = getYouthType(code)
      const dimScores = scoring.dimensions
      const variantKey = isCoach ? 'trainer_personality' : `player_selftest_${ageGroup}`

      const qId = isCoach
        ? '00000000-0000-0000-0000-000000003001'
        : (ageGroup === 'u13' ? '00000000-0000-0000-0000-000000001013'
          : ageGroup === 'u16' ? '00000000-0000-0000-0000-000000001016'
          : '00000000-0000-0000-0000-000000001019')

      const { data: sub } = await supabase.from('survey_submissions').insert({
        questionnaire_id: qId,
        submitted_by: user.id,
        subject_user_id: user.id,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }).select().single()

      if (sub) {
        await supabase.from('type_results').insert({
          submission_id: sub.id,
          user_id: user.id,
          result_type: code,
          result_label: typeData?.name || code,
          age_group: isCoach ? null : ageGroup,
          questionnaire_variant: variantKey,
          confidence_score: Math.round(
            DIMENSIONS.reduce((s, d) => s + Math.abs(dimScores[d.key as keyof typeof dimScores].pct - 50), 0) / 4 * 2
          ),
          scoring_json: { emoji: typeData?.emoji, family: scoring.family, dimensions: dimScores, answers, ageGroup, source: 'self' },
          category_scores: Object.fromEntries(
            DIMENSIONS.map(d => [d.key, dimScores[d.key as keyof typeof dimScores].pct])
          )
        })
      }

      try { localStorage.removeItem('humatrix_youth_test_draft') } catch {}
      setResult({ code, typeData, family: scoring.family, dimScores })
    } catch (e) { console.error(e); alert('Fehler beim Speichern.') }
    setSubmitting(false)
  }

  // ═══ RESULT SCREEN ═══════════════════════════════════════════
  if (result) {
    const ty = result.typeData || {}
    const fam = FAMILY_META[result.family as keyof typeof FAMILY_META]
    const ageMeta = !isCoach && ageGroup ? AGE_GROUP_META[ageGroup] : null

    return (
      <div className="max-w-2xl mx-auto fade-in">
        <div className="youth-type-card hm-bounce-in" style={{ marginTop: '1rem', textAlign: 'center' }}>
          <div className="youth-type-emoji" style={{ fontSize: '5rem', marginBottom: '0.5rem' }}>
            {ty.emoji || '🧬'}
          </div>
          {fam && (
            <div className="type-family-tag" style={{ color: fam.color, justifyContent: 'center' }}>
              {fam.icon} {fam.name}
            </div>
          )}
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '2.4rem',
            fontWeight: 900,
            letterSpacing: '-0.045em',
            lineHeight: 1,
            marginTop: '0.3rem',
            background: isCoach ? 'none' : 'var(--grad-text)',
            WebkitBackgroundClip: isCoach ? 'initial' : 'text',
            WebkitTextFillColor: isCoach ? (ty.color || 'var(--accent)') : 'transparent',
            backgroundClip: isCoach ? 'initial' : 'text',
            color: isCoach ? (ty.color || 'var(--accent)') : undefined,
          }}>
            {ty.name}
          </h2>
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.7rem' }}>
            <span className="hm-badge hm-badge-purple">{result.code}</span>
            {ageMeta && <span className="hm-badge hm-badge-u16">{ageMeta.shortLabel}</span>}
          </div>
          {ty.tagline && (
            <div style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--accent-2)',
              marginTop: '0.8rem',
              fontStyle: 'italic',
            }}>
              „{ty.tagline}"
            </div>
          )}
          <p style={{
            fontSize: '0.95rem',
            lineHeight: 1.55,
            color: 'var(--ink-soft)',
            marginTop: '1rem',
            maxWidth: 460,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            {ty.desc}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/results" className="btn-accent">
            ✨ Ganzes Profil ansehen
          </Link>
          <Link href={isCoach ? '/dashboard/coach' : '/dashboard/player'} className="btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // ═══ TEST UI ═══════════════════════════════════════════════════
  return (
    <div className="max-w-2xl mx-auto fade-in">
      {/* Block-Header */}
      <div style={{
        fontSize: '0.65rem',
        fontWeight: 800,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: blockMeta.color,
        marginBottom: '0.4rem',
      }}>
        {blockMeta.icon} {blockMeta.coach} · Block {currentDim + 1}/{totalDims}
      </div>

      <h1 className="hero">
        {isCoach ? (
          <>Dein <span style={{ color: 'var(--accent)' }}>Test</span></>
        ) : (
          <>Dein-<span className="gradient-text">Test</span></>
        )}
        {!isCoach && ageGroup && (
          <span className="hm-badge hm-badge-u16" style={{ verticalAlign: 'middle', marginLeft: '0.6rem', fontSize: '0.7rem' }}>
            {AGE_GROUP_META[ageGroup].shortLabel}
          </span>
        )}
      </h1>
      <div className="hero-sub">
        {dimMeta.poleA} vs. {dimMeta.poleB} · {dimQuestions.length} Fragen · ca. {Math.max(2, Math.ceil(dimQuestions.length * 0.25))} Min.
      </div>

      {totalAnswered > 0 && totalAnswered < questions.length && (
        <div style={{
          fontSize: '0.72rem',
          marginTop: '0.8rem',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
        }}>
          💾 Entwurf · {totalAnswered}/{questions.length} gespeichert
        </div>
      )}

      {/* Progress Bar */}
      <div className="progress-row" style={{ marginTop: '1rem' }}>
        {DIM_ORDER.map((d, i) => (
          <div key={d} className={`progress-seg ${i <= currentDim ? 'done' : ''}`} />
        ))}
      </div>

      {/* Questions */}
      <div style={{ marginTop: '1.2rem' }}>
        {dimQuestions.map(q => (
          <div key={q.id} className="q-card" style={{
            borderColor: answers[q.id] !== undefined ? blockMeta.color + '66' : undefined,
          }}>
            <div className="q-text">
              <span className="q-num" style={{ color: blockMeta.color }}>{q.id}</span>
              {q.text}
            </div>
            <div className="scale-row">
              {[1,2,3,4,5,6,7].map(val => (
                <button
                  key={val}
                  onClick={() => setAnswerAndSave(q.id, val)}
                  className={`scale-btn ${answers[q.id] === val ? 'active' : ''}`}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="q-scale-labels">
              <span>Trifft gar nicht zu</span>
              <span>Trifft voll zu</span>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.7rem',
        marginTop: '1.8rem',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setCurrentDim(Math.max(0, currentDim - 1))}
          disabled={currentDim === 0}
          className="btn-secondary"
          style={{ opacity: currentDim === 0 ? 0.4 : 1 }}
        >
          ← Zurück
        </button>
        {currentDim < totalDims - 1 ? (
          <button
            onClick={() => setCurrentDim(currentDim + 1)}
            className="btn-primary"
            disabled={!allAnsweredInDim}
            style={{ opacity: allAnsweredInDim ? 1 : 0.5 }}
          >
            {allAnsweredInDim ? 'Weiter →' : `Noch ${dimQuestions.length - answeredInDim} offen`}
          </button>
        ) : (
          <div style={{ textAlign: 'right' }}>
            {totalAnswered < questions.length && (
              <div style={{ fontSize: '0.72rem', marginBottom: '0.4rem', color: 'var(--gold)', fontWeight: 600 }}>
                {totalAnswered}/{questions.length} Fragen
              </div>
            )}
            <button
              onClick={() => {
                if (confirm('Test wirklich abschließen? Antworten können danach nicht mehr geändert werden.')) handleSubmit()
              }}
              disabled={submitting || totalAnswered < questions.length}
              className={!isCoach && totalAnswered >= questions.length ? 'btn-accent' : 'btn-primary'}
              style={{ opacity: totalAnswered >= questions.length ? 1 : 0.5 }}
            >
              {submitting ? '⏳ Wird berechnet…' : totalAnswered >= questions.length ? '✨ Test abschließen' : `Noch ${questions.length - totalAnswered}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
