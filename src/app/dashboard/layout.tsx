'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AcademyLogo } from '@/components/AcademyLogo'

// Spieler-Navigation (max 5 für Bottom-Tab-Bar auf Mobile)
const NAV_PLAYER = [
  { href: '/dashboard/player',   label: 'Home',     icon: '🏠' },
  { href: '/dashboard/test',     label: 'Test',     icon: '🧬' },
  { href: '/dashboard/results',  label: 'Typ',      icon: '✨' },
  { href: '/dashboard/battery',  label: 'Check',    icon: '📋' },
  { href: '/dashboard/history',  label: 'Verlauf',  icon: '📈' },
]
const NAV_PLAYER_EXTRA = [
  { href: '/dashboard/feedback', label: 'Feedback', icon: '💬' },
  { href: '/dashboard/profile', label: 'Profil', icon: '👤' },
]

// Trainer-Navigation
const NAV_COACH = [
  { href: '/dashboard/coach',        label: 'Dashboard',   icon: '📊' },
  { href: '/dashboard/team',         label: 'Team',        icon: '👥' },
  { href: '/dashboard/send-battery', label: 'Umfrage',     icon: '📤' },
  { href: '/dashboard/trends',       label: 'Trends',      icon: '📈' },
  { href: '/dashboard/coach-dev',    label: 'Entwicklung', icon: '🎓' },
  { href: '/dashboard/admin',        label: 'Verwaltung',  icon: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        if (!supabase) { setLoading(false); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile(data)
        } else {
          const meta = user.user_metadata || {}
          setProfile({
            id: user.id,
            email: user.email,
            first_name: meta.first_name || '',
            last_name: meta.last_name || '',
            role: meta.role || 'player'
          })
        }

        const { data: coachCheck } = await supabase
          .from('team_memberships')
          .select('id')
          .eq('user_id', user.id)
          .eq('role_in_team', 'coach')
          .limit(1)
        if (coachCheck && coachCheck.length > 0) {
          setProfile((prev: any) => prev ? { ...prev, role: 'coach' } : prev)
        }

        const { data: notifs } = await supabase.from('notifications').select('*')
          .eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false }).limit(5)
        if (notifs) setNotifications(notifs)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  // Theme auf <html> setzen
  useEffect(() => {
    if (!profile) return
    const theme = profile.role === 'coach' ? 'coach' : 'youth'
    document.documentElement.setAttribute('data-theme', theme)
  }, [profile])

  async function dismissNotification(id: string) {
    await supabase?.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function handleLogout() {
    await supabase?.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen hm-page flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
      <div className="text-center">
        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Wird geladen...</div>
      </div>
    </div>
  )

  const isCoach = profile?.role === 'coach'
  const nav = isCoach ? NAV_COACH : [...NAV_PLAYER, ...NAV_PLAYER_EXTRA]
  const initials = profile
    ? `${(profile.first_name || '?')[0]}${(profile.last_name || '')[0] || ''}`.toUpperCase()
    : '?'

  return (
    <div className="min-h-screen hm-page">
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: isCoach ? '#0d1526' : 'rgba(10,10,15,0.85)',
          borderBottom: isCoach ? 'none' : '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-3 gap-4">
          {/* Logo */}
          <Link href={isCoach ? '/dashboard/coach' : '/dashboard/player'} style={{ flexShrink: 0 }}>
            <AcademyLogo size={36} showText={true} variant={isCoach ? 'coach' : 'youth'} />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {nav.map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.72rem',
                    fontWeight: active ? 700 : 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    borderRadius: isCoach ? 6 : 10,
                    color: isCoach
                      ? (active ? '#fff' : 'rgba(255,255,255,0.45)')
                      : (active ? '#fff' : 'rgba(255,255,255,0.40)'),
                    background: active
                      ? (isCoach
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(255,255,255,0.08)')
                      : 'transparent',
                    border: '1px solid transparent',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {isCoach ? item.label : `${item.icon} ${item.label}`}
                </Link>
              )
            })}
          </nav>

          {/* User chip + logout */}
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            {profile && (
              <div
                className="hidden md:flex items-center gap-2"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: isCoach ? 'rgba(255,255,255,0.55)' : 'var(--ink)',
                }}
              >
                <span>{profile.first_name} {profile.last_name}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="hidden md:inline-flex"
              style={{
                fontSize: '0.72rem',
                padding: '0.4rem 0.9rem',
                borderRadius: 6,
                fontWeight: 600,
                border: isCoach ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-strong)',
                background: isCoach ? 'rgba(255,255,255,0.05)' : 'var(--surface)',
                color: isCoach ? 'rgba(255,255,255,0.4)' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Abmelden
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-2xl"
              style={{ color: 'var(--ink)', padding: '0.3rem 0.5rem' }}
              aria-label="Menü"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav-Drawer */}
      {menuOpen && (
        <nav
          className="md:hidden px-4 py-3"
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
          }}
        >
          {nav.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: active ? 800 : 600,
                  color: active ? 'white' : 'var(--ink)',
                  background: active
                    ? (isCoach
                        ? 'linear-gradient(160deg, #0d1526, #131e36)'
                        : 'rgba(255,255,255,0.08)')
                    : 'var(--surface-2)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{isCoach ? '' : item.icon}</span>
                {item.label}
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem 1rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--muted)',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 14,
              textAlign: 'left',
            }}
          >
            🚪 Abmelden
          </button>
        </nav>
      )}

      {/* Notifications Bar */}
      {notifications.length > 0 && (
        <div className="px-4 md:px-8 py-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifications.map(n => (
            <div
              key={n.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                padding: '0.85rem 1.1rem',
                background: isCoach
                  ? 'var(--surface)'
                  : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(236,72,153,0.06))',
                border: '1.5px solid ' + (isCoach ? 'var(--border)' : 'rgba(245,158,11,0.2)'),
                borderRadius: 16,
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ fontSize: '1.4rem' }}>📬</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--ink)' }}>{n.title}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{n.message}</div>
              </div>
              {n.action_url && (
                <Link
                  href={n.action_url}
                  onClick={() => dismissNotification(n.id)}
                  className={isCoach ? 'btn-primary' : 'btn-accent'}
                  style={{ fontSize: '0.78rem', padding: '0.55rem 1rem' }}
                >
                  Ausfüllen →
                </Link>
              )}
              <button
                onClick={() => dismissNotification(n.id)}
                style={{
                  fontSize: '1.2rem',
                  color: 'var(--muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.3rem',
                }}
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <main className="px-4 md:px-8 py-6">
        {children}
      </main>

      {/* Youth-only Mobile Bottom Tab Bar */}
      {!isCoach && (
        <nav className="youth-tab-bar md:hidden">
          {NAV_PLAYER.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`youth-tab-btn ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="youth-tab-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
