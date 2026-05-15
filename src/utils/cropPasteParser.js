/**
 * Parse Travian marketplace / village copy-paste (CZ, EN, DE, NL headers).
 * Focus: incoming deliveries (crop), granary stock & capacity, server time.
 */

import { parseCoordsInput } from './coordParse'

const INCOMING_MARKERS = [
  /Příchozí dodávky/i,
  /Incoming deliveries/i,
  /Eingehende Lieferungen/i,
  /Ankommende Lieferungen/i,
  /Inkomende leveringen/i,
]

const OUTGOING_MARKERS = [
  /Odchozí dodávky/i,
  /Outgoing deliveries/i,
  /Ausgehende Lieferungen/i,
  /Uitgaande leveringen/i,
]

const TRANSPORT_FROM = /^Transport\s+(?:z|from|von|van)\s+(.+?)\s*:\s*(.+)$/i

const ARRIVAL_LINE =
  /(?:Za|in)\s+(\d{2}):(\d{2}):(\d{2})\s+(?:v|at|um|om)\s+(\d{1,2}):(\d{2})/i

const SERVER_TIME =
  /(?:Čas serveru|Server time|Serverzeit|Servertijd)\s*:?\s*(\d{1,2}):(\d{2}):(\d{2})/i

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

/** "Za 00:04:38 v 07:58" → minutes from now (ceil seconds). */
export function parseArrivalMinutes(line, serverTime) {
  const m = normalizeTravianText(line).match(ARRIVAL_LINE)
  if (!m) return null

  const durMin =
    parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + (parseInt(m[3], 10) > 0 ? 1 : 0)

  if (serverTime) {
    const arrH = parseInt(m[4], 10)
    const arrM = parseInt(m[5], 10)
    const nowSec = serverTime.hours * 3600 + serverTime.minutes * 60 + serverTime.seconds
    let arrSec = arrH * 3600 + arrM * 60
    if (arrSec < nowSec - 12 * 3600) arrSec += 24 * 3600
    const diffSec = arrSec - nowSec
    if (diffSec >= 0) return Math.ceil(diffSec / 60)
  }

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
    /Očekáváno celkem|Expected total|Gesamt erwartet|Erwartet gesamt|Verwachte aantal|Verwacht totaal/i
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
 * @returns {{ village: string, player: string, wood: number, clay: number, iron: number, crop: number, minutesFromNow: number|null, arrivalLabel: string|null }[]}
 */
export function parseIncomingDeliveries(text, serverTime = null) {
  const section = sliceIncomingSection(text)
  if (!section) return []

  const lines = section.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const out = []
  let i = 0

  while (i < lines.length) {
    const tm = lines[i].match(TRANSPORT_FROM)
    if (!tm) {
      i++
      continue
    }

    const village = tm[1].trim()
    const player = tm[2].trim()
    i++

    if (i < lines.length && isMerchantLine(lines[i])) i++

    const resources = []
    while (i < lines.length && resources.length < 4) {
      if (TRANSPORT_FROM.test(lines[i]) || ARRIVAL_LINE.test(lines[i])) break
      const n = parseTravianNumber(lines[i])
      if (n === null) break
      resources.push(n)
      i++
    }

    let arrivalLabel = null
    let minutesFromNow = null
    if (i < lines.length && ARRIVAL_LINE.test(lines[i])) {
      arrivalLabel = lines[i]
      minutesFromNow = parseArrivalMinutes(lines[i], serverTime)
      i++
    }

    if (resources.length >= 4) {
      out.push({
        village,
        player,
        wood: resources[0],
        clay: resources[1],
        iron: resources[2],
        crop: resources[3],
        minutesFromNow,
        arrivalLabel,
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
  ]) {
    const i = norm.search(re)
    if (i > start && i < end) end = i
  }

  const tail = norm.slice(start, end)
  const merchantEnd = tail.search(/\n(?:Merchants|Handelaren|Händler)\s*:/iu)
  const totalEnd = tail.search(/\n(?:Total|Celkem|Gesamt|Totaal)\s*:\s*\d/i)
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
  const parts = norm.split(/Čas serveru|Server time|Serverzeit|Servertijd/i)
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

  return parseCoordsInput(norm)
}

/** Village name from paste footer, e.g. "Moula" + "00 Vysočany". */
export function parseVillageNameFromPaste(text) {
  const norm = normalizeTravianText(text)
  const m = norm.match(
    /(?:^|\n)([^\n:]+)\n(\d{2}\s+[^\n]+)\n(?:Obyvatelé|Population|Einwohner|Inwoners)\b/im,
  )
  if (!m) return null
  const village = (m[2] ?? '').trim()
  return village || null
}

export function parseVillageFromPaste(text) {
  const name = parseVillageNameFromPaste(text)
  const coords = parseVillageCoords(text, name)
  const serverBase = parseServerBaseFromPaste(text)
  const mapUrl = coords ? buildMapUrl(serverBase, coords.x, coords.y) : null
  return { name, coords, serverBase, mapUrl }
}

export function parseMarketplacePaste(text) {
  const serverTime = parseServerTime(text)
  const granary = parseGranaryFromPaste(text)
  const incoming = parseIncomingDeliveries(text, serverTime)
  const village = parseVillageFromPaste(text)

  return {
    serverTime,
    currentCrop: granary.currentCrop,
    granaryCapacity: granary.capacity,
    incoming,
    villageName: village.name,
    villageCoords: village.coords,
    serverBase: village.serverBase,
    mapUrl: village.mapUrl,
  }
}
