'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getYouthType, FAMILY_META, DIMENSION_META, AGE_GROUP_META, type AgeGroup } from '@/lib/youth/constants'
import { DIMENSIONS } from '@/services/scoring/calculate'
import Link from 'next/link'

export default function ResultsPage() {
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [isCoach, setIsCoach] = useState(false)
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: cm } = await supabase.from('team_memberships').select('id')
          .eq('user_id', user.id).eq('role_in_team', 'coach').limit(1)
        setIsCoach(!!(cm && cm.length > 0))

        const { data: pp } = await supabase.from('player_profiles').select('age_group')
          .eq('user_id', user.id).single()
        if (pp?.age_group) setAgeGroup(pp.age_group as AgeGroup)

        const { data: results } = await supabase
          .from('type_results').select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (results?.length) {
          setResult(results[0])
          setHistory(results)
          if (!ageGroup && results[0].age_group) setAgeGroup(results[0].age_group)
        }
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Lade Ergebnisse…</div>
    </div>
  )

  if (!result) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 fade-in">
        <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'float 3s ease-in-out infinite' }}>🧬</div>
        <h2 className="hero" style={{ fontSize: '1.8rem', marginBottom: '0.6rem' }}>
          Noch keine <span className="gradient-text">Ergebnisse</span>
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Schließe zuerst den Selbsttest ab — dann siehst du deinen Typ mit Tipps und Hilfestellungen.
        </p>
        <Link href="/dashboard/test" className="btn-accent">
          ✨ Test starten
        </Link>
      </div>
    )
  }

  const ty = getYouthType(result.result_type)
  const fam = ty ? FAMILY_META[ty.family as keyof typeof FAMILY_META] : null
  const ageMeta = ageGroup ? AGE_GROUP_META[ageGroup] : null

  return (
    <div className="max-w-3xl mx-auto fade-in">
      {/* Breadcrumb */}
      <div className="hm-breadcrumb">
        {isCoach ? 'Mein Profil' : 'Dein Profil'} · {result.result_type}
      </div>

      {/* Hero */}
      <h1 className="hero" style={{ marginBottom: '0.4rem' }}>
        {isCoach ? (
          <>Dein <span style={{ color: 'var(--accent)' }}>Profil</span></>
        ) : (
          <>Dein <span className="gradient-text">Typ</span></>
        )}
      </h1>
      <div className="hero-sub" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {ageMeta && <span className="hm-badge hm-badge-u16">{ageMeta.shortLabel} · {ageMeta.ageRange}</span>}
        <span>Getestet am {new Date(result.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      </div>

      {/* Typ Hero Card */}
      <div className="youth-type-card hm-bounce-in" style={{ marginTop: '1.4rem' }}>
        {fam && (
          <div className="type-family-tag" style={{ color: fam.color }}>
            {fam.icon} Familie der {fam.name}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem', flexWrap: 'wrap' }}>
          <div className="youth-type-emoji">{ty?.emoji || '🧬'}</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '2.2rem',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              background: isCoach ? 'none' : 'var(--grad-text)',
              WebkitBackgroundClip: isCoach ? 'initial' : 'text',
              WebkitTextFillColor: isCoach ? 'var(--accent)' : 'transparent',
              backgroundClip: isCoach ? 'initial' : 'text',
              color: isCoach ? 'var(--accent)' : undefined,
            }}>
              {ty?.name || result.result_label}
            </h2>
            {ty?.tagline && (
              <div style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--accent-2)',
                marginTop: '0.4rem',
                fontStyle: 'italic',
              }}>
                „{ty.tagline}"
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
              <span className="hm-badge hm-badge-purple">{result.result_type}</span>
              {result.confidence_score && (
                <span className="hm-badge hm-badge-pink">
                  Klarheit {Math.round(result.confidence_score)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {ty?.desc && (
          <p style={{
            fontSize: '0.98rem',
            lineHeight: 1.6,
            color: 'var(--ink-soft)',
            marginTop: '1.3rem',
          }}>
            {ty.desc}
          </p>
        )}

        {/* Info-Box: Was heißt das? */}
        <div style={{
          marginTop: '1.2rem',
          padding: '1rem 1.2rem',
          borderRadius: 18,
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.15)',
        }}>
          <div className="hm-section" style={{ marginBottom: '0.4rem' }}>💡 Was heißt das für dich?</div>
          <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--ink-soft)' }}>
            <strong style={{ color: 'var(--ink)' }}>{ty?.name || result.result_label}</strong> ist dein
            <strong style={{ color: 'var(--ink)' }}> natürlicher Schwerpunkt</strong> — also wie du
            <em> meistens </em> tickst. Du bist aber nicht NUR so. Die 4 Balken unten zeigen, wie stark jede
            Seite bei dir ausgeprägt ist. Jeder Mensch ist eine einzigartige Mischung.
          </div>
        </div>
      </div>

      {/* 4 Dimensionen */}
      {result.scoring_json?.dimensions && (
        <div className="card" style={{ marginTop: '1.4rem' }}>
          <div className="hm-section">Dein Profil · 4 Dimensionen</div>
          {DIMENSIONS.map(d => {
            const sc = (result.scoring_json.dimensions as any)?.[d.key]
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
                  letterSpacing: '0.04em',
                }}>
                  {sc.label} ({sc.pct}%)
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ JUGEND-TIPPS: Was du tun kannst / was du lassen solltest ═══ */}
      {ty?.playerDo && ty.playerDo.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0.9rem',
          marginTop: '1.4rem',
        }}>
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(20,184,196,0.04))',
            border: '1px solid rgba(16,185,129,0.18)',
          }}>
            <div className="hm-section" style={{ color: 'var(--success)' }}>
              ✓ Das hilft dir
            </div>
            {ty.playerDo.map((tip: string, i: number) => (
              <div key={i} className="strength-item" style={{ fontSize: '0.9rem' }}>{tip}</div>
            ))}
          </div>

          {ty.playerDont && ty.playerDont.length > 0 && (
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(245,158,11,0.04))',
              border: '1px solid rgba(236,72,153,0.18)',
            }}>
              <div className="hm-section" style={{ color: 'var(--danger)' }}>
                ⚠ Pass auf
              </div>
              {ty.playerDont.map((tip: string, i: number) => (
                <div key={i} style={{
                  fontSize: '0.9rem',
                  padding: '0.4rem 0 0.4rem 1.3rem',
                  position: 'relative',
                  lineHeight: 1.5,
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    color: 'var(--danger)',
                    fontWeight: 800,
                  }}>!</span>
                  {tip}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Self-Development */}
      {ty?.selfDev && ty.selfDev.length > 0 && (
        <div className="card" style={{
          marginTop: '1.4rem',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(236,72,153,0.04))',
          border: '1px solid rgba(139,92,246,0.15)',
        }}>
          <div className="hm-section">🎯 Daran kannst du gezielt arbeiten</div>
          {ty.selfDev.map((tip: string, i: number) => (
            <div key={i} style={{
              fontSize: '0.92rem',
              padding: '0.5rem 0 0.5rem 1.5rem',
              position: 'relative',
              lineHeight: 1.55,
              borderBottom: i < ty.selfDev.length - 1 ? '1px solid rgba(139,92,246,0.12)' : 'none',
            }}>
              <span style={{
                position: 'absolute',
                left: 0,
                fontWeight: 800,
                background: 'var(--grad-text)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{i + 1}.</span>
              {tip}
            </div>
          ))}
        </div>
      )}

      {/* Stärken & Risiken */}
      {(ty?.strengths || ty?.risks) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0.9rem',
          marginTop: '1.4rem',
        }}>
          {ty?.strengths && (
            <div className="card">
              <div className="hm-section" style={{ color: 'var(--success)' }}>Deine Stärken</div>
              {ty.strengths.map((s: string, i: number) => (
                <div key={i} className="strength-item" style={{ fontSize: '0.88rem' }}>{s}</div>
              ))}
            </div>
          )}
          {ty?.risks && (
            <div className="card">
              <div className="hm-section" style={{ color: 'var(--gold)' }}>⚠ Achtung</div>
              {ty.risks.map((r: string, i: number) => (
                <div key={i} style={{
                  fontSize: '0.88rem',
                  padding: '0.3rem 0 0.3rem 1.1rem',
                  position: 'relative',
                  lineHeight: 1.5,
                }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--gold)', fontWeight: 800 }}>!</span>
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Was motiviert / demotiviert dich */}
      {(ty?.why || ty?.whyNot) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0.9rem',
          marginTop: '1.4rem',
        }}>
          {ty?.why && (
            <div className="card">
              <div className="hm-section" style={{ color: 'var(--accent)' }}>💚 Das motiviert dich</div>
              {ty.why.map((r: string, i: number) => (
                <div key={i} style={{
                  fontSize: '0.88rem',
                  padding: '0.3rem 0 0.3rem 1.1rem',
                  position: 'relative',
                  lineHeight: 1.5,
                }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--accent)', fontWeight: 800 }}>→</span>
                  {r}
                </div>
              ))}
            </div>
          )}
          {ty?.whyNot && (
            <div className="card">
              <div className="hm-section" style={{ color: 'var(--muted)' }}>🔻 Das nervt dich</div>
              {ty.whyNot.map((r: string, i: number) => (
                <div key={i} style={{
                  fontSize: '0.88rem',
                  padding: '0.3rem 0 0.3rem 1.1rem',
                  position: 'relative',
                  lineHeight: 1.5,
                }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--muted)', fontWeight: 800 }}>×</span>
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tipps für Trainer (nur wenn Coach) */}
      {isCoach && (ty?.coachDo || ty?.coachDont) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '0.9rem',
          marginTop: '1.4rem',
        }}>
          {ty?.coachDo && (
            <div className="card" style={{ background: 'var(--surface-2)' }}>
              <div className="hm-section" style={{ color: 'var(--accent)' }}>👤 Wie Trainer dich unterstützen können</div>
              {ty.coachDo.map((tip: string, i: number) => (
                <div key={i} className="strength-item" style={{ fontSize: '0.88rem' }}>{tip}</div>
              ))}
            </div>
          )}
          {ty?.coachDont && (
            <div className="card" style={{ background: 'var(--surface-2)' }}>
              <div className="hm-section" style={{ color: 'var(--danger)' }}>👤 Was Trainer besser lassen</div>
              {ty.coachDont.map((tip: string, i: number) => (
                <div key={i} style={{
                  fontSize: '0.88rem',
                  padding: '0.3rem 0 0.3rem 1.1rem',
                  position: 'relative',
                  lineHeight: 1.5,
                }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--danger)', fontWeight: 800 }}>!</span>
                  {tip}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verlauf */}
      {history.length > 1 && (
        <div className="card" style={{ marginTop: '1.4rem' }}>
          <div className="hm-section">📈 Dein Verlauf</div>
          {history.map((h, i) => (
            <div
              key={h.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                padding: '0.7rem 0',
                borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>{h.scoring_json?.emoji || getYouthType(h.result_type)?.emoji || '🧬'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{h.result_label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {new Date(h.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                color: i === 0 ? 'var(--accent)' : 'var(--muted)',
              }}>
                {h.confidence_score?.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href={isCoach ? '/dashboard/coach' : '/dashboard/player'} className="btn-secondary">
          ← Zurück zum Dashboard
        </Link>
        <Link href="/dashboard/test" className="btn-primary">
          🔄 Test wiederholen
        </Link>
      </div>
    </div>
  )
}
