'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { AcademyLogo } from '@/components/AcademyLogo'
import { useRouter } from 'next/navigation'
import { ageGroupFromBirthdate } from '@/lib/youth/scoring'
import { AGE_GROUP_META } from '@/lib/youth/constants'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'player' | 'coach'>('player')
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const detectedAge = birthDate ? ageGroupFromBirthdate(birthDate) : null
  const ageMeta = detectedAge ? AGE_GROUP_META[detectedAge] : null

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role,
            birth_date: role === 'player' && birthDate ? birthDate : null,
          }
        }
      })

      if (authErr) {
        if (authErr.message.includes('already registered')) {
          setError('Diese E-Mail ist bereits registriert. Versuche dich anzumelden.')
        } else {
          setError(authErr.message)
        }
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Registrierung fehlgeschlagen. Bitte erneut versuchen.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten.')
      setLoading(false)
    }
  }

  const isPlayer = role === 'player'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: isPlayer
          ? `radial-gradient(circle at 15% 10%, rgba(139,92,246,0.15), transparent 25%),
             radial-gradient(circle at 85% 5%, rgba(236,72,153,0.10), transparent 28%),
             radial-gradient(circle at 50% 100%, rgba(249,115,22,0.08), transparent 30%),
             #0a0a0f`
          : `radial-gradient(circle at top left, rgba(20,184,196,0.08), transparent 25%),
             radial-gradient(circle at top right, rgba(15,23,42,0.04), transparent 22%),
             linear-gradient(180deg, #f8fafc 0%, #f4f6fb 100%)`,
        fontFamily: "'DM Sans', sans-serif",
        transition: 'background 0.4s',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div style={{ display: 'inline-block' }}>
            <AcademyLogo size={52} showText={true} variant={isPlayer ? 'youth' : 'coach'} />
          </div>
        </div>

        <div
          style={{
            background: isPlayer
              ? 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(252,248,255,0.96))'
              : 'white',
            border: isPlayer
              ? '1px solid rgba(124, 58, 237, 0.14)'
              : '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: isPlayer ? 28 : 20,
            padding: '2.2rem 1.8rem',
            boxShadow: isPlayer
              ? '0 18px 46px rgba(124, 58, 237, 0.14)'
              : '0 18px 46px rgba(15, 23, 42, 0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {isPlayer && (
            <div style={{
              position: 'absolute',
              top: '-30%',
              right: '-20%',
              width: 240,
              height: 240,
              background: 'radial-gradient(circle, rgba(236,72,153,0.10), transparent 70%)',
              pointerEvents: 'none',
            }} />
          )}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{
              fontFamily: isPlayer ? "'Syne', sans-serif" : "'Inter', sans-serif",
              fontSize: '1.8rem',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              marginBottom: '0.3rem',
            }}>
              {isPlayer ? (
                <>Hey! <span style={{
                  background: 'linear-gradient(135deg, #7c3aed, #ec4899, #f59e0b)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Willkommen</span></>
              ) : (
                <>Neues <span style={{ color: '#14b8c4' }}>Trainer-Konto</span></>
              )}
            </h1>
            <p style={{
              color: isPlayer ? '#6b5b8a' : '#64748b',
              fontSize: '0.92rem',
              marginBottom: '1.5rem',
              lineHeight: 1.5,
            }}>
              {isPlayer
                ? 'Erstelle dein Profil und entdecke deinen Typ.'
                : 'Registriere dich als Trainer deiner Jugendmannschaft.'}
            </p>

            {/* Rolle wählen */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              marginBottom: '1.2rem',
            }}>
              <button
                type="button"
                onClick={() => setRole('player')}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 14,
                  border: isPlayer ? '2px solid #7c3aed' : '1.5px solid rgba(15,23,42,0.08)',
                  background: isPlayer
                    ? 'linear-gradient(135deg, rgba(236,72,153,0.10), rgba(236,72,153,0.06))'
                    : 'white',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  color: isPlayer ? '#7c3aed' : '#64748b',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.18s',
                }}
              >
                🧬 Ich bin Spieler*in
              </button>
              <button
                type="button"
                onClick={() => setRole('coach')}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 14,
                  border: !isPlayer ? '2px solid #14b8c4' : '1.5px solid rgba(15,23,42,0.08)',
                  background: !isPlayer
                    ? 'linear-gradient(135deg, rgba(20,184,196,0.10), rgba(15,23,42,0.04))'
                    : 'white',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  color: !isPlayer ? '#0f8f99' : '#64748b',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.18s',
                }}
              >
                👤 Ich bin Trainer*in
              </button>
            </div>

            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <div>
                  <label style={inputLabelStyle(isPlayer)}>Vorname</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    placeholder="Max"
                    style={inputStyle(isPlayer)}
                  />
                </div>
                <div>
                  <label style={inputLabelStyle(isPlayer)}>Nachname</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                    placeholder="Muster"
                    style={inputStyle(isPlayer)}
                  />
                </div>
              </div>

              {isPlayer && (
                <div style={{ marginBottom: '0.8rem' }}>
                  <label style={inputLabelStyle(isPlayer)}>Geburtsdatum</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    required
                    style={inputStyle(isPlayer)}
                  />
                  {ageMeta && (
                    <div style={{
                      marginTop: '0.4rem',
                      padding: '0.5rem 0.8rem',
                      borderRadius: 10,
                      background: 'rgba(245,158,11,0.10)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#b45309',
                    }}>
                      ✓ Altersgruppe: {ageMeta.shortLabel} ({ageMeta.ageRange})
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '0.8rem' }}>
                <label style={inputLabelStyle(isPlayer)}>E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@beispiel.at"
                  style={inputStyle(isPlayer)}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={inputLabelStyle(isPlayer)}>
                  Passwort <span style={{ opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>(mind. 6 Zeichen)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  style={inputStyle(isPlayer)}
                />
              </div>

              {error && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 12,
                  marginBottom: '1rem',
                  background: 'rgba(236,72,153,0.08)',
                  border: '1.5px solid rgba(236,72,153,0.22)',
                  color: '#be185d',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                }}>
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  background: isPlayer
                    ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'
                    : 'linear-gradient(180deg, #101938 0%, #0b1430 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 999,
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  fontFamily: 'inherit',
                  boxShadow: isPlayer
                    ? '0 12px 28px rgba(124, 58, 237, 0.32)'
                    : '0 10px 24px rgba(15, 23, 42, 0.18)',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {loading ? '⏳ Wird erstellt…' : isPlayer ? '✨ Konto erstellen' : '→ Konto erstellen'}
              </button>
            </form>

            <div style={{
              marginTop: '1.3rem',
              paddingTop: '1.2rem',
              borderTop: '1px solid rgba(15,23,42,0.08)',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: isPlayer ? '#6b5b8a' : '#64748b',
              fontWeight: 500,
            }}>
              Bereits registriert?{' '}
              <Link href="/login" style={{
                fontWeight: 800,
                color: isPlayer ? '#7c3aed' : '#14b8c4',
              }}>
                → Anmelden
              </Link>
            </div>
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '1.3rem',
          fontSize: '0.72rem',
          color: '#9ca3af',
          fontWeight: 500,
        }}>
          © Humatrix Youth Academy · Next Generation
        </div>
      </div>
    </div>
  )
}

// Helpers
function inputLabelStyle(isPlayer: boolean): React.CSSProperties {
  return {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: isPlayer ? '#6b5b8a' : '#64748b',
    marginBottom: '0.35rem',
  }
}

function inputStyle(isPlayer: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '0.75rem 0.95rem',
    borderRadius: isPlayer ? 14 : 10,
    border: isPlayer
      ? '1.5px solid rgba(124, 58, 237, 0.14)'
      : '1.5px solid rgba(15, 23, 42, 0.10)',
    fontSize: '0.92rem',
    outline: 'none',
    background: 'white',
    fontFamily: 'inherit',
    color: isPlayer ? '#1a1033' : '#172033',
  }
}
