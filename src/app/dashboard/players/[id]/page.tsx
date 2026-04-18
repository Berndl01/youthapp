'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getYouthType, DIMENSION_META, FAMILY_META, ANCHOR_METRICS, AGE_GROUP_META, type AgeGroup } from '@/lib/youth/constants'
import { getFamily as getFamilyKey, DIMENSIONS } from '@/services/scoring/calculate'
import Link from 'next/link'

const MONTH_NAMES = ['', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez', 'Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun']
const ANCHOR_KEYS = ['anchor_satisfaction', 'anchor_psych_safety', 'anchor_commitment', 'anchor_alignment', 'anchor_motivation']

export default function PlayerDetailPage() {
  const params = useParams()
  const playerId = params.id as string
  const [player, setPlayer] = useState<any>(null)
  const [playerProfile, setPlayerProfile] = useState<any>(null)
  const [selfType, setSelfType] = useState<any>(null)
  const [coachType, setCoachType] = useState<any>(null)
  const [comparison, setComparison] = useState<any>(null)
  const [feedback, setFeedback] = useState<any[]>([])
  const [batteries, setBatteries] = useState<any[]>([])
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackVisible, setFeedbackVisible] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        if (!playerId) { setLoading(false); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: coachTeams } = await supabase.from('team_memberships').select('team_id')
          .eq('user_id', user.id).eq('role_in_team', 'coach')
        if (!coachTeams?.length) { setLoading(false); return }
        const teamIds = coachTeams.map((t: any) => t.team_id)
        const { data: playerTeam } = await supabase.from('team_memberships').select('team_id')
          .eq('user_id', playerId).in('team_id', teamIds).limit(1)
        if (!playerTeam?.length) { setLoading(false); return }
        setAuthorized(true)

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', playerId).single()
        if (prof) setPlayer(prof)
        const { data: pp } = await supabase.from('player_profiles').select('*').eq('user_id', playerId).limit(1)
        if (pp?.length) setPlayerProfile(pp[0])

        const { data: types } = await supabase.from('type_results').select('*')
          .eq('user_id', playerId).order('created_at', { ascending: false })
        if (types) {
          const self = types.find((t: any) => t.scoring_json?.source !== 'coach')
          const coach = types.find((t: any) => t.scoring_json?.source === 'coach')
          if (self) setSelfType(self)
          if (coach) setCoachType(coach)
        }

        const { data: comp } = await supabase.from('assessment_comparisons').select('*')
          .eq('player_user_id', playerId).order('created_at', { ascending: false }).limit(1)
        if (comp?.length) setComparison(comp[0])

        const { data: fb } = await supabase.from('coach_feedback').select('*')
          .eq('player_user_id', playerId).eq('coach_user_id', user.id)
          .order('created_at', { ascending: false })
        if (fb) setFeedback(fb)

        const { data: bat } = await supabase.from('battery_responses').select('*')
          .eq('user_id', playerId).order('season_month')
        if (bat) setBatteries(bat)
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [playerId])

  async function sendFeedback() {
    if (!feedbackText.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data: mem } = await supabase.from('team_memberships').select('team_id')
      .eq('user_id', playerId).limit(1)
    await supabase.from('coach_feedback').insert({
      player_user_id: playerId, coach_user_id: user.id,
      team_id: mem?.[0]?.team_id || null,
      feedback_text: feedbackText.trim(), is_visible_to_player: feedbackVisible
    })
    setFeedbackText('')
    setSaving(false)
    window.location.reload()
  }

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Lade Spieler…</div>
    </div>
  )

  if (!authorized) return (
    <div className="max-w-lg mx-auto text-center py-16 fade-in">
      <div style={{ fontSize: '3rem', marginBottom: '0.6rem' }}>🔒</div>
      <h2 className="hero" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Keine Berechtigung</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '1.4rem' }}>
        Spieler nicht gefunden oder nicht in deinem Team.
      </p>
      <Link href="/dashboard/coach" className="btn-primary">← Zurück zum Dashboard</Link>
    </div>
  )

  const selfTy = selfType ? getYouthType(selfType.result_type) : null
  const coachTy = coachType ? getYouthType(coachType.result_type) : null
  const selfFam = selfType ? FAMILY_META[getFamilyKey(selfType.result_type) as keyof typeof FAMILY_META] : null
  const pAge: AgeGroup | null = playerProfile?.age_group || selfType?.age_group || null
  const initials = `${(player?.first_name || '?')[0]}${(player?.last_name || '')[0] || ''}`.toUpperCase()

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="hm-breadcrumb">
        <Link href="/dashboard/coach" style={{ color: 'inherit' }}>Dashboard</Link> · Spieler-Profil
      </div>

      {/* Header Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="hm-avatar" style={{
            width: 72, height: 72, fontSize: '1.6rem',
            background: selfTy ? `linear-gradient(135deg, ${selfFam?.color || '#7c3aed'}, ${selfFam?.color || '#ec4899'}cc)` : undefined,
            color: 'white',
          }}>
            {selfTy?.emoji || initials}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 className="hero" style={{ fontSize: '1.8rem' }}>
              {player.first_name} {player.last_name}
            </h1>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.4rem' }}>
              {pAge && <span className="hm-badge hm-badge-u16">{AGE_GROUP_META[pAge].shortLabel}</span>}
              {selfTy && (
                <span className="hm-badge hm-badge-purple">
                  {selfTy.name} ({selfType.result_type})
                </span>
              )}
              {selfFam && (
                <span className="hm-badge hm-badge-pink">
                  {selfFam.icon} {selfFam.name}
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/dashboard/rate?player=${playerId}`}
            className="btn-accent"
            style={{ flexShrink: 0 }}
          >
            👤 Bewerten
          </Link>
        </div>

        {/* Stammdaten */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.8rem',
          marginTop: '1.3rem',
          paddingTop: '1.2rem',
          borderTop: '1px solid var(--border)',
        }}>
          {[
            ['Position', playerProfile?.position],
            ['Rückennummer', playerProfile?.jersey_number ? `#${playerProfile.jersey_number}` : null],
            ['Starker Fuß', playerProfile?.preferred_foot],
            ['Geburtsdatum', playerProfile?.birth_date ? new Date(playerProfile.birth_date).toLocaleDateString('de-AT') : null],
            ['Größe', playerProfile?.height_cm ? `${playerProfile.height_cm} cm` : null],
            ['Gewicht', playerProfile?.weight_kg ? `${playerProfile.weight_kg} kg` : null],
            ['Vorherige Akademien', playerProfile?.previous_clubs],
            ['E-Mail', player.email],
          ].map(([label, value]) => (
            <div key={label as string}>
              <div style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                {label}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)', marginTop: '0.15rem', wordBreak: 'break-word' }}>
                {value || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typ-Profil (Selbsttest) */}
      {selfType?.scoring_json?.dimensions && (
        <div className="card" style={{ marginTop: '1.2rem' }}>
          <div className="hm-section">🧬 Typ-Profil · Selbsteinschätzung</div>
          {DIMENSIONS.map(d => {
            const sc = selfType.scoring_json.dimensions[d.key]
            if (!sc) return null
            const meta = DIMENSION_META[d.key as keyof typeof DIMENSION_META]
            const isLeft = sc.pct >= 50
            return (
              <div key={d.key} className="dim-row">
                <div className="dim-head">
                  <span style={{ color: meta.colorA }}>{meta.poleA}</span>
                  <span style={{ color: 'var(--muted)' }}>{meta.icon} {meta.label}</span>
                  <span style={{ color: meta.colorB }}>{meta.poleB}</span>
                </div>
                <div className="dim-bar-wrap">
                  {isLeft ? (
                    <div className="dim-bar" style={{ width: `${sc.pct}%`, background: meta.colorA, left: 0 }} />
                  ) : (
                    <div className="dim-bar" style={{ width: `${100 - sc.pct}%`, background: meta.colorB, left: `${sc.pct}%` }} />
                  )}
                  <div className="dim-center" />
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  marginTop: '0.3rem',
                  color: isLeft ? meta.colorA : meta.colorB,
                }}>
                  {sc.label} ({sc.pct}%)
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Self vs Coach Vergleich */}
      {comparison && selfType?.scoring_json?.dimensions && coachType?.scoring_json?.dimensions && (() => {
        const matchColor = comparison.match_score >= 80 ? 'var(--success)' : comparison.match_score >= 60 ? 'var(--gold)' : 'var(--danger)'
        return (
          <div className="card" style={{
            marginTop: '1.2rem',
            border: `2px solid ${matchColor}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}>
              <div className="hm-section" style={{ margin: 0 }}>📊 Self vs. Coach Vergleich</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: matchColor,
              }}>
                {comparison.match_score}% Match
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.7rem',
              marginBottom: '1.2rem',
            }}>
              <div style={{
                padding: '1rem', borderRadius: 16, textAlign: 'center',
                background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)',
              }}>
                <div className="hm-section" style={{ margin: 0, color: 'var(--accent)' }}>🪞 Selbstbild</div>
                <div style={{ fontSize: '2.2rem', marginTop: '0.5rem' }}>{selfTy?.emoji}</div>
                <div style={{ fontWeight: 800, marginTop: '0.2rem', color: 'var(--ink)' }}>{selfTy?.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{selfType.result_type}</div>
              </div>
              <div style={{
                padding: '1rem', borderRadius: 16, textAlign: 'center',
                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)',
              }}>
                <div className="hm-section" style={{ margin: 0, color: 'var(--gold)' }}>👤 Fremdbild</div>
                <div style={{ fontSize: '2.2rem', marginTop: '0.5rem' }}>{coachTy?.emoji}</div>
                <div style={{ fontWeight: 800, marginTop: '0.2rem', color: 'var(--ink)' }}>{coachTy?.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{coachType.result_type}</div>
              </div>
            </div>

            <div className="hm-section" style={{ color: 'var(--muted)' }}>Pro Dimension</div>
            {DIMENSIONS.map(d => {
              const selfDim = selfType.scoring_json.dimensions[d.key]
              const coachDim = coachType.scoring_json.dimensions[d.key]
              if (!selfDim || !coachDim) return null
              const meta = DIMENSION_META[d.key as keyof typeof DIMENSION_META]
              const diff = Math.abs(selfDim.pct - coachDim.pct)
              const severity = diff > 35 ? 'gap' : diff > 20 ? 'attention' : 'match'
              const sevColor = severity === 'gap' ? 'var(--danger)' : severity === 'attention' ? 'var(--gold)' : 'var(--success)'

              return (
                <div
                  key={d.key}
                  style={{
                    padding: '0.8rem',
                    borderRadius: 14,
                    marginBottom: '0.5rem',
                    background: `rgba(0,0,0,0.02)`,
                    border: `1px solid ${sevColor}44`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    <span>{meta.icon} {meta.label}</span>
                    <span style={{ color: sevColor }}>
                      Δ {diff}% {severity === 'gap' ? '⚠' : severity === 'attention' ? '●' : '✓'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.68rem', width: 44, color: 'var(--accent)', fontWeight: 700 }}>Self</span>
                    <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--border)' }}>
                      <div style={{ height: '100%', width: `${selfDim.pct}%`, borderRadius: 999, background: 'var(--accent)' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', width: 48, textAlign: 'right', fontWeight: 700 }}>
                      {selfDim.pct}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.68rem', width: 44, color: 'var(--gold)', fontWeight: 700 }}>Coach</span>
                    <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--border)' }}>
                      <div style={{ height: '100%', width: `${coachDim.pct}%`, borderRadius: 999, background: 'var(--gold)' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', width: 48, textAlign: 'right', fontWeight: 700 }}>
                      {coachDim.pct}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Coaching-Tipps */}
      {selfTy && (selfTy.coachDo || selfTy.coachDont) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0.9rem',
          marginTop: '1.2rem',
        }}>
          {selfTy.coachDo && (
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(20,184,196,0.04))',
              border: '1px solid rgba(16,185,129,0.18)',
            }}>
              <div className="hm-section" style={{ color: 'var(--success)' }}>✓ So coachen</div>
              {selfTy.coachDo.map((t: string, i: number) => (
                <div key={i} className="strength-item" style={{ fontSize: '0.88rem' }}>{t}</div>
              ))}
            </div>
          )}
          {selfTy.coachDont && (
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(245,158,11,0.04))',
              border: '1px solid rgba(236,72,153,0.18)',
            }}>
              <div className="hm-section" style={{ color: 'var(--danger)' }}>✕ Vermeiden</div>
              {selfTy.coachDont.map((t: string, i: number) => (
                <div key={i} style={{
                  fontSize: '0.88rem',
                  padding: '0.35rem 0 0.35rem 1.3rem',
                  position: 'relative',
                  lineHeight: 1.5,
                }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--danger)', fontWeight: 800 }}>!</span>
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ankerwerte Verlauf */}
      {batteries.length > 0 && (
        <div className="card" style={{ marginTop: '1.2rem' }}>
          <div className="hm-section">📈 Ankerwerte · Verlauf</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.82rem', minWidth: 400, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: '0.6rem', fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em' }}>MONAT</th>
                  {ANCHOR_METRICS.map(a => (
                    <th key={a.key} style={{ textAlign: 'center', paddingBottom: '0.6rem', fontSize: '1rem' }} title={a.question}>
                      {a.icon}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', paddingBottom: '0.6rem', fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em' }}>RISIKO</th>
                </tr>
              </thead>
              <tbody>
                {batteries.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 700 }}>
                      {MONTH_NAMES[b.season_month]}{' '}
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600 }}>{b.battery}</span>
                    </td>
                    {ANCHOR_KEYS.map(k => {
                      const v = b[k]
                      const col = v >= 6 ? 'var(--success)' : v >= 4 ? 'var(--gold)' : v ? 'var(--danger)' : 'var(--muted)'
                      return (
                        <td key={k} style={{ textAlign: 'center', padding: '0.6rem 0', fontWeight: 800, color: col }}>
                          {v?.toFixed(1) || '—'}
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'center', padding: '0.6rem 0', fontSize: '1rem' }}>
                      {b.turnover_risk === 'low' ? '🟢' : b.turnover_risk === 'mid' ? '🟡' : '🔴'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feedback schreiben */}
      <div className="card" style={{
        marginTop: '1.2rem',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(236,72,153,0.03))',
        border: '1.5px solid rgba(245,158,11,0.18)',
      }}>
        <div className="hm-section" style={{ color: 'var(--gold)' }}>
          💬 Feedback an {player.first_name}
        </div>
        <textarea
          value={feedbackText}
          onChange={e => setFeedbackText(e.target.value)}
          placeholder="Dein Feedback für den Spieler…"
          rows={3}
          style={{ marginBottom: '0.8rem' }}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.7rem',
          flexWrap: 'wrap',
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 600,
            letterSpacing: 0,
            textTransform: 'none',
            color: 'var(--ink-soft)',
            margin: 0,
          }}>
            <input
              type="checkbox"
              checked={feedbackVisible}
              onChange={e => setFeedbackVisible(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
            />
            {feedbackVisible ? '👁 Für Spieler sichtbar' : '🔒 Nur für dich (intern)'}
          </label>
          <button
            onClick={sendFeedback}
            disabled={saving || !feedbackText.trim()}
            className="btn-primary"
            style={{ opacity: saving || !feedbackText.trim() ? 0.5 : 1 }}
          >
            {saving ? '⏳ Wird gesendet…' : '→ Senden'}
          </button>
        </div>
      </div>

      {/* Feedback History */}
      {feedback.length > 0 && (
        <div className="card" style={{ marginTop: '1.2rem' }}>
          <div className="hm-section">📜 Bisheriges Feedback ({feedback.length})</div>
          {feedback.map((fb: any, i: number) => (
            <div
              key={fb.id}
              style={{
                padding: '0.9rem 0',
                borderBottom: i < feedback.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                <span
                  className={`hm-badge ${fb.is_visible_to_player ? 'hm-badge-green' : 'hm-badge-gold'}`}
                  style={{ fontSize: '0.64rem' }}
                >
                  {fb.is_visible_to_player ? '👁 Sichtbar' : '🔒 Intern'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>
                  {new Date(fb.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div style={{ fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                {fb.feedback_text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/dashboard/coach" className="btn-secondary">
          ← Zurück zum Dashboard
        </Link>
        <Link href={`/dashboard/rate?player=${playerId}`} className="btn-accent">
          👤 Neu bewerten
        </Link>
      </div>
    </div>
  )
}
