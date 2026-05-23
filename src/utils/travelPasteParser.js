/**
 * Parse Travian Legends "Village overview → Units → Own units" paste.
 * Column order is tribe-specific (see travelUnits.js); header labels are ignored.
 */

import { parseVillageListFromPaste } from './cropPasteParser.js'
import { TRIBE_UNIT_COLUMNS } from '../data/travelUnits.js'

const VILLAGE_HEADER_RE = /^(?:Vesnice|Village|Dorf|Wioska|Aldeia|Dorp|Ciudad|Köy|Selo)\b/i
const SUM_ROW_RE = /^(?:Součet|Sum|Total|Gesamt|Somme|Totaal)\b/i
const VILLAGE_ROW_RE = /^(\d{2}\s+.+)$/

function normalizePasteText(text) {
  return String(text ?? '')
    .replace(/[\u202A-\u202E\u200E\u200F\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/−/g, '-')
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

/**
 * @param {string} text
 * @param {'roman'|'teuton'|'gaul'} tribe
 */
export function parseOwnUnitsPaste(text, tribe) {
  const norm = normalizePasteText(text)
  const notes = []
  const unitIds = TRIBE_UNIT_COLUMNS[tribe]
  if (!unitIds) {
    return { villages: [], notes: ['Unknown tribe.'], villageList: [] }
  }

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

  if (headerIdx < 0) {
    return {
      villages: [],
      notes: ['Unit table not found — paste Village overview → Units → Own units (full Ctrl+A).'],
      villageList: parseVillageListFromPaste(text),
    }
  }

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
      const raw = cells[colOffset + c]
      counts[unitIds[c]] = parseTravianCount(raw)
    }

    villages.push({
      name: vm[1].trim(),
      counts,
    })
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
  }

  if (!villages.length) {
    notes.push('No village rows parsed — expand the unit table and copy again.')
  }

  return { villages, notes, villageList }
}
