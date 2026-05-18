/**
 * Parse Travian marketplace / village copy-paste (CZ, EN, DE, NL, LV, LT headers).
 * Focus: incoming deliveries (crop), granary stock & capacity, server time.
 */

import { parseCoordsInput } from './coordParse'

const INCOMING_MARKERS = [
  /Příchozí dodávky/i,
  /Incoming deliveries/i,
  /Eingehende Lieferungen/i,
  /Ankommende Lieferungen/i,
  /Inkomende leveringen/i,
  /Ienākošās piegādes/i,
  /Atvykstantys pristatymai/i,
]

/**
 * Travian link to expand a truncated incoming-delivery list. Extend this alternation when new
 * locales appear — one place instead of scattering language checks across the UI.
 */
export const SHOW_ALL_INCOMING_LINK_RE =
  /\b(?:Zobrazit\s+v(?:še|šetko)|Show\s+all|Alle\s+anzeigen|Toon\s+alles|Tout\s+afficher|Mostrar\s+todo|Vis\s+alle|Vis\s+mer|Rādīt\s+visu|Rodyti\s+viską|Näita\s+kõik|Zobacz\s+wszystko|Pokaż\s+wszystko)\b/i

/** True when paste includes incoming section and still shows a "show all" style link (list likely collapsed). */
export function pasteSignalsCollapsedIncomingList(text) {
  const nt = normalizeTravianText(text)
  if (!INCOMING_MARKERS.some((re) => re.test(nt))) return false
  return SHOW_ALL_INCOMING_LINK_RE.test(nt)
}

const OUTGOING_MARKERS = [
  /Odchozí dodávky/i,
  /Outgoing deliveries/i,
  /Ausgehende Lieferungen/i,
  /Uitgaande leveringen/i,
  /Izejošās piegādes/i,
  /Išvykstantys pristatymai/i,
]

const TRANSPORT_FROM_GENERIC = /^Transport\s+(?:z|from|von|van)\s+(.+?)\s*:\s*(.+)$/i
/** Latvian Legends: "Transportē no 08 Ostrava : Moula" */
const TRANSPORT_FROM_LV = /^Transportē\s+no\s+(.+?)\s*:\s*(.+)$/iu
/** Lithuanian: "Gabenama iš 08 Ostrava : Moula" */
const TRANSPORT_FROM_LT = /^Gabenama\s+iš\s+(.+?)\s*:\s*(.+)$/iu

/**
 * Return-trip block headers (2×/3×: first timed row = merchant heading back).
 * cs Návrat do · de Rückkehr nach · en Return to · nl Stuur terug naar · lv Atgriež uz · lt Grįžti į
 */
const RETURN_TO_PATTERNS = [
  /^Návrat\s+do\s+(.+?)\s*:\s*(.+)$/iu,
  /^Rückkehr\s+nach\s+(.+?)\s*:\s*(.+)$/iu,
  /^Return\s+to\s+(.+?)\s*:\s*(.+)$/iu,
  /^Stuur\s+terug\s+naar\s+(.+?)\s*:\s*(.+)$/iu,
  /^Atgriež\s+uz\s+(.+?)\s*:\s*(.+)$/iu,
  /^Grįžti\s+į\s+(.+?)\s*:\s*(.+)$/iu,
]

function matchTransportFrom(line) {
  const norm = normalizeTravianText(line).trim()
  let m = norm.match(TRANSPORT_FROM_GENERIC)
  if (m) return m
  m = norm.match(TRANSPORT_FROM_LV)
  if (m) return m
  m = norm.match(TRANSPORT_FROM_LT)
  return m || null
}

function matchReturnTo(line) {
  const norm = normalizeTravianText(line).trim()
  for (const re of RETURN_TO_PATTERNS) {
    const m = norm.match(re)
    if (m) return m
  }
  return null
}

/** @returns {{ kind: 'incoming'|'return', village: string, player: string }|null} */
function matchDeliveryHeader(line) {
  const ret = matchReturnTo(line)
  if (ret) {
    return { kind: 'return', village: ret[1].trim(), player: ret[2].trim() }
  }
  const inc = matchTransportFrom(line)
  if (inc) {
    return { kind: 'incoming', village: inc[1].trim(), player: inc[2].trim() }
  }
  return null
}

function isDeliveryHeaderLine(line) {
  return matchDeliveryHeader(line) != null
}

function isTransportFromLine(line) {
  return matchTransportFrom(line) != null
}

/**
 * Return blocks: skip legs without ETA; skip first leg that has ETA (ride back);
 * keep further legs (incoming to current village).
 */
function filterReturnTripLegs(legs) {
  let skippedFirstTimed = false
  const kept = []
  for (const L of legs) {
    const hasTime = L.min != null && Number.isFinite(L.min)
    if (!hasTime) continue
    if (!skippedFirstTimed) {
      skippedFirstTimed = true
      continue
    }
    kept.push(L)
  }
  return kept
}

/** CZ/EN/DE/NL / LV / LT arrival line formats */
const ARRIVAL_PATTERNS = [
  /(?:Za|in)\s+(\d{2}):(\d{2}):(\d{2})\s+(?:v|at|um|om)\s+(\d{1,2}):(\d{2})/i,
  /Pēc\s+(\d{2}):(\d{2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/iu,
  /Per\s+(\d{2}):(\d{2}):(\d{2})\s+atvyks\s+(\d{1,2}):(\d{2})/iu,
]

function matchArrivalLine(line) {
  const norm = normalizeTravianText(line)
  for (const re of ARRIVAL_PATTERNS) {
    const m = norm.match(re)
    if (m) return m
  }
  return null
}

function isArrivalLine(line) {
  return matchArrivalLine(line) != null
}

const SERVER_TIME =
  /(?:Čas serveru|Server time|Serverzeit|Servertijd|Servera laiks|Serverio laikas)\s*:?\s*(\d{1,2}):(\d{2}):(\d{2})/i

/** Strip Travian bidi / invisible chars and NBSP. */
export function normalizeTravianText(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u202A-\u202E\u200E\u200F\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[‭‬]/g, '')
    .replace(/−/g, '-')
}

/** Parenthesized coords: (-196|-33) with optional unicode minus. */
const COORDS_IN_PARENS = /\(\s*(-?\d+)\s*[|,;]\s*(-?\d+)\s*\)/

/** "15 200" / "‭68 093‬" → 15200 */
export function parseTravianNumber(raw) {
  if (raw == null) return null
  const cleaned = String(raw).replace(/[^\d-]/g, '')
  if (!cleaned) return null
  const n = parseInt(cleaned, 10)
  return Number.isFinite(n) ? n : null
}

export function parseServerTime(text) {
  const m = normalizeTravianText(text).match(SERVER_TIME)
  if (!m) return null
  return {
    hours: parseInt(m[1], 10),
    minutes: parseInt(m[2], 10),
    seconds: parseInt(m[3], 10),
    label: `${m[1].padStart(2, '0')}:${m[2]}:${m[3]}`,
  }
}

/** "Za … v …" / NL "In … om …" / LV "Pēc … - …" → minutes from now (ceil seconds).
 *
 * Uses only the **countdown** part (Za/In/Pēc … HH:MM:SS). The trailing wall-clock
 * (e.g. `v 01:00` / `at 1:00 am`) is often shown in **the player's browser timezone**, while
 * "Server time" in the paste is **game server time** — comparing the two misplaces deliveries
 * when those zones differ. Travian's countdown is authoritative for "how many minutes from now".
 */
export function parseArrivalMinutes(line, _serverTime = null) {
  const m = matchArrivalLine(line)
  if (!m) return null

  const hours = parseInt(m[1], 10)
  const minutes = parseInt(m[2], 10)
  const seconds = parseInt(m[3], 10)
  const durMin = hours * 60 + minutes + (seconds > 0 ? 1 : 0)

  return durMin
}

function sliceIncomingSection(text) {
  const norm = normalizeTravianText(text)
  let start = -1
  for (const re of INCOMING_MARKERS) {
    const i = norm.search(re)
    if (i !== -1 && (start === -1 || i < start)) start = i
  }
  if (start === -1) return ''

  let end = norm.length
  for (const re of OUTGOING_MARKERS) {
    const i = norm.search(re)
    if (i !== -1 && i > start && i < end) end = i
  }
  const expected =
    /Očekáváno celkem|Expected total|Gesamt erwartet|Erwartet gesamt|Verwachte aantal|Verwacht totaal|Paredzamā kopsumma|Viso laukiama/i
  const expIdx = norm.slice(start, end).search(expected)
  if (expIdx !== -1) {
    const afterSection = norm.slice(start + expIdx)
    let after = -1
    for (const re of OUTGOING_MARKERS) {
      const i = afterSection.search(re)
      if (i !== -1 && (after === -1 || i < after)) after = i
    }
    if (after !== -1 && start + expIdx + after < end) end = start + expIdx + after
  }

  return norm.slice(start, end)
}

function isMerchantLine(line) {
  return /^\s*\d+\s*[×x]/i.test(line)
}

/** e.g. "3×" / "2 x" → 3 (cap sanity) */
function parseMerchantMultiplier(line) {
  if (!line || !isMerchantLine(line)) return null
  const norm = normalizeTravianText(line).trim()
  const m = norm.match(/^(\d+)\s*[×x]/i)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(n, 99)
}

/** Read four consecutive resource integers; skip bidi-only lines handled by parseTravianNumber */
function tryReadResourceQuad(lines, startIdx) {
  const quad = []
  let j = startIdx
  while (j < lines.length && quad.length < 4) {
    if (isDeliveryHeaderLine(lines[j]) || isArrivalLine(lines[j])) break
    const n = parseTravianNumber(lines[j])
    if (n === null) break
    quad.push(n)
    j++
  }
  return quad.length === 4 ? { quad, nextIdx: j } : null
}

/** Lines that are only a formatted integer (resource bar / granary header). */
function isStandaloneNumberLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 28) return false
  const n = parseTravianNumber(trimmed)
  if (n == null || n < 100) return false
  return /^[\d\s‭‬.,]+$/.test(trimmed.replace(/[‭‬]/g, ''))
}

function findLastSendMarkerIndex(norm) {
  const sendMarkers = [
    /Poslat suroviny/i,
    /Send resources/i,
    /Rohstoffe senden/i,
    /Verschicken/i,
    /Stuur grondstoffen/i,
    /Sūtīt resursus/i,
    /Siųsti resursus/i,
  ]
  let start = -1
  for (const re of sendMarkers) {
    let idx = 0
    let m
    const r = new RegExp(re.source, 'gi')
    while ((m = r.exec(norm)) !== null) idx = m.index
    if (idx !== -1) start = Math.max(start, idx)
  }
  return start
}

/**
 * @returns {{ village: string, player: string, wood: number, clay: number, iron: number, crop: number, minutesFromNow: number|null, arrivalLabel: string|null, alreadyArrived?: boolean }[]}
 */
export function parseIncomingDeliveries(text, serverTime = null) {
  const section = sliceIncomingSection(text)
  if (!section) return []

  const lines = section.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const out = []
  let i = 0

  while (i < lines.length) {
    const header = matchDeliveryHeader(lines[i])
    if (!header) {
      i++
      continue
    }

    const { kind, village, player } = header
    i++

    let merchantMult = null
    if (i < lines.length && isMerchantLine(lines[i])) {
      merchantMult = parseMerchantMultiplier(lines[i])
      i++
    }

    /** @type {{ quad: number[], min: number|null, lab: string|null, arrived: boolean }[]} */
    const legs = []
    while (i < lines.length) {
      const r = tryReadResourceQuad(lines, i)
      if (!r) break
      i = r.nextIdx
      let min = null
      let lab = null
      if (i < lines.length && isArrivalLine(lines[i])) {
        lab = lines[i]
        min = parseArrivalMinutes(lines[i], serverTime)
        i++
      }
      legs.push({ quad: r.quad, min, lab, arrived: false })
      if (i < lines.length && isDeliveryHeaderLine(lines[i])) break
    }

    // One trailing "Za …" after all resource rows (no per-row timer in paste) — Travian 2×/3× shorthand
    if (i < lines.length && isArrivalLine(lines[i])) {
      const lab = lines[i]
      const min = parseArrivalMinutes(lines[i], serverTime)
      i++
      const q = legs.length
      const m = merchantMult ?? q
      if (min != null && Number.isFinite(min) && q >= 1) {
        if (q === 1) {
          legs[0].min = min
          legs[0].lab = lab
        } else if (q === 2 && (m === 2 || merchantMult == null)) {
          legs.forEach((L) => {
            L.min = min
            L.lab = lab
          })
        } else if (q >= 3 && m >= 3 && q === m) {
          legs[q - 1].min = min
          legs[q - 1].lab = lab
          for (let k = 0; k < q - 1; k++) legs[k].arrived = true
        } else {
          legs[q - 1].min = min
          legs[q - 1].lab = lab
        }
      }
    }

    if (!legs.length) continue

    let legsForModel = legs
    if (kind === 'return') {
      legsForModel = filterReturnTripLegs(legs)
    } else {
      // If multiple legs already have their own countdown, do not mark earlier legs as "arrived"
      const etaCount = legs.filter((L) => L.min != null && Number.isFinite(L.min)).length
      if (etaCount >= 2) {
        for (const L of legs) {
          if (L.arrived) L.arrived = false
        }
      }
    }

    for (const L of legsForModel) {
      out.push({
        village,
        player,
        wood: L.quad[0],
        clay: L.quad[1],
        iron: L.quad[2],
        crop: L.quad[3],
        minutesFromNow: L.min,
        arrivalLabel: L.lab,
        ...(L.arrived ? { alreadyArrived: true } : {}),
      })
    }
  }

  return out
}

/** EN paste often splits "0 / 48690" across lines — merge before parsing. */
function collapseSplitSlashPairs(text) {
  return text.replace(/(?:\r?\n)\s*\/\s*(?:\r?\n)/g, ' / ')
}

/** Marketplace send form: last "Send resources" → before incoming / delivery overview. */
function sliceSendResourcesBlock(text) {
  const norm = normalizeTravianText(text)
  const start = findLastSendMarkerIndex(norm)
  if (start === -1) return ''

  let end = norm.length
  for (const re of INCOMING_MARKERS) {
    const i = norm.search(re)
    if (i > start && i < end) end = i
  }
  for (const re of [
    /Delivery overview/i,
    /Přehled dodávek/i,
    /Lieferübersicht/i,
    /Leveringsoverzicht/i,
    /Piegāžu pārskats/i,
    /Pristatymo apžvalga/i,
  ]) {
    const i = norm.search(re)
    if (i > start && i < end) end = i
  }

  const tail = norm.slice(start, end)
  const merchantEnd = tail.search(/\n(?:Merchants|Handelaren|Händler|Tirgotāji|Prekeiviai)\s*:/iu)
  const totalEnd = tail.search(/\n(?:Total|Celkem|Gesamt|Totaal|Kopā|Viso)\s*:\s*\d/i)
  const cut =
    merchantEnd !== -1
      ? merchantEnd
      : totalEnd !== -1
        ? totalEnd
        : tail.length
  return tail.slice(0, cut)
}

/** Numbers from the top resource bar (around server time — EN paste often lists them just after). */
function parseResourceBarNumbers(text) {
  const norm = normalizeTravianText(text)
  const parts = norm.split(/Čas serveru|Server time|Serverzeit|Servertijd|Servera laiks|Serverio laikas/i)
  const head = parts[0] ?? ''
  const afterServer = (parts[1] ?? '').split('\n').slice(0, 12).join('\n')
  const scan = `${head}\n${afterServer}`
  const nums = []
  for (const line of scan.split('\n')) {
    if (isStandaloneNumberLine(line)) {
      const n = parseTravianNumber(line)
      if (n != null) nums.push(n)
    }
  }
  return nums
}

/**
 * Granary stock & capacity from Travian paste:
 * - Stock = right side of the 4th "0 / N" in the send-resources form (crop column).
 * - Capacity = standalone number on the line BEFORE stock in the top resource bar
 *   (e.g. 80 000 above 28 081), matching the in-game granary UI.
 */
function parseSlashPairsFromBlock(block) {
  const pairs = []
  for (const line of block.split('\n')) {
    const cleaned = line.trim().replace(/[‭‬]/g, '')
    const m = cleaned.match(/^(\d[\d\s,.]*)\s*\/\s*([\d\s,.]+)$/)
    if (m) pairs.push([m[1], m[2]])
  }
  if (pairs.length >= 4) return pairs
  return [...block.matchAll(/(\d[\d\s,.]*)\s*\/\s*([\d\s,.]+?)(?=\n|$)/g)].map((m) => [
    m[1],
    m[2],
  ])
}

function cropFromSlashPairs(pairs) {
  if (pairs.length < 4) return null
  const lastFour = pairs.slice(-4)
  const right = parseTravianNumber(lastFour[3][1])
  const left = parseTravianNumber(lastFour[3][0])
  if (right != null && right >= 500) return right
  if (left != null && left >= 500) return left
  return right ?? left
}

/** Match crop stock line in header bar — exact or within ~tick refresh lag vs send form */
function lookupGranaryCapacityFromHeaderNums(headerNums, currentCrop) {
  if (currentCrop == null) return null
  let idx = headerNums.lastIndexOf(currentCrop)
  if (idx < 0) {
    const tol = Math.max(200, Math.round(currentCrop * 0.004))
    idx = headerNums.findLastIndex((n) => Math.abs(n - currentCrop) <= tol)
  }
  if (idx > 0 && headerNums[idx - 1] >= currentCrop) return headerNums[idx - 1]
  return null
}

export function parseGranaryFromPaste(text) {
  const sendBlock = collapseSplitSlashPairs(sliceSendResourcesBlock(text))
  let blockPairs = parseSlashPairsFromBlock(sendBlock)
  let currentCrop = cropFromSlashPairs(blockPairs)

  const headerNums = parseResourceBarNumbers(text)
  let capacity = lookupGranaryCapacityFromHeaderNums(headerNums, currentCrop)

  if (currentCrop == null && headerNums.length >= 2) {
    for (let i = headerNums.length - 1; i > 0; i--) {
      const stock = headerNums[i]
      const cap = headerNums[i - 1]
      if (stock >= 500 && cap >= stock && cap <= stock * 4) {
        currentCrop = stock
        capacity = cap
        break
      }
    }
  }

  if (currentCrop == null) {
    const wide = collapseSplitSlashPairs(
      normalizeTravianText(text).slice(findLastSendMarkerIndex(normalizeTravianText(text))),
    )
    blockPairs = parseSlashPairsFromBlock(wide.slice(0, 2500))
    currentCrop = cropFromSlashPairs(blockPairs)
    if (currentCrop != null && capacity == null)
      capacity = lookupGranaryCapacityFromHeaderNums(headerNums, currentCrop)
  }

  return { currentCrop, capacity }
}

const DEFAULT_SERVER_BASE = 'https://ts10.x1.europe.travian.com'

/** Try to read server host from paste (rare); alliance default otherwise. */
export function parseServerBaseFromPaste(text) {
  const norm = normalizeTravianText(text)
  const m = norm.match(/https?:\/\/([a-z0-9.-]+\.travian\.com)/i)
    ?? norm.match(/\b(ts\d+\.[a-z0-9.-]+\.travian\.com)\b/i)
  if (m) return `https://${m[1].replace(/^https?:\/\//i, '')}`
  return DEFAULT_SERVER_BASE
}

export function buildMapUrl(serverBase, x, y) {
  if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) return null
  const base = (serverBase || DEFAULT_SERVER_BASE).replace(/\/$/, '')
  return `${base}/karte.php?x=${x}&y=${y}`
}

/** Compare village names (case / diacritics insensitive). */
export function villageNamesMatch(a, b) {
  const fold = (s) =>
    normalizeTravianText(s)
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  if (!a || !b) return false
  const fa = fold(a)
  const fb = fold(b)
  return fa === fb || fa.replace(/\s/g, '') === fb.replace(/\s/g, '')
}

/**
 * All villages from sidebar list: "00 Vysočany (-196 | -33)".
 * @returns {{ name: string, x: number, y: number }[]}
 */
export function parseVillageListFromPaste(text) {
  const norm = normalizeTravianText(text)
  const villages = []
  const seen = new Set()

  const push = (name, x, y) => {
    const key = `${name}|${x}|${y}`
    if (seen.has(key)) return
    seen.add(key)
    villages.push({ name: name.trim(), x, y })
  }

  const inlineRe = /(?:^|\n)(\d{2}\s+[^\n(]+?)\s*\(\s*(-?\d+)\s*[|,;]\s*(-?\d+)\s*\)/gim
  let m
  while ((m = inlineRe.exec(norm)) !== null) {
    push(m[1], parseInt(m[2], 10), parseInt(m[3], 10))
  }

  const lines = norm.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const villageLineRe = /^(\d{2}\s+.+)$/
  for (let i = 0; i < lines.length; i++) {
    const vm = lines[i].match(villageLineRe)
    if (!vm) continue
    const name = vm[1].trim()
    const onSame = name.match(/^(\d{2}\s+.+?)\s*\(\s*(-?\d+)\s*[|,;]\s*(-?\d+)\s*\)$/)
    if (onSame) {
      push(onSame[1], parseInt(onSame[2], 10), parseInt(onSame[3], 10))
      continue
    }
    if (i + 1 < lines.length) {
      const cm = lines[i + 1].match(COORDS_IN_PARENS)
      if (cm) push(name, parseInt(cm[1], 10), parseInt(cm[2], 10))
    }
  }

  return villages
}

/** Match current village name against the VESNICE list in the same paste. */
export function lookupCoordsInVillageList(villageName, text) {
  if (!villageName) return null
  const list = parseVillageListFromPaste(text)
  if (!list.length) return null

  const exact = list.find((v) => villageNamesMatch(v.name, villageName))
  if (exact) return { x: exact.x, y: exact.y }

  const num = villageName.match(/^(\d{2})/)
  if (num) {
    const prefixed = list.filter((v) => v.name.trimStart().startsWith(num[1]))
    if (prefixed.length === 1) return { x: prefixed[0].x, y: prefixed[0].y }
  }

  return null
}

/** Coordinates: village list lookup first, then coords on next line after name. */
export function parseVillageCoords(text, villageName) {
  const norm = normalizeTravianText(text)

  if (villageName) {
    const fromList = lookupCoordsInVillageList(villageName, text)
    if (fromList) return fromList

    const esc = villageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(
      `${esc}[\\s\\S]{0,120}?\\(?\\s*(-?\\d+)\\s*[|,;]\\s*(-?\\d+)\\s*\\)?`,
      'i',
    )
    const m = norm.match(re)
    if (m) return { x: parseInt(m[1], 10), y: parseInt(m[2], 10) }
  }

  return null
}

const POPULATION_FOOTER_RE =
  /(?:Obyvatelé|Population|Einwohner|Inwoners|Populācija|Gyventojų skaičius)\s*:+/i

const VILLAGE_NAME_LINE_RE = /^(\d{2}\s+\S.+)$/

/** Lines in the footer block immediately before population / loyalty stats. */
function linesBeforePopulationFooter(norm) {
  const foot = norm.slice(-4500)
  const m = foot.match(POPULATION_FOOTER_RE)
  if (!m || m.index == null) return []
  return foot
    .slice(0, m.index)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Village name from paste footer, e.g. "Moula" + "00 Vysočany" or LT "Mateushas" + "02 Juodžiai". */
export function parseVillageNameFromPaste(text) {
  const norm = normalizeTravianText(text)

  const classic = norm.match(
    /(?:^|\n)([^\n:]+)\n(\d{2}\s+[^\n]+)\n(?:Obyvatelé|Population|Einwohner|Inwoners|Populācija|Gyventojų skaičius)\s*:+/im,
  )
  if (classic) {
    const village = (classic[2] ?? '').trim()
    if (village && VILLAGE_NAME_LINE_RE.test(village)) return village
  }

  const beforePop = linesBeforePopulationFooter(norm)
  for (let i = beforePop.length - 1; i >= 0; i--) {
    const m = beforePop[i].match(VILLAGE_NAME_LINE_RE)
    if (m) return m[1].trim()
  }

  return null
}

/** True when footer has population stats but no "02 Name" line before them (blank row in UI). */
export function isVillageNameMissingFromFooter(text) {
  if (!POPULATION_FOOTER_RE.test(normalizeTravianText(text))) return false
  if (parseVillageNameFromPaste(text)) return false
  const beforePop = linesBeforePopulationFooter(normalizeTravianText(text))
  return beforePop.length > 0
}

export function villageListKey(v) {
  return `${v.name}|${v.x}|${v.y}`
}

export function parseVillageFromPaste(text) {
  const name = parseVillageNameFromPaste(text)
  const coords = name ? parseVillageCoords(text, name) : null
  const serverBase = parseServerBaseFromPaste(text)
  const mapUrl = coords ? buildMapUrl(serverBase, coords.x, coords.y) : null
  return { name, coords, serverBase, mapUrl }
}

export function parseMarketplacePaste(text) {
  const serverTime = parseServerTime(text)
  const granary = parseGranaryFromPaste(text)
  const incoming = parseIncomingDeliveries(text, serverTime)
  const village = parseVillageFromPaste(text)
  const villageList = parseVillageListFromPaste(text)
  const villageNameMissing = isVillageNameMissingFromFooter(text)

  return {
    serverTime,
    currentCrop: granary.currentCrop,
    granaryCapacity: granary.capacity,
    incoming,
    villageName: village.name,
    villageCoords: village.coords,
    serverBase: village.serverBase,
    mapUrl: village.mapUrl,
    villageList,
    villageNameMissing,
  }
}
