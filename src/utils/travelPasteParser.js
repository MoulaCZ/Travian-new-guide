/**
 * Travian Legends — paste parser for the village → Units screen.
 *
 * Supports BOTH paste sources, auto-detected:
 *  1. "Vlastní jednotky" (Own units) — single wide table, one row per village.
 *  2. "Jednotky ve vesnicích" (Units in villages) — per-village blocks with
 *     one or more unit tables (own + reinforcements from allies / captured nature).
 *
 * For source (2) we keep only the FIRST table whose header matches the selected
 * tribe — this skips reinforcement blocks from other tribes and captured animals.
 */

import { parseVillageListFromPaste } from './cropPasteParser.js'
import { TRIBE_UNIT_COLUMNS } from '../data/travelUnits.js'

const VILLAGE_HEADER_RE = /^(?:Vesnice|Village|Dorf|Wioska|Aldeia|Dorp|Ciudad|Köy|Selo)\b/i
const SUM_ROW_RE = /^(?:Součet|Sum|Total|Gesamt|Somme|Totaal)\b/i
const VILLAGE_ROW_RE = /^(\d{2}\s+.+)$/
const PER_HOUR_RE = /\b(?:na hodinu|per hour|pro Stunde|par heure|per uur|na godzinę|por hora|saatte|по часу)\b/i

/**
 * Tribe marker words (across locales) — used to detect which unit table inside
 * a per-village block belongs to the selected tribe. Lowercase, normalized.
 */
const TRIBE_MARKERS = {
  teuton: [
    // CZ
    'pálkař', 'oštěpař', 'sekerník', 'zvěd', 'rytíř', 'teuton jezdec', 'kmenový vůdce',
    // EN
    'clubswinger', 'spearman', 'axeman', 'scout', 'paladin', 'teutonic knight', 'chief',
    // DE
    'keulenschwinger', 'speerträger', 'axtkämpfer', 'späher', 'teutonen ritter', 'stammeshäuptling',
  ],
  roman: [
    // CZ
    'legionář', 'pretorián', 'imperián', 'equites legati', 'equites imperatoris',
    'equites caesaris', 'ohnivý katapult', 'senátor',
    // EN
    'legionnaire', 'praetorian', 'imperian', 'senator', 'fire catapult',
    // DE
    'legionär', 'prätorianer', 'imperianer', 'feuerkatapult',
  ],
  gaul: [
    // CZ
    'falanga', 'šermíř', 'slídič', 'theutates blesk', 'druid jezdec', 'haeduan',
    'válečný katapult', 'náčelník',
    // EN
    'phalanx', 'swordsman', 'pathfinder', 'theutates thunder', 'druidrider',
    'haeduan', 'chieftain', 'trebuchet',
    // DE
    'phalanx', 'schwertkämpfer', 'pfadfinder', 'druidenreiter', 'haeduaner',
    'häuptling', 'kriegskatapult',
  ],
}

function normalizePasteText(text) {
  return String(text ?? '')
    .replace(/[\u202A-\u202E\u200E\u200F\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/−/g, '-')
}

function normalizeCell(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFC')
    .trim()
}

/** Strip Travian bidi / thin-space number formatting. */
export function parseTravianCount(raw) {
  const s = String(raw ?? '')
    .replace(/[\u202A-\u202E\u200E\u200F\uFEFF‭‬]/g, '')
    .replace(/\s/g, '')
    .trim()
  if (!s || s === '-' || s === '—') return 0
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function splitRow(line) {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
  return line.split(/\s{2,}/).map((c) => c.trim())
}

function headerMatchesTribe(cells, tribe) {
  const markers = TRIBE_MARKERS[tribe] ?? []
  if (!markers.length) return false
  const cellSet = new Set(cells.map(normalizeCell))
  for (const m of markers) {
    if (cellSet.has(normalizeCell(m))) return true
  }
  return false
}

function isAllNumeric(cells, minCols) {
  if (cells.length < minCols) return false
  let nonZeroSeen = false
  for (let i = 0; i < minCols; i++) {
    const c = String(cells[i] ?? '').trim()
    if (c === '' || c === '-' || c === '—') {
      continue
    }
    if (!/^[\d\s\u202A-\u202E\u200E\u200F\uFEFF‭‬,.\-]+$/.test(c)) return false
    nonZeroSeen = true
  }
  return nonZeroSeen
}

/* -------------------------------------------------------------------------- */
/* Format 1: "Vlastní jednotky" – single wide table                            */
/* -------------------------------------------------------------------------- */

function parseOwnUnitsFormat(text, tribe, unitIds) {
  const norm = normalizePasteText(text)
  const lines = norm.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  let headerIdx = -1
  let colOffset = 0

  for (let i = 0; i < lines.length; i++) {
    const cells = splitRow(lines[i])
    if (cells.length < unitIds.length + 1) continue
    if (!VILLAGE_HEADER_RE.test(cells[0])) continue
    headerIdx = i
    colOffset = 1
    break
  }

  if (headerIdx < 0) return null

  const villages = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitRow(lines[i])
    const label = cells[0] ?? ''
    if (SUM_ROW_RE.test(label)) break
    if (/^\d$/.test(label)) continue
    const vm = label.match(VILLAGE_ROW_RE)
    if (!vm) continue

    const counts = {}
    for (let c = 0; c < unitIds.length; c++) {
      counts[unitIds[c]] = parseTravianCount(cells[colOffset + c])
    }
    villages.push({ name: vm[1].trim(), counts })
  }
  return villages
}

/* -------------------------------------------------------------------------- */
/* Format 2: "Jednotky ve vesnicích" – per-village blocks                      */
/* -------------------------------------------------------------------------- */

function parseInVillagesFormat(text, tribe, unitIds) {
  const norm = normalizePasteText(text)
  const lines = norm.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)

  /** Indexes of plausible village-name lines that head a unit block. */
  const villageStarts = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(VILLAGE_ROW_RE)
    if (!m) continue
    // Village names never contain a tab — guard against numeric rows like "24\t9833\t..." matching.
    if (line.includes('\t')) continue
    // Exclude village list entries: those have the coord parens on same or next line.
    if (/\(\s*-?\d+\s*[|,;]\s*-?\d+\s*\)/.test(line)) continue
    const next = lines[i + 1] ?? ''
    if (/^\(\s*-?\d+\s*[|,;]\s*-?\d+\s*\)/.test(next)) continue
    // Must be followed within a few lines by something tab-shaped or unit-headerish.
    const lookahead = lines.slice(i + 1, i + 4).join(' ')
    if (!/\t/.test(lines[i + 1] ?? '') && !/Hrdina|Hero|Held/i.test(lookahead)) continue
    villageStarts.push(i)
  }

  if (!villageStarts.length) return null

  const villages = []
  for (let s = 0; s < villageStarts.length; s++) {
    const startIdx = villageStarts[s]
    const endIdx = s + 1 < villageStarts.length ? villageStarts[s + 1] : lines.length
    const name = lines[startIdx].match(VILLAGE_ROW_RE)[1].trim()

    // Walk this block, find header → counts pairs.
    let counts = null
    for (let j = startIdx + 1; j < endIdx - 1; j++) {
      const headerCells = splitRow(lines[j])
      if (headerCells.length < unitIds.length) continue
      if (!headerMatchesTribe(headerCells, tribe)) continue
      const countsCells = splitRow(lines[j + 1])
      if (!isAllNumeric(countsCells, unitIds.length)) continue
      counts = {}
      for (let c = 0; c < unitIds.length; c++) {
        counts[unitIds[c]] = parseTravianCount(countsCells[c])
      }
      break // first matching tribe block wins
    }

    if (counts) {
      villages.push({ name, counts })
    } else {
      // Village exists but no matching tribe table → push empty counts so user sees it.
      const zeros = {}
      for (const id of unitIds) zeros[id] = 0
      villages.push({ name, counts: zeros, noTribeMatch: true })
    }
  }

  return villages
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * @param {string} text
 * @param {'roman'|'teuton'|'gaul'} tribe
 */
export function parseOwnUnitsPaste(text, tribe) {
  const notes = []
  const unitIds = TRIBE_UNIT_COLUMNS[tribe]
  if (!unitIds) {
    return { villages: [], notes: ['Unknown tribe.'], villageList: [] }
  }

  // Try the per-village block format first; fall back to the wide-table format.
  let villages = parseInVillagesFormat(text, tribe, unitIds)
  let usedFormat = 'in-villages'
  if (!villages || !villages.length) {
    villages = parseOwnUnitsFormat(text, tribe, unitIds)
    usedFormat = 'own-units'
  }

  if (!villages || !villages.length) {
    return {
      villages: [],
      notes: [
        'No unit data found. Paste either "Vlastní jednotky" (Own units) or "Jednotky ve vesnicích" (Units in villages) with Ctrl+A.',
      ],
      villageList: parseVillageListFromPaste(text),
    }
  }

  const villageList = parseVillageListFromPaste(text)
  const listByName = new Map(villageList.map((v) => [v.name.trim().toLowerCase(), v]))

  for (const v of villages) {
    const key = v.name.toLowerCase()
    const found = listByName.get(key)
    if (found) {
      v.coords = { x: found.x, y: found.y }
    } else {
      const num = v.name.match(/^(\d{2})/)
      if (num) {
        const candidates = villageList.filter((x) => x.name.trimStart().startsWith(num[1]))
        if (candidates.length === 1) {
          v.coords = { x: candidates[0].x, y: candidates[0].y }
        }
      }
    }
    if (!v.coords) {
      notes.push(`⚠️ No coordinates for ${v.name} — check footer village list in paste.`)
    }
    if (v.noTribeMatch) {
      notes.push(
        `ℹ️ ${v.name}: no ${tribe} unit table found in this village block (only reinforcements / nature?).`,
      )
      delete v.noTribeMatch
    }
  }

  if (usedFormat === 'in-villages') {
    notes.unshift(
      `Parsed ${villages.length} village${villages.length === 1 ? '' : 's'} from "Jednotky ve vesnicích".`,
    )
  }

  return { villages, notes, villageList }
}
