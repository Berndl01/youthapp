'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        if (!supabase) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('coach_feedback').select('*')
          .eq('player_user_id', user.id).eq('is_visible_to_player', true)
          .order('created_at', { ascending: false })
        if (data) setFeedback(data)
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Lade Feedback…</div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div className="hm-breadcrumb">Spieler · Feedback</div>

      <h1 className="hero">
        Trainer-<span className="gradient-text">Feedback</span>
      </h1>
      <p className="hero-sub">
        Rückmeldungen deines Trainers, die für dich freigegeben wurden.
      </p>

      {feedback.length === 0 ? (
        <div className="card" style={{
          marginTop: '1.5rem',
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', opacity: 0.4 }}>💬</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--ink)' }}>
            Noch kein Feedback
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>
            Sobald dein Trainer dir Feedback freigibt, erscheint es hier.
          </div>
          <Link href="/dashboard/player" className="btn-secondary" style={{ marginTop: '1.5rem' }}>
            ← Zurück zum Dashboard
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.5rem' }}>
          {feedback.map((fb, i) => (
            <div
              key={fb.id}
              className="card"
              style={{
                background: i === 0
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.04))'
                  : undefined,
                border: i === 0
                  ? '1.5px solid rgba(124,58,237,0.18)'
                  : undefined,
              }}
            >
              {i === 0 && (
                <div className="hm-badge hm-badge-pink" style={{ marginBottom: '0.6rem' }}>
                  ✨ Neu
                </div>
              )}
              {fb.title && (
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: 'var(--ink)',
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.02em',
                }}>
                  {fb.title}
                </div>
              )}
              <div style={{
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: 'var(--ink-soft)',
                whiteSpace: 'pre-wrap',
              }}>
                {fb.feedback_text}
              </div>
              <div style={{
                fontSize: '0.74rem',
                marginTop: '1rem',
                paddingTop: '0.8rem',
                borderTop: '1px solid var(--border)',
                color: 'var(--muted)',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}>
                📅 {new Date(fb.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
