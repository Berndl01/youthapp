'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ANCHOR_METRICS } from '@/lib/youth/constants'
import Link from 'next/link'

const MONTH_NAMES = ['', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez', 'Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun']
const ANCHOR_KEYS = ['anchor_satisfaction', 'anchor_psych_safety', 'anchor_commitment', 'anchor_alignment', 'anchor_motivation']
const ANCHOR_COLORS = ['#10b981', '#14b8c4', '#ec4899', '#f59e0b', '#7c3aed']

function scoreColor(v: number | null): string {
  if (v === null) return 'var(--muted)'
  if (v >= 6) return 'var(--success)'
  if (v >= 4) return 'var(--gold)'
  return 'var(--danger)'
}

function riskBadge(risk: string | null) {
  if (risk === 'low') return { cls: 'hm-badge-green', text: '🟢 Gering' }
  if (risk === 'mid') return { cls: 'hm-badge-gold', text: '🟡 Mittel' }
  return { cls: 'hm-badge-red', text: '🔴 Hoch' }
}

export default function TrendsPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [batteries, setBatteries] = useState<any[]>([])
  const [teamAvg, setTeamAvg] = useState<any[]>([])
  const [showInfo, setShowInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: myTeams } = await supabase.from('team_memberships').select('team_id')
          .eq('user_id', user.id).eq('role_in_team', 'coach')
        if (!myTeams?.length) { setLoading(false); return }
        const teamIds = myTeams.map((t: any) => t.team_id)

        const { data: members } = await supabase.from('team_memberships')
          .select('user_id, profiles(id, first_name, last_name)')
          .in('team_id', teamIds).eq('role_in_team', 'player')
        if (members) setPlayers(members.map((m: any) => m.profiles).filter(Boolean))

        const { data: allBatteries } = await supabase.from('battery_responses').select('*')
          .in('team_id', teamIds).order('season_month')
        if (allBatteries) {
          setBatteries(allBatteries)

          const byMonth: Record<number, any[]> = {}
          allBatteries.forEach((b: any) => {
            if (!byMonth[b.season_month]) byMonth[b.season_month] = []
            byMonth[b.season_month].push(b)
          })
          const avgs = Object.entries(byMonth).map(([month, responses]) => {
            const avg: any = { season_month: Number(month), count: responses.length }
            ANCHOR_KEYS.forEach(k => {
              const vals = responses.map(r => r[k]).filter((v: any) => v !== null)
              avg[k] = vals.length ? Math.round(vals.reduce((s: number, v: number) => s + v, 0) / vals.length * 10) / 10 : null
            })
            return avg
          })
          setTeamAvg(avgs.sort((a, b) => a.season_month - b.season_month))
        }
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Lade Trends…</div>
    </div>
  )

  const playerBatteries = selectedPlayer
    ? batteries.filter(b => b.user_id === selectedPlayer).sort((a, b) => a.season_month - b.season_month)
    : []

  return (
    <div className="max-w-6xl mx-auto fade-in">
      <div className="hm-breadcrumb">Trainer · Trends & Verlauf</div>

      <h1 className="hero">
        Verlaufs-<span style={{ color: 'var(--accent)' }}>Trends</span>
      </h1>
      <p className="hero-sub">
        5 Ankermetriken über die Saison · Team und einzelne Spieler
      </p>

      {/* Team-Durchschnitt */}
      <div className="card" style={{ marginTop: '1.4rem' }}>
        <div className="hm-section">📊 Team-Durchschnitt · Saison 2025/26</div>
        {teamAvg.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
            Noch keine Monatsdaten vorhanden. Verschicke zuerst eine Umfrage.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.85rem', minWidth: 500, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: '0.6rem', fontSize: '0.66rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em' }}>MONAT</th>
                  {ANCHOR_METRICS.map((a, i) => (
                    <th
                      key={a.key}
                      style={{
                        textAlign: 'center',
                        paddingBottom: '0.6rem',
                        fontSize: '0.7rem',
                        color: ANCHOR_COLORS[i],
                        fontWeight: 800,
                        cursor: 'pointer',
                        letterSpacing: '0.04em',
                      }}
                      onClick={() => setShowInfo(showInfo === a.key ? null : a.key)}
                    >
                      {a.icon} {a.label}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', paddingBottom: '0.6rem', fontSize: '0.66rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em' }}>N</th>
                </tr>
              </thead>
              <tbody>
                {teamAvg.map(row => (
                  <tr key={row.season_month} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 800 }}>{MONTH_NAMES[row.season_month]}</td>
                    {ANCHOR_KEYS.map(k => (
                      <td key={k} style={{ textAlign: 'center', padding: '0.6rem 0' }}>
                        {row[k] !== null ? (
                          <span style={{ fontWeight: 800, color: scoreColor(row[k]) }}>
                            {row[k].toFixed(1)}
                          </span>
                        ) : <span style={{ color: 'var(--border)' }}>—</span>}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', padding: '0.6rem 0', color: 'var(--muted)', fontSize: '0.82rem' }}>
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info-Panel */}
        {showInfo && (() => {
          const a = ANCHOR_METRICS.find(m => m.key === showInfo)
          if (!a) return null
          return (
            <div style={{
              marginTop: '1rem',
              padding: '1rem 1.2rem',
              borderRadius: 16,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                {a.icon} {a.label}
              </div>
              {a.what && (
                <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                  {a.what}
                </div>
              )}
              {a.basis && (
                <div style={{ fontSize: '0.72rem', marginBottom: '0.7rem', color: 'var(--muted)' }}>
                  Basis: {a.basis}
                </div>
              )}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                fontSize: '0.78rem',
              }}>
                {a.high && (
                  <div style={{
                    padding: '0.6rem',
                    borderRadius: 10,
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}>
                    <div style={{ fontWeight: 800, marginBottom: '0.2rem', color: 'var(--success)' }}>🟢 6–7</div>
                    {a.high}
                  </div>
                )}
                {a.mid && (
                  <div style={{
                    padding: '0.6rem',
                    borderRadius: 10,
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}>
                    <div style={{ fontWeight: 800, marginBottom: '0.2rem', color: 'var(--gold)' }}>🟡 4–5</div>
                    {a.mid}
                  </div>
                )}
                {a.low && (
                  <div style={{
                    padding: '0.6rem',
                    borderRadius: 10,
                    background: 'rgba(236,72,153,0.06)',
                    border: '1px solid rgba(236,72,153,0.18)',
                  }}>
                    <div style={{ fontWeight: 800, marginBottom: '0.2rem', color: 'var(--danger)' }}>🔴 1–3</div>
                    {a.low}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Spieler-Auswahl + Verlauf */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 1fr) 3fr',
        gap: '1rem',
        marginTop: '1.4rem',
      }} className="trends-grid">
        <div>
          <div className="hm-section" style={{ color: 'var(--gold)' }}>👥 Spieler wählen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {players.map(p => {
              const pb = batteries.filter(b => b.user_id === p.id)
              const latest = pb.length ? pb[pb.length - 1] : null
              const risk = latest?.turnover_risk
              const rb = risk ? riskBadge(risk) : null
              const active = selectedPlayer === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayer(p.id)}
                  style={{
                    textAlign: 'left',
                    padding: '0.7rem 0.9rem',
                    borderRadius: 14,
                    background: active ? 'rgba(124,58,237,0.08)' : 'var(--surface)',
                    border: active ? '2px solid rgba(124,58,237,0.3)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                    color: 'var(--ink)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.first_name} {p.last_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {pb.length} Befragungen
                    </div>
                  </div>
                  {rb && (
                    <span className={`hm-badge ${rb.cls}`} style={{ fontSize: '0.6rem', padding: '0.25rem 0.5rem' }}>
                      {rb.text}
                    </span>
                  )}
                </button>
              )
            })}
            {players.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                Keine Spieler
              </div>
            )}
          </div>
        </div>

        <div>
          {selectedPlayer && playerBatteries.length > 0 ? (
            <div className="card">
              <div className="hm-section">
                📈 Verlauf · {players.find(p => p.id === selectedPlayer)?.first_name} {players.find(p => p.id === selectedPlayer)?.last_name}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.82rem', minWidth: 500, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', paddingBottom: '0.6rem', fontSize: '0.66rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em' }}>MONAT</th>
                      <th style={{ textAlign: 'center', paddingBottom: '0.6rem', fontSize: '0.66rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em' }}>BAT</th>
                      {ANCHOR_METRICS.map((a, i) => (
                        <th key={a.key} style={{ textAlign: 'center', paddingBottom: '0.6rem', fontSize: '1rem' }} title={a.label}>
                          {a.icon}
                        </th>
                      ))}
                      <th style={{ textAlign: 'center', paddingBottom: '0.6rem', fontSize: '0.66rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em' }}>RISIKO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerBatteries.map((b, idx) => {
                      const prev = idx > 0 ? playerBatteries[idx - 1] : null
                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.6rem 0', fontWeight: 800 }}>{MONTH_NAMES[b.season_month]}</td>
                          <td style={{ textAlign: 'center', padding: '0.6rem 0' }}>
                            <span className="hm-badge hm-badge-cyan" style={{ fontSize: '0.64rem' }}>{b.battery}</span>
                          </td>
                          {ANCHOR_KEYS.map(k => {
                            const v = b[k]
                            const pv = prev ? prev[k] : null
                            const trend = v && pv ? (v - pv >= 1 ? '↑' : v - pv <= -1 ? '↓' : '') : ''
                            return (
                              <td key={k} style={{ textAlign: 'center', padding: '0.6rem 0' }}>
                                {v !== null ? (
                                  <span style={{ fontWeight: 800, color: scoreColor(v) }}>
                                    {v.toFixed(1)}
                                    {trend && <span style={{ marginLeft: 2, fontSize: '0.75rem' }}>{trend}</span>}
                                  </span>
                                ) : <span style={{ color: 'var(--border)' }}>—</span>}
                              </td>
                            )
                          })}
                          <td style={{ textAlign: 'center', padding: '0.6rem 0', fontSize: '1rem' }}>
                            {b.turnover_risk === 'low' ? '🟢' : b.turnover_risk === 'mid' ? '🟡' : '🔴'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Trend-Warnungen */}
              {playerBatteries.length >= 2 && (() => {
                const latest = playerBatteries[playerBatteries.length - 1]
                const prev = playerBatteries[playerBatteries.length - 2]
                const warnings: string[] = []
                ANCHOR_KEYS.forEach((k, i) => {
                  if (latest[k] && prev[k] && (prev[k] - latest[k]) >= 2) {
                    warnings.push(
                      `${ANCHOR_METRICS[i].icon} ${ANCHOR_METRICS[i].label}: Abfall von ${prev[k].toFixed(1)} auf ${latest[k].toFixed(1)} (−${(prev[k] - latest[k]).toFixed(1)})`
                    )
                  }
                })
                if (warnings.length === 0) return null
                return (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem 1.2rem',
                    borderRadius: 16,
                    background: 'rgba(236,72,153,0.06)',
                    border: '1.5px solid rgba(236,72,153,0.2)',
                  }}>
                    <div className="hm-section" style={{ color: 'var(--danger)' }}>⚠ Trend-Warnung</div>
                    {warnings.map((w, i) => (
                      <div key={i} style={{ fontSize: '0.88rem', marginBottom: '0.3rem', color: 'var(--ink)', lineHeight: 1.5 }}>
                        {w}
                      </div>
                    ))}
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                      💡 Abfall ≥2 Punkte in einem Monat → Einzelgespräch empfohlen
                    </div>
                  </div>
                )
              })()}

              {/* Link zum Spieler-Profil */}
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <Link href={`/dashboard/players/${selectedPlayer}`} className="btn-primary">
                  → Vollständiges Spieler-Profil
                </Link>
              </div>
            </div>
          ) : selectedPlayer ? (
            <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--muted)' }}>
              Noch keine Befragungsdaten für diesen Spieler.
            </div>
          ) : (
            <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.7rem', opacity: 0.4 }}>👈</div>
              Wähle links einen Spieler, um den Verlauf zu sehen.
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .trends-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
