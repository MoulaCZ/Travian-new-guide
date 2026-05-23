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
 * Effective movement speed (fields/h) after bonuses.
 * @param {number} baseSpeed
 * @param {{ distance: number, tournamentLevel?: number, heroBonusPct?: number }} bonuses
 */
export function effectiveSpeed(baseSpeed, { distance, tournamentLevel = 0, heroBonusPct = 0 }) {
  if (!Number.isFinite(baseSpeed) || baseSpeed <= 0) return 0
  let speed = baseSpeed
  if (distance > TOURNAMENT_SQUARE_MIN_DISTANCE && tournamentLevel > 0) {
    speed *= 1 + TOURNAMENT_SQUARE_BONUS_PER_LEVEL * tournamentLevel
  }
  if (heroBonusPct > 0) {
    speed *= 1 + heroBonusPct / 100
  }
  return speed
}

/** Travel duration in seconds. */
export function travelTimeSeconds(distance, speedFieldsPerHour) {
  if (!Number.isFinite(distance) || distance <= 0) return 0
  if (!Number.isFinite(speedFieldsPerHour) || speedFieldsPerHour <= 0) return Infinity
  return (distance / speedFieldsPerHour) * 3600
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
    const speed = effectiveSpeed(base, { distance, ...bonuses })
    const sec = travelTimeSeconds(distance, speed)
    unitTimes.push({ unitId, count: n, baseSpeed: base, effectiveSpeed: speed, seconds: sec })
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
