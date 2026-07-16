/**
 * Parse Travian Village overview → Resources tab (warehouse / granary %).
 * Supports Ctrl+A text paste and optional Ctrl+U HTML (for village newdid + server).
 */

const BIDI_RE = /[\u202A-\u202E\u200E\u200F\uFEFF\u2066-\u2069\u200B-\u200D]/g
const MINUS_RE = /[−–—‐‑﹣－]/g

export const MAIN_CROP_LOW_PCT = 40
export const FEEDER_HIGH_PCT = 45
export const FEEDER_LEAVE_PCT = 15

const DEFAULT_SERVER_BASE = 'https://ts10.x1.europe.travian.com'

function parseServerBaseFromPaste(text) {
  const norm = normalize(text)
  const mapUrl = norm.match(
    /https?:\/\/([a-z0-9.-]+\.travian\.com)\/(?:karte|position_details|build|dorf\d|raid_list|farmList)\.php/i,
  )
  if (mapUrl && !/^(cdn\.|www\.|support\.|lobby\.)/i.test(mapUrl[1])) {
    return `https://${mapUrl[1].toLowerCase()}`
  }
  for (const m of norm.matchAll(/\b(ts\d+\.x\d+\.[a-z0-9.-]+\.travian\.com)\b/gi)) {
    return `https://${m[1].toLowerCase()}`
  }
  const title = norm.match(/<title>\s*([^<]+?)\s*<\/title>/i)
  if (title) {
    const world = title[1].trim().match(/^(Europe|America|Asia|Arabics|International)\s+(\d+)/i)
    if (world) return `https://ts${world[2]}.x1.${world[1].toLowerCase()}.travian.com`
  }
  return DEFAULT_SERVER_BASE
}

function buildMapUrl(serverBase, x, y) {
  if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) return null
  const base = (serverBase || DEFAULT_SERVER_BASE).replace(/\/$/, '')
  return `${base}/karte.php?x=${x}&y=${y}`
}

/** Marketplace send-resources tab (gid=17, t=5). Slot id=23 is common but not required. */
export function buildMarketplaceUrl(serverBase, villageId = null) {
  const base = (serverBase || DEFAULT_SERVER_BASE).replace(/\/$/, '')
  const params = new URLSearchParams()
  if (villageId != null && Number.isFinite(Number(villageId))) {
    params.set('newdid', String(villageId))
  }
  params.set('id', '23')
  params.set('gid', '17')
  params.set('t', '5')
  return `${base}/build.php?${params.toString()}`
}

function normalize(text) {
  return String(text ?? '')
    .replace(BIDI_RE, '')
    .replace(MINUS_RE, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
}

function parsePct(raw) {
  const m = String(raw ?? '').replace(/\s/g, '').match(/(-?\d+)\s*%/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

/** "462:16:41" | "− 4:48:09" | "- 11:34:49" */
function parseDuration(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const neg = /^-/.test(s)
  const m = s.replace(/^-+\s*/, '').match(/(\d+):(\d{2}):(\d{2})/)
  if (!m) return null
  const hours = parseInt(m[1], 10)
  const mins = parseInt(m[2], 10)
  const secs = parseInt(m[3], 10)
  const totalSeconds = hours * 3600 + mins * 60 + secs
  return { label: s, negative: neg, totalSeconds: neg ? -totalSeconds : totalSeconds }
}

/**
 * Extract villageId by name from HTML page source (dorf links / newdid).
 * @returns {Map<string, number>} name → id
 */
export function parseVillageIdsFromHtml(text) {
  const map = new Map()
  const norm = normalize(text)
  // <a ... newdid=12345 ...>11 Poledňany</a> or similar
  const re =
    /newdid[=:](\d+)[^>]*>\s*([^<]{1,80}?)\s*<\/a>/gi
  for (const m of norm.matchAll(re)) {
    const id = parseInt(m[1], 10)
    const name = m[2].replace(/\s+/g, ' ').trim()
    if (name && Number.isFinite(id)) map.set(name, id)
  }
  // fallback: data-did / village id near name in JSON blobs
  const jsonRe = /"name"\s*:\s*"([^"]+)"[^}]{0,200}?"id"\s*:\s*(\d+)/gi
  for (const m of norm.matchAll(jsonRe)) {
    const name = m[1].replace(/\\u([0-9a-f]{4})/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    const id = parseInt(m[2], 10)
    if (name && Number.isFinite(id) && !map.has(name)) map.set(name, id)
  }
  const jsonRe2 = /"id"\s*:\s*(\d+)[^}]{0,200}?"name"\s*:\s*"([^"]+)"/gi
  for (const m of norm.matchAll(jsonRe2)) {
    const id = parseInt(m[1], 10)
    const name = m[2].replace(/\\u([0-9a-f]{4})/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    if (name && Number.isFinite(id) && !map.has(name)) map.set(name, id)
  }
  return map
}

/** Coords from sidebar list: "11 Poledňany\n(197|−26)" */
export function parseVillageCoordsFromPaste(text) {
  const norm = normalize(text)
  /** @type {Map<string, {x:number,y:number}>} */
  const map = new Map()
  // Name must be on one line (no newlines inside), then coords on next line
  const re =
    /(?:^|\n)\s*(\d{2}[^\n(]*?[^\s\n])\s*\n\s*\(\s*(-?\d+)\s*[|]\s*(-?\d+)\s*\)/g
  for (const m of norm.matchAll(re)) {
    const name = m[1].replace(/\s+/g, ' ').trim()
    // skip bare group labels like "00" / "04"
    if (/^\d{2}$/.test(name)) continue
    const x = parseInt(m[2], 10)
    const y = parseInt(m[3], 10)
    if (name && Number.isFinite(x) && Number.isFinite(y)) map.set(name, { x, y })
  }
  // same-line variant
  const re2 =
    /(\d{2}\s+[^\n(]+?)\s*\(\s*(-?\d+)\s*[|]\s*(-?\d+)\s*\)/g
  for (const m of norm.matchAll(re2)) {
    const name = m[1].replace(/\s+/g, ' ').trim()
    if (/^\d{2}$/.test(name) || map.has(name)) continue
    const x = parseInt(m[2], 10)
    const y = parseInt(m[3], 10)
    if (name && Number.isFinite(x) && Number.isFinite(y)) map.set(name, { x, y })
  }
  return map
}

/**
 * Row pattern:
 * 11 Poledňany  15%  43%  23%  462:16:41  33%  − 4:48:09
 */
function parseResourceRows(norm) {
  const rows = []
  const re =
    /(?:^|\n)\s*(\d{2}\s+[^\n\t%]+?)\s+(\d+)\s*%\s+(\d+)\s*%\s+(\d+)\s*%\s+(-?\s*\d+:\d{2}:\d{2})\s+(\d+)\s*%\s+(-?\s*\d+:\d{2}:\d{2})/g
  for (const m of norm.matchAll(re)) {
    const name = m[1].replace(/\s+/g, ' ').trim()
    rows.push({
      name,
      lumberPct: parseInt(m[2], 10),
      clayPct: parseInt(m[3], 10),
      ironPct: parseInt(m[4], 10),
      warehouseDuration: parseDuration(m[5]),
      cropPct: parseInt(m[6], 10),
      granaryDuration: parseDuration(m[7]),
    })
  }
  return rows
}

/**
 * @typedef {{ name: string, id: number|null, coords: {x:number,y:number}|null, lumberPct: number, clayPct: number, ironPct: number, cropPct: number, warehouseDuration: ReturnType<typeof parseDuration>, granaryDuration: ReturnType<typeof parseDuration>, cropDeficit: boolean }} WarehouseVillage
 */

/**
 * @param {string} text
 * @returns {{ villages: WarehouseVillage[], serverBase: string, notes: string[] } | null}
 */
export function parseWarehouseOverviewPaste(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return null
  const norm = normalize(raw)
  const notes = []

  const rows = parseResourceRows(norm)
  if (!rows.length) {
    notes.push('No warehouse rows found. Open Village overview → Resources, expand all villages, Ctrl+A / Ctrl+C.')
    return { villages: [], serverBase: parseServerBaseFromPaste(raw), notes }
  }

  const coordsMap = parseVillageCoordsFromPaste(norm)
  const idMap = parseVillageIdsFromHtml(raw)
  const serverBase = parseServerBaseFromPaste(raw)

  if (idMap.size === 0) {
    notes.push(
      'Village IDs not found in paste — marketplace links open the send tab without switching village. Paste page source (Ctrl+U) for direct village links.',
    )
  }

  /** @type {WarehouseVillage[]} */
  const villages = rows.map((r) => {
    const coords = coordsMap.get(r.name) ?? null
    let id = idMap.get(r.name) ?? null
    if (id == null) {
      // fuzzy: id map keys may differ slightly
      for (const [n, vid] of idMap) {
        if (n.replace(/\s/g, '').toLowerCase() === r.name.replace(/\s/g, '').toLowerCase()) {
          id = vid
          break
        }
      }
    }
    const cropDeficit = Boolean(r.granaryDuration?.negative)
    return {
      name: r.name,
      id,
      coords,
      lumberPct: r.lumberPct,
      clayPct: r.clayPct,
      ironPct: r.ironPct,
      cropPct: r.cropPct,
      warehouseDuration: r.warehouseDuration,
      granaryDuration: r.granaryDuration,
      cropDeficit,
    }
  })

  return { villages, serverBase, notes }
}

/** Suggest main villages: crop granary emptying (negative duration). */
export function suggestMainVillageNames(villages) {
  return villages.filter((v) => v.cropDeficit).map((v) => v.name)
}

/**
 * @param {'lumber'|'clay'|'iron'|'crop'} res
 * @param {WarehouseVillage} v
 */
export function pctOf(v, res) {
  if (res === 'lumber') return v.lumberPct
  if (res === 'clay') return v.clayPct
  if (res === 'iron') return v.ironPct
  return v.cropPct
}

/**
 * Red-flag cells for UI.
 * Main: crop < 40%. Feeder: any resource > 45%.
 * @param {WarehouseVillage} v
 * @param {boolean} isMain
 */
export function flaggedResources(v, isMain) {
  /** @type {Array<'lumber'|'clay'|'iron'|'crop'>} */
  const out = []
  if (isMain) {
    if (v.cropPct < MAIN_CROP_LOW_PCT) out.push('crop')
  } else {
    for (const r of /** @type {const} */ (['lumber', 'clay', 'iron', 'crop'])) {
      if (pctOf(v, r) > FEEDER_HIGH_PCT) out.push(r)
    }
  }
  return out
}

/**
 * Build send plan: squeeze feeders down to leavePct, push surplus to needy mains.
 * Amounts are in %-of-warehouse points (absolute stock unknown from overview paste).
 *
 * @param {WarehouseVillage[]} villages
 * @param {Set<string>} mainNames
 * @param {string} serverBase
 */
export function buildSendPlan(villages, mainNames, serverBase) {
  const mains = villages.filter((v) => mainNames.has(v.name))
  const feeders = villages.filter((v) => !mainNames.has(v.name))

  /** @type {Array<{
   *   from: string, to: string, resource: 'lumber'|'clay'|'iron'|'crop',
   *   fromPct: number, leavePct: number, sendPctPoints: number,
   *   toPct: number, reason: string, marketUrl: string, mapUrl: string|null
   * }>} */
  const transfers = []

  const resources = /** @type {const} */ (['crop', 'lumber', 'clay', 'iron'])

  for (const feeder of feeders) {
    for (const res of resources) {
      const fromPct = pctOf(feeder, res)
      if (fromPct <= FEEDER_HIGH_PCT) continue
      const leavePct = FEEDER_LEAVE_PCT
      const sendPctPoints = fromPct - leavePct
      if (sendPctPoints <= 0) continue

      // Prefer mains that need this resource most
      let candidates = mains
      if (res === 'crop') {
        candidates = mains
          .filter((m) => m.cropPct < MAIN_CROP_LOW_PCT)
          .sort((a, b) => a.cropPct - b.cropPct)
        if (!candidates.length) {
          candidates = [...mains].sort((a, b) => a.cropPct - b.cropPct)
        }
      } else {
        candidates = [...mains].sort((a, b) => pctOf(a, res) - pctOf(b, res))
      }
      if (!candidates.length) continue

      const to = candidates[0]
      const toPct = pctOf(to, res)
      const reason =
        res === 'crop'
          ? `Main ${to.name} crop at ${toPct}% (target ≥${MAIN_CROP_LOW_PCT}%). Squeeze feeder from ${fromPct}% → ${leavePct}%.`
          : `Feeder ${feeder.name} ${res} at ${fromPct}% (>${FEEDER_HIGH_PCT}%). Send to main ${to.name} (${toPct}%), leave ~${leavePct}%.`

      transfers.push({
        from: feeder.name,
        to: to.name,
        resource: res,
        fromPct,
        leavePct,
        sendPctPoints,
        toPct,
        reason,
        marketUrl: buildMarketplaceUrl(serverBase, feeder.id),
        mapUrl: feeder.coords
          ? buildMapUrl(serverBase, feeder.coords.x, feeder.coords.y)
          : null,
      })
    }
  }

  // Sort: crop first (feeding), then by send size desc
  transfers.sort((a, b) => {
    if (a.resource === 'crop' && b.resource !== 'crop') return -1
    if (b.resource === 'crop' && a.resource !== 'crop') return 1
    return b.sendPctPoints - a.sendPctPoints
  })

  return transfers
}

export function formatNum(n, locale = 'en') {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')
}
