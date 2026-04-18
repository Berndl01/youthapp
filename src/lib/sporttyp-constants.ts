// ══════════════════════════════════════════════════════════════════
// KOMPATIBILITÄTS-SHIM
// Leitet alte Imports auf Youth-Konstanten um. Alte Pages bleiben
// lauffähig ohne Änderungen. Neue Pages nutzen direkt '@/lib/youth/constants'.
// ══════════════════════════════════════════════════════════════════

import {
  YOUTH_TYPES,
  getYouthType,
  DIMENSION_META as YOUTH_DIMENSION_META,
  FAMILY_META as YOUTH_FAMILY_META,
  ANCHOR_METRICS as YOUTH_ANCHOR_METRICS,
  getPlayerSelftest,
  getExternalAssessment,
  getTrainerPersonality,
  getTrainerCoaching,
  getBattery,
  type AgeGroup,
} from './youth/constants'

export const SPORTTYP_TYPES = new Proxy({} as Record<string, any>, {
  get(_, code: string) { return getYouthType(code) },
  has(_, code: string) { return code in YOUTH_TYPES },
  ownKeys() { return Object.keys(YOUTH_TYPES) },
  getOwnPropertyDescriptor(_, code: string) {
    const t = getYouthType(code)
    return t ? { enumerable: true, configurable: true, value: t } : undefined
  }
})

export const DIMENSION_META = YOUTH_DIMENSION_META
export const FAMILY_META = YOUTH_FAMILY_META
export const ANCHOR_METRICS = YOUTH_ANCHOR_METRICS

export const SPORTTYP_QUESTIONS = {
  get player_selftest() { return getPlayerSelftest('u16') },
  get external_assessment() { return getExternalAssessment('u16') },
  get trainer_personality() { return getTrainerPersonality() },
  get trainer_coaching() { return getTrainerCoaching() },
  get battery_a() { return getBattery('a') },
  get battery_b() { return getBattery('b') },
  get battery_c() { return getBattery('c') },
  get battery_d() { return getBattery('d') },
  get battery_e() { return getBattery('e') },
}

export interface SporttypType {
  name: string; family: string; tagline: string; emoji: string
  color: string; desc: string; strengths: string[]; risks: string[]
  playerDo: string[]; playerDont: string[]; coachDo: string[]
  coachDont: string[]; why: string[]; whyNot: string[]; selfDev: string[]
}

export interface SporttypQuestion {
  id: number; dim: string; pole: string; text: string
}

export type { AgeGroup }
