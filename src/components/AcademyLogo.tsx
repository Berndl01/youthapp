'use client'

/**
 * ACADEMY LOGO — Preview Match
 *
 * variant="coach"  → Cyan Network-Hexagon SVG + "HUMATRIX · Youth Academy"
 * variant="youth"  → Purple/Pink/Orange Gradient Star SVG + "YOUTH ACADEMY" (gradient)
 */

export function AcademyLogo({
  size = 40,
  showText = true,
  variant = 'coach',
}: {
  size?: number
  showText?: boolean
  variant?: 'youth' | 'coach' | 'auto'
}) {
  const v = variant === 'auto' ? 'coach' : variant

  if (v === 'youth') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <defs>
            <linearGradient id="yhLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <rect x="8" y="8" width="84" height="84" rx="26" fill="url(#yhLogoGrad)" opacity="0.14" stroke="url(#yhLogoGrad)" strokeWidth="2" />
          <path d="M50 22 L58 40 L76 42 L62 55 L67 74 L50 64 L33 74 L38 55 L24 42 L42 40 Z" fill="url(#yhLogoGrad)" opacity="0.88" />
          <circle cx="50" cy="50" r="6" fill="white" />
        </svg>
        {showText && (
          <div style={{ lineHeight: 1 }}>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 900,
              fontSize: '0.98rem',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #7c3aed, #ec4899, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>YOUTH</span>{' '}
              <span style={{ color: '#1a1033' }}>ACADEMY</span>
            </div>
            <div style={{
              fontSize: '0.55rem',
              color: '#6b5b8a',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginTop: 3,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Humatrix · Next Gen
            </div>
          </div>
        )}
      </div>
    )
  }

  // COACH Variant — Network Hexagon
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <rect x="8" y="8" width="84" height="84" rx="24" fill="rgba(20,184,196,0.12)" stroke="rgba(20,184,196,0.30)" strokeWidth="1.5" />
        <path d="M50 20 L68 30 L72 52 L62 72 L50 80 L38 72 L28 52 L32 30 Z" stroke="rgba(20,184,196,0.9)" strokeWidth="2" fill="none" />
        <circle cx="50" cy="33" r="3.5" fill="#14B8C4" />
        <circle cx="37" cy="43" r="3" fill="#14B8C4" opacity="0.8" />
        <circle cx="63" cy="43" r="3" fill="#14B8C4" opacity="0.8" />
        <circle cx="50" cy="52" r="4" fill="#14B8C4" />
        <circle cx="42" cy="66" r="2.8" fill="#14B8C4" opacity="0.6" />
        <circle cx="58" cy="66" r="2.8" fill="#14B8C4" opacity="0.6" />
        <line x1="50" y1="33" x2="37" y2="43" stroke="#14B8C4" strokeWidth="1.6" opacity="0.55" />
        <line x1="50" y1="33" x2="63" y2="43" stroke="#14B8C4" strokeWidth="1.6" opacity="0.55" />
        <line x1="37" y1="43" x2="50" y2="52" stroke="#14B8C4" strokeWidth="1.4" opacity="0.55" />
        <line x1="63" y1="43" x2="50" y2="52" stroke="#14B8C4" strokeWidth="1.4" opacity="0.55" />
        <line x1="42" y1="66" x2="50" y2="52" stroke="#14B8C4" strokeWidth="1.4" opacity="0.45" />
        <line x1="58" y1="66" x2="50" y2="52" stroke="#14B8C4" strokeWidth="1.4" opacity="0.45" />
      </svg>
      {showText && (
        <div style={{ lineHeight: 1 }}>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 900,
            fontSize: '0.98rem',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>
            <span style={{ color: '#14B8C4' }}>HUMA</span>
            <span style={{ color: '#0f172a' }}>TRIX</span>
          </div>
          <div style={{
            fontSize: '0.55rem',
            color: '#64748b',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            marginTop: 3,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            Youth Academy · Coach
          </div>
        </div>
      )}
    </div>
  )
}
