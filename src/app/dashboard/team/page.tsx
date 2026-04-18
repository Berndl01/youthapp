'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getYouthType, FAMILY_META, ANCHOR_METRICS, AGE_GROUP_META, type AgeGroup } from '@/lib/youth/constants'
import { getFamily } from '@/services/scoring/calculate'
import Link from 'next/link'

export default function TeamPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [showAnchorInfo, setShowAnchorInfo] = useState<string | null>(null)
  const [currentTeam, setCurrentTeam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: memberships } = await supabase.from('team_memberships').select('team_id')
          .eq('user_id', user.id).eq('role_in_team', 'coach')
        if (!memberships?.length) { setLoading(false); return }
        const teamIds = memberships.map((m: any) => m.team_id)

        const { data: teamData } = await supabase
          .from('teams')
          .select('id, name, season, age_group, clubs(name)')
          .in('id', teamIds)
        if (teamData?.length) setCurrentTeam(teamData[0])

        const { data: playerMembers } = await supabase.from('team_memberships')
          .select('user_id, team_id, profiles(*)')
          .in('team_id', teamIds).eq('role_in_team', 'player')
        if (!playerMembers) { setLoading(false); return }

        const enriched = await Promise.all(playerMembers.map(async (pm: any) => {
          const p = pm.profiles
          if (!p) return null
          const { data: types } = await supabase.from('type_results').select('*')
            .eq('user_id', p.id).order('created_at', { ascending: false }).limit(1)
          const { data: pp } = await supabase.from('player_profiles').select('age_group')
            .eq('user_id', p.id).single()
          return {
            profile: p,
            teamId: pm.team_id,
            latestType: types?.[0],
            ageGroup: pp?.age_group || null,
          }
        }))
        setPlayers(enriched.filter(Boolean) as any[])
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Lade Team-Analyse…</div>
    </div>
  )

  // Team-DNA nach Familie
  const famCounts: Record<string, { count: number; players: string[] }> = {
    str: { count: 0, players: [] },
    tfo: { count: 0, players: [] },
    per: { count: 0, players: [] },
    lea: { count: 0, players: [] },
  }
  players.forEach(p => {
    if (!p.latestType) return
    const fam = getFamily(p.latestType.result_type)
    if (fam && famCounts[fam]) {
      famCounts[fam].count++
      famCounts[fam].players.push(p.profile.first_name)
    }
  })

  const ageMeta = currentTeam?.age_group ? AGE_GROUP_META[currentTeam.age_group as AgeGroup] : null

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="hm-breadcrumb">
        <Link href="/dashboard/coach" style={{ color: 'inherit' }}>Dashboard</Link> · Team-Analyse
      </div>

      <h1 className="hero">
        Mannschafts-<span style={{ color: 'var(--accent)' }}>Analyse</span>
      </h1>
      <p className="hero-sub" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {currentTeam && (
          <>
            <span>{(currentTeam.clubs as any)?.name} · {currentTeam.name} · {currentTeam.season}</span>
            {ageMeta && <span className="hm-badge hm-badge-u16">{ageMeta.shortLabel} · {ageMeta.ageRange}</span>}
          </>
        )}
      </p>

      {/* Schnellaktionen */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1.2rem', marginBottom: '1.5rem' }}>
        <Link href="/dashboard/coach" className="btn-primary">
          📊 Spieler-Dashboard
        </Link>
        <Link href="/dashboard/send-battery" className="btn-secondary">
          📤 Umfrage verschicken
        </Link>
        <Link href="/dashboard/trends" className="btn-secondary">
          📈 Verlauf
        </Link>
      </div>

      {/* Team-DNA */}
      <div className="card" style={{ marginBottom: '1.2rem' }}>
        <div className="hm-section">🧬 Team-DNA · Typenverteilung</div>

        <div className="fam-grid" style={{ marginBottom: '1rem' }}>
          {Object.entries(FAMILY_META).map(([k, fam]) => {
            const fc = famCounts[k]
            const pct = players.length ? Math.round((fc.count / players.length) * 100) : 0
            return (
              <div
                key={k}
                className="fam-card"
                style={{
                  borderTop: `3px solid ${fam.color}`,
                  padding: '1rem 0.6rem',
                }}
              >
                <div className="fam-icon">{fam.icon}</div>
                <div className="fam-count" style={{ color: fam.color }}>{fc.count}</div>
                <div className="fam-name" style={{ color: fam.color }}>{fam.name}</div>
                <div className="fam-pct">{pct}%</div>
                {fc.players.length > 0 && (
                  <div style={{
                    fontSize: '0.68rem',
                    marginTop: '0.5rem',
                    color: 'var(--ink-soft)',
                    lineHeight: 1.3,
                    fontWeight: 600,
                  }}>
                    {fc.players.join(', ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Team-Balance Warnungen */}
        {players.length >= 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {Object.entries(famCounts).map(([k, fc]) => {
              const fam = FAMILY_META[k as keyof typeof FAMILY_META]
              const pct = players.length ? fc.count / players.length : 0

              if (pct === 0 && players.length > 3) {
                return (
                  <div
                    key={k + '-warn'}
                    style={{
                      padding: '0.9rem 1.1rem',
                      borderRadius: 14,
                      fontSize: '0.88rem',
                      background: 'rgba(236,72,153,0.06)',
                      border: '1.5px solid rgba(236,72,153,0.18)',
                      color: 'var(--ink)',
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: 'var(--danger)', fontWeight: 800 }}>⚠</span>{' '}
                    <strong>Keine {fam.name} im Team</strong>
                    {(fam as any).lack && <> — {(fam as any).lack}</>}
                  </div>
                )
              }
              if (pct > 0.5) {
                return (
                  <div
                    key={k + '-warn'}
                    style={{
                      padding: '0.9rem 1.1rem',
                      borderRadius: 14,
                      fontSize: '0.88rem',
                      background: 'rgba(245,158,11,0.08)',
                      border: '1.5px solid rgba(245,158,11,0.22)',
                      color: 'var(--ink)',
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: 'var(--gold)', fontWeight: 800 }}>⚠</span>{' '}
                    <strong>Überrepräsentation {fam.name}</strong> ({Math.round(pct * 100)}%)
                    {(fam as any).excess && <> — {(fam as any).excess}</>}
                  </div>
                )
              }
              return null
            })}
          </div>
        )}

        {players.filter(p => p.latestType).length === 0 && (
          <div style={{
            padding: '1.5rem',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: '0.88rem',
          }}>
            Noch keine Test-Ergebnisse vorhanden. Die Jugendlichen müssen zuerst den Selbsttest machen.
          </div>
        )}
      </div>

      {/* 5 Ankermetriken Info */}
      <div className="card">
        <div className="hm-section" style={{ color: 'var(--gold)' }}>
          📋 5 Ankermetriken · monatliches Monitoring
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '0.5rem',
        }}>
          {ANCHOR_METRICS.map(a => {
            const active = showAnchorInfo === a.key
            return (
              <button
                key={a.key}
                onClick={() => setShowAnchorInfo(active ? null : a.key)}
                style={{
                  padding: '0.8rem 0.5rem',
                  borderRadius: 14,
                  textAlign: 'center',
                  background: active ? 'rgba(124,58,237,0.08)' : 'var(--surface)',
                  border: active ? '2px solid rgba(124,58,237,0.3)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                  color: 'var(--ink)',
                }}
              >
                <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>{a.icon}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, marginTop: '0.3rem' }}>
                  {a.label}
                </div>
              </button>
            )
          })}
        </div>

        {showAnchorInfo && (() => {
          const a = ANCHOR_METRICS.find(m => m.key === showAnchorInfo)
          if (!a) return null
          return (
            <div style={{
              marginTop: '1rem',
              padding: '1.2rem',
              borderRadius: 18,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                {a.icon} {a.label}
              </div>
              {a.what && (
                <div style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginBottom: '0.4rem', lineHeight: 1.5 }}>
                  {a.what}
                </div>
              )}
              {a.basis && (
                <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: '0.8rem', fontStyle: 'italic' }}>
                  Basis: {a.basis}
                </div>
              )}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.6rem',
                fontSize: '0.8rem',
              }}>
                {a.high && (
                  <div style={{
                    padding: '0.8rem',
                    borderRadius: 12,
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}>
                    <div style={{ fontWeight: 800, marginBottom: '0.3rem', color: 'var(--success)' }}>🟢 6–7</div>
                    {a.high}
                  </div>
                )}
                {a.mid && (
                  <div style={{
                    padding: '0.8rem',
                    borderRadius: 12,
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}>
                    <div style={{ fontWeight: 800, marginBottom: '0.3rem', color: 'var(--gold)' }}>🟡 4–5</div>
                    {a.mid}
                  </div>
                )}
                {a.low && (
                  <div style={{
                    padding: '0.8rem',
                    borderRadius: 12,
                    background: 'rgba(236,72,153,0.06)',
                    border: '1px solid rgba(236,72,153,0.18)',
                  }}>
                    <div style={{ fontWeight: 800, marginBottom: '0.3rem', color: 'var(--danger)' }}>🔴 1–3</div>
                    {a.low}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Info / Hinweis */}
      <div style={{
        marginTop: '1.2rem',
        padding: '1rem 1.2rem',
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(236,72,153,0.03))',
        border: '1px solid rgba(124,58,237,0.14)',
        fontSize: '0.9rem',
        color: 'var(--ink-soft)',
        lineHeight: 1.55,
      }}>
        💡 <strong style={{ color: 'var(--ink)' }}>Tipp:</strong> Im{' '}
        <Link href="/dashboard/coach" style={{ color: 'var(--accent)', fontWeight: 700 }}>Spieler-Dashboard</Link>{' '}
        siehst du die ganze Liste deiner Jugendlichen. Klick auf einen Namen, um Profil und Feedback zu öffnen.
      </div>
    </div>
  )
}
