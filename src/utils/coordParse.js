/**
 * Parse Travian coordinates from manual input or paste fragments.
 * Supports: "150 21", "-24,65", "9 -54", "(−196|−33)", "−196|−33", "-196|-33"
 */

function normalizeCoordText(raw) {
  return String(raw ?? '')
    .replace(/[\u202A-\u202E\u200E\u200F\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[‭‬]/g, '')
    .replace(/−/g, '-')
    .trim()
}

/**
 * @returns {{ x: number, y: number } | null}
 */
export function parseCoordsInput(raw) {
  const s = normalizeCoordText(raw)
  if (!s) return null

  const patterns = [
    /\(\s*(-?\d+)\s*[|,;]\s*(-?\d+)\s*\)/,
    /(-?\d+)\s*[|,;]\s*(-?\d+)/,
    /^(-?\d+)\s+(-?\d+)$/,
  ]

  for (const re of patterns) {
    const m = s.match(re)
    if (m) {
      const x = parseInt(m[1], 10)
      const y = parseInt(m[2], 10)
      if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
    }
  }

  return null
}

export function formatCoordsForInput(coords) {
  if (!coords || !Number.isFinite(coords.x) || !Number.isFinite(coords.y)) return ''
  return `${coords.x}|${coords.y}`
}
