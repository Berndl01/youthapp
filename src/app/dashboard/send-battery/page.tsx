'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const BATTERIES = [
  { key: 'A', label: 'Führung & Alignment',    icon: '🎯', color: '#14b8c4', desc: 'Trainerkommunikation, Rollenklarheit, Fairness, Feedback' },
  { key: 'B', label: 'Team & Klima',            icon: '🤝', color: '#10b981', desc: 'Stimmung, Zusammenhalt, Integration, Konflikte, Vertrauen' },
  { key: 'C', label: 'Entwicklung & Energie',   icon: '⚡', color: '#f59e0b', desc: 'Fortschritt, Spielzeit, Perspektive, Balance' },
  { key: 'D', label: 'Vertrauen & Wohlbefinden',icon: '💜', color: '#7c3aed', desc: 'Fitness, Mental, Druck, Wertschätzung, Identifikation' },
  { key: 'E', label: 'Spieltag-Reflexion',      icon: '⚽', color: '#ec4899', desc: 'Nach dem Spiel: Leistung, Taktik, Reaktion, Stimmung, Bereitschaft' },
]

const MONTH_NAMES = ['', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez', 'Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun']

export default function SendBatteryPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [teamId, setTeamId] = useState<string>('')
  const [selectedBattery, setSelectedBattery] = useState<string>('A')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [matchContext, setMatchContext] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  function getCurrentMonth(): number {
    const m = new Date().getMonth() + 1
    const map: Record<number, number> = {7:1,8:2,9:3,10:4,11:5,12:6,1:7,2:8,3:9,4:10,5:11,6:12}
    return map[m] || 1
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Nicht eingeloggt'); setLoading(false); return }
        const { data: teams } = await supabase.from('team_memberships').select('team_id')
          .eq('user_id', user.id).eq('role_in_team', 'coach')
        if (!teams?.length) { setError('Keine Trainer-Zuweisung'); setLoading(false); return }
        setTeamId(teams[0].team_id)

        const { data: members } = await supabase.from('team_memberships')
          .select('user_id, profiles(id, first_name, last_name)')
          .eq('team_id', teams[0].team_id).eq('role_in_team', 'player')
        if (members) setPlayers(members.map((m: any) => m.profiles).filter(Boolean))
      } catch (e: any) { setError(e?.message || 'Fehler beim Laden') }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSend() {
    if (!players.length || !teamId) return
    setSending(true)

    const bat = BATTERIES.find(b => b.key === selectedBattery)!
    const monthName = MONTH_NAMES[selectedMonth]
    const title = selectedBattery === 'E'
      ? `⚽ Spieltag-Reflexion${matchContext ? ': ' + matchContext : ''}`
      : `📋 Monatsbefragung ${monthName}: ${bat.label}`
    const message = selectedBattery === 'E'
      ? `Bitte fülle die kurze Spieltag-Reflexion aus (ca. 3 Min).${matchContext ? ' Zum Spiel: ' + matchContext : ''}`
      : `Dein Trainer hat die Befragung "${bat.label}" für ${monthName} freigeschaltet. Bitte fülle sie aus (ca. 5 Min).`

    let count = 0
    for (const player of players) {
      try {
        await supabase.from('notifications').insert({
          user_id: player.id,
          team_id: teamId,
          type: 'battery_request',
          title,
          message,
          action_url: `/dashboard/battery?bat=${selectedBattery}&month=${selectedMonth}`,
        })
        count++
      } catch (e) { console.error('Notification failed for', player.id, e) }
    }

    setSentCount(count)
    setSent(true)
    setSending(false)
  }

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Lade…</div>
    </div>
  )

  if (error) return (
    <div className="max-w-lg mx-auto text-center py-16 fade-in">
      <div style={{ fontSize: '3rem', marginBottom: '0.8rem' }}>⚠️</div>
      <h2 className="hero" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Keine Berechtigung</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '1.4rem' }}>{error}</p>
      <Link href="/dashboard/admin" className="btn-primary">→ Zur Verwaltung</Link>
    </div>
  )

  if (sent) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 fade-in">
        <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'bounceIn 0.6s' }}>✅</div>
        <h2 className="hero" style={{ marginBottom: '0.5rem' }}>
          Befragung <span style={{ color: 'var(--success)' }}>verschickt</span>
        </h2>
        <p className="hero-sub" style={{ marginBottom: '0.5rem' }}>
          <strong>{sentCount}</strong> Jugendliche haben eine Benachrichtigung erhalten.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1.8rem' }}>
          Die Spieler sehen die Anfrage beim nächsten Öffnen der App.
        </p>
        <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setSent(false); setMatchContext('') }}
            className="btn-primary"
          >
            📤 Weitere verschicken
          </button>
          <Link href="/dashboard/trends" className="btn-secondary">
            📈 Trends ansehen
          </Link>
        </div>
      </div>
    )
  }

  const currentBat = BATTERIES.find(b => b.key === selectedBattery)!

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div className="hm-breadcrumb">Trainer · Umfrage versenden</div>

      <h1 className="hero">
        Umfrage <span style={{ color: 'var(--accent)' }}>versenden</span>
      </h1>
      <p className="hero-sub">
        Wähle eine Batterie und einen Monat. Alle <strong>{players.length} Jugendlichen</strong> erhalten eine Benachrichtigung.
      </p>

      {/* Batterie-Auswahl */}
      <div style={{ marginTop: '1.5rem' }}>
        <div className="hm-section">📦 Batterie wählen</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {BATTERIES.map(b => {
            const active = selectedBattery === b.key
            return (
              <button
                key={b.key}
                onClick={() => setSelectedBattery(b.key)}
                style={{
                  textAlign: 'left',
                  padding: '1rem 1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem',
                  background: active ? `${b.color}12` : 'var(--surface)',
                  border: active ? `2px solid ${b.color}` : '1px solid var(--border)',
                  borderRadius: 16,
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  fontFamily: 'inherit',
                  color: 'var(--ink)',
                  boxShadow: active ? `0 8px 24px ${b.color}22` : 'none',
                }}
              >
                <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{b.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: active ? b.color : 'var(--ink)' }}>
                    Batterie {b.key}: {b.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem', lineHeight: 1.4 }}>
                    {b.desc}
                  </div>
                </div>
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.3rem 0.7rem',
                  borderRadius: 999,
                  background: active ? `${b.color}22` : 'var(--surface-2)',
                  color: active ? b.color : 'var(--muted)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
                }}>
                  {b.key === 'E' ? '11 Fragen' : '13 Fragen'}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Monat oder Kontext */}
      {selectedBattery !== 'E' ? (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="hm-section">🗓 Monat zuordnen</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '0.4rem',
          }}>
            {MONTH_NAMES.slice(1).map((name, i) => {
              const month = i + 1
              const active = selectedMonth === month
              return (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  style={{
                    padding: '0.6rem 0.3rem',
                    borderRadius: 12,
                    background: active ? 'var(--grad-primary)' : 'var(--surface)',
                    border: active ? '1px solid transparent' : '1px solid var(--border)',
                    color: active ? 'white' : 'var(--muted)',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                    boxShadow: active ? '0 8px 18px rgba(124, 58, 237, 0.28)' : 'none',
                  }}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ color: 'var(--accent-2)' }}>⚽ Spieltag-Kontext (optional)</label>
          <input
            type="text"
            value={matchContext}
            onChange={e => setMatchContext(e.target.value)}
            placeholder="z.B. Heimspiel vs. FC Innsbruck – 1:3 Niederlage"
          />
        </div>
      )}

      {/* Zusammenfassung + Senden */}
      <div className="card" style={{
        marginTop: '1.5rem',
        background: `linear-gradient(135deg, ${currentBat.color}08, ${currentBat.color}03)`,
        border: `1.5px solid ${currentBat.color}28`,
      }}>
        <div className="hm-section" style={{ color: currentBat.color }}>📋 Zusammenfassung</div>
        <div style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--ink-soft)' }}>
          <div><strong style={{ color: 'var(--ink)' }}>Batterie:</strong> {currentBat.icon} {currentBat.label}</div>
          {selectedBattery !== 'E' && (
            <div><strong style={{ color: 'var(--ink)' }}>Monat:</strong> {MONTH_NAMES[selectedMonth]}</div>
          )}
          {selectedBattery === 'E' && matchContext && (
            <div><strong style={{ color: 'var(--ink)' }}>Kontext:</strong> {matchContext}</div>
          )}
          <div><strong style={{ color: 'var(--ink)' }}>Empfänger:</strong> {players.length} Jugendliche</div>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !players.length}
          className="btn-accent"
          style={{ width: '100%', marginTop: '1.2rem', opacity: sending || !players.length ? 0.5 : 1 }}
        >
          {sending
            ? '⏳ Wird versendet…'
            : `📤 An ${players.length} Jugendliche verschicken`}
        </button>
      </div>

      {/* Info-Box */}
      <div style={{
        marginTop: '1.2rem',
        padding: '0.9rem 1.1rem',
        fontSize: '0.82rem',
        color: 'var(--muted)',
        lineHeight: 1.5,
        background: 'var(--surface-2)',
        borderRadius: 14,
        border: '1px solid var(--border)',
      }}>
        💡 <strong style={{ color: 'var(--ink)' }}>Tipp:</strong> Die Jugendlichen sehen die Benachrichtigung beim
        nächsten Öffnen oben auf ihrem Dashboard. Sie können die Umfrage dann mit einem Klick starten.
      </div>
    </div>
  )
}
