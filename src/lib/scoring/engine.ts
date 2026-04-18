import type { Question } from '@/lib/types'

// ═══════════════════════════════════════════════════════════════════
// HUMATRIX SPORTTYP SCORING ENGINE
// Exact replica of the Sporttyp scoring logic (doCalc + makeCode)
// 4 Dimensions × 2 Poles = 16 Types
// ═══════════════════════════════════════════════════════════════════

export const DIMENSIONS = [
  { key: 'drive',  label: 'Antrieb',    poleA: 'Entwicklung',  poleB: 'Wettkampf',    codeA: 'E', codeB: 'W', colorA: '#34D399', colorB: '#F59E0B' },
  { key: 'energy', label: 'Energie',    poleA: 'Eigenständig', poleB: 'Teamgebunden', codeA: 'S', codeB: 'T', colorA: '#A78BFA', colorB: '#60A5FA' },
  { key: 'mental', label: 'Mentalität', poleA: 'Stabil',       poleB: 'Intensiv',     codeA: 'A', codeB: 'I', colorA: '#2FA7BC', colorB: '#FB923C' },
  { key: 'role',   label: 'Rolle',      poleA: 'Führend',      poleB: 'Adaptiv',      codeA: 'F', codeB: 'D', colorA: '#F87171', colorB: '#34D399' },
] as const

export type DimensionKey = 'drive' | 'energy' | 'mental' | 'role'

export const FAMILIES = {
  str: { name: 'Strategen', color: '#A78BFA', desc: 'Strategische Tiefe' },
  tfo: { name: 'Teamformer', color: '#60A5FA', desc: 'Sozialer Kitt' },
  per: { name: 'Performer', color: '#F59E0B', desc: 'Wettkampfkraft' },
  lea: { name: 'Anführer', color: '#F87171', desc: 'Emotionale Führung' },
} as const

export type FamilyKey = keyof typeof FAMILIES

export const TYPE_FAMILY: Record<string, FamilyKey> = {
  ESAF:'str',ESAD:'str',ESIF:'str',ESID:'str',
  ETAF:'tfo',ETAD:'tfo',ETIF:'tfo',ETID:'tfo',
  WSAF:'per',WSAD:'per',WSIF:'per',WSID:'per',
  WTAF:'lea',WTAD:'lea',WTIF:'lea',WTID:'lea',
}

export interface DimensionScore {
  pct: number
  letter: string
  label: string
}

// Exact logic from Sporttyp doCalc()
export function calculateDimensionScores(
  answers: Record<number, number>,
  questions: Question[]
): Record<DimensionKey, DimensionScore> {
  const result: Record<string, DimensionScore> = {}
  for (const dim of DIMENSIONS) {
    const aVals: number[] = []
    const bVals: number[] = []
    for (const q of questions) {
      if (q.category !== dim.key) continue
      const val = answers[q.sort_order]
      if (val === undefined || val === null) continue
      if (!q.is_reversed) aVals.push(val)
      else bVals.push(val)
    }
    if (!aVals.length && !bVals.length) {
      result[dim.key] = { pct: 50, letter: dim.codeA, label: dim.poleA }
      continue
    }
    let aScore = 0.5
    if (aVals.length > 0) {
      const s = aVals.reduce((a, v) => a + v, 0)
      aScore = (s - aVals.length) / (aVals.length * 6)
    }
    let bScore = 0.5
    if (bVals.length > 0) {
      const s = bVals.reduce((a, v) => a + (8 - v), 0)
      bScore = (s - bVals.length) / (bVals.length * 6)
    }
    const pct = Math.round(((aScore + bScore) / 2) * 100)
    result[dim.key] = {
      pct,
      letter: pct >= 50 ? dim.codeA : dim.codeB,
      label: pct >= 50 ? dim.poleA : dim.poleB,
    }
  }
  return result as Record<DimensionKey, DimensionScore>
}

// Exact logic from Sporttyp makeCode()
export function makeTypeCode(scores: Record<DimensionKey, DimensionScore>): string {
  return DIMENSIONS.map(d => scores[d.key]?.letter || d.codeA).join('')
}

export interface SporttypResult {
  code: string
  family: FamilyKey
  familyName: string
  dimensionScores: Record<DimensionKey, DimensionScore>
}

export function calculateSporttyp(
  answers: Record<number, number>,
  questions: Question[]
): SporttypResult {
  const ds = calculateDimensionScores(answers, questions)
  const code = makeTypeCode(ds)
  const fam = TYPE_FAMILY[code] || 'str'
  return { code, family: fam, familyName: FAMILIES[fam].name, dimensionScores: ds }
}

export function calculateAlignment(
  selfScores: Record<DimensionKey, DimensionScore>,
  coachScores: Record<DimensionKey, DimensionScore>
): { matchScore: number; differences: Record<DimensionKey, number> } {
  const diffs: Record<string, number> = {}
  let total = 0
  for (const dim of DIMENSIONS) {
    const d = Math.abs((selfScores[dim.key]?.pct ?? 50) - (coachScores[dim.key]?.pct ?? 50))
    diffs[dim.key] = d
    total += d
  }
  return { matchScore: Math.round((1 - total / 400) * 100), differences: diffs as Record<DimensionKey, number> }
}
