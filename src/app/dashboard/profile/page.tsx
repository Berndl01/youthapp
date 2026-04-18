'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import Link from 'next/link'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', birth_date: '',
    position: '', jersey_number: '', preferred_foot: '',
    height_cm: '', weight_kg: '', previous_clubs: ''
  })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile(data)
          setForm(prev => ({ ...prev,
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone: data.phone || '',
            birth_date: data.birth_date || '',
          }))
          const { data: pp } = await supabase.from('player_profiles').select('*').eq('user_id', user.id).limit(1)
          if (pp?.length) {
            setForm(f => ({ ...f,
              birth_date: pp[0].birth_date || f.birth_date,
              position: pp[0].position || '',
              jersey_number: pp[0].jersey_number ? String(pp[0].jersey_number) : '',
              preferred_foot: pp[0].preferred_foot || '',
              height_cm: pp[0].height_cm ? String(pp[0].height_cm) : '',
              weight_kg: pp[0].weight_kg ? String(pp[0].weight_kg) : '',
              previous_clubs: pp[0].previous_clubs || '',
            }))
          }
        }
      } catch (err) { console.error(err) }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    await supabase.from('profiles').update({
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
    }).eq('id', profile.id)

    if (form.birth_date || form.position || form.jersey_number || form.preferred_foot || form.height_cm || form.weight_kg) {
      const { data: membership } = await supabase.from('team_memberships').select('team_id')
        .eq('user_id', profile.id).limit(1)
      const teamId = membership?.[0]?.team_id || null
      const { data: teamData } = teamId
        ? await supabase.from('teams').select('club_id').eq('id', teamId).single()
        : { data: null }

      await supabase.from('player_profiles').upsert({
        user_id: profile.id,
        club_id: teamData?.club_id || null,
        team_id: teamId,
        birth_date: form.birth_date || null,
        position: form.position || null,
        jersey_number: form.jersey_number ? parseInt(form.jersey_number) : null,
        preferred_foot: form.preferred_foot || null,
        height_cm: form.height_cm ? parseInt(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseInt(form.weight_kg) : null,
        previous_clubs: form.previous_clubs || null,
      }, { onConflict: 'user_id' })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Lade Profil…</div>
    </div>
  )

  if (!profile) return (
    <div className="text-center py-20">
      <div style={{ color: 'var(--muted)' }}>Kein Profil gefunden.</div>
    </div>
  )

  const isCoach = profile.role === 'coach'
  const initials = `${(profile.first_name || '?')[0]}${(profile.last_name || '')[0] || ''}`.toUpperCase()

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div className="hm-breadcrumb">{isCoach ? 'Trainer' : 'Spieler'} · Profil</div>

      <h1 className="hero">
        Mein <span className={isCoach ? '' : 'gradient-text'} style={{ color: isCoach ? 'var(--accent)' : undefined }}>Profil</span>
      </h1>
      <p className="hero-sub">Deine persönlichen Daten verwalten</p>

      {/* Profile Header */}
      <div className="card" style={{ marginTop: '1.4rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.1rem',
          paddingBottom: '1.2rem',
          marginBottom: '1.4rem',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}>
          <div className="hm-avatar" style={{
            width: 64, height: 64, fontSize: '1.4rem',
            background: isCoach
              ? 'linear-gradient(135deg, #0f172a, #334155)'
              : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            color: 'white',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--ink)' }}>
              {profile.first_name} {profile.last_name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
              {profile.email}
            </div>
            <span
              className={`hm-badge ${isCoach ? 'hm-badge-gold' : 'hm-badge-purple'}`}
              style={{ marginTop: '0.4rem' }}
            >
              {isCoach ? '👤 Trainer*in' : '🧬 Spieler*in'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.9rem' }}>
            <div>
              <label>Vorname</label>
              <input
                type="text"
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Nachname</label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label>Telefon</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+43 676 …"
            />
          </div>

          <div>
            <label>Geburtsdatum</label>
            <input
              type="date"
              value={form.birth_date}
              onChange={e => setForm({ ...form, birth_date: e.target.value })}
            />
          </div>

          {!isCoach && (
            <>
              <div style={{
                paddingTop: '0.6rem',
                borderTop: '1px dashed var(--border)',
              }}>
                <div className="hm-section">⚽ Sportliche Daten</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.9rem' }}>
                <div>
                  <label>Position</label>
                  <select
                    value={form.position}
                    onChange={e => setForm({ ...form, position: e.target.value })}
                  >
                    <option value="">–</option>
                    <option value="Tor">Tor</option>
                    <option value="Abwehr">Abwehr</option>
                    <option value="Mittelfeld">Mittelfeld</option>
                    <option value="Sturm">Sturm</option>
                  </select>
                </div>
                <div>
                  <label>Rückennummer</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={form.jersey_number}
                    onChange={e => setForm({ ...form, jersey_number: e.target.value })}
                    placeholder="#"
                  />
                </div>
                <div>
                  <label>Starker Fuß</label>
                  <select
                    value={form.preferred_foot}
                    onChange={e => setForm({ ...form, preferred_foot: e.target.value })}
                  >
                    <option value="">–</option>
                    <option value="rechts">Rechts</option>
                    <option value="links">Links</option>
                    <option value="beidfüßig">Beidfüßig</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.9rem' }}>
                <div>
                  <label>Größe (cm)</label>
                  <input
                    type="number"
                    min="130"
                    max="210"
                    value={form.height_cm}
                    onChange={e => setForm({ ...form, height_cm: e.target.value })}
                    placeholder="178"
                  />
                </div>
                <div>
                  <label>Gewicht (kg)</label>
                  <input
                    type="number"
                    min="30"
                    max="120"
                    value={form.weight_kg}
                    onChange={e => setForm({ ...form, weight_kg: e.target.value })}
                    placeholder="75"
                  />
                </div>
              </div>

              <div>
                <label>Bisherige Akademien</label>
                <input
                  type="text"
                  value={form.previous_clubs}
                  onChange={e => setForm({ ...form, previous_clubs: e.target.value })}
                  placeholder="z.B. SV Innsbruck, FC Wacker"
                />
              </div>
            </>
          )}

          <div>
            <label>E-Mail (nicht änderbar)</label>
            <input type="email" value={profile.email} disabled style={{ opacity: 0.55 }} />
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={saving}
              className={isCoach ? 'btn-primary' : 'btn-accent'}
              style={{ opacity: saving ? 0.5 : 1 }}
            >
              {saving ? '⏳ Speichern…' : '→ Speichern'}
            </button>
            {saved && (
              <span style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                ✓ Gespeichert
              </span>
            )}
          </div>
        </form>
      </div>

      {profile.created_at && (
        <div style={{
          fontSize: '0.72rem',
          color: 'var(--muted)',
          marginTop: '1.5rem',
          textAlign: 'center',
          fontWeight: 500,
        }}>
          Konto erstellt: {new Date(profile.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      )}

      {/* Back */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.2rem' }}>
        <Link href={isCoach ? '/dashboard/coach' : '/dashboard/player'} className="btn-secondary">
          ← Zurück zum Dashboard
        </Link>
      </div>
    </div>
  )
}
