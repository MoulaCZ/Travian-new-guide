/**
 * Parse Travian Village overview → Resources → Warehouse paste.
 * Prefer Ctrl+U HTML (#warehouse table): village id + absolute stock/capacity.
 * Falls back to visible-text % rows when HTML is missing.
 */

export const MAIN_CROP_LOW_PCT = 40
export const FEEDER_HIGH_PCT = 45
export const FEEDER_LEAVE_PCT = 15

const REGION_HOST = {
  europe: 'x1.europe.travian.com',
  america: 'x1.america.travian.com',
  asia: 'x1.asia.travian.com',
  arabics: 'x1.arabics.travian.com',
}

function buildMapUrl(serverBase, x, y) {
  if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) return null
  const base = (serverBase || '').replace(/\/$/, '')
  if (!base) return null
  return `${base}/karte.php?x=${x}&y=${y}`
}

function normalize(text) {
  return String(text ?? '')
    .replace(/\u202d|\u202c|\u200e|\u200f/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
}

function decodeHtmlEntities(s) {
  return String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&minus;/gi, '-')
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\u202d|\u202c|\u200e|\u200f/g, '')
}

/**
 * @param {string} s
 * @returns {{ hours: number, minutes: number, seconds: number, totalSeconds: number, negative: boolean, raw: string } | null}
 */
export function parseDuration(s) {
  const t = String(s ?? '').trim()
  if (!t || t === '—') return null
  const neg = /^-|−|–/.test(t) || /crit/.test(t)
  const m = t.replace(/^[-−–\s]+/, '').match(/(\d+):(\d{2}):(\d{2})/)
  if (!m) return null
  const hours = parseInt(m[1], 10)
  const minutes = parseInt(m[2], 10)
  const seconds = parseInt(m[3], 10)
  return {
    hours,
    minutes,
    seconds,
    totalSeconds: hours * 3600 + minutes * 60 + seconds,
    negative: neg,
    raw: t,
  }
}

export function formatDuration(d) {
  if (!d) return '—'
  const sign = d.negative ? '−' : ''
  const h = d.hours
  const mm = String(d.minutes).padStart(2, '0')
  const ss = String(d.seconds).padStart(2, '0')
  return `${sign}${h}:${mm}:${ss}`
}

/**
 * Marketplace "Send resources" tab.
 * Use gid=17 (marketplace) — do NOT hardcode building slot id=23 (differs per village).
 * @param {string} serverBase
 * @param {number|null|undefined} villageId
 */
export function buildMarketplaceUrl(serverBase, villageId) {
  const base = (serverBase || '').replace(/\/$/, '')
  if (!base) return ''
  if (villageId != null && Number.isFinite(Number(villageId))) {
    return `${base}/build.php?newdid=${villageId}&gid=17&t=5`
  }
  return `${base}/build.php?gid=17&t=5`
}

export function parseServerBaseFromPaste(text) {
  const raw = String(text ?? '')
  const title = raw.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i)
  if (title) {
    const t = title[1].trim()
    const m = t.match(/^(Europe|America|Asia|Arabics)\s+(\d+)\b/i)
    if (m) {
      const region = m[1].toLowerCase()
      const n = m[2]
      const host = REGION_HOST[region]
      if (host) return `https://ts${n}.${host}`
    }
  }
  const mAbs = raw.match(/https?:\/\/((?:ts|www)\d*\.[a-z0-9.-]*travian\.com)/i)
  if (mAbs) {
    const host = mAbs[1].toLowerCase()
    if (!host.includes('cdn.') && !host.includes('gpack')) return `https://${host}`
  }
  return ''
}

function parseStockTitle(titleAttr) {
  const t = decodeHtmlEntities(titleAttr || '')
  const m = t.replace(/[^\d/]/g, '').match(/(\d+)\s*\/\s*(\d+)/)
  if (!m) return null
  const stock = parseInt(m[1], 10)
  const capacity = parseInt(m[2], 10)
  if (!capacity) return null
  return {
    stock,
    capacity,
    pct: Math.round((100 * stock) / capacity),
  }
}

function parseTimerFromCell(html) {
  const crit = /class=["'][^"']*\bcrit\b/i.test(html) || /class=["']crit["']/i.test(html)
  const val = html.match(/counting=["']down["'][^>]*value=["'](\d+)["']/i)
    || html.match(/value=["'](\d+)["'][^>]*counting=["']down["']/i)
  const text = html.match(/>(\d+:\d{2}:\d{2})</)
  if (val) {
    const totalSeconds = parseInt(val[1], 10)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return {
      hours,
      minutes,
      seconds,
      totalSeconds,
      negative: crit,
      raw: text ? `${crit ? '−' : ''}${text[1]}` : String(totalSeconds),
    }
  }
  if (text) return parseDuration(`${crit ? '-' : ''}${text[1]}`)
  return null
}

/**
 * Parse #warehouse HTML table rows (Ctrl+U source).
 * @param {string} html
 */
function parseWarehouseTableHtml(html) {
  const raw = String(html ?? '')
  const tableMatch = raw.match(/<table[^>]*\bid=["']warehouse["'][^>]*>([\s\S]*?)<\/table>/i)
  const chunk = tableMatch ? tableMatch[1] : raw
  if (!/<td[^>]*class=["'][^"']*\bvil\b/i.test(chunk) && !/dorf1\.php\?newdid=/i.test(chunk)) {
    return []
  }

  const rows = []
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let tr
  while ((tr = trRe.exec(chunk)) !== null) {
    const row = tr[1]
    if (!/dorf1\.php\?newdid=/i.test(row) && !/class=["'][^"']*\bvil\b/i.test(row)) continue

    const link = row.match(
      /<a[^>]+href=["'][^"']*dorf1\.php\?newdid=(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
    )
    if (!link) continue
    const id = parseInt(link[1], 10)
    const name = decodeHtmlEntities(link[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
    if (!name) continue

    const lum = row.match(/<td[^>]*class=["'][^"']*\blum\b[^"']*["'][^>]*title=["']([^"']*)["'][^>]*>/i)
    const clay = row.match(/<td[^>]*class=["'][^"']*\bclay\b[^"']*["'][^>]*title=["']([^"']*)["'][^>]*>/i)
    const iron = row.match(/<td[^>]*class=["'][^"']*\biron\b[^"']*["'][^>]*title=["']([^"']*)["'][^>]*>/i)
    const crop = row.match(/<td[^>]*class=["'][^"']*\bcrop\b[^"']*["'][^>]*title=["']([^"']*)["'][^>]*>/i)

    const s1 = parseStockTitle(lum?.[1])
    const s2 = parseStockTitle(clay?.[1])
    const s3 = parseStockTitle(iron?.[1])
    const s4 = parseStockTitle(crop?.[1])

    // Warehouse / granary duration cells
    const max123 = row.match(/<td[^>]*class=["'][^"']*\bmax123\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)
    const max4 = row.match(/<td[^>]*class=["'][^"']*\bmax4\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)

    rows.push({
      name,
      id,
      lumberPct: s1?.pct ?? 0,
      clayPct: s2?.pct ?? 0,
      ironPct: s3?.pct ?? 0,
      cropPct: s4?.pct ?? 0,
      lumberStock: s1?.stock ?? null,
      clayStock: s2?.stock ?? null,
      ironStock: s3?.stock ?? null,
      cropStock: s4?.stock ?? null,
      warehouseCap: s1?.capacity ?? s2?.capacity ?? s3?.capacity ?? null,
      granaryCap: s4?.capacity ?? null,
      warehouseDuration: parseTimerFromCell(max123?.[1] ?? ''),
      granaryDuration: parseTimerFromCell(max4?.[1] ?? ''),
    })
  }
  return rows
}

/** Visible-text fallback (no HTML). */
function parseResourceRowsText(norm) {
  const rows = []
  const re =
    /(?:^|\n)\s*(\d{2}\s+[^\n\t%]+?)\s+(\d+)\s*%\s+(\d+)\s*%\s+(\d+)\s*%\s+(-?\s*\d+:\d{2}:\d{2})\s+(\d+)\s*%\s+(-?\s*\d+:\d{2}:\d{2})/g
  for (const m of norm.matchAll(re)) {
    const name = m[1].replace(/\s+/g, ' ').trim()
    rows.push({
      name,
      id: null,
      lumberPct: parseInt(m[2], 10),
      clayPct: parseInt(m[3], 10),
      ironPct: parseInt(m[4], 10),
      warehouseDuration: parseDuration(m[5]),
      cropPct: parseInt(m[6], 10),
      granaryDuration: parseDuration(m[7]),
      lumberStock: null,
      clayStock: null,
      ironStock: null,
      cropStock: null,
      warehouseCap: null,
      granaryCap: null,
    })
  }
  return rows
}

/**
 * Coords + ids from React viewData JSON embedded in page source.
 * @param {string} raw
 * @returns {{ coords: Map<string,{x:number,y:number}>, ids: Map<string,number> }}
 */
function parseViewDataVillages(raw) {
  /** @type {Map<string, {x:number,y:number}>} */
  const coords = new Map()
  /** @type {Map<string, number>} */
  const ids = new Map()
  // Compact objects in villageList: {"id":78592,"name":"11 Poledňany",..."x":197,"y":-26}
  const re =
    /\{\s*"id"\s*:\s*(\d+)\s*,\s*"name"\s*:\s*"((?:\\.|[^"\\])*)"\s*,[\s\S]{0,400}?"x"\s*:\s*(-?\d+)\s*,\s*"y"\s*:\s*(-?\d+)/g
  for (const m of String(raw).matchAll(re)) {
    const id = parseInt(m[1], 10)
    const name = decodeHtmlEntities(m[2].replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )).replace(/\s+/g, ' ').trim()
    const x = parseInt(m[3], 10)
    const y = parseInt(m[4], 10)
    if (!name || !/^\d{2}\s/.test(name)) continue
    ids.set(name, id)
    if (Number.isFinite(x) && Number.isFinite(y)) coords.set(name, { x, y })
  }
  return { coords, ids }
}

function parseVillageCoordsFromPaste(norm) {
  /** @type {Map<string, {x:number,y:number}>} */
  const map = new Map()
  const re =
    /(\d{2}\s+[^\n(]+?)\s+\((-?\d+)\s*\|\s*(-?\d+)\)/g
  for (const m of norm.matchAll(re)) {
    const name = m[1].replace(/\s+/g, ' ').trim()
    map.set(name, { x: parseInt(m[2], 10), y: parseInt(m[3], 10) })
  }
  return map
}

function resolveId(name, idMap) {
  if (idMap.has(name)) return idMap.get(name)
  const key = name.replace(/\s/g, '').toLowerCase()
  for (const [n, vid] of idMap) {
    if (n.replace(/\s/g, '').toLowerCase() === key) return vid
  }
  return null
}

/**
 * @typedef {{
 *   name: string, id: number|null, coords: {x:number,y:number}|null,
 *   lumberPct: number, clayPct: number, ironPct: number, cropPct: number,
 *   lumberStock: number|null, clayStock: number|null, ironStock: number|null, cropStock: number|null,
 *   warehouseCap: number|null, granaryCap: number|null,
 *   warehouseDuration: ReturnType<typeof parseDuration>,
 *   granaryDuration: ReturnType<typeof parseDuration>,
 *   cropDeficit: boolean
 * }} WarehouseVillage
 */

/**
 * @param {string} text
 * @returns {{ villages: WarehouseVillage[], serverBase: string, notes: string[], fromHtml: boolean } | null}
 */
export function parseWarehouseOverviewPaste(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return null
  const norm = normalize(raw)
  const notes = []
  const serverBase = parseServerBaseFromPaste(raw)

  let rows = parseWarehouseTableHtml(raw)
  let fromHtml = rows.length > 0

  if (!rows.length) {
    rows = parseResourceRowsText(norm)
    fromHtml = false
  }

  if (!rows.length) {
    notes.push(
      'No warehouse rows found. Open Village overview → Resources → Warehouse, then paste Ctrl+U page source (best) or visible table.',
    )
    return { villages: [], serverBase, notes, fromHtml: false }
  }

  const coordsMap = parseVillageCoordsFromPaste(norm)
  const fromView = parseViewDataVillages(raw)
  for (const [n, c] of fromView.coords) {
    if (!coordsMap.has(n)) coordsMap.set(n, c)
  }

  // Extra ids from sidebar / viewData if HTML table missed some
  /** @type {Map<string, number>} */
  const idMap = new Map(fromView.ids)
  for (const r of rows) {
    if (r.id != null) idMap.set(r.name, r.id)
  }
  for (const m of raw.matchAll(/data-did=["'](\d+)["'][^>]*>\s*([^<]+?)\s*</gi)) {
    const id = parseInt(m[1], 10)
    const name = decodeHtmlEntities(m[2]).replace(/\s+/g, ' ').trim()
    if (name && /^\d{2}\s/.test(name) && !idMap.has(name)) idMap.set(name, id)
  }

  if (![...idMap.values()].some(Boolean) && !fromHtml) {
    notes.push('Village IDs missing — paste Ctrl+U (page source) so Market links include newdid=.')
  } else if (fromHtml) {
    notes.push('Parsed warehouse HTML: village IDs + absolute stock/capacity.')
  }

  /** @type {WarehouseVillage[]} */
  const villages = rows.map((r) => {
    const id = r.id ?? resolveId(r.name, idMap)
    const coords = coordsMap.get(r.name) ?? null
    const cropDeficit = Boolean(r.granaryDuration?.negative)
    return {
      name: r.name,
      id,
      coords,
      lumberPct: r.lumberPct,
      clayPct: r.clayPct,
      ironPct: r.ironPct,
      cropPct: r.cropPct,
      lumberStock: r.lumberStock ?? null,
      clayStock: r.clayStock ?? null,
      ironStock: r.ironStock ?? null,
      cropStock: r.cropStock ?? null,
      warehouseCap: r.warehouseCap ?? null,
      granaryCap: r.granaryCap ?? null,
      warehouseDuration: r.warehouseDuration,
      granaryDuration: r.granaryDuration,
      cropDeficit,
    }
  })

  return { villages, serverBase, notes, fromHtml }
}

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
 * @param {'lumber'|'clay'|'iron'|'crop'} res
 * @param {WarehouseVillage} v
 */
export function stockOf(v, res) {
  if (res === 'lumber') return v.lumberStock
  if (res === 'clay') return v.clayStock
  if (res === 'iron') return v.ironStock
  return v.cropStock
}

/**
 * @param {'lumber'|'clay'|'iron'|'crop'} res
 * @param {WarehouseVillage} v
 */
export function capacityOf(v, res) {
  if (res === 'crop') return v.granaryCap
  return v.warehouseCap
}

/**
 * Absolute amount to send so feeder ends near leavePct of capacity.
 * @param {WarehouseVillage} feeder
 * @param {'lumber'|'clay'|'iron'|'crop'} res
 * @param {number} leavePct
 */
export function computeSendAmount(feeder, res, leavePct = FEEDER_LEAVE_PCT) {
  const stock = stockOf(feeder, res)
  const cap = capacityOf(feeder, res)
  if (stock != null && cap != null && cap > 0) {
    const leaveAmount = Math.floor((cap * leavePct) / 100)
    return Math.max(0, stock - leaveAmount)
  }
  // %-point estimate when no absolute stock (text paste)
  const fromPct = pctOf(feeder, res)
  return Math.max(0, fromPct - leavePct)
}

/**
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
   *   sendAmount: number, amountIsAbsolute: boolean,
   *   toPct: number, reason: string, marketUrl: string, mapUrl: string|null,
   *   fromId: number|null
   * }>} */
  const transfers = []

  const resources = /** @type {const} */ (['crop', 'lumber', 'clay', 'iron'])

  for (const feeder of feeders) {
    for (const res of resources) {
      const fromPct = pctOf(feeder, res)
      if (fromPct <= FEEDER_HIGH_PCT) continue
      const leavePct = FEEDER_LEAVE_PCT
      const sendAmount = computeSendAmount(feeder, res, leavePct)
      const amountIsAbsolute = stockOf(feeder, res) != null && capacityOf(feeder, res) != null
      const sendPctPoints = fromPct - leavePct
      if (sendAmount <= 0 && sendPctPoints <= 0) continue

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
      const amountLabel = amountIsAbsolute
        ? `${Math.round(sendAmount).toLocaleString('en-US')} ${res}`
        : `~${sendPctPoints} %-points ${res}`
      const reason =
        res === 'crop'
          ? `Main ${to.name} crop at ${toPct}% (target ≥${MAIN_CROP_LOW_PCT}%). Send ${amountLabel} (${fromPct}% → ~${leavePct}%).`
          : `Feeder ${feeder.name} ${res} at ${fromPct}% (>${FEEDER_HIGH_PCT}%). Send ${amountLabel} to ${to.name} (${toPct}%).`

      transfers.push({
        from: feeder.name,
        to: to.name,
        resource: res,
        fromPct,
        leavePct,
        sendPctPoints,
        sendAmount: amountIsAbsolute ? sendAmount : sendPctPoints,
        amountIsAbsolute,
        toPct,
        reason,
        marketUrl: buildMarketplaceUrl(serverBase, feeder.id),
        mapUrl: feeder.coords
          ? buildMapUrl(serverBase, feeder.coords.x, feeder.coords.y)
          : null,
        fromId: feeder.id,
      })
    }
  }

  transfers.sort((a, b) => {
    if (a.resource === 'crop' && b.resource !== 'crop') return -1
    if (b.resource === 'crop' && a.resource !== 'crop') return 1
    const aKey = a.amountIsAbsolute ? a.sendAmount : a.sendPctPoints * 1000
    const bKey = b.amountIsAbsolute ? b.sendAmount : b.sendPctPoints * 1000
    return bKey - aKey
  })

  return transfers
}

export function formatNum(n, locale = 'en') {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')
}
