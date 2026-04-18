'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getYouthType, FAMILY_META, AGE_GROUP_META, type AgeGroup } from '@/lib/youth/constants'
import Link from 'next/link'

export default function PlayerDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [playerProfile, setPlayerProfile] = useState<any>(null)
  const [latestType, setLatestType] = useState<any>(null)
  const [typeHistory, setTypeHistory] = useState<any[]>([])
  const [batteries, setBatteries] = useState<any[]>([])
  const [feedback, setFeedback] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (prof) setProfile(prof)

        const { data: pp } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).single()
        if (pp) setPlayerProfile(pp)

        const { data: types } = await supabase.from('type_results').select('*')
          .eq('user_id', user.id).order('created_at', { ascending: false })
        if (types?.length) {
          setLatestType(types[0])
          setTypeHistory(types)
        }

        const { data: bat } = await supabase.from('battery_responses').select('*')
          .eq('user_id', user.id).order('season_month')
        if (bat) setBatteries(bat)

        const { data: fb } = await supabase.from('coach_feedback').select('*')
          .eq('player_user_id', user.id).eq('is_visible_to_player', true)
          .order('created_at', { ascending: false }).limit(5)
        if (fb) setFeedback(fb)

        const { data: notifs } = await supabase.from('notifications').select('*')
          .eq('user_id', user.id).eq('is_read', false)
          .order('created_at', { ascending: false })
        if (notifs) setNotifications(notifs)
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)', fontSize: '0.95rem', fontWeight: 500 }}>Lade dein Profil…</div>
    </div>
  )

  const ty = latestType ? getYouthType(latestType.result_type) : null
  const fam = ty ? FAMILY_META[ty.family as keyof typeof FAMILY_META] : null
  const firstName = profile?.first_name || 'Freund'
  const ageGroup: AgeGroup | null = playerProfile?.age_group || latestType?.age_group || null
  const ageMeta = ageGroup ? AGE_GROUP_META[ageGroup] : null

  const weeklyTip = ty?.selfDev?.[0]
  const openSurveys = notifications.filter(n => n.type === 'battery_request')

  return (
    <div className="max-w-4xl mx-auto fade-in">
      {/* Hero */}
      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.15rem' }}>Willkommen zurück</div>
      <h1 className="hero">
        Hey, <span className="gradient-text">{firstName}</span> 👋
      </h1>
      <div className="hero-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        <span>Deine Youth Academy</span>
        {ageMeta && <span style={{
          display: 'inline-flex', padding: '2px 8px', borderRadius: 6,
          fontSize: '0.6rem', fontWeight: 800, letterSpacing: '.06em',
          background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
          border: '1px solid rgba(139,92,246,0.2)',
        }}>{ageMeta.shortLabel} · {ageMeta.ageRange}</span>}
      </div>

      {/* Offene Umfragen vom Trainer — Hero-CTA */}
      {openSurveys.length > 0 && (
        <div className="card" style={{
          marginTop: '1rem',
          background: 'rgba(249,115,22,0.08)',
          border: '1px solid rgba(249,115,22,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '2rem' }}>📬</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ink)' }}>
                {openSurveys.length === 1 ? 'Dein Trainer hat eine Umfrage geschickt' : `${openSurveys.length} neue Umfragen vom Trainer`}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                {openSurveys[0].title} · ca. {openSurveys[0].type === 'battery_request' ? '5' : '3'} Min
              </div>
            </div>
            <Link href={openSurveys[0].action_url || '/dashboard/battery'} className="btn-accent">
              Jetzt ausfüllen →
            </Link>
          </div>
        </div>
      )}

      {/* Type Card (Haupt-Hero) */}
      {ty ? (
        <div className="youth-type-card hm-bounce-in" style={{ marginTop: '1.4rem' }}>
          <div className="type-family-tag">
            {fam?.icon} {fam?.name} · Dein Typ
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
            <div className="youth-type-emoji">{ty.emoji}</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '2rem',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                background: 'var(--grad-text)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {ty.name}
              </h2>
              <div style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--accent-2)',
                marginTop: '0.3rem',
                fontStyle: 'italic',
              }}>
                „{ty.tagline}"
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
                <span className="hm-badge hm-badge-purple">{latestType.result_type}</span>
                {latestType.confidence_score && (
                  <span className="hm-badge hm-badge-pink">Klarheit {latestType.confidence_score}%</span>
                )}
                {ageMeta && <span className="hm-badge hm-badge-u16">{ageMeta.shortLabel}</span>}
              </div>
            </div>
          </div>

          <p style={{
            fontSize: '0.95rem',
            lineHeight: 1.55,
            color: 'var(--ink-soft)',
            marginTop: '1.2rem',
          }}>
            {ty.desc}
          </p>

          <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.4rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/results" className="btn-accent">
              → Ganzes Profil ansehen
            </Link>
            <Link href="/dashboard/test" className="btn-secondary">
              Test wiederholen
            </Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', marginTop: '1.4rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.8rem', animation: 'float 3s ease-in-out infinite' }}>🧬</div>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 900,
            fontSize: '1.8rem',
            marginBottom: '0.6rem',
            background: 'var(--grad-text)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Dein Typ wartet auf dich.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem', maxWidth: 440, margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
            In ~15 Minuten weißt du, welcher der 16 Humatrix-Typen du bist.<br />
            Ehrlich antworten — das Ergebnis bleibt zwischen dir und deinem Trainer.
          </p>
          <Link href="/dashboard/test" className="btn-accent" style={{ fontSize: '1rem' }}>
            ✨ Test starten
          </Link>
        </div>
      )}

      {/* Stories Row */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        overflowX: 'auto',
        padding: '2px 0 8px',
        marginTop: '1.2rem',
        WebkitOverflowScrolling: 'touch',
      }}>
        {[
          { href: '/dashboard/battery', icon: '📋', label: 'Check-in', hasNew: openSurveys.length > 0 },
          { href: '/dashboard/results', icon: '✨', label: 'Mein Typ', hasNew: false },
          { href: '/dashboard/history', icon: '📈', label: 'Verlauf', hasNew: false },
          { href: '/dashboard/feedback', icon: '💬', label: 'Feedback', hasNew: feedback.length > 0 },
          { href: '/dashboard/profile', icon: '👤', label: 'Profil', hasNew: false },
        ].map(s => (
          <Link key={s.href} href={s.href} style={{
            flex: '0 0 auto', width: 72, textAlign: 'center', textDecoration: 'none',
          }}>
            <div style={{
              width: 58, height: 58, borderRadius: '50%', padding: 3, margin: '0 auto 5px',
              background: s.hasNew
                ? 'linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)'
                : 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))',
              boxShadow: s.hasNew ? '0 0 16px rgba(236,72,153,0.25)' : 'none',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: '#141419',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem',
              }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#6e6e82', textTransform: 'uppercase' as const, letterSpacing: '.03em' }}>
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Tipp der Woche */}
      {weeklyTip && (
        <div className="youth-quote" style={{ marginTop: '1.4rem' }}>
          <div className="youth-quote-text">{weeklyTip}</div>
          <div className="youth-quote-caption">💡 Dein Tipp · diese Woche</div>
        </div>
      )}

      {/* Stärken-Preview (aus ty.strengths) */}
      {ty?.strengths && ty.strengths.length > 0 && (
        <div className="card" style={{ marginTop: '1.4rem' }}>
          <div className="hm-section">Deine Stärken</div>
          {ty.strengths.slice(0, 4).map((s: string, i: number) => (
            <div key={i} className="strength-item">{s}</div>
          ))}
          {ty.strengths.length > 4 && (
            <Link href="/dashboard/results" style={{
              display: 'inline-block',
              marginTop: '0.8rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--accent)',
            }}>
              Alle {ty.strengths.length} Stärken ansehen →
            </Link>
          )}
        </div>
      )}

      {/* Entwicklung Mini-Trend */}
      {batteries.length > 0 && (() => {
        const ANCHOR_LABELS = ['😊', '🛡️', '🔗', '🧭', '🔥']
        const ANCHOR_KEYS_SHORT = ['anchor_satisfaction', 'anchor_psych_safety', 'anchor_commitment', 'anchor_alignment', 'anchor_motivation']
        const MONTH_NAMES_SHORT = ['', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez', 'Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun']
        const latest = batteries[batteries.length - 1]
        const barMax = 7
        return (
          <div className="card" style={{ marginTop: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div className="hm-section" style={{ margin: 0 }}>📈 Deine Entwicklung</div>
              <Link href="/dashboard/history" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>
                Alles ansehen →
              </Link>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
              Letzter Check-in: {MONTH_NAMES_SHORT[latest.season_month] || '?'} · Batterie {latest.battery}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              {ANCHOR_KEYS_SHORT.map((key, i) => {
                const val = latest[key] as number | null
                const pct = val ? (val / barMax) * 100 : 0
                const col = val && val >= 6 ? 'var(--success)' : val && val >= 4 ? 'var(--gold)' : val ? 'var(--danger)' : 'var(--border)'
                return (
                  <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      height: 60,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        width: '70%',
                        height: `${Math.max(pct, 8)}%`,
                        borderRadius: '6px 6px 0 0',
                        background: col,
                        transition: 'height 0.5s ease',
                        minHeight: 4,
                      }} />
                    </div>
                    <div style={{ fontSize: '1rem', marginTop: '0.3rem' }}>{ANCHOR_LABELS[i]}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: col }}>
                      {val?.toFixed(1) || '—'}
                    </div>
                  </div>
                )
              })}
            </div>
            {batteries.length > 1 && (() => {
              const prev = batteries[batteries.length - 2]
              const changes = ANCHOR_KEYS_SHORT.map((key, i) => {
                const curr = latest[key] as number | null
                const prevVal = prev[key] as number | null
                if (!curr || !prevVal) return null
                const diff = curr - prevVal
                if (Math.abs(diff) < 0.3) return null
                return { label: ANCHOR_LABELS[i], diff }
              }).filter(Boolean) as { label: string; diff: number }[]
              if (changes.length === 0) return null
              return (
                <div style={{
                  marginTop: '0.6rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border)',
                  fontSize: '0.78rem',
                  color: 'var(--ink-soft)',
                  display: 'flex',
                  gap: '0.7rem',
                  flexWrap: 'wrap',
                }}>
                  {changes.map((c, i) => (
                    <span key={i} style={{ color: c.diff > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                      {c.label} {c.diff > 0 ? '↑' : '↓'} {Math.abs(c.diff).toFixed(1)}
                    </span>
                  ))}
                  <span style={{ color: 'var(--muted)' }}>vs. vorheriger Check-in</span>
                </div>
              )
            })()}
          </div>
        )
      })()}

      {/* Type History Mini */}
      {typeHistory.length > 1 && (
        <div className="card" style={{ marginTop: '1.4rem' }}>
          <div className="hm-section">🧬 Deine Typ-Entwicklung</div>
          <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.3rem' }}>
            {typeHistory.slice(0, 5).map((h, i) => {
              const hTy = getYouthType(h.result_type)
              return (
                <div key={h.id} style={{
                  flex: '0 0 auto',
                  textAlign: 'center',
                  padding: '0.7rem 1rem',
                  borderRadius: 14,
                  background: i === 0
                    ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.10))'
                    : 'var(--surface-2)',
                  border: i === 0 ? '1px solid rgba(139,92,246,0.3)' : '1px solid var(--border)',
                  boxShadow: i === 0 ? '0 0 20px rgba(139,92,246,0.1)' : 'none',
                  minWidth: 72,
                }}>
                  <div style={{ fontSize: '1.6rem' }}>{hTy?.emoji || '🧬'}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--ink)', marginTop: '0.2rem' }}>
                    {h.result_type}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                    {new Date(h.created_at).toLocaleDateString('de-AT', { month: 'short', year: '2-digit' })}
                  </div>
                  {i === 0 && <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.15rem', letterSpacing: '0.08em' }}>AKTUELL</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Feedback-Liste */}
      {feedback.length > 0 && (
        <div className="card" style={{ marginTop: '1.4rem' }}>
          <div className="hm-section">Neues von deinem Trainer</div>
          {feedback.slice(0, 2).map(fb => (
            <div key={fb.id} style={{
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--ink)' }}>
                {fb.feedback_text}
              </div>
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--muted)',
                marginTop: '0.5rem',
                fontWeight: 600,
              }}>
                {new Date(fb.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
