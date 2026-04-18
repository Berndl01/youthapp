// ══════════════════════════════════════════════════════════════════
// HUMATRIX YOUTH ACADEMY - CONSTANTS
// ══════════════════════════════════════════════════════════════════
// Altersspezifische Fragen und jugendgerechte Typ-Texte für die
// Humatrix Youth Academy. Die Scoring-Struktur bleibt zum Original
// identisch (4 Dimensionen, 16 Typen, 4 Familien) — damit Spieler
// aus der Jugendakademie später nahtlos in den Erwachsenenbereich
// übergehen können, ohne Typ-Wechsel.
// ══════════════════════════════════════════════════════════════════

import questionsYouth from './questions-youth.json'
import typesYouth from './types-youth.json'

// ─── ALTERSGRUPPEN ────────────────────────────────────────────────

export type AgeGroup = 'u13' | 'u16' | 'u19'

export const AGE_GROUPS: AgeGroup[] = ['u13', 'u16', 'u19']

export const AGE_GROUP_META: Record<AgeGroup, {
  label: string
  shortLabel: string
  ageRange: string
  tone: 'playful' | 'reflective' | 'professional'
  desc: string
}> = {
  u13: {
    label: 'U13 · Starter',
    shortLabel: 'U13',
    ageRange: '12–13 Jahre',
    tone: 'playful',
    desc: 'Entdeckerphase — Sprache einfach, direkt, emotional. Fokus: Spaß, Freunde, erste Rollen.',
  },
  u16: {
    label: 'U16 · Developer',
    shortLabel: 'U16',
    ageRange: '14–16 Jahre',
    tone: 'reflective',
    desc: 'Identitätsphase — Selbstreflexion, Peer-Vergleich, erste Karriere-Frage. Fragen reflektierter, Themen tiefer.',
  },
  u19: {
    label: 'U19 · Pre-Pro',
    shortLabel: 'U19',
    ageRange: '17–19 Jahre',
    tone: 'professional',
    desc: 'Übergangsphase — (fast) erwachsen, Karriere-Entscheidungen nah. Sprache erwachsen, professionell.',
  },
}

// ─── THEMEN-BEREICHE ──────────────────────────────────────────────

export type YouthTopic = 'family' | 'school' | 'friends_social' | 'self_image' | 'future'

export const TOPIC_META: Record<YouthTopic, { label: string; icon: string; color: string }> = {
  family:         { label: 'Eltern & Familie',        icon: '🏠', color: '#F59E0B' },
  school:         { label: 'Schule & Leistung',       icon: '📚', color: '#60A5FA' },
  friends_social: { label: 'Freunde & Social Media',  icon: '📱', color: '#A78BFA' },
  self_image:     { label: 'Selbstbild & Identität',  icon: '🪞', color: '#34D399' },
  future:         { label: 'Motivation & Zukunft',    icon: '🎯', color: '#F87171' },
}

// ─── FRAGEN-SETS ──────────────────────────────────────────────────

export interface YouthQuestion {
  id: number
  dim: string       // 'drive' | 'energy' | 'mental' | 'role'
  pole: 'A' | 'B'
  text: string
}

interface YouthQuestionsData {
  _meta: any
  [key: string]: any
}

const Q = questionsYouth as YouthQuestionsData

/** Spieler-Selbsttest für eine Altersgruppe (68 Fragen) */
export function getPlayerSelftest(age: AgeGroup): YouthQuestion[] {
  return Q[`player_selftest_${age}`] as YouthQuestion[]
}

/** Fremdeinschätzung (Trainer → Jugendlicher) für eine Altersgruppe (20 Fragen) */
export function getExternalAssessment(age: AgeGroup): YouthQuestion[] {
  return Q[`external_assessment_${age}`] as YouthQuestion[]
}

/** Trainer-Persönlichkeitstest (16 Fragen, altersunabhängig) */
export function getTrainerPersonality(): YouthQuestion[] {
  return Q.trainer_personality as YouthQuestion[]
}

/** Trainer-Coaching-Stil (24 Fragen, jugendspezifisch) */
export function getTrainerCoaching(): YouthQuestion[] {
  return Q.trainer_coaching as YouthQuestion[]
}

/** Eine der 5 Batterien (A-E) */
export function getBattery(letter: 'a' | 'b' | 'c' | 'd' | 'e'): YouthQuestion[] {
  return Q[`battery_${letter}`] as YouthQuestion[]
}

// ─── TYPEN-DEFINITIONEN ───────────────────────────────────────────

export interface YouthType {
  code: string
  name: string
  family: string
  tagline: string
  emoji: string
  color: string
  desc: string
  strengths: string[]
  risks: string[]
  playerDo: string[]
  playerDont: string[]
  coachDo: string[]
  coachDont: string[]
  why: string[]
  whyNot: string[]
  selfDev: string[]
}

export const YOUTH_TYPES = typesYouth as Record<string, Omit<YouthType, 'code'>>

/** Holt ein Typ-Objekt mit Code-Feld */
export function getYouthType(code: string): YouthType | null {
  const t = YOUTH_TYPES[code]
  return t ? { code, ...t } : null
}

/** Alle 16 Typen als Array */
export function getAllYouthTypes(): YouthType[] {
  return Object.entries(YOUTH_TYPES).map(([code, t]) => ({ code, ...t }))
}

// ─── DIMENSIONS & FAMILIES ────────────────────────────────────────
// Identisch zum Original-Schema — Jugend-App bleibt kompatibel

export const DIMENSION_META = {
  drive: {
    label: 'Antrieb',
    poleA: 'Entwicklung',    poleB: 'Wettkampf',
    colorA: '#34D399',       colorB: '#F59E0B',
    icon: '🎯',
    descA: 'Will lernen, wachsen, sich verbessern',
    descB: 'Will gewinnen, vergleichen, sich messen',
  },
  energy: {
    label: 'Energie',
    poleA: 'Eigenständig',   poleB: 'Teamgebunden',
    colorA: '#A78BFA',       colorB: '#60A5FA',
    icon: '⚡',
    descA: 'Lädt alleine auf — braucht Raum und Ruhe',
    descB: 'Lädt in der Gruppe auf — braucht Verbindung',
  },
  mental: {
    label: 'Mentalität',
    poleA: 'Stabil',         poleB: 'Intensiv',
    colorA: '#2FA7BC',       colorB: '#FB923C',
    icon: '🧠',
    descA: 'Ruhig, kontrolliert, wenig Schwankung',
    descB: 'Emotional, feurig, hohe Intensität',
  },
  role: {
    label: 'Rolle',
    poleA: 'Führend',        poleB: 'Adaptiv',
    colorA: '#F87171',       colorB: '#34D399',
    icon: '👑',
    descA: 'Geht voran, trifft Entscheidungen',
    descB: 'Passt sich an, unterstützt, bleibt flexibel',
  },
} as const

export const FAMILY_META = {
  str: {
    name: 'Strategen',   color: '#A78BFA', icon: '💜',
    desc: 'Denken voraus, arbeiten eigenständig an sich — leise und tief.',
    descYouth: 'Die Denker*innen. Arbeiten lieber alleine an sich, haben Pläne, wirken reifer als andere in ihrem Alter.',
    lack: 'Ohne sie fehlt taktische Tiefe und Selbstentwicklung in der Akademie.',
    excess: 'Zu viele → zu viel Kopf, zu wenig Bauch und Emotion.',
  },
  tfo: {
    name: 'Teamformer', color: '#60A5FA', icon: '💙',
    desc: 'Verbinden, integrieren, halten die Gruppe zusammen.',
    descYouth: 'Das soziale Netz der Mannschaft. Sorgen dafür dass keiner verloren geht — wichtig besonders für Integration und Klima.',
    lack: 'Ohne sie zerfällt die Kabine — Grüppchenbildung, Mobbing-Risiko.',
    excess: 'Zu viele → alles wird Harmonie, Leistungsfrage verblasst.',
  },
  per: {
    name: 'Performer',  color: '#F59E0B', icon: '💛',
    desc: 'Wollen gewinnen, arbeiten alleine hart, liefern im entscheidenden Moment.',
    descYouth: 'Die Ehrgeizigen. Wollen es wissen — gegen Gegner und gegen sich selbst. Haben oft früh eine klare Ziel-Richtung.',
    lack: 'Ohne sie fehlen die, die in engen Matches den Unterschied machen.',
    excess: 'Zu viele → Ego-Konflikte, jede*r will der/die Beste sein.',
  },
  lea: {
    name: 'Anführer',   color: '#F87171', icon: '❤️',
    desc: 'Führen emotional, ziehen das Team mit, gehen in Krisen voran.',
    descYouth: 'Die Lautstarken und Wärmenden. Reißen die Mannschaft mit — aber tragen auch viel auf ihren Schultern.',
    lack: 'Ohne sie fehlt emotionale Führung — in Krisenmomenten bricht die Mannschaft ein.',
    excess: 'Zu viele → Machtkämpfe, zu viele Alphas.',
  },
} as const

// ─── ANCHORS (Kurz-Indikatoren für Batterien) ─────────────────────

export const ANCHOR_METRICS = [
  {
    key: 'satisfaction', label: 'Zufriedenheit', icon: '😊',
    question: 'Wie zufrieden bist du aktuell insgesamt mit deiner Situation in der Akademie?',
    what: 'Wie wohl fühlt sich der/die Jugendliche in Team und Akademie-Alltag?',
    basis: 'Athlete Satisfaction (Riemer & Chelladurai, 1998)',
    high: 'Fühlt sich wohl. Keine Intervention nötig.',
    mid: 'Irgendwas stimmt nicht. Zeit für ein Gespräch.',
    low: 'Aktiver Handlungsbedarf. Ursache klären.',
  },
  {
    key: 'psych_safety', label: 'Psych. Sicherheit', icon: '🛡️',
    question: 'Ich traue mich im Team ehrlich zu sagen was ich denke — ohne Angst vor blöden Reaktionen.',
    what: 'Trauen sich Jugendliche Fehler zuzugeben, Fragen zu stellen, Probleme anzusprechen?',
    basis: 'Team Psychological Safety (Edmondson, 1999)',
    high: 'Offene Fehlerkultur.',
    mid: 'Oberflächliche Harmonie — Jugendliche sagen was sie glauben der Trainer möchte.',
    low: 'Angstklima. Probleme werden verborgen.',
  },
  {
    key: 'commitment', label: 'Bindung', icon: '🔗',
    question: 'Ich sehe mich auch in der nächsten Saison in dieser Akademie.',
    what: 'Gibt es innere Distanz, Frust, Absprungsgedanken?',
    basis: 'Turnover Intention (Cuskelly & Boag, 2001)',
    high: 'Jugendliche*r ist committed.',
    mid: 'Ambivalenz — Zeit für Bindungsgespräch.',
    low: 'Innerlich bereits weg.',
  },
  {
    key: 'alignment', label: 'Alignment', icon: '🧭',
    question: 'Ich weiß genau welche Rolle ich habe und was der Trainer von mir erwartet.',
    what: 'Versteht der/die Jugendliche Rolle, Erwartungen, Entwicklungsrichtung?',
    basis: 'Role Clarity (Beauchamp et al., 2002)',
    high: 'Klare Kommunikation.',
    mid: 'Unschärfe — nachschärfen.',
    low: 'Dringender Klärungsbedarf.',
  },
  {
    key: 'motivation', label: 'Motivation', icon: '🔥',
    question: 'Ich bin aktuell voll motiviert für die Akademie Leistung zu bringen.',
    what: 'Wie hoch sind Einsatz, Zugkraft, Drive?',
    basis: 'Self-Determination Theory (Deci & Ryan, 2000)',
    high: 'Intrinsisch motiviert.',
    mid: 'Routinegefahr.',
    low: 'Antriebslos — mögliche Ursachen: Über-/Unterforderung, fehlende Anerkennung, familiärer Druck.',
  },
] as const
