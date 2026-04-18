/**
 * HUMATRIX SERVICE TESTS
 * 
 * Run: npx tsx src/services/__tests__/scoring.test.ts
 * 
 * Tests all pure functions without database.
 */

import { calculateDimensions, makeCode, calculateType, calculateConfidence } from '../scoring/calculate'
import type { ScoringQuestion } from '../scoring/calculate'
import { getType, getAllTypes, isValidTypeCode, FAMILIES } from '../scoring/types'
import { compareAssessments } from '../comparison/compare'
import { getQuestionnaire, validateAnswers, getScoringQuestions, getCompletionPct } from '../questionnaires/questionnaires'

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`) }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`) }
}

function assertClose(actual: number, expected: number, tolerance: number, msg: string) {
  assert(Math.abs(actual - expected) <= tolerance, `${msg} (got ${actual}, expected ~${expected})`)
}

// ═══════════════════════════════════════════════════════════════
// 1. DIMENSION SCORING
// ═══════════════════════════════════════════════════════════════

console.log('\n═══ 1. Dimension Scoring ═══')

// Build simple test questions: 4 per dimension, 2×A + 2×B
const testQuestions: ScoringQuestion[] = [
  { id: 1, dimension: 'drive', pole: 'A' },
  { id: 2, dimension: 'drive', pole: 'B' },
  { id: 3, dimension: 'drive', pole: 'A' },
  { id: 4, dimension: 'drive', pole: 'B' },
  { id: 5, dimension: 'energy', pole: 'A' },
  { id: 6, dimension: 'energy', pole: 'B' },
  { id: 7, dimension: 'energy', pole: 'A' },
  { id: 8, dimension: 'energy', pole: 'B' },
  { id: 9, dimension: 'mental', pole: 'A' },
  { id: 10, dimension: 'mental', pole: 'B' },
  { id: 11, dimension: 'mental', pole: 'A' },
  { id: 12, dimension: 'mental', pole: 'B' },
  { id: 13, dimension: 'role', pole: 'A' },
  { id: 14, dimension: 'role', pole: 'B' },
  { id: 15, dimension: 'role', pole: 'A' },
  { id: 16, dimension: 'role', pole: 'B' },
]

// Test: All answers 4 (neutral) → should give ~50% on all dimensions
{
  const answers: Record<number, number> = {}
  for (let i = 1; i <= 16; i++) answers[i] = 4
  const dims = calculateDimensions(answers, testQuestions)
  assert(dims.drive.pct === 50, 'Neutral answers → 50% drive')
  assert(dims.energy.pct === 50, 'Neutral answers → 50% energy')
  assert(dims.mental.pct === 50, 'Neutral answers → 50% mental')
  assert(dims.role.pct === 50, 'Neutral answers → 50% role')
}

// Test: All A-pole answers 7, B-pole answers 1 → strong pole A
{
  const answers: Record<number, number> = {}
  testQuestions.forEach(q => { answers[q.id] = q.pole === 'A' ? 7 : 1 })
  const dims = calculateDimensions(answers, testQuestions)
  assert(dims.drive.pct === 100, 'Max A answers → 100% (A pole)')
  assert(dims.drive.letter === 'E', 'Max A → letter E (Entwicklung)')
}

// Test: All B-pole answers 7, A-pole answers 1 → strong pole B
{
  const answers: Record<number, number> = {}
  testQuestions.forEach(q => { answers[q.id] = q.pole === 'B' ? 7 : 1 })
  const dims = calculateDimensions(answers, testQuestions)
  assert(dims.drive.pct === 0, 'Max B answers → 0%')
  assert(dims.drive.letter === 'W', 'Max B → letter W (Wettkampf)')
}

// Test: No answers → default 50%
{
  const dims = calculateDimensions({}, testQuestions)
  assert(dims.drive.pct === 50, 'No answers → default 50%')
  assert(dims.drive.aCount === 0, 'No answers → 0 A count')
}

// Test: Out-of-range values are rejected
{
  const answers = { 1: 0, 2: 8, 3: -1, 4: 100 } // all invalid
  const dims = calculateDimensions(answers, testQuestions)
  assert(dims.drive.pct === 50, 'Out-of-range → treated as unanswered → 50%')
}

// Test: Partial answers work
{
  const answers = { 1: 7, 3: 7 } // only A-pole, no B-pole
  const dims = calculateDimensions(answers, testQuestions)
  assert(dims.drive.aCount === 2, 'Partial: 2 A-pole answered')
  assert(dims.drive.bCount === 0, 'Partial: 0 B-pole answered')
  assert(dims.drive.pct > 50, 'Partial A-only with 7s → above 50%')
}

// ═══════════════════════════════════════════════════════════════
// 2. TYPE CODE GENERATION
// ═══════════════════════════════════════════════════════════════

console.log('\n═══ 2. Type Code ═══')

{
  const dims = calculateDimensions(
    { 1: 7, 2: 1, 3: 7, 4: 1,   // drive A=7, B=1 → E
      5: 7, 6: 1, 7: 7, 8: 1,   // energy A=7, B=1 → S
      9: 7, 10: 1, 11: 7, 12: 1, // mental A=7, B=1 → A
      13: 7, 14: 1, 15: 7, 16: 1 }, // role A=7, B=1 → F
    testQuestions
  )
  const code = makeCode(dims)
  assert(code === 'ESAF', `Full A-pole → ESAF (got ${code})`)
}

{
  const dims = calculateDimensions(
    { 1: 1, 2: 7, 3: 1, 4: 7,   // drive → W
      5: 1, 6: 7, 7: 1, 8: 7,   // energy → T
      9: 1, 10: 7, 11: 1, 12: 7, // mental → I
      13: 1, 14: 7, 15: 1, 16: 7 }, // role → D
    testQuestions
  )
  const code = makeCode(dims)
  assert(code === 'WTID', `Full B-pole → WTID (got ${code})`)
}

// ═══════════════════════════════════════════════════════════════
// 3. CONFIDENCE
// ═══════════════════════════════════════════════════════════════

console.log('\n═══ 3. Confidence ═══')

{
  // All at 50% → confidence 0
  const neutralDims = calculateDimensions(
    Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i + 1, 4])),
    testQuestions
  )
  const conf = calculateConfidence(neutralDims)
  assert(conf === 0, `All neutral → confidence 0 (got ${conf})`)
}

{
  // All at extremes → confidence 100
  const extremeDims = calculateDimensions(
    Object.fromEntries(testQuestions.map(q => [q.id, q.pole === 'A' ? 7 : 1])),
    testQuestions
  )
  const conf = calculateConfidence(extremeDims)
  assert(conf === 100, `All extreme → confidence 100 (got ${conf})`)
}

// ═══════════════════════════════════════════════════════════════
// 4. FULL PIPELINE
// ═══════════════════════════════════════════════════════════════

console.log('\n═══ 4. Full Pipeline ═══')

{
  const answers: Record<number, number> = {}
  testQuestions.forEach(q => { answers[q.id] = q.pole === 'A' ? 6 : 2 })
  const result = calculateType(answers, testQuestions)
  assert(result.code === 'ESAF', `Pipeline: clear A-pole → ESAF (got ${result.code})`)
  assert(result.family === 'str', `Pipeline: ESAF → family str (got ${result.family})`)
  assert(result.confidence > 50, `Pipeline: confidence > 50 (got ${result.confidence})`)
  assert(result.answeredCount === 16, `Pipeline: all 16 answered (got ${result.answeredCount})`)
  assert(result.calculatedAt !== '', 'Pipeline: timestamp set')
}

// ═══════════════════════════════════════════════════════════════
// 5. TYPE REGISTRY
// ═══════════════════════════════════════════════════════════════

console.log('\n═══ 5. Type Registry ═══')

assert(getAllTypes().length === 16, `16 types registered (got ${getAllTypes().length})`)
assert(isValidTypeCode('ESAF'), 'ESAF is valid')
assert(isValidTypeCode('WTID'), 'WTID is valid')
assert(!isValidTypeCode('XXXX'), 'XXXX is invalid')

{
  const ty = getType('WSAF')
  assert(ty !== null, 'WSAF found')
  assert(ty?.name === 'Der Commander', `WSAF name = Der Commander (got ${ty?.name})`)
  assert(ty?.emoji === '👑', 'WSAF emoji = 👑')
  assert((ty?.coachDo?.length ?? 0) >= 3, 'WSAF has coaching tips')
  assert((ty?.risks?.length ?? 0) >= 2, 'WSAF has risks')
}

assert(Object.keys(FAMILIES).length === 4, '4 families')
assert(FAMILIES.str.name === 'Strategen', 'str = Strategen')

// ═══════════════════════════════════════════════════════════════
// 6. COMPARISON
// ═══════════════════════════════════════════════════════════════

console.log('\n═══ 6. Comparison ═══')

{
  // Identical scores → 100% match
  const scores = calculateDimensions(
    Object.fromEntries(Array.from({ length: 16 }, (_, i) => [i + 1, 5])),
    testQuestions
  )
  const result = compareAssessments(scores, scores, 'ESAF', 'ESAF')
  assert(result.matchScore === 100, `Identical → 100% match (got ${result.matchScore})`)
  assert(result.sameType === true, 'Same type = true')
  assert(result.differences.every(d => d.absDiff === 0), 'All diffs = 0')
}

{
  // Opposite scores → low match
  const selfAnswers: Record<number, number> = {}
  const coachAnswers: Record<number, number> = {}
  testQuestions.forEach(q => {
    selfAnswers[q.id] = q.pole === 'A' ? 7 : 1  // All A
    coachAnswers[q.id] = q.pole === 'A' ? 1 : 7  // All B
  })
  const selfScores = calculateDimensions(selfAnswers, testQuestions)
  const coachScores = calculateDimensions(coachAnswers, testQuestions)
  const result = compareAssessments(selfScores, coachScores, 'ESAF', 'WTID')
  assert(result.matchScore === 0, `Opposite → 0% match (got ${result.matchScore})`)
  assert(result.sameType === false, 'Different type')
  assert(result.differences.every(d => d.severity === 'gap'), 'All gaps')
}

{
  // Moderate difference
  const selfAnswers: Record<number, number> = {}
  const coachAnswers: Record<number, number> = {}
  testQuestions.forEach(q => {
    selfAnswers[q.id] = q.pole === 'A' ? 6 : 3
    coachAnswers[q.id] = q.pole === 'A' ? 5 : 4 // closer to neutral
  })
  const selfScores = calculateDimensions(selfAnswers, testQuestions)
  const coachScores = calculateDimensions(coachAnswers, testQuestions)
  const result = compareAssessments(selfScores, coachScores, makeCode(selfScores), makeCode(coachScores))
  assert(result.matchScore > 30 && result.matchScore < 90, `Moderate diff → mid-range match (got ${result.matchScore})`)
  assert(result.summary.length > 0, 'Summary generated')
}

// ═══════════════════════════════════════════════════════════════
// 7. QUESTIONNAIRES
// ═══════════════════════════════════════════════════════════════

console.log('\n═══ 7. Questionnaires ═══')

{
  const q = getQuestionnaire('player_selftest')
  assert(q.questionCount === 68, `Player selftest: 68 questions (got ${q.questionCount})`)
  assert(q.questions[0].scaleMin === 1, 'Scale min = 1')
  assert(q.questions[0].scaleMax === 7, 'Scale max = 7')
}

{
  const q = getQuestionnaire('external_assessment')
  assert(q.questionCount === 20, `External: 20 questions (got ${q.questionCount})`)
}

{
  const q = getQuestionnaire('trainer_personality')
  assert(q.questionCount === 16, `Trainer pers: 16 questions (got ${q.questionCount})`)
}

{
  const q = getQuestionnaire('trainer_coaching')
  assert(q.questionCount === 24, `Trainer coaching: 24 questions (got ${q.questionCount})`)
}

// Validation
{
  const result = validateAnswers({}, 'player_selftest')
  assert(result.valid === false, 'Empty answers → invalid')
  assert(result.missingQuestions.length === 68, 'All 68 missing')
}

{
  // Build complete valid answers for player selftest
  const sq = getScoringQuestions('player_selftest')
  const answers: Record<number, number> = {}
  sq.forEach(q => { answers[q.id] = 4 })
  const result = validateAnswers(answers, 'player_selftest')
  assert(result.valid === true, 'All 68 answered → valid')
  assert(result.answeredCount === 68, 'Answered = 68')
}

// Completion
{
  const sq = getScoringQuestions('player_selftest')
  const answers: Record<number, number> = {}
  sq.slice(0, 34).forEach(q => { answers[q.id] = 4 })
  const pct = getCompletionPct(answers, 'player_selftest')
  assert(pct === 50, `Half answered → 50% (got ${pct})`)
}

// ═══════════════════════════════════════════════════════════════
// 8. EDGE CASES
// ═══════════════════════════════════════════════════════════════

console.log('\n═══ 8. Edge Cases ═══')

{
  // Empty questions array
  const result = calculateType({}, [])
  assert(result.code.length === 4, 'Empty questions → still returns 4-letter code')
}

{
  // All same value (1)
  const answers: Record<number, number> = {}
  testQuestions.forEach(q => { answers[q.id] = 1 })
  const result = calculateType(answers, testQuestions)
  assert(result.code.length === 4, 'All 1s → valid code')
}

{
  // All same value (7)
  const answers: Record<number, number> = {}
  testQuestions.forEach(q => { answers[q.id] = 7 })
  const result = calculateType(answers, testQuestions)
  assert(result.code.length === 4, 'All 7s → valid code')
}

{
  // Mixed undefined values
  const result = calculateType(
    { 1: 5, 2: undefined as any, 3: null as any, 5: 3 },
    testQuestions
  )
  assert(result.code.length === 4, 'Mixed null/undefined → valid code')
  assert(result.answeredCount === 2, 'Only valid answers counted')
}

// ═══════════════════════════════════════════════════════════════
// 9. REAL-WORLD SIMULATION
// ═══════════════════════════════════════════════════════════════

console.log('\n═══ 9. Real-World Simulation ═══')

{
  // Simulate a "Commander" profile (WSAF): high wettkampf, eigenständig, stabil, führend
  const sq = getScoringQuestions('player_selftest')
  const answers: Record<number, number> = {}
  for (const q of sq) {
    if (q.dimension === 'drive')  answers[q.id] = q.pole === 'B' ? 7 : 2 // Wettkampf
    if (q.dimension === 'energy') answers[q.id] = q.pole === 'A' ? 7 : 2 // Eigenständig
    if (q.dimension === 'mental') answers[q.id] = q.pole === 'A' ? 7 : 2 // Stabil
    if (q.dimension === 'role')   answers[q.id] = q.pole === 'A' ? 7 : 2 // Führend
  }
  const result = calculateType(answers, sq)
  assert(result.code === 'WSAF', `Simulated Commander → WSAF (got ${result.code})`)
  assert(result.family === 'per', `WSAF → Performer family (got ${result.family})`)
  assert(result.confidence > 60, `Clear profile → high confidence (got ${result.confidence})`)

  const ty = getType(result.code)
  assert(ty?.name === 'Der Commander', `WSAF = Der Commander (got ${ty?.name})`)
}

{
  // Simulate a "Verbinder" profile (ETID): entwicklung, teamgebunden, intensiv, adaptiv
  const sq = getScoringQuestions('player_selftest')
  const answers: Record<number, number> = {}
  for (const q of sq) {
    if (q.dimension === 'drive')  answers[q.id] = q.pole === 'A' ? 6 : 3 // Entwicklung
    if (q.dimension === 'energy') answers[q.id] = q.pole === 'B' ? 6 : 3 // Teamgebunden
    if (q.dimension === 'mental') answers[q.id] = q.pole === 'B' ? 6 : 3 // Intensiv
    if (q.dimension === 'role')   answers[q.id] = q.pole === 'B' ? 6 : 3 // Adaptiv
  }
  const result = calculateType(answers, sq)
  assert(result.code === 'ETID', `Simulated Verbinder → ETID (got ${result.code})`)
  assert(result.family === 'tfo', `ETID → Teamformer (got ${result.family})`)
}

// ═══════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(50)}`)
console.log(`ERGEBNIS: ${passed} bestanden, ${failed} fehlgeschlagen`)
console.log(`${'═'.repeat(50)}\n`)

if (failed > 0) process.exit(1)
