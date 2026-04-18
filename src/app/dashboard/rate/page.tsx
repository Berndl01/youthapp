'use client'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  DIMENSION_META, FAMILY_META, getYouthType, AGE_GROUP_META, type AgeGroup,
} from '@/lib/youth/constants'
import { getYouthQuestions, getYouthScoringQuestions, ageGroupFromBirthdate } from '@/lib/youth/scoring'
import { calculateType, DIMENSIONS } from '@/services/scoring/calculate'

const DIM_ORDER = ['drive', 'energy', 'mental', 'role'] as const

const BLOCK_META: Record<string, { icon: string; color: string; label: string }> = {
  drive:  { icon: '🎯', color: '#34D399', label: 'Antrieb' },
  energy: { icon: '⚡', color: '#A78BFA', label: 'Energie' },
  mental: { icon: '🧠', color: '#2FA7BC', label: 'Mentalität' },
  role:   { icon: '👑', color: '#F87171', label: 'Rolle' },
}

function RatePlayerInner() {
  const [player, setPlayer] = useState<any>(null)
  const [playerAge, setPlayerAge] = useState<AgeGroup>('u16')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [currentDim, setCurrentDim] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [selfResult, setSelfResult] = useState<any>(null)
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const playerId = searchParams.get('player')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        if (!playerId) { setLoading(false); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: coachTeams } = await supabase
          .from('team_memberships').select('team_id')
          .eq('user_id', user.id).eq('role_in_team', 'coach')
        if (!coachTeams?.length) { setLoading(false); return }

        const teamIds = coachTeams.map((t: any) => t.team_id)
        const { data: playerMembership } = await supabase
          .from('team_memberships').select('team_id')
          .eq('user_id', playerId).in('team_id', teamIds).limit(1)
        if (!playerMembership?.length) { setLoading(false); return }

        setAuthorized(true)
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', playerId).single()
        if (prof) setPlayer(prof)

        const { data: pp } = await supabase.from('player_profiles').select('age_group').eq('user_id', playerId).single()
        if (pp?.age_group) {
          setPlayerAge(pp.age_group as AgeGroup)
        } else if (prof?.birth_date) {
          setPlayerAge(ageGroupFromBirthdate(prof.birth_date))
        }

        const { data: selfTypes } = await supabase.from('type_results').select('*')
          .eq('user_id', playerId).order('created_at', { ascending: false }).limit(1)
        if (selfTypes?.length) setSelfResult(selfTypes[0])
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [playerId])

  const questions = getYouthQuestions('external_assessment', playerAge)
  const dim = DIM_ORDER[currentDim]
  const dimMeta = DIMENSION_META[dim]
  const blockMeta = BLOCK_META[dim]
  const dimQuestions = questions.filter(q => q.dim === dim)
  const answeredInDim = dimQuestions.filter(q => answers[q.id] !== undefined).length
  const allAnsweredInDim = answeredInDim === dimQuestions.length
  const totalAnswered = Object.keys(answers).length

  function setAnswer(qId: number, val: number) {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !playerId) { setSubmitting(false); return }

    const scoringQs = getYouthScoringQuestions('external_assessment', playerAge)
    const scoring = calculateType(answers, scoringQs)
    const code = scoring.code
    const typeData = getYouthType(code)
    const dimScores = scoring.dimensions
    const variantKey = `external_assessment_${playerAge}`
    const qId = playerAge === 'u13' ? '00000000-0000-0000-0000-000000002013'
              : playerAge === 'u16' ? '00000000-0000-0000-0000-000000002016'
              : '00000000-0000-0000-0000-000000002019'

    const { data: sub } = await supabase.from('survey_submissions').insert({
      questionnaire_id: qId,
      submitted_by: user.id,
      subject_user_id: playerId,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    }).select().single()

    if (sub) {
      await supabase.from('type_results').insert({
        submission_id: sub.id,
        user_id: playerId,
        result_type: code,
        result_label: typeData?.name || code,
        age_group: playerAge,
        questionnaire_variant: variantKey,
        confidence_score: null,
        scoring_json: { emoji: typeData?.emoji, source: 'coach', dimensions: dimScores, answers, ageGroup: playerAge },
        category_scores: Object.fromEntries(DIMENSIONS.map(d => [d.key, dimScores[d.key as keyof typeof dimScores].pct]))
      })

      if (selfResult) {
        const selfScores = selfResult.scoring_json?.dimensions || selfResult.category_scores
        if (selfScores) {
          let totalDiff = 0
          const diffs: Record<string, number> = {}
          for (const d of DIMENSIONS) {
            const selfPct = typeof selfScores[d.key] === 'object' ? selfScores[d.key].pct : (selfScores[d.key] || 50)
            const coachPct = dimScores[d.key as keyof typeof dimScores].pct
            diffs[d.key] = Math.abs(selfPct - coachPct)
            totalDiff += Math.abs(selfPct - coachPct)
          }
          await supabase.from('assessment_comparisons').insert({
            player_user_id: playerId,
            self_submission_id: selfResult.submission_id,
            coach_submission_id: sub.id,
            match_score: Math.round((1 - totalDiff / 400) * 100),
            differences_json: diffs
          })
        }
      }
    }

    setResult({ code, typeData, dimScores })
    setSubmitting(false)
  }

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Lade…</div>
    </div>
  )

  if (!playerId || (!player && !authorized)) return (
    <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>🔒</div>
      <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--ink)' }}>Keine Berechtigung</div>
      <div style={{ fontSize: '0.88rem' }}>Jugendliche*r nicht gefunden oder nicht in deinem Team.</div>
      <Link href="/dashboard/coach" className="btn-secondary" style={{ marginTop: '1.5rem' }}>
        ← Zurück
      </Link>
    </div>
  )

  // RESULT SCREEN
  if (result) {
    const ty = result.typeData || {}
    const fam = FAMILY_META[getYouthType(result.code)?.family as keyof typeof FAMILY_META]
    const matches = selfResult && selfResult.result_type === result.code

    return (
      <div className="max-w-2xl mx-auto fade-in">
        <div className="youth-type-card hm-bounce-in" style={{ marginTop: '1rem', textAlign: 'center' }}>
          <div className="youth-type-emoji" style={{ fontSize: '4.5rem' }}>{ty.emoji || '🧬'}</div>
          <div className="type-family-tag" style={{ color: 'var(--gold)', justifyContent: 'center' }}>
            👤 Trainer-Einschätzung · {AGE_GROUP_META[playerAge].shortLabel}
          </div>
          <h2 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '2.2rem',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            color: 'var(--accent)',
            marginTop: '0.3rem',
          }}>
            {ty.name}
          </h2>
          <div className="hm-badge hm-badge-cyan" style={{ marginTop: '0.5rem' }}>
            {result.code}
          </div>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--muted)',
            marginTop: '0.8rem',
          }}>
            Deine Einschätzung von <strong>{player.first_name} {player.last_name}</strong>
          </p>
        </div>

        {selfResult && (
          <div className="card" style={{ marginTop: '1.2rem' }}>
            <div className="hm-section">📊 Self vs. Coach Vergleich</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.8rem',
                padding: '0.8rem 1rem', background: 'var(--surface-2)', borderRadius: 14,
              }}>
                <div style={{ fontSize: '1.5rem' }}>🪞</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Selbstbild
                  </div>
                  <div style={{ fontWeight: 700 }}>{selfResult.result_label} ({selfResult.result_type})</div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.8rem',
                padding: '0.8rem 1rem', background: 'var(--surface-2)', borderRadius: 14,
              }}>
                <div style={{ fontSize: '1.5rem' }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Fremdbild (Coach)
                  </div>
                  <div style={{ fontWeight: 700 }}>{ty.name} ({result.code})</div>
                </div>
              </div>
            </div>
            {matches && (
              <div style={{
                marginTop: '1rem',
                padding: '0.9rem 1rem',
                borderRadius: 14,
                background: 'rgba(16,185,129,0.1)',
                color: 'var(--success)',
                fontSize: '0.88rem',
                fontWeight: 700,
              }}>
                ✓ Selbstbild und Fremdbild stimmen überein — hohe Selbstwahrnehmung
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={`/dashboard/players/${playerId}`} className="btn-primary">
            → Spieler-Profil ansehen
          </Link>
          <Link href="/dashboard/team" className="btn-secondary">
            Zur Mannschaft
          </Link>
        </div>
      </div>
    )
  }

  // RATING UI
  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div style={{
        fontSize: '0.65rem',
        fontWeight: 800,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: blockMeta.color,
        marginBottom: '0.4rem',
      }}>
        {blockMeta.icon} {blockMeta.label} · Block {currentDim + 1}/{DIM_ORDER.length}
      </div>

      <h1 className="hero" style={{ fontSize: '1.9rem' }}>
        Fremd-<span style={{ color: 'var(--accent)' }}>einschätzung</span>
      </h1>
      <p className="hero-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        Bewertung von <strong>{player?.first_name} {player?.last_name}</strong>
        <span className="hm-badge hm-badge-u16">{AGE_GROUP_META[playerAge].shortLabel}</span>
        <span>· {dimQuestions.length} Fragen</span>
      </p>

      {totalAnswered > 0 && (
        <div style={{
          fontSize: '0.72rem',
          marginTop: '0.7rem',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
        }}>
          💾 {totalAnswered}/{questions.length} gespeichert
        </div>
      )}

      {/* Progress */}
      <div className="progress-row" style={{ marginTop: '1rem' }}>
        {DIM_ORDER.map((d, i) => (
          <div key={d} className={`progress-seg ${i <= currentDim ? 'done' : ''}`} />
        ))}
      </div>

      {/* Fragen */}
      <div style={{ marginTop: '1.2rem' }}>
        {dimQuestions.map(q => (
          <div
            key={q.id}
            className="q-card"
            style={{
              borderColor: answers[q.id] !== undefined ? blockMeta.color + '55' : undefined,
            }}
          >
            <div className="q-text">
              <span className="q-num" style={{ color: blockMeta.color }}>{q.id}</span>
              {q.text}
            </div>
            <div className="scale-row">
              {[1,2,3,4,5,6,7].map(val => (
                <button
                  key={val}
                  onClick={() => setAnswer(q.id, val)}
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
        {currentDim < 3 ? (
          <button
            onClick={() => setCurrentDim(currentDim + 1)}
            disabled={!allAnsweredInDim}
            className="btn-primary"
            style={{ opacity: allAnsweredInDim ? 1 : 0.5 }}
          >
            {allAnsweredInDim ? 'Weiter →' : `Noch ${dimQuestions.length - answeredInDim}`}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !allAnsweredInDim}
            className="btn-primary"
            style={{ opacity: allAnsweredInDim ? 1 : 0.5 }}
          >
            {submitting ? '⏳ Wird berechnet…' : '✓ Bewertung abschließen'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function RatePlayerPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20">
        <div style={{ color: 'var(--muted)' }}>Lade…</div>
      </div>
    }>
      <RatePlayerInner />
    </Suspense>
  )
}
