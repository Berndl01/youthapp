'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getYouthType, FAMILY_META, AGE_GROUP_META, DIMENSION_META, type AgeGroup } from '@/lib/youth/constants'
import { getFamily, DIMENSIONS } from '@/services/scoring/calculate'
import Link from 'next/link'

const FAM_COLORS: Record<string, string> = {
  str: '#6d28d9', tfo: '#2563eb', per: '#d97706', lea: '#dc2626',
}
const FAM_LABELS: Record<string, string> = {
  str: 'Strategen', tfo: 'Teamformer', per: 'Performer', lea: 'Anführer',
}
const DIM_COLORS = ['#0891b2', '#6d28d9', '#d97706', '#dc2626']

function DonutChart({ data, total }: { data: { key: string; count: number }[]; total: number }) {
  const r = 54, cx = 75, cy = 75, sw = 20
  const circ = 2 * Math.PI * r
  let offset = -circ / 4 // start at top
  const arcs = data.map(d => {
    const pct = total > 0 ? d.count / total : 0
    const len = pct * circ
    const arc = { key: d.key, len, gap: circ - len, offset, color: FAM_COLORS[d.key] || '#9ca3af' }
    offset += len
    return arc
  })
  return (
    <svg width="150" height="150" viewBox="0 0 150 150">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f1f5" strokeWidth={sw} />
      {arcs.map(a => (
        <circle key={a.key} cx={cx} cy={cy} r={r} fill="none"
          stroke={a.color} strokeWidth={sw}
          strokeDasharray={`${a.len} ${a.gap}`}
          strokeDashoffset={-a.offset}
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      ))}
      <circle cx={cx} cy={cy} r={r - sw / 2 + 2} fill="white" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontFamily="Inter" fontWeight="800" fontSize="20" fill="#111827">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontFamily="Inter" fontWeight="600" fontSize="9" fill="#9ca3af" letterSpacing=".06em">SPIELER</text>
    </svg>
  )
}

function RadarChart({ dims }: { dims: Record<string, { pct: number }> }) {
  const size = 220, c = size / 2, maxR = 80
  const keys = ['drive', 'energy', 'mental', 'role']
  const angles = keys.map((_, i) => (i * Math.PI * 2) / 4 - Math.PI / 2)
  const points = keys.map((k, i) => {
    const pct = (dims[k]?.pct ?? 50) / 100
    const r = pct * maxR
    return { x: c + r * Math.cos(angles[i]), y: c + r * Math.sin(angles[i]), pct: dims[k]?.pct ?? 50 }
  })
  const polygon = points.map(p => `${p.x},${p.y}`).join(' ')
  const gridLevels = [0.25, 0.5, 0.75, 1]
  const labels = ['Antrieb', 'Energie', 'Mentalität', 'Rolle']
  const labelPos = [
    { x: c, y: c - maxR - 18, anchor: 'middle' },
    { x: c + maxR + 14, y: c + 4, anchor: 'start' },
    { x: c, y: c + maxR + 22, anchor: 'middle' },
    { x: c - maxR - 14, y: c + 4, anchor: 'end' },
  ]
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map(g => (
        <polygon key={g} fill="none" stroke="#e5e7eb" strokeWidth="0.7"
          points={angles.map(a => `${c + g * maxR * Math.cos(a)},${c + g * maxR * Math.sin(a)}`).join(' ')} />
      ))}
      <line x1={c} y1={c - maxR} x2={c} y2={c + maxR} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3,3" />
      <line x1={c - maxR} y1={c} x2={c + maxR} y2={c} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3,3" />
      <polygon points={polygon} fill="rgba(8,145,178,0.10)" stroke="#0891b2" strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#0891b2" stroke="#fff" strokeWidth="1.5" />
          <text x={labelPos[i].x} y={labelPos[i].y} textAnchor={labelPos[i].anchor}
            fontFamily="Inter" fontWeight="700" fontSize="10.5" fill="#374151">{labels[i]}</text>
          <text x={p.x + (i === 1 ? 8 : i === 3 ? -8 : 0)} y={p.y + (i === 0 ? -10 : i === 2 ? 14 : 0)}
            textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="9" fill="#0891b2">{p.pct}%</text>
        </g>
      ))}
    </svg>
  )
}

export default function CoachDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [coachType, setCoachType] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedTeam) loadPlayers(selectedTeam) }, [selectedTeam])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Nicht eingeloggt'); setLoading(false); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof) setProfile(prof)
      const { data: myTeams, error: teamErr } = await supabase
        .from('team_memberships').select('team_id').eq('user_id', user.id).eq('role_in_team', 'coach')
      if (teamErr) { setError('Fehler: ' + teamErr.message); setLoading(false); return }
      if (!myTeams?.length) {
        setError('Noch keiner Mannschaft als Trainer zugeordnet.')
        setLoading(false); return
      }
      const teamIds = myTeams.map((t: any) => t.team_id)
      const { data: teamDetails } = await supabase
        .from('teams').select('id, name, season, age_group, club_id, clubs(name)').in('id', teamIds)
      if (teamDetails?.length) { setTeams(teamDetails); setSelectedTeam(teamDetails[0].id) }
      const { data: cTypes } = await supabase.from('type_results').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
      if (cTypes?.length) setCoachType(cTypes[0])
    } catch (e: any) { setError('Fehler: ' + (e?.message || String(e))) }
    setLoading(false)
  }

  async function loadPlayers(teamId: string) {
    try {
      const { data: members } = await supabase
        .from('team_memberships').select('user_id').eq('team_id', teamId).eq('role_in_team', 'player')
      if (!members?.length) { setPlayers([]); return }
      const playerIds = members.map((m: any) => m.user_id)
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', playerIds)
      const { data: playerProfiles } = await supabase.from('player_profiles').select('*').in('user_id', playerIds)
      const { data: types } = await supabase.from('type_results').select('*').in('user_id', playerIds)
        .order('created_at', { ascending: false })
      const playerList = (profiles || []).map((p: any) => {
        const pp = (playerProfiles || []).find((x: any) => x.user_id === p.id)
        const latestType = (types || []).find((t: any) => t.user_id === p.id)
        return { profile: p, playerProfile: pp, latestType, selfTestDone: !!latestType }
      })
      setPlayers(playerList)
    } catch (e) { console.error(e) }
  }

  // Family counts
  const famCounts: Record<string, number> = { str: 0, tfo: 0, per: 0, lea: 0 }
  players.forEach(p => {
    if (!p.latestType) return
    const fam = getFamily(p.latestType.result_type)
    if (famCounts[fam] !== undefined) famCounts[fam]++
  })

  // Team average dimensions
  const teamDimAvg: Record<string, { pct: number }> = {}
  const dimCounts: Record<string, number[]> = {}
  players.forEach(p => {
    if (!p.latestType?.scoring_json?.dimensions) return
    const dims = p.latestType.scoring_json.dimensions
    for (const d of DIMENSIONS) {
      if (!dimCounts[d.key]) dimCounts[d.key] = []
      if (dims[d.key]?.pct !== undefined) dimCounts[d.key].push(dims[d.key].pct)
    }
  })
  for (const d of DIMENSIONS) {
    const arr = dimCounts[d.key] || []
    teamDimAvg[d.key] = { pct: arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 50 }
  }

  const filteredPlayers = players.filter(p => {
    if (filterType && p.latestType) { if (getFamily(p.latestType.result_type) !== filterType) return false }
    if (filterType && !p.latestType) return false
    if (filterStatus === 'tested' && !p.selfTestDone) return false
    if (filterStatus === 'open' && p.selfTestDone) return false
    return true
  })

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Lade Dashboard...</div>
    </div>
  )
  if (error) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div style={{ fontSize: '1rem', color: 'var(--danger)', fontWeight: 700, marginBottom: '0.8rem' }}>{error}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
        <Link href="/dashboard/admin" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Verwaltung</Link> aufrufen, um eine Akademie und ein Team anzulegen.
      </div>
    </div>
  )

  const currentTeam = teams.find(t => t.id === selectedTeam) as any
  const currentAgeGroup: AgeGroup | null = currentTeam?.age_group || null
  const ageMeta = currentAgeGroup ? AGE_GROUP_META[currentAgeGroup] : null
  const testedCount = players.filter(p => p.selfTestDone).length
  const openCount = players.filter(p => !p.selfTestDone).length
  const testedPct = players.length ? Math.round((testedCount / players.length) * 100) : 0
  const coachTy = coachType ? getYouthType(coachType.result_type) : null
  const coachFam = coachType ? getFamily(coachType.result_type) : null

  return (
    <div className="max-w-6xl mx-auto fade-in">
      <h1 className="hero">
        Trainer-<span style={{ color: 'var(--accent)' }}>Dashboard</span>
      </h1>
      <div className="hero-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span>{currentTeam?.name || 'Team'} · Saison {currentTeam?.season || '2025/26'}</span>
        {ageMeta && <span style={{
          display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
          fontSize: '10px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const,
          border: '1px solid var(--border-strong)', color: 'var(--muted)',
        }}>{ageMeta.shortLabel} · {ageMeta.ageRange}</span>}
      </div>

      {teams.length > 1 && (
        <div style={{ marginTop: '1rem' }}>
          <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}
            style={{ maxWidth: 400, fontSize: '0.85rem', padding: '0.5rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-strong)', background: 'var(--surface)' }}>
            {teams.map((t: any) => (
              <option key={t.id} value={t.id}>{t.clubs?.name || ''} – {t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.7rem', margin: '1.2rem 0' }}>
        {[
          { val: players.length, label: 'Spieler', color: 'var(--accent)' },
          { val: testedCount, label: 'Tests abgeschlossen', color: 'var(--success)' },
          { val: openCount, label: 'Tests ausstehend', color: 'var(--danger)' },
          { val: `${testedPct}%`, label: 'Abschlussrate', color: 'var(--gold)' },
        ].map((kpi, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontFamily: 'Inter', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: kpi.color }}>
              {kpi.val}
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted)', marginTop: '0.3rem', letterSpacing: '.02em', textTransform: 'uppercase' as const }}>
              {kpi.label}
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: kpi.color }} />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
        <Link href="/dashboard/send-battery" className="btn-primary">Umfrage verschicken</Link>
        <Link href="/dashboard/team" className="btn-secondary">Mannschaft verwalten</Link>
        <Link href="/dashboard/trends" className="btn-secondary">Trends</Link>
      </div>

      {/* Coach Type Strip */}
      {coachType && coachTy ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1rem 1.5rem',
          background: 'var(--navy)', color: '#fff', borderRadius: 12, marginBottom: '1.2rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'var(--cyan)' }}>Dein Trainer-Typ</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{coachTy.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
              {FAM_LABELS[coachFam!] || ''} · {coachType.result_type} · Klarheit {coachType.confidence_score || '—'}%
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/dashboard/results" style={{
              padding: '0.45rem 0.9rem', borderRadius: 7, fontSize: '0.72rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              textDecoration: 'none',
            }}>Profil ansehen</Link>
            <Link href="/dashboard/coach-dev" style={{
              padding: '0.45rem 0.9rem', borderRadius: 7, fontSize: '0.72rem', fontWeight: 700,
              color: '#fff', background: 'var(--cyan)', border: 'none', textDecoration: 'none',
            }}>Entwicklung</Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Trainer-Selbsttest noch nicht gemacht</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Eigenen Typ ermitteln und typspezifische Coaching-Tipps erhalten.</div>
          </div>
          <Link href="/dashboard/test" className="btn-primary" style={{ flexShrink: 0 }}>Test starten</Link>
        </div>
      )}

      {/* Charts: Donut + Radar */}
      {players.some(p => p.latestType) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.8rem', marginBottom: '1.2rem' }}>
          {/* Donut */}
          <div className="card">
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: '1rem' }}>
              Typenverteilung
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <DonutChart
                data={Object.entries(famCounts).map(([k, c]) => ({ key: k, count: c }))}
                total={players.length}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', flex: 1, minWidth: 160 }}>
                {Object.entries(famCounts).map(([k, count]) => {
                  const pct = players.length ? Math.round((count / players.length) * 100) : 0
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: FAM_COLORS[k], flexShrink: 0 }} />
                      <span>{FAM_LABELS[k]}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em', color: FAM_COLORS[k] }}>{count}</span>
                      <span style={{ width: 36, textAlign: 'right', fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted)' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Radar */}
          <div className="card">
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Team-Durchschnitt · 4 Dimensionen
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart dims={teamDimAvg} />
            </div>
          </div>
        </div>
      )}

      {/* Player List */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Spieler</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)', marginLeft: '0.5rem' }}>{filteredPlayers.length} Personen</span>
        </div>
        <div style={{ flex: 1 }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '0.4rem 0.7rem', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'var(--surface)', fontSize: '0.78rem', fontWeight: 600 }}>
          <option value="">Alle Typen</option>
          <option value="str">Strategen</option>
          <option value="tfo">Teamformer</option>
          <option value="per">Performer</option>
          <option value="lea">Anführer</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '0.4rem 0.7rem', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'var(--surface)', fontSize: '0.78rem', fontWeight: 600 }}>
          <option value="">Alle Status</option>
          <option value="tested">Abgeschlossen</option>
          <option value="open">Ausstehend</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {filteredPlayers.map(p => {
          const ty = p.latestType ? getYouthType(p.latestType.result_type) : null
          const fam = p.latestType ? getFamily(p.latestType.result_type) : null
          const famColor = fam ? FAM_COLORS[fam] : '#9ca3af'
          const initials = `${(p.profile.first_name || '?')[0]}${(p.profile.last_name || '')[0] || ''}`.toUpperCase()
          const dims = p.latestType?.scoring_json?.dimensions

          return (
            <Link key={p.profile.id} href={`/dashboard/players/${p.profile.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.9rem',
                padding: '0.75rem 1rem', borderRadius: 10,
                background: 'var(--surface)', border: `1px solid ${p.selfTestDone ? 'var(--border)' : 'var(--border-strong)'}`,
                borderStyle: p.selfTestDone ? 'solid' : 'dashed',
                opacity: p.selfTestDone ? 1 : 0.65,
                textDecoration: 'none', color: 'inherit',
                transition: 'all 0.12s', cursor: 'pointer',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-0.5px)' }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
            >
              {/* Initials Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 800, color: '#fff', background: famColor, flexShrink: 0,
              }}>{initials}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {p.profile.first_name} {p.profile.last_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.05rem' }}>
                  {p.latestType ? (
                    <><span style={{ fontWeight: 600, color: famColor }}>{ty?.name?.replace('Der ', '').replace('Die ', '') || p.latestType.result_type}</span> · {p.latestType.result_type} · {FAM_LABELS[fam!] || ''}</>
                  ) : 'Test ausstehend'}
                </div>
              </div>

              {/* Mini Dimension Bars */}
              {dims ? (
                <div style={{ display: 'flex', gap: 3, width: 72, flexShrink: 0 }}>
                  {DIMENSIONS.map((d, i) => {
                    const pct = dims[d.key]?.pct ?? 50
                    return (
                      <div key={d.key} style={{ flex: 1, height: 22, borderRadius: 3, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, borderRadius: 3, background: DIM_COLORS[i], transition: 'height 0.4s ease' }} />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 3, width: 72, flexShrink: 0, opacity: 0.15 }}>
                  {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 22, borderRadius: 3, background: 'var(--surface-3)' }} />)}
                </div>
              )}

              {/* Status */}
              <div style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' as const,
                padding: '0.25rem 0.6rem', borderRadius: 5, flexShrink: 0,
                background: p.selfTestDone ? 'rgba(4,120,87,0.06)' : 'rgba(190,18,60,0.06)',
                color: p.selfTestDone ? 'var(--success)' : 'var(--danger)',
              }}>
                {p.selfTestDone ? 'Fertig' : 'Offen'}
              </div>
            </Link>
          )
        })}

        {filteredPlayers.length === 0 && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
            {players.length === 0
              ? 'Noch keine Spieler in diesem Team. Einladungslink in der Verwaltung erstellen.'
              : 'Keine Treffer für diesen Filter.'}
          </div>
        )}
      </div>
    </div>
  )
}
