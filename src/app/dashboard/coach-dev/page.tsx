'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getYouthType, FAMILY_META, DIMENSION_META, getAllYouthTypes } from '@/lib/youth/constants'
import { getFamily, DIMENSIONS } from '@/services/scoring/calculate'
import Link from 'next/link'

const COACH_RESOURCES = [
  {
    icon: '',
    title: 'Psychologische Sicherheit schaffen',
    desc: 'Wie du ein Umfeld baust, in dem Jugendliche Fehler zugeben und ehrlich kommunizieren.',
    tips: [
      'Starte jedes Training mit einer kurzen Check-in-Frage ("Wie geht\'s dir heute auf einer Skala von 1-5?")',
      'Reagiere auf Fehler mit Neugier statt Kritik: "Was hast du dabei gelernt?"',
      'Teile eigene Fehler — das normalisiert Verletzlichkeit',
      'Etabliere eine "No-Blame"-Regel für die ersten 10 Minuten nach einem Spiel',
    ],
    basis: 'Edmondson (1999) · Team Psychological Safety',
    color: '#14b8c4',
  },
  {
    icon: '',
    title: 'Rollenklarheit kommunizieren',
    desc: 'Jugendliche performen besser wenn sie wissen was von ihnen erwartet wird.',
    tips: [
      'Führe zu Saisonbeginn ein 1:1-Gespräch mit jedem Spieler über seine Rolle',
      'Schreibe die Rolle schriftlich auf — nicht nur mündlich',
      'Wiederhole die Rolle vor jedem Spiel in 1-2 Sätzen',
      'Frage regelmäßig: "Weißt du was ich von dir erwarte?" — ehrlich, nicht rhetorisch',
    ],
    basis: 'Beauchamp et al. (2002) · Role Clarity in Sport',
    color: '#f59e0b',
  },
  {
    icon: '',
    title: 'Feedback das ankommt',
    desc: 'Gutes Feedback verändert Verhalten. Schlechtes zerstört Motivation.',
    tips: [
      'Nutze die 3:1-Regel — drei positive Rückmeldungen pro kritische',
      'Sei konkret: "Dein Timing beim Pressing in Minute 35 war perfekt" statt "Gut gemacht"',
      'Trenne Person von Verhalten: "Die Aktion war riskant" statt "Du bist rücksichtslos"',
      'Gib Feedback zeitnah — nicht erst beim nächsten Training',
      'Frage nach dem Feedback: "Wie siehst du das?" — Dialog statt Monolog',
    ],
    basis: 'Hattie & Timperley (2007) · Feedback Framework',
    color: '#7c3aed',
  },
  {
    icon: '',
    title: 'Motivation verstehen & fördern',
    desc: 'Intrinsische Motivation ist der stärkste Antrieb — aber sie braucht die richtigen Bedingungen.',
    tips: [
      'Autonomie geben: Lass Spieler bei Übungsauswahl mitentscheiden',
      'Kompetenz stärken: Setze erreichbare Zwischenziele, feiere kleine Fortschritte',
      'Zugehörigkeit schaffen: Teamrituale, gemeinsame Erlebnisse abseits des Platzes',
      'Vergleiche Spieler NIE öffentlich miteinander — nur mit sich selbst',
      'Frage: "Was brauchst du gerade von mir?" — nicht jeder braucht dasselbe',
    ],
    basis: 'Deci & Ryan (2000) · Self-Determination Theory',
    color: '#10b981',
  },
  {
    icon: '',
    title: 'Umgang mit Druck & Wellbeing',
    desc: 'Jugendliche tragen oft mehr als man sieht — Schule, Familie, Social Media, Leistungsdruck.',
    tips: [
      'Erkenne Warnsignale: Rückzug, Leistungseinbruch, Reizbarkeit, häufige Verletzungen',
      'Sprich Druck offen an: "Es ist okay wenn es gerade zu viel ist"',
      'Biete Pausen an ohne Strafe — Erholung ist kein Zeichen von Schwäche',
      'Kenne die Grenzen deiner Rolle — bei ernsten Problemen an Profis weiterleiten',
      'Führe regelmäßig die Humatrix-Batterien durch um Veränderungen früh zu erkennen',
    ],
    basis: 'WHO (2021) · Mental Health in Adolescent Athletes',
    color: '#ec4899',
  },
  {
    icon: '',
    title: 'Teamdynamik aktiv gestalten',
    desc: 'Eine Mannschaft ist mehr als die Summe ihrer Spieler — die Dynamik entscheidet.',
    tips: [
      'Nutze die Humatrix Team-DNA um Ungleichgewichte zu erkennen',
      'Mische bewusst: Strategen mit Anführern, Teamformer mit Performern',
      'Sprich Konflikte direkt an — ungelöste Konflikte vergiften das Klima',
      'Schaffe Räume für informellen Austausch (gemeinsames Essen, Teambuilding)',
      'Achtung bei zu vielen gleichen Typen — Diversität stärkt das Team',
    ],
    basis: 'Tuckman (1965) · Stages of Group Development + Humatrix Typ-Familien',
    color: '#60a5fa',
  },
]

const COACHING_BY_FAMILY: Record<string, {
  title: string
  desc: string
  approach: string[]
  pitfalls: string[]
  color: string
}> = {
  str: {
    title: 'Strategen coachen',
    desc: 'Ruhige, analytische Spieler die alleine an sich arbeiten. Brauchen Struktur und Tiefe.',
    approach: [
      'Gib ihnen Raum für eigenständiges Training',
      'Nutze sie als taktische Sparringspartner',
      'Kommuniziere sachlich und konkret — nicht emotional',
      'Entwickle gemeinsam langfristige Entwicklungspläne',
      'Wertschätze ihre leise Art — nicht jeder muss laut führen',
    ],
    pitfalls: [
      'Zwinge sie nicht ständig in Gruppenarbeit',
      'Keine vagen oder spontanen Anweisungen',
      'Nicht öffentlich unter Druck setzen',
      'Routinen nicht ohne Erklärung ändern',
    ],
    color: '#A78BFA',
  },
  tfo: {
    title: 'Teamformer coachen',
    desc: 'Soziale Verbinder die das Team zusammenhalten. Brauchen Harmonie und Anerkennung.',
    approach: [
      'Gib ihnen eine integrierende Rolle (Kapitän, Betreuerrolle)',
      'Erkenne ihre soziale Arbeit an — sie halten die Kabine zusammen',
      'Nutze sie als Frühwarnsystem für Teamkonflikte',
      'Fördere sie in Kommunikation und Mediation',
      'Beziehe sie in Entscheidungen ein die das Team betreffen',
    ],
    pitfalls: [
      'Fordere Konfrontation nicht erzwungen ein',
      'Überlade sie nicht mit Verantwortung für andere',
      'Nicht ignorieren wenn sie sich zurückziehen — das ist ein Alarmsignal',
      'Wettkampfdruck nicht ausschließlich über sie kanalisieren',
    ],
    color: '#60A5FA',
  },
  per: {
    title: 'Performer coachen',
    desc: 'Ehrgeizige Wettkämpfer die sich messen wollen. Brauchen Herausforderung und klare Ziele.',
    approach: [
      'Setze messbare, progressive Ziele — sie lieben Zahlen und Fortschritt',
      'Fordere sie heraus — Unterforderung ist Gift für diesen Typ',
      'Gib direktes, ehrliches Feedback — sie respektieren Klarheit',
      'Nutze gesunden Wettbewerb als Motivator',
      'Erkenne ihre Einzelleistung an, aber lenke den Fokus auch aufs Team',
    ],
    pitfalls: [
      'Nicht mit Lob sparen — auch Performer brauchen Anerkennung',
      'Ego-Konflikte früh adressieren bevor sie eskalieren',
      'Nicht nur auf Ergebnisse schauen — auch den Prozess wertschätzen',
      'Vermeide es mehrere Performer gegeneinander auszuspielen',
    ],
    color: '#F59E0B',
  },
  lea: {
    title: 'Anführer coachen',
    desc: 'Emotionale Leader die das Team mitreißen. Brauchen Vertrauen und Verantwortung.',
    approach: [
      'Gib ihnen Führungsverantwortung — sie wachsen daran',
      'Nutze ihre Energie in Krisenmomenten bewusst',
      'Sprich über Emotionsregulation — Führung braucht Kontrolle',
      'Baue eine vertrauensvolle 1:1-Beziehung auf',
      'Lass sie mitgestalten — Spielaufstellung, Taktik-Gespräche',
    ],
    pitfalls: [
      'Nicht öffentlich demütigen — das zerstört die Beziehung nachhaltig',
      'Nicht alle Last auf ihre Schultern legen',
      'Machtkämpfe vermeiden — klare Hierarchie kommunizieren',
      'Emotionale Ausbrüche nicht ignorieren — nachbesprechen',
    ],
    color: '#F87171',
  },
}

export default function CoachDevPage() {
  const [profile, setProfile] = useState<any>(null)
  const [coachType, setCoachType] = useState<any>(null)
  const [expandedResource, setExpandedResource] = useState<number | null>(null)
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (prof) setProfile(prof)
        const { data: types } = await supabase.from('type_results').select('*')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
        if (types?.length) setCoachType(types[0])
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Wird geladen…</div>
    </div>
  )

  const ty = coachType ? getYouthType(coachType.result_type) : null
  const fam = coachType ? FAMILY_META[getFamily(coachType.result_type) as keyof typeof FAMILY_META] : null

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="hm-breadcrumb">
        <Link href="/dashboard/coach" style={{ color: 'inherit' }}>Dashboard</Link> · Weiterentwicklung
      </div>

      <h1 className="hero">
        Trainer-<span style={{ color: 'var(--accent)' }}>Entwicklung</span>
      </h1>
      <div className="hero-sub">
        Wissen, Tools und Impulse für bessere Jugendarbeit
      </div>

      {/* Coach Type Summary */}
      {coachType && ty && (
        <div className="card" style={{
          marginTop: '1.5rem',
          padding: '1.4rem',
          background: 'linear-gradient(135deg, rgba(20,184,196,0.06), rgba(15,23,42,0.02))',
          border: '1.5px solid rgba(20,184,196,0.18)',
        }}>
          <div className="hm-section" style={{ color: 'var(--accent)' }}>Dein Trainer-Typ</div>
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '3.5rem' }}>{ty.emoji}</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--ink)',
              }}>
                {ty.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                {fam?.icon} {fam?.name} · {coachType.result_type}
              </div>
              {ty.tagline && (
                <div style={{ fontSize: '0.88rem', fontStyle: 'italic', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>
                  „{ty.tagline}"
                </div>
              )}
            </div>
            <Link href="/dashboard/results" className="btn-secondary" style={{ flexShrink: 0, fontSize: '0.8rem' }}>
              Profil ansehen →
            </Link>
          </div>

          {/* Dim Bars compact */}
          {coachType.scoring_json?.dimensions && (
            <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              {DIMENSIONS.map(d => {
                const sc = coachType.scoring_json.dimensions[d.key]
                if (!sc) return null
                const meta = DIMENSION_META[d.key as keyof typeof DIMENSION_META]
                return (
                  <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, width: 70, color: 'var(--muted)' }}>
                      {meta.icon} {meta.label}
                    </span>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--border)' }}>
                      <div style={{
                        height: '100%',
                        width: `${sc.pct}%`,
                        borderRadius: 999,
                        background: sc.pct >= 50 ? meta.colorA : meta.colorB,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, width: 86, textAlign: 'right', color: sc.pct >= 50 ? meta.colorA : meta.colorB }}>
                      {sc.label} {sc.pct}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Self Dev Tips */}
          {ty.selfDev && ty.selfDev.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div className="hm-section" style={{ color: 'var(--accent)', marginBottom: '0.4rem' }}>
                Persönliche Entwicklungspunkte
              </div>
              {ty.selfDev.map((tip: string, i: number) => (
                <div key={i} className="strength-item" style={{ fontSize: '0.88rem' }}>{tip}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {!coachType && (
        <div className="card" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}></div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--ink)' }}>
            Du hast noch keinen Trainer-Test gemacht
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Finde heraus welcher Trainer-Typ du bist — und erhalte typspezifische Entwicklungstipps.
          </div>
          <Link href="/dashboard/test" className="btn-primary">
            Trainer-Test starten
          </Link>
        </div>
      )}

      {/* Coaching by Family Type */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.3rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--ink)',
          marginBottom: '0.3rem',
        }}>
          Spielertypen richtig coachen
        </h2>
        <div style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Jede Typ-Familie braucht einen anderen Ansatz. Klick auf eine Familie für konkrete Handlungsempfehlungen.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {Object.entries(COACHING_BY_FAMILY).map(([key, fam]) => {
            const famMeta = FAMILY_META[key as keyof typeof FAMILY_META]
            const isExpanded = expandedFamily === key
            return (
              <div key={key}>
                <button
                  onClick={() => setExpandedFamily(isExpanded ? null : key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '1rem 1.2rem',
                    borderRadius: isExpanded ? '18px 18px 0 0' : 18,
                    background: 'var(--surface)',
                    border: `1.5px solid ${fam.color}33`,
                    borderBottom: isExpanded ? `1.5px solid ${fam.color}22` : undefined,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s',
                  }}
                >
                  <div style={{ fontSize: '1.6rem' }}>{famMeta.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: fam.color }}>{fam.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{fam.desc}</div>
                  </div>
                  <span style={{ fontSize: '1.2rem', color: 'var(--muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                    ▾
                  </span>
                </button>

                {isExpanded && (
                  <div style={{
                    padding: '1.2rem',
                    borderRadius: '0 0 18px 18px',
                    background: 'var(--surface)',
                    border: `1.5px solid ${fam.color}33`,
                    borderTop: 'none',
                    animation: 'fadeIn 0.25s ease',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      <div>
                        <div className="hm-section" style={{ color: 'var(--success)' }}>So coachen</div>
                        {fam.approach.map((t, i) => (
                          <div key={i} className="strength-item" style={{ fontSize: '0.86rem' }}>{t}</div>
                        ))}
                      </div>
                      <div>
                        <div className="hm-section" style={{ color: 'var(--danger)' }}>Vermeiden</div>
                        {fam.pitfalls.map((t, i) => (
                          <div key={i} style={{
                            fontSize: '0.86rem',
                            padding: '0.35rem 0 0.35rem 1.2rem',
                            position: 'relative',
                            lineHeight: 1.5,
                          }}>
                            <span style={{ position: 'absolute', left: 0, color: 'var(--danger)', fontWeight: 800 }}>!</span>
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Knowledge Base */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.3rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--ink)',
          marginBottom: '0.3rem',
        }}>
          Wissensbausteine
        </h2>
        <div style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Evidenzbasierte Impulse für die tägliche Praxis mit Jugendlichen.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {COACH_RESOURCES.map((res, idx) => {
            const isExpanded = expandedResource === idx
            return (
              <div key={idx}>
                <button
                  onClick={() => setExpandedResource(isExpanded ? null : idx)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '1rem 1.2rem',
                    borderRadius: isExpanded ? '18px 18px 0 0' : 18,
                    background: 'var(--surface)',
                    border: `1px solid var(--card-border)`,
                    borderLeft: `4px solid ${res.color}`,
                    borderBottom: isExpanded ? '1px solid var(--border)' : undefined,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s',
                  }}
                >
                  <div style={{ fontSize: '1.6rem' }}>{res.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--ink)' }}>{res.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>{res.desc}</div>
                  </div>
                  <span style={{ fontSize: '1.2rem', color: 'var(--muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                    ▾
                  </span>
                </button>

                {isExpanded && (
                  <div style={{
                    padding: '1.2rem',
                    borderRadius: '0 0 18px 18px',
                    background: 'var(--surface)',
                    border: '1px solid var(--card-border)',
                    borderTop: 'none',
                    borderLeft: `4px solid ${res.color}`,
                    animation: 'fadeIn 0.25s ease',
                  }}>
                    {res.tips.map((tip, i) => (
                      <div key={i} className="strength-item" style={{ fontSize: '0.88rem' }}>{tip}</div>
                    ))}
                    <div style={{
                      marginTop: '0.8rem',
                      paddingTop: '0.6rem',
                      borderTop: '1px solid var(--border)',
                      fontSize: '0.72rem',
                      color: 'var(--muted)',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      Quelle: {res.basis}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div style={{
        display: 'flex',
        gap: '0.6rem',
        marginTop: '2rem',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <Link href="/dashboard/coach" className="btn-secondary">
          ← Dashboard
        </Link>
        {!coachType && (
          <Link href="/dashboard/test" className="btn-primary">
            Trainer-Test machen
          </Link>
        )}
      </div>
    </div>
  )
}
