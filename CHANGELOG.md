# Humatrix Youth Academy — Changelog

## v1.0 — Initial Youth Academy Release (April 2026)

### Gespiegelt von humatrix-app v1

**Neue Inhalte:**
- 367 jugendgerechte Fragen (3 Altersgruppen × 68 Selbsttests + 3 × 20 Fremdeinschätzungen + Trainer-Sets + 5 Batterien)
- 16 komplett neu formulierte Typ-Definitionen (jugendgerechte Sprache)
- 5 Themenbereiche eingewebt: Eltern, Schule, Freunde/Social Media, Selbstbild, Zukunft

**Neue UI:**
- Dual-Theme-System (youth purple/pink/orange vs coach navy/cyan)
- AcademyLogo mit 2 Varianten
- Bottom-Tab-Bar für Jugend-Mobile
- Altersgruppen-Badges (U13/U16/U19) in allen Listen und Detail-Seiten
- Animierte Emojis im Spieler-Dashboard
- Gradient Text für Namen und Hero-Überschriften

**Neue Datenstruktur:**
- `age_group` Enum (u13/u16/u19) in Supabase
- `is_academy` Flag für clubs
- `school_type`, `school_level`, `parent_email`, `parent_name`, `dual_career_notes` in player_profiles
- `birth_date` + automatisch generiertes `is_minor`-Feld in profiles
- `questionnaire_variant`, `age_group` in type_results
- Auto-Sync-Trigger: Altersgruppe wird bei Profil-Update automatisch aus Geburtsdatum berechnet
- View `v_youth_players` für vollständigen Jugend-Kontext

**Neue Technik:**
- `lib/youth/constants.ts` als zentrale API
- `lib/youth/scoring.ts` als Adapter zur bestehenden Scoring-Engine
- `sporttyp-constants.ts` als Kompatibilitäts-Shim (alte Imports funktionieren weiter via Proxy)
- Python-Generatoren (`generate_questions.py`, `generate_types.py`) für einfache Content-Wartung

**Angepasste Pages:**
- `dashboard/layout.tsx` — Theme-Switch per Rolle, Bottom-Tab-Bar für Jugend
- `dashboard/test/page.tsx` — Altersgruppen-basierte Fragenauswahl
- `dashboard/rate/page.tsx` — Fremdeinschätzung mit altersspezifischen 20 Fragen
- `dashboard/battery/page.tsx` — Jugend-Batterien aus JSON
- `dashboard/player/page.tsx` — Jugendliches Dashboard mit Gradient, animierten Emojis
- `dashboard/coach/page.tsx` — Professionelles Dashboard mit Age-Group-Übersicht
- `register/page.tsx` — Geburtsdatum, Schultyp, Parent-Email-Feld bei U13
- `admin/page.tsx` — "Verein" → "Akademie" überall
- `legal/page.tsx` — DSGVO-Text auf Jugendakademie angepasst
