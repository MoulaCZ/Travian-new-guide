import {
  getUnitSpeed,
  TOURNAMENT_SQUARE_BONUS_PER_LEVEL,
  TOURNAMENT_SQUARE_MIN_DISTANCE,
} from '../data/travelUnits.js'

/**
 * Travian Legends map is toroidal: column +200 wraps to -200 (and the same on Y).
 * Standard map spans -200..200 inclusive → 401 positions per axis.
 */
export const TRAVIAN_MAP_SIZE = 401

function wrapDelta(d, size = TRAVIAN_MAP_SIZE) {
  const abs = Math.abs(d)
  return Math.min(abs, size - abs)
}

/** Euclidean distance in fields, respecting toroidal wrap on both axes. */
export function fieldDistance(from, to) {
  if (!from || !to) return NaN
  const dx = wrapDelta(to.x - from.x)
  const dy = wrapDelta(to.y - from.y)
  return Math.hypot(dx, dy)
}

/**
 * Travel duration in seconds with the proper segmented Travian formula:
 *
 *   - Hero's alliance standard is a flat speed multiplier for the whole journey.
 *   - Tournament Square gives +20% per level, BUT only on the part of the journey
 *     that exceeds 20 fields. The first 20 fields always move at base × hero speed.
 *
 *   t(d) = min(d, 20) / (base × hero) + max(0, d − 20) / (base × hero × ts)
 *
 * Verified against in-game arrival time: 9 844 spearmen, 05 Brno (-189|-56) →
 * (-192|-124) = 68.07 fields, TS lvl 7, no hero standard → 5:43:06 (matches).
 *
 * @param {number} distance fields
 * @param {number} baseSpeed fields/h
 * @param {{ tournamentLevel?: number, heroBonusPct?: number }} bonuses
 */
export function travelTimeSeconds(distance, baseSpeed, bonuses = {}) {
  const { tournamentLevel = 0, heroBonusPct = 0 } = bonuses
  if (!Number.isFinite(distance) || distance <= 0) return 0
  if (!Number.isFinite(baseSpeed) || baseSpeed <= 0) return Infinity

  const heroMult = 1 + Math.max(0, heroBonusPct) / 100
  const baseHeroSpeed = baseSpeed * heroMult

  const threshold = TOURNAMENT_SQUARE_MIN_DISTANCE
  if (tournamentLevel <= 0 || distance <= threshold) {
    return (distance / baseHeroSpeed) * 3600
  }

  const tsMult = 1 + TOURNAMENT_SQUARE_BONUS_PER_LEVEL * tournamentLevel
  const firstSeg = threshold / baseHeroSpeed
  const restSeg = (distance - threshold) / (baseHeroSpeed * tsMult)
  return (firstSeg + restSeg) * 3600
}

/**
 * Effective average speed over the whole march (fields/h) — convenience for UI.
 * For TS-bonus marches this is < base × ts because of the first-20-fields segment.
 */
export function effectiveSpeed(baseSpeed, { distance, tournamentLevel = 0, heroBonusPct = 0 }) {
  const sec = travelTimeSeconds(distance, baseSpeed, { tournamentLevel, heroBonusPct })
  if (!Number.isFinite(sec) || sec <= 0) return 0
  return (distance / sec) * 3600
}

/**
 * @param {Record<string, number>} counts unitId → count (only types with count > 0)
 * @param {string[]} activeUnitIds units included in this march
 */
export function computeMarchTimes(counts, activeUnitIds, from, to, bonuses) {
  const distance = fieldDistance(from, to)
  const unitTimes = []
  let slowestSec = 0

  for (const unitId of activeUnitIds) {
    const n = counts[unitId] ?? 0
    if (n <= 0) continue
    const base = getUnitSpeed(unitId)
    if (base == null) continue
    const sec = travelTimeSeconds(distance, base, bonuses)
    const avgSpeed = sec > 0 ? (distance / sec) * 3600 : 0
    unitTimes.push({ unitId, count: n, baseSpeed: base, effectiveSpeed: avgSpeed, seconds: sec })
    if (sec > slowestSec) slowestSec = sec
  }

  return { distance, unitTimes, totalSeconds: slowestSec || 0 }
}

export function formatTravelTime(totalSeconds) {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return '—'
  if (totalSeconds === Infinity) return '—'
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function formatDistance(d) {
  if (!Number.isFinite(d)) return '—'
  return d.toFixed(1)
}
