# Humatrix Youth Academy

Psychologisches Profiling-System für Jugend-Fußball-Akademien.  
Zwei getrennte Welten: **Trainer** (professionell, analytisch) und **Spieler** (jung, motivierend, cool).

## Features

### Trainer
- 📊 **Dashboard** — Überblick über alle Spieler, Test-Status, Team-DNA
- 🧬 **Trainer-Selbsttest** — 16 Fragen, eigener Typ + Handlungsempfehlungen
- 👤 **Spieler bewerten** — Fremdeinschätzung mit Abweichungs-Vergleich (Self vs Coach)
- 📤 **Testbatterien** — 5 Umfrage-Sets (A-E) zum Verschicken an die Mannschaft
- 👥 **Verwaltung** — Verein, Team, Spieler verwalten + WhatsApp-Einladungslinks
- 🎓 **Entwicklung** — Evidenzbasierte Coaching-Tipps pro Spielertyp-Familie
- 📈 **Trends** — Ankerwerte (Zufriedenheit, Sicherheit, Bindung, Alignment, Motivation)

### Spieler
- 🧬 **Selbsttest** — 68 Fragen, 4 Dimensionen, 16 Typen (U13/U16/U19 altersgerecht)
- ✨ **Typ-Profil** — Stärken, Risiken, Do's & Don'ts, Selbstentwicklung
- 📈 **Entwicklung** — Typ-Verlauf, Ankerwerte-Trend, Check-in-History
- 📋 **Batterien** — Trainer-Umfragen beantworten
- 💬 **Feedback** — Nachrichten vom Trainer

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **Hosting:** Netlify (mit @netlify/plugin-nextjs)
- **Design:** Dual-Theme (Coach: Inter/Navy/Cyan, Youth: Syne/Purple-Pink-Gradient)

## Setup

### 1. Repository klonen
```bash
git clone <repo-url>
cd humatrix-youth-academy
npm install
```

### 2. Supabase einrichten
1. Neues Supabase-Projekt erstellen auf [supabase.com](https://supabase.com)
2. SQL-Scripts ausführen (in dieser Reihenfolge):
   ```
   supabase/schema.sql
   supabase/seed.sql
   supabase/schema-youth.sql
   supabase/fix-rls-and-data.sql
   ```

### 3. Environment Variables
`.env.local` erstellen:
```env
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
```

### 4. Lokale Entwicklung
```bash
npm run dev
```
→ Öffne http://localhost:3000

### 5. Deploy auf Netlify
```bash
npm run build
```

In Netlify:
- Build command: `npm run build`
- Publish directory: `.next`
- Environment Variables setzen (NEXT_PUBLIC_SUPABASE_URL + KEY)

## Projektstruktur

```
src/
├── app/
│   ├── dashboard/
│   │   ├── coach/          # Trainer-Dashboard
│   │   ├── coach-dev/      # Trainer-Weiterentwicklung
│   │   ├── player/         # Spieler-Dashboard  
│   │   ├── test/           # Selbsttest (Spieler + Trainer)
│   │   ├── results/        # Typ-Profil mit Tipps
│   │   ├── rate/           # Fremdeinschätzung
│   │   ├── team/           # Teamübersicht
│   │   ├── players/[id]/   # Spieler-Detail (Coach)
│   │   ├── send-battery/   # Umfrage verschicken
│   │   ├── battery/        # Umfrage ausfüllen (Spieler)
│   │   ├── trends/         # Ankerwerte-Trends
│   │   ├── history/        # Verlauf (Spieler)
│   │   ├── feedback/       # Trainer-Feedback
│   │   ├── profile/        # Spieler-Stammdaten
│   │   ├── admin/          # Vereins-/Team-Verwaltung
│   │   ├── layout.tsx      # Dual-Navigation
│   │   └── page.tsx        # Role-based Redirect
│   ├── login/
│   ├── register/
│   ├── invite/[code]/
│   └── globals.css         # Design System (Coach + Youth Theme)
├── lib/
│   ├── youth/
│   │   ├── constants.ts    # Dimensionen, Typen, Familien, Batterien
│   │   ├── scoring.ts      # Youth Scoring Adapter
│   │   ├── questions-youth.json  # 200+ Fragen (3 Altersgruppen)
│   │   └── types-youth.json     # 16 Typ-Definitionen (jugendgerecht)
│   └── supabase/
├── services/
│   └── scoring/
│       └── calculate.ts    # Core Scoring Engine (4 Dim, 16 Typen)
└── components/
    └── AcademyLogo.tsx
```

## Scoring-System

4 Dimensionen × 2 Pole = 16 Typen in 4 Familien:

| Familie | Icon | Typen | Beschreibung |
|---------|------|-------|-------------|
| Strategen | 💜 | ESAF, ESAD, ESIF, ESID | Denken voraus, arbeiten eigenständig |
| Teamformer | 💙 | ETAF, ETAD, ETIF, ETID | Verbinden, integrieren, halten zusammen |
| Performer | 💛 | WSAF, WSAD, WSIF, WSID | Wollen gewinnen, liefern im Moment |
| Anführer | ❤️ | WTAF, WTAD, WTIF, WTID | Führen emotional, reißen mit |

## Lizenz

© Humatrix / The Mind Club Company
