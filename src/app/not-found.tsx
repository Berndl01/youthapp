import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#010C1A', color: 'rgba(255,255,255,0.85)' }}>
      <div className="text-center">
        <div className="text-8xl font-extrabold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>404</div>
        <h1 className="text-2xl font-bold mb-2">Seite nicht gefunden</h1>
        <p className="mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>Diese Seite existiert nicht oder wurde verschoben.</p>
        <Link href="/login" className="px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wider inline-block"
          style={{ background: 'var(--accent)', color: '#010C1A' }}>→ Zur Startseite</Link>
      </div>
    </div>
  )
}
