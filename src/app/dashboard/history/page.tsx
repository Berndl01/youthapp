'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getYouthType, FAMILY_META } from '@/lib/youth/constants'
import { getFamily } from '@/services/scoring/calculate'
import Link from 'next/link'

const MONTH_NAMES = ['', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez', 'Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun']
const ANCHOR_KEYS = ['anchor_satisfaction', 'anchor_psych_safety', 'anchor_commitment', 'anchor_alignment', 'anchor_motivation']
const ANCHOR_SHORT = ['Zufr.', 'Sich.', 'Bind.', 'Align.', 'Motiv.']

export default function HistoryPage() {
  const [results, setResults] = useState<any[]>([])
  const [batteries, setBatteries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        if (!supabase) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: types } = await supabase.from('type_results').select('*')
          .eq('user_id', user.id).order('created_at', { ascending: false })
        if (types) setResults(types)
        const { data: bat } = await supabase.from('battery_responses').select('*')
          .eq('user_id', user.id).order('season_month')
        if (bat) setBatteries(bat)
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Lade Historie…</div>
    </div>
  )

  function scoreColor(v: number): string {
    if (v >= 6) return 'var(--success)'
    if (v >= 4) return 'var(--gold)'
    return 'var(--danger)'
  }

  return (
    <div className="max-w-3xl mx-auto fade-in">
      <div className="hm-breadcrumb">Spieler · Historie</div>

      <h1 className="hero">
        Test-<span className="gradient-text">Historie</span>
      </h1>
      <p className="hero-sub">
        Alle bisherigen Tests und Befragungen im Überblick
      </p>

      {/* Typ-Tests */}
      <div style={{ marginTop: '1.5rem' }}>
        <div className="hm-section">🧬 Typ-Tests</div>
        {results.length === 0 ? (
          <div className="card" style={{ padding: '2rem 1.2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
            Noch keine Typ-Tests abgeschlossen.
            <div style={{ marginTop: '1rem' }}>
              <Link href="/dashboard/test" className="btn-accent">
                ✨ Ersten Test starten
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {results.map((r, idx) => {
              const ty = getYouthType(r.result_type)
              const fam = FAMILY_META[getFamily(r.result_type) as keyof typeof FAMILY_META]
              const isLatest = idx === 0
              const source = r.scoring_json?.source === 'coach' ? 'Trainerbewertung' : 'Selbsttest'
              return (
                <div
                  key={r.id}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    padding: '1rem 1.2rem',
                    border: isLatest ? `2px solid ${fam?.color || 'var(--accent)'}55` : undefined,
                    background: isLatest
                      ? `linear-gradient(135deg, ${fam?.color}08 0%, ${fam?.color}03 100%)`
                      : undefined,
                  }}
                >
                  <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>{ty?.emoji || '🧬'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: '0.95rem' }}>
                      {ty?.name || r.result_type}
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, marginLeft: '0.4rem', color: 'var(--muted)' }}>
                        {r.result_type}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', marginTop: '0.15rem', color: fam?.color || 'var(--muted)', fontWeight: 600 }}>
                      {fam?.icon} {fam?.name} · {source}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                      {new Date(r.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.3rem',
                      fontWeight: 800,
                      color: 'var(--accent)',
                      letterSpacing: '-0.02em',
                    }}>
                      {r.confidence_score?.toFixed(0) || '—'}
                      {r.confidence_score && '%'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Klarheit
                    </div>
                  </div>
                  {isLatest && (
                    <span className="hm-badge hm-badge-purple" style={{ fontSize: '0.62rem' }}>
                      Aktuell
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Monatsbefragungen */}
      <div style={{ marginTop: '1.8rem' }}>
        <div className="hm-section" style={{ color: 'var(--gold)' }}>📋 Monatsbefragungen</div>
        {batteries.length === 0 ? (
          <div className="card" style={{ padding: '2rem 1.2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
            Noch keine Monatsbefragungen abgeschlossen.
          </div>
        ) : (
          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.84rem', minWidth: 420, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingBottom: '0.6rem', fontSize: '0.66rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em' }}>MONAT</th>
                    <th style={{ textAlign: 'center', paddingBottom: '0.6rem', fontSize: '0.66rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em' }}>BAT</th>
                    {ANCHOR_SHORT.map(l => (
                      <th key={l} style={{ textAlign: 'center', paddingBottom: '0.6rem', fontSize: '0.66rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.08em' }}>
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batteries.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.6rem 0', fontWeight: 800 }}>{MONTH_NAMES[b.season_month]}</td>
                      <td style={{ textAlign: 'center', padding: '0.6rem 0' }}>
                        <span className="hm-badge hm-badge-cyan" style={{ fontSize: '0.62rem' }}>{b.battery}</span>
                      </td>
                      {ANCHOR_KEYS.map(k => {
                        const v = b[k]
                        return (
                          <td key={k} style={{ textAlign: 'center', padding: '0.6rem 0' }}>
                            {v !== null && v !== undefined ? (
                              <span style={{ fontWeight: 800, color: scoreColor(v) }}>
                                {v.toFixed(1)}
                              </span>
                            ) : <span style={{ color: 'var(--border)' }}>—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link href="/dashboard/player" className="btn-secondary">
          ← Zurück zum Dashboard
        </Link>
      </div>
    </div>
  )
}
