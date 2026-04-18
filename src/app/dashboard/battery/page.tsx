'use client'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { ANCHOR_METRICS, getBattery } from '@/lib/youth/constants'
import Link from 'next/link'

const BATTERIES = [
  { key: 'A', label: 'Führung & Trainer',   icon: '🎯', color: '#14b8c4', months: [2, 6, 10], monthNames: ['Aug', 'Dez', 'Apr'] },
  { key: 'B', label: 'Team & Klima',        icon: '🤝', color: '#10b981', months: [3, 7, 11], monthNames: ['Sep', 'Jän', 'Mai'] },
  { key: 'C', label: 'Entwicklung',         icon: '⚡', color: '#f59e0b', months: [4, 8, 12], monthNames: ['Okt', 'Feb', 'Jun'] },
  { key: 'D', label: 'Wellbeing & Druck',   icon: '💜', color: '#8b5cf6', months: [5, 9],     monthNames: ['Nov', 'Mär'] },
  { key: 'E', label: 'Matchday-Reflexion',  icon: '⚽', color: '#ec4899', months: [],         monthNames: [] },
] as const

const MONTH_NAMES = ['', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez', 'Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun']

const FOCUS_QUESTIONS: Record<string, { id: number; text: string }[]> = {
  A: getBattery('a').filter(q => !q.dim.startsWith('anchor_')).map(q => ({ id: q.id, text: q.text })),
  B: getBattery('b').filter(q => !q.dim.startsWith('anchor_')).map(q => ({ id: q.id, text: q.text })),
  C: getBattery('c').filter(q => !q.dim.startsWith('anchor_')).map(q => ({ id: q.id, text: q.text })),
  D: getBattery('d').filter(q => !q.dim.startsWith('anchor_')).map(q => ({ id: q.id, text: q.text })),
  E: getBattery('e').filter(q => !q.dim.startsWith('anchor_')).map(q => ({ id: q.id, text: q.text })),
}

function BatteryInner() {
  const searchParams = useSearchParams()
  const urlBat = searchParams.get('bat')
  const urlMonth = searchParams.get('month')
  const [profile, setProfile] = useState<any>(null)
  const [membership, setMembership] = useState<any>(null)
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [activeBattery, setActiveBattery] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const supabase = createClient()

  function getCurrentMonth(): number {
    const now = new Date()
    const m = now.getMonth() + 1
    const map: Record<number, number> = {7:1, 8:2, 9:3, 10:4, 11:5, 12:6, 1:7, 2:8, 3:9, 4:10, 5:11, 6:12}
    return map[m] || 1
  }

  function getBatteryForMonth(month: number): string {
    for (const b of BATTERIES) {
      if ((b.months as readonly number[]).includes(month)) return b.key
    }
    return 'A'
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof) setProfile(prof)

      const { data: mem } = await supabase.from('team_memberships').select('team_id').eq('user_id', user.id).limit(1)
      if (mem?.length) setMembership(mem[0])

      const { data: responses } = await supabase.from('battery_responses').select('season_month')
        .eq('user_id', user.id).eq('season', '2025/26')
      const done: Record<string, boolean> = {}
      responses?.forEach((r: any) => { done[String(r.season_month)] = true })
      setCompleted(done)

      if (urlBat && !done[String(urlMonth || getCurrentMonth())]) {
        setActiveBattery(urlBat)
        if (urlMonth) setSelectedMonth(Number(urlMonth))
      }
    }
    load()
  }, [])

  function setAnswer(qId: number, val: number) {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  async function handleSubmit() {
    if (!profile || !activeBattery) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const focusQs = FOCUS_QUESTIONS[activeBattery] || []
    const focusVals = focusQs.map(q => answers[q.id]).filter(v => v !== undefined)
    const focusAvg = focusVals.length > 0 ? focusVals.reduce((s, v) => s + v, 0) / focusVals.length : null

    const commitment = answers[203] || 4
    const satisfaction = answers[201] || 4
    const motivation = answers[205] || 4
    const riskScore = (commitment + satisfaction + motivation) / 3
    const turnoverRisk = riskScore <= 3 ? 'high' : riskScore <= 5 ? 'mid' : 'low'

    try {
      await supabase.from('battery_responses').insert({
        user_id: user.id,
        team_id: membership?.team_id || null,
        battery: activeBattery,
        season_month: selectedMonth,
        season: '2025/26',
        anchor_satisfaction: answers[201] || null,
        anchor_psych_safety: answers[202] || null,
        anchor_commitment: answers[203] || null,
        anchor_alignment: answers[204] || null,
        anchor_motivation: answers[205] || null,
        answers_json: answers,
        focus_scores: { average: focusAvg ? Math.round(focusAvg * 10) / 10 : null, battery: activeBattery },
        turnover_risk: turnoverRisk,
      })
      setDone(true)
    } catch (err) {
      alert('Fehler beim Speichern. Bitte erneut versuchen.')
    }
    setSubmitting(false)
  }

  // ═══ DONE SCREEN ═══
  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 fade-in">
        <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'bounceIn 0.6s' }}>🎉</div>
        <h2 className="hero" style={{ marginBottom: '0.5rem' }}>
          <span className="gradient-text">Danke!</span>
        </h2>
        <p className="hero-sub" style={{ marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Deine Antworten wurden gespeichert. Dein Trainer erhält die Daten automatisch.
        </p>
        <Link href="/dashboard/player" className="btn-accent">
          → Zurück zum Dashboard
        </Link>
      </div>
    )
  }

  // ═══ BATTERY SELECTION ═══
  if (!activeBattery) {
    const currentBattery = getBatteryForMonth(selectedMonth)
    return (
      <div className="max-w-2xl mx-auto fade-in">
        <div className="hm-breadcrumb">Spieler · Monats-Check-in</div>

        <h1 className="hero">
          Monats-<span className="gradient-text">Check-in</span>
        </h1>
        <p className="hero-sub">5 Minuten · 13 Fragen · Monatlich über die Saison</p>

        {/* Saison-Kalender */}
        <div className="card" style={{ marginTop: '1.4rem' }}>
          <div className="hm-section">🗓 Saison 2025/26</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.4rem' }}>
            {MONTH_NAMES.slice(1).map((name, i) => {
              const month = i + 1
              const bat = getBatteryForMonth(month)
              const batDef = BATTERIES.find(b => b.key === bat)
              const isDone = completed[String(month)]
              const isCurrent = month === selectedMonth
              return (
                <button
                  key={month}
                  onClick={() => !isDone && setSelectedMonth(month)}
                  disabled={isDone}
                  style={{
                    padding: '0.6rem 0.3rem',
                    textAlign: 'center',
                    background: isCurrent ? `${batDef?.color}15` : isDone ? 'rgba(16,185,129,0.08)' : 'var(--surface)',
                    border: isCurrent
                      ? `2px solid ${batDef?.color}`
                      : isDone ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border)',
                    borderRadius: 12,
                    opacity: isDone ? 0.6 : 1,
                    cursor: isDone ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isDone ? 'var(--success)' : batDef?.color }}>
                    {name}
                  </div>
                  <div style={{ fontSize: '0.65rem', marginTop: '0.15rem', color: 'var(--muted)', fontWeight: 600 }}>
                    {isDone ? '✓' : bat}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Aktuelle Batterie */}
        {(() => {
          const bat = BATTERIES.find(b => b.key === currentBattery)!
          const isAlreadyDone = completed[String(selectedMonth)]
          return (
            <div className="card" style={{
              marginTop: '1.2rem',
              background: `linear-gradient(135deg, ${bat.color}08, ${bat.color}03)`,
              border: `2px solid ${bat.color}28`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{bat.icon}</span>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: bat.color,
                    letterSpacing: '-0.02em',
                  }}>
                    Batterie {bat.key}: {bat.label}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                    {MONTH_NAMES[selectedMonth]} · 5 Ankerfragen + 8 Schwerpunktfragen
                  </div>
                </div>
              </div>
              {isAlreadyDone ? (
                <div style={{
                  padding: '0.9rem 1rem',
                  borderRadius: 14,
                  background: 'rgba(16,185,129,0.1)',
                  color: 'var(--success)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textAlign: 'center',
                }}>
                  ✓ Bereits ausgefüllt für diesen Monat
                </div>
              ) : (
                <button
                  onClick={() => setActiveBattery(currentBattery)}
                  className="btn-accent"
                  style={{ width: '100%' }}
                >
                  → Befragung starten
                </button>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  // ═══ ACTIVE BATTERY QUESTIONNAIRE ═══
  const bat = BATTERIES.find(b => b.key === activeBattery)!
  const anchorQs = ANCHOR_METRICS
  const focusQs = FOCUS_QUESTIONS[activeBattery] || []
  const totalQs = 5 + focusQs.length
  const answeredCount = Object.keys(answers).filter(k => answers[Number(k)] !== undefined).length
  const allDone = answeredCount >= totalQs

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div style={{
        fontSize: '0.65rem',
        fontWeight: 800,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: bat.color,
        marginBottom: '0.4rem',
      }}>
        {bat.icon} Batterie {bat.key} · {MONTH_NAMES[selectedMonth]}
      </div>

      <h1 className="hero" style={{ fontSize: '1.9rem' }}>
        {bat.label}
      </h1>
      <p className="hero-sub">
        <strong>{answeredCount}/{totalQs}</strong> Fragen beantwortet
      </p>

      {/* Progress Bar */}
      <div style={{
        height: 6,
        borderRadius: 999,
        background: 'rgba(15,23,42,0.08)',
        overflow: 'hidden',
        marginTop: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          height: '100%',
          width: `${(answeredCount / totalQs) * 100}%`,
          background: `linear-gradient(90deg, ${bat.color}, ${bat.color}dd)`,
          borderRadius: 999,
          transition: 'width 0.5s cubic-bezier(.2,.8,.2,1)',
        }} />
      </div>

      {/* Anker-Fragen */}
      <div className="hm-section">🧭 5 Ankerfragen</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {anchorQs.map((a, idx) => {
          const qId = 201 + idx
          return (
            <div
              key={qId}
              className="q-card"
              style={{
                borderColor: answers[qId] !== undefined ? 'var(--accent)' : undefined,
              }}
            >
              <div className="q-text">
                <span className="q-num">{a.icon}</span>
                {a.question}
              </div>
              <div className="scale-row">
                {[1,2,3,4,5,6,7].map(val => (
                  <button
                    key={val}
                    onClick={() => setAnswer(qId, val)}
                    className={`scale-btn ${answers[qId] === val ? 'active' : ''}`}
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
          )
        })}
      </div>

      {/* Focus-Fragen */}
      <div className="hm-section" style={{ color: bat.color }}>
        {bat.icon} {bat.label} · Schwerpunkt
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {focusQs.map(q => (
          <div
            key={q.id}
            className="q-card"
            style={{
              borderColor: answers[q.id] !== undefined ? bat.color + '55' : undefined,
            }}
          >
            <div className="q-text">{q.text}</div>
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

      {/* Submit */}
      <div style={{ textAlign: 'right', paddingBottom: '1rem' }}>
        {!allDone && (
          <div style={{ fontSize: '0.78rem', marginBottom: '0.5rem', color: 'var(--gold)', fontWeight: 600 }}>
            Noch {totalQs - answeredCount} Fragen offen
          </div>
        )}
        <button
          onClick={() => { if (allDone && confirm('Antworten abschicken?')) handleSubmit() }}
          disabled={submitting || !allDone}
          className={allDone ? 'btn-accent' : 'btn-secondary'}
          style={{ opacity: allDone ? 1 : 0.5 }}
        >
          {submitting
            ? '⏳ Wird gespeichert…'
            : allDone ? '✓ Befragung abschließen' : `Noch ${totalQs - answeredCount} offen`}
        </button>
      </div>
    </div>
  )
}

export default function BatteryPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20">
        <div style={{ color: 'var(--muted)' }}>Lade…</div>
      </div>
    }>
      <BatteryInner />
    </Suspense>
  )
}
