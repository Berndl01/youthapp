'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AcademyLogo } from '@/components/AcademyLogo'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    })

    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: `
        radial-gradient(circle at 15% 10%, rgba(139,92,246,0.15), transparent 25%),
        radial-gradient(circle at 85% 5%, rgba(236,72,153,0.10), transparent 28%),
        radial-gradient(circle at 50% 100%, rgba(249,115,22,0.08), transparent 30%),
        #0a0a0f
      `,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div style={{ display: 'inline-block' }}>
            <AcademyLogo size={48} showText={true} variant="youth" />
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(252,248,255,0.96))',
          borderRadius: 28,
          padding: '2.2rem 1.8rem',
          border: '1px solid rgba(124, 58, 237, 0.14)',
          boxShadow: '0 18px 46px rgba(124, 58, 237, 0.14)',
        }}>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '1.7rem',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            marginBottom: '0.4rem',
            color: '#1a1033',
          }}>
            Passwort <span style={{
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>vergessen?</span>
          </h1>
          <p style={{
            color: '#6b5b8a',
            fontSize: '0.92rem',
            marginBottom: '1.5rem',
            lineHeight: 1.5,
          }}>
            Kein Problem. Wir senden dir einen Link an deine E-Mail-Adresse.
          </p>

          {success ? (
            <div style={{
              padding: '1.1rem 1.2rem',
              borderRadius: 16,
              background: 'rgba(16,185,129,0.08)',
              border: '1.5px solid rgba(16,185,129,0.25)',
              color: '#14895a',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              fontWeight: 600,
            }}>
              ✓ Der Link wurde versendet. Prüfe jetzt dein Postfach — auch den Spam-Ordner.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
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

              {error && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 12,
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
                }}
              >
                {loading ? '⏳ Sende Link…' : '→ Link senden'}
              </button>
            </form>
          )}

          <div style={{
            marginTop: '1.3rem',
            paddingTop: '1.2rem',
            borderTop: '1px solid rgba(15,23,42,0.08)',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            <Link href="/login" style={{ color: '#6b5b8a' }}>
              ← Zurück zum Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
