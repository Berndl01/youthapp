/**
 * HUMATRIX TYPE REGISTRY
 * 
 * Static type definitions. Loaded from sporttyp-data.json.
 * Separated from scoring so types can be updated without touching calculation.
 * 
 * Each type has:
 * - Identity: code, name, emoji, color, family, tagline
 * - Content: description, strengths, risks
 * - Coaching: coachDo, coachDont, playerDo, playerDont
 * - Psychology: why (motivation drivers), whyNot (demotivators)
 * - Development: selfDev (self-improvement tasks)
 */

import rawTypes from '../../lib/sporttyp-data.json'

export interface TypeDefinition {
  code: string
  name: string
  emoji: string
  color: string
  family: string
  tagline: string
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

export interface FamilyDefinition {
  key: string
  name: string
  color: string
  icon: string
  desc: string
  lack: string
  excess: string
}

// ─── TYPE REGISTRY ──────────────────────────────────────────────────

const TYPES: Record<string, TypeDefinition> = {}
for (const [code, data] of Object.entries(rawTypes)) {
  TYPES[code] = { code, ...(data as Omit<TypeDefinition, 'code'>) }
}

/** Get type definition by 4-letter code. Returns null if unknown. */
export function getType(code: string): TypeDefinition | null {
  return TYPES[code] || null
}

/** Get all 16 type definitions. */
export function getAllTypes(): TypeDefinition[] {
  return Object.values(TYPES)
}

/** Get types for a specific family. */
export function getTypesByFamily(family: string): TypeDefinition[] {
  return Object.values(TYPES).filter(t => t.family === family)
}

/** Check if a type code is valid. */
export function isValidTypeCode(code: string): boolean {
  return code in TYPES
}

// ─── FAMILY REGISTRY ────────────────────────────────────────────────

export const FAMILIES: Record<string, FamilyDefinition> = {
  str: {
    key: 'str', name: 'Strategen', color: '#A78BFA', icon: '💜',
    desc: 'Strategische Tiefe — taktisches Denken, individuelle Entwicklung, Spielintelligenz.',
    lack: 'Ohne sie fehlt taktische Variabilität und langfristige Spielerentwicklung im Kader.',
    excess: 'Zu viele → Überanalyse, zu wenig Zweikampfhärte und emotionale Intensität.',
  },
  tfo: {
    key: 'tfo', name: 'Teamformer', color: '#60A5FA', icon: '💙',
    desc: 'Sozialer Kitt — Kabine zusammenhalten, Vertrauen aufbauen, integrieren.',
    lack: 'Ohne sie zerfällt die Mannschaftschemie — Grüppchenbildung und gescheiterte Neuzugänge.',
    excess: 'Zu viele → Harmoniebedürfnis überwiegt, zu wenig Leistungsdruck.',
  },
  per: {
    key: 'per', name: 'Performer', color: '#F59E0B', icon: '💛',
    desc: 'Wettkampfkraft — in den entscheidenden 90 Minuten den Unterschied machen.',
    lack: 'Ohne sie fehlen Spieler die in Drucksituationen liefern.',
    excess: 'Zu viele → Ego-Konflikte, Konkurrenzkampf statt Zusammenarbeit.',
  },
  lea: {
    key: 'lea', name: 'Anführer', color: '#F87171', icon: '❤️',
    desc: 'Emotionale Führung — vorangehen, Kabinenansprache, in Krisen aufstehen.',
    lack: 'Ohne sie fehlt emotionale Führung — nach Rückständen bricht die Mannschaft ein.',
    excess: 'Zu viele → Machtkämpfe, zu viele Alphatiere.',
  },
}

export function getFamily(key: string): FamilyDefinition | null {
  return FAMILIES[key] || null
}
