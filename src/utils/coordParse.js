/**
 * Parse Travian coordinates from anything a player might paste:
 *   "150 21" · "-24,65" · "9 -54" · "(−196|−33)" · "−196|−33"
 *   "[−196 | −33]" · "X: 12 Y: -7" · "y=-33&x=-196"
 *   "https://ts1.x1...travian.com/karte.php?x=-196&y=-33"
 *   "https://.../position_details.php?x=-196&y=-33"
 *
 * Accepts every Unicode minus variant players run into:
 *   - U+002D HYPHEN-MINUS          "-"
 *   − U+2212 MINUS SIGN            "−"
 *   – U+2013 EN DASH               "–"
 *   — U+2014 EM DASH               "—"
 *   ‐ U+2010 HYPHEN                "‐"
 *   ‑ U+2011 NON-BREAKING HYPHEN   "‑"
 *   ﹣ U+FE63 SMALL HYPHEN-MINUS    "﹣"
 *   － U+FF0D FULLWIDTH HYPHEN-M.   "－"
 */

const MINUS_VARIANTS_RE = /[−–—‐‑﹣－]/g
const BIDI_INVISIBLE_RE = /[\u202A-\u202E\u200E\u200F\uFEFF\u2066-\u2069]/g
const FULLWIDTH_DIGITS_RE = /[０-９]/g

function normalizeCoordText(raw) {
  return String(raw ?? '')
    .replace(BIDI_INVISIBLE_RE, '')
    .replace(/[‭‬]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(MINUS_VARIANTS_RE, '-')
    .replace(FULLWIDTH_DIGITS_RE, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30))
    .trim()
}

/** Try to read x/y from a Travian-style URL (any host, any page). */
function parseUrlCoords(text) {
  if (!/[?&]\s*[xy]\s*=/i.test(text) && !/karte\.php|position_details\.php/i.test(text)) {
    return null
  }
  const xMatch = text.match(/[?&]\s*x\s*=\s*(-?\d+)/i)
  const yMatch = text.match(/[?&]\s*y\s*=\s*(-?\d+)/i)
  if (xMatch && yMatch) {
    const x = parseInt(xMatch[1], 10)
    const y = parseInt(yMatch[1], 10)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  return null
}

/** Try to read "X: 12 Y: -7" style labelled coords. */
function parseLabelledCoords(text) {
  const xm = text.match(/\bx\s*[:=]\s*(-?\d+)/i)
  const ym = text.match(/\by\s*[:=]\s*(-?\d+)/i)
  if (xm && ym) {
    const x = parseInt(xm[1], 10)
    const y = parseInt(ym[1], 10)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  return null
}

/** @returns {{ x: number, y: number } | null} */
export function parseCoordsInput(raw) {
  const s = normalizeCoordText(raw)
  if (!s) return null

  const fromUrl = parseUrlCoords(s)
  if (fromUrl) return fromUrl

  const fromLabel = parseLabelledCoords(s)
  if (fromLabel) return fromLabel

  // brackets + separator (|, /, ,, ;, :, space)
  const patterns = [
    /[\(\[\{]\s*(-?\d+)\s*[|/,;:\s]+\s*(-?\d+)\s*[\)\]\}]/,
    /(-?\d+)\s*[|/,;:]\s*(-?\d+)/,
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
