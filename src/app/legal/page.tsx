import Link from 'next/link'

export default function LegalPage() {
  return (
    <div className="min-h-screen px-4 py-12" style={{ background: '#010C1A', color: 'rgba(255,255,255,0.85)' }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/login" className="text-sm mb-8 inline-block" style={{ color: 'rgba(255,255,255,0.45)' }}>← Zurück</Link>

        <h1 className="text-3xl font-extrabold mb-8" style={{ fontFamily: 'var(--font-display)' }}>
          <span style={{ color: 'var(--accent)' }}>Impressum</span> & Datenschutz
        </h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>Impressum</h2>
            <div className="text-sm leading-relaxed space-y-1">
              <p><strong>Humatrix – The Mind Club Company</strong></p>
              <p>Mag. Bernhard Lampl PhD BSc. MBA LLM MBA</p>
              <p>CEO & Founder</p>
              <p>Dorfstraße 3b, 6116 Weer</p>
              <p>Tirol / Austria</p>
              <p>Tel: +43 / 676 / 916 60 20</p>
              <p>E-Mail: bernhard@humatrix.cc</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>Datenschutz</h2>
            <div className="text-sm leading-relaxed space-y-3" style={{ color: 'var(--text)' }}>
              <p>Die Humatrix App verarbeitet personenbezogene Daten ausschließlich zum Zweck der altersgerechten Typ-Analyse und Jugendakademie-Entwicklung.</p>
              <p><strong>Welche Daten werden erhoben:</strong> Name, E-Mail, Geburtsdatum, Position, Rückennummer, Testantworten und daraus berechnete Spielertypen.</p>
              <p><strong>Wo werden die Daten gespeichert:</strong> Alle Daten werden auf Servern in Frankfurt am Main (Deutschland) gespeichert (Supabase, eu-central-1). Die Übertragung erfolgt verschlüsselt (TLS/SSL).</p>
              <p><strong>Wer hat Zugriff:</strong> Spieler sehen nur ihre eigenen Daten. Trainer sehen nur die Daten der Spieler ihrer Mannschaft. Es gibt keine Weitergabe an Dritte.</p>
              <p><strong>Löschung:</strong> Alle Daten können jederzeit auf Anfrage gelöscht werden. Kontakt: bernhard@humatrix.cc</p>
              <p><strong>Rechtsgrundlage:</strong> Die Verarbeitung erfolgt auf Basis der Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) durch die Registrierung in der App.</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-6 text-center text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} Humatrix by Bernhard Lampl
        </div>
      </div>
    </div>
  )
}
