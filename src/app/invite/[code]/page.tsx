'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { AcademyLogo } from '@/components/AcademyLogo'

export default function InvitePage() {
  const params = useParams()
  const code = params.code as string
  const supabase = createClient()

  const [team, setTeam] = useState<any>(null)
  const [club, setClub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')

  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', birth_date: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        if (!supabase) {
          setError('Verbindung nicht möglich')
          setLoading(false)
          return
        }

        const { data: teamData } = await supabase
          .from('teams')
          .select('*, clubs(name)')
          .eq('invite_code', code)
          .single()

        if (!teamData) {
          setError('Ungültiger Einladungslink.')
          setLoading(false)
          return
        }

        setTeam(teamData)
        setClub((teamData as any).clubs)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: existing } = await supabase
            .from('team_memberships')
            .select('id')
            .eq('user_id', user.id)
            .eq('team_id', teamData.id)
            .limit(1)

          if (existing?.length) setJoined(true)
        }
      } catch {
        setError('Fehler beim Laden der Einladung.')
      }
      setLoading(false)
    }
    load()
  }, [code, supabase])

  async function joinTeam(userId: string) {
    if (!team) return false
    setJoining(true)
    const { error } = await supabase.from('team_memberships').insert({
      user_id: userId,
      team_id: team.id,
      role_in_team: 'player'
    })

    if (error && !error.message.includes('duplicate')) {
      setFormError('Fehler beim Beitreten: ' + error.message)
      setJoining(false)
      return false
    }

    setJoined(true)
    setJoining(false)
    return true
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
          role: 'player',
          birth_date: form.birth_date || null,
        }
      }
    })

    if (error) {
      setFormError(error.message)
      setFormLoading(false)
      return
    }
    if (data.user) await joinTeam(data.user.id)
    setFormLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    })

    if (error) {
      setFormError(error.message)
      setFormLoading(false)
      return
    }
    if (data.user) await joinTeam(data.user.id)
    setFormLoading(false)
  }

  const pageBackground = `
    radial-gradient(circle at 15% 10%, rgba(139,92,246,0.15), transparent 25%),
    radial-gradient(circle at 85% 5%, rgba(236,72,153,0.10), transparent 28%),
    radial-gradient(circle at 50% 100%, rgba(249,115,22,0.08), transparent 30%),
    #0a0a0f
  `

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: pageBackground,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.6rem' }}>⏳</div>
          <div style={{ color: '#6b5b8a', fontWeight: 600 }}>Einladung wird geladen…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: pageBackground,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          maxWidth: 440,
          width: '100%',
          padding: '2.5rem 1.8rem',
          background: 'white',
          borderRadius: 28,
          textAlign: 'center',
          boxShadow: '0 18px 46px rgba(15, 23, 42, 0.08)',
          border: '1px solid rgba(236,72,153,0.2)',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.8rem' }}>⚠️</div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '1.6rem',
            fontWeight: 800,
            color: '#1a1033',
            letterSpacing: '-0.04em',
            marginBottom: '1rem',
          }}>
            {error}
          </h1>
          <Link href="/login" style={{
            display: 'inline-block',
            padding: '0.8rem 1.5rem',
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            color: 'white',
            borderRadius: 999,
            fontWeight: 800,
            fontSize: '0.9rem',
            textDecoration: 'none',
          }}>
            → Zur Anmeldung
          </Link>
        </div>
      </div>
    )
  }

  if (joined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: pageBackground,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          width: '100%',
          maxWidth: 560,
          padding: '3rem 2rem',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(252,248,255,0.96))',
          borderRadius: 32,
          textAlign: 'center',
          boxShadow: '0 18px 46px rgba(124, 58, 237, 0.20)',
          border: '2px solid rgba(124, 58, 237, 0.14)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '-30%',
            right: '-25%',
            width: 280,
            height: 280,
            background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'float 3s ease-in-out infinite' }}>🎉</div>
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '2.2rem',
              fontWeight: 900,
              letterSpacing: '-0.045em',
              lineHeight: 1,
              marginBottom: '0.5rem',
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #7c3aed, #ec4899, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Willkommen
              </span>{' '}
              im Team!
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#2d2a4a',
              marginTop: '0.8rem',
              lineHeight: 1.5,
            }}>
              Du bist jetzt Mitglied bei<br />
              <strong style={{ color: '#1a1033', fontSize: '1.2rem' }}>{team?.name}</strong>
            </p>
            <p style={{ color: '#6b5b8a', marginTop: '0.3rem', fontWeight: 500 }}>
              {club?.name} · {team?.season}
            </p>
            <a
              href="/dashboard/player"
              style={{
                display: 'inline-block',
                marginTop: '1.8rem',
                padding: '0.95rem 2rem',
                background: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 50%, #7c3aed 100%)',
                backgroundSize: '200% 200%',
                color: 'white',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: '0.98rem',
                textDecoration: 'none',
                boxShadow: '0 14px 32px rgba(124, 58, 237, 0.35)',
              }}
            >
              ✨ Zum Dashboard
            </a>
          </div>

          <style jsx>{`
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-6px); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem 1rem',
      background: pageBackground,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)',
        gap: '2rem',
      }} className="invite-grid">
        {/* Linke Spalte — Info */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(252,248,255,0.88))',
          borderRadius: 32,
          padding: '2.5rem 2rem',
          border: '1px solid rgba(124, 58, 237, 0.14)',
          boxShadow: '0 18px 46px rgba(124, 58, 237, 0.10)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }} className="invite-info-col">
          <div style={{
            position: 'absolute',
            top: '-20%',
            right: '-20%',
            width: 280,
            height: 280,
            background: 'radial-gradient(circle, rgba(245,158,11,0.10), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <AcademyLogo size={52} showText={true} variant="youth" />

            <div style={{
              display: 'inline-block',
              marginTop: '2rem',
              padding: '0.5rem 1rem',
              borderRadius: 999,
              background: 'rgba(124, 58, 237, 0.10)',
              border: '1px solid rgba(124, 58, 237, 0.18)',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6d28d9',
            }}>
              📬 Team-Einladung
            </div>

            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '2.3rem',
              fontWeight: 900,
              letterSpacing: '-0.045em',
              lineHeight: 1.05,
              marginTop: '1.2rem',
              color: '#1a1033',
            }}>
              Beitreten, Profil anlegen und{' '}
              <span style={{
                background: 'linear-gradient(135deg, #7c3aed, #ec4899, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                direkt loslegen
              </span>.
            </h1>
            <p style={{
              marginTop: '1.1rem',
              fontSize: '1rem',
              color: '#2d2a4a',
              lineHeight: 1.55,
            }}>
              Über diesen Link wirst du als Spieler*in dem Team hinzugefügt. Danach kannst du
              dein Profil vervollständigen, deinen Typ herausfinden und Umfragen ausfüllen.
            </p>
          </div>

          <div style={{
            padding: '1.5rem',
            borderRadius: 22,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.05))',
            border: '1.5px solid rgba(124,58,237,0.18)',
            position: 'relative',
            zIndex: 1,
          }}>
            <div style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#6b5b8a',
              marginBottom: '0.5rem',
            }}>
              Einladung für
            </div>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '1.8rem',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              color: '#1a1033',
              lineHeight: 1,
            }}>
              {team?.name}
            </div>
            <div style={{ marginTop: '0.4rem', color: '#6b5b8a', fontWeight: 600 }}>
              {club?.name} · {team?.season}
            </div>
          </div>
        </div>

        {/* Rechte Spalte — Formular */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(252,248,255,0.96))',
          borderRadius: 32,
          padding: '2rem 1.8rem',
          border: '1px solid rgba(124, 58, 237, 0.14)',
          boxShadow: '0 18px 46px rgba(124, 58, 237, 0.14)',
        }}>
          {/* Mobile Header */}
          <div style={{ marginBottom: '1.5rem' }} className="invite-mobile-header">
            <AcademyLogo size={46} showText={true} variant="youth" />

            <div style={{
              marginTop: '1.2rem',
              padding: '1rem 1.2rem',
              borderRadius: 20,
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.14)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#6b5b8a',
              }}>
                📬 Einladung
              </div>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: '1.4rem',
                fontWeight: 900,
                color: '#1a1033',
                marginTop: '0.4rem',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}>
                {team?.name}
              </h2>
              <div style={{ color: '#6b5b8a', marginTop: '0.2rem', fontSize: '0.85rem', fontWeight: 600 }}>
                {club?.name} · {team?.season}
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.4rem',
            padding: '0.3rem',
            borderRadius: 18,
            background: 'rgba(124,58,237,0.06)',
            marginBottom: '1.2rem',
          }}>
            <button
              onClick={() => setMode('register')}
              style={{
                padding: '0.75rem',
                borderRadius: 14,
                border: 'none',
                background: mode === 'register' ? 'linear-gradient(135deg, #7c3aed, #ec4899)' : 'transparent',
                color: mode === 'register' ? 'white' : '#6b5b8a',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: mode === 'register' ? '0 8px 18px rgba(124,58,237,0.28)' : 'none',
                transition: 'all 0.18s',
              }}
            >
              Neu registrieren
            </button>
            <button
              onClick={() => setMode('login')}
              style={{
                padding: '0.75rem',
                borderRadius: 14,
                border: 'none',
                background: mode === 'login' ? 'linear-gradient(135deg, #7c3aed, #ec4899)' : 'transparent',
                color: mode === 'login' ? 'white' : '#6b5b8a',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: mode === 'login' ? '0 8px 18px rgba(124,58,237,0.28)' : 'none',
                transition: 'all 0.18s',
              }}
            >
              Bereits registriert
            </button>
          </div>

          <form
            onSubmit={mode === 'register' ? handleRegister : handleLogin}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
          >
            {mode === 'register' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <label style={inputLabelStyle}>Vorname</label>
                    <input
                      type="text"
                      required
                      value={form.first_name}
                      onChange={e => setForm({ ...form, first_name: e.target.value })}
                      style={inputStyle}
                      placeholder="Max"
                    />
                  </div>
                  <div>
                    <label style={inputLabelStyle}>Nachname</label>
                    <input
                      type="text"
                      required
                      value={form.last_name}
                      onChange={e => setForm({ ...form, last_name: e.target.value })}
                      style={inputStyle}
                      placeholder="Muster"
                    />
                  </div>
                </div>
                <div>
                  <label style={inputLabelStyle}>Geburtsdatum</label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={e => setForm({ ...form, birth_date: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </>
            )}

            <div>
              <label style={inputLabelStyle}>E-Mail</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
                placeholder="name@beispiel.at"
              />
            </div>

            <div>
              <label style={inputLabelStyle}>Passwort</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            {formError && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 12,
                background: 'rgba(236,72,153,0.08)',
                border: '1.5px solid rgba(236,72,153,0.22)',
                color: '#be185d',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}>
                ⚠ {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={formLoading || joining}
              style={{
                padding: '1rem',
                background: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 50%, #7c3aed 100%)',
                backgroundSize: '200% 200%',
                color: 'white',
                border: 'none',
                borderRadius: 999,
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: formLoading ? 'not-allowed' : 'pointer',
                opacity: formLoading ? 0.6 : 1,
                fontFamily: 'inherit',
                boxShadow: '0 14px 32px rgba(124, 58, 237, 0.35)',
                marginTop: '0.4rem',
              }}
            >
              {formLoading || joining
                ? '⏳ Bitte warten…'
                : mode === 'register'
                  ? '✨ Registrieren & Team beitreten'
                  : '→ Anmelden & Team beitreten'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .invite-grid {
            grid-template-columns: 1fr !important;
          }
          .invite-info-col {
            display: none !important;
          }
        }
        @media (min-width: 901px) {
          .invite-mobile-header {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

const inputLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#6b5b8a',
  marginBottom: '0.35rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 0.95rem',
  borderRadius: 14,
  border: '1.5px solid rgba(124, 58, 237, 0.14)',
  fontSize: '0.92rem',
  outline: 'none',
  background: 'white',
  fontFamily: 'inherit',
  color: '#1a1033',
}
