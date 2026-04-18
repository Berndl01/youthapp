'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AcademyLogo } from '@/components/AcademyLogo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'E-Mail oder Passwort ist falsch.'
          : authError.message)
        setLoading(false)
        return
      }
      if (!data.user) {
        setError('Login fehlgeschlagen')
        setLoading(false)
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Ein Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: `
          radial-gradient(circle at 15% 10%, rgba(139,92,246,0.15), transparent 30%),
          radial-gradient(circle at 85% 5%, rgba(236,72,153,0.10), transparent 30%),
          radial-gradient(circle at 50% 100%, rgba(249,115,22,0.08), transparent 30%),
          #0a0a0f
        `,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-block' }}>
            <AcademyLogo size={52} showText={true} variant="youth" />
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(252,248,255,0.96))',
            border: '1px solid rgba(124, 58, 237, 0.14)',
            borderRadius: 28,
            padding: '2.3rem 1.8rem',
            boxShadow: '0 18px 46px rgba(124, 58, 237, 0.14)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-30%',
            right: '-20%',
            width: 240,
            height: 240,
            background: 'radial-gradient(circle, rgba(236,72,153,0.10), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '1.9rem',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              marginBottom: '0.4rem',
              lineHeight: 1,
            }}>
              Hey,{' '}
              <span style={{
                background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                schön dass du da bist
              </span>{' '}
              👋
            </h1>
            <p style={{ color: '#6b5b8a', fontSize: '0.92rem', marginBottom: '1.6rem', lineHeight: 1.5 }}>
              Melde dich an, um dein Dashboard zu öffnen.
            </p>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#6b5b8a',
                  marginBottom: '0.35rem',
                }}>
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="name@beispiel.at"
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: 14,
                    border: '1.5px solid rgba(124, 58, 237, 0.14)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    background: 'white',
                    fontFamily: 'inherit',
                    color: '#1a1033',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#6b5b8a',
                  marginBottom: '0.35rem',
                }}>
                  Passwort
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: 14,
                    border: '1.5px solid rgba(124, 58, 237, 0.14)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    background: 'white',
                    fontFamily: 'inherit',
                    color: '#1a1033',
                  }}
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
                  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 999,
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  fontFamily: 'inherit',
                  boxShadow: '0 12px 28px rgba(124, 58, 237, 0.32)',
                  transition: 'transform 0.18s, box-shadow 0.18s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 18px 40px rgba(124, 58, 237, 0.42)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(124, 58, 237, 0.32)'
                }}
              >
                {loading ? '⏳ Wird geladen…' : '✨ Anmelden'}
              </button>
            </form>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '1.4rem',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}>
              <Link href="/reset-password" style={{ color: '#6b5b8a', textDecoration: 'underline' }}>
                Passwort vergessen?
              </Link>
              <Link href="/register" style={{
                background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 800,
              }}>
                Neu registrieren →
              </Link>
            </div>
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
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
