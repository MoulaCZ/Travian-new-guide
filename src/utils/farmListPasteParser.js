/**
 * Parse Travian Rally Point → Farm List page paste (Ctrl+A on tt=99).
 * Loot data lives in embedded viewData JSON inside Travian.React.FarmList.render(...).
 */

import {
  formatCropNum,
  formatCropSignedNum,
  getCropFarmStrings,
  normalizeCropFarmLocale,
} from '../i18n/cropFarmSimulator.js'
import { TRIBE_UNIT_COLUMNS, getUnitLabel } from '../data/travelUnits.js'
import { buildMapUrl, parseServerBaseFromPaste } from './cropPasteParser.js'

/** Travian viewData tribeId → travelUnits tribe key */
const TRIBE_ID_TO_KEY = { 1: 'roman', 2: 'teuton', 3: 'gaul' }

const FARM_LIST_PAGE_RE =
  /FarmList\.render|farmLists|rallyPointFarmList|Pillages|Listes de pillage|listes de pillage/i

/** @param {string} html */
function extractJsonObjectAfterMarker(html, marker) {
  const idx = html.indexOf(marker)
  if (idx < 0) return null

  const start = html.indexOf('{', idx + marker.length)
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return html.slice(start, i + 1)
    }
  }
  return null
}

/** @param {Record<string, number>} a @param {Record<string, number>} b */
function addResources(a, b) {
  return {
    lumber: (a.lumber || 0) + (b.lumber || 0),
    clay: (a.clay || 0) + (b.clay || 0),
    iron: (a.iron || 0) + (b.iron || 0),
    crop: (a.crop || 0) + (b.crop || 0),
  }
}

/** @param {Record<string, number>} r @param {number} factor */
function scaleResources(r, factor) {
  return {
    lumber: Math.round((r.lumber || 0) * factor),
    clay: Math.round((r.clay || 0) * factor),
    iron: Math.round((r.iron || 0) * factor),
    crop: Math.round((r.crop || 0) * factor),
  }
}

const EMPTY_RESOURCES = { lumber: 0, clay: 0, iron: 0, crop: 0 }

/**
 * Farm list slot.troop uses t1–t10 matching TRIBE_UNIT_COLUMNS order (same as Travian API).
 * @param {Record<string, number>|null|undefined} troop
 * @param {number|null} tribeId — 1 Roman, 2 Teuton, 3 Gaul
 * @param {import('../i18n/cropFarmSimulator.js').CropFarmLocale} [locale='en']
 */
export function formatTroopShort(troop, tribeId, locale = 'en') {
  if (!troop) return '—'
  const tribe = TRIBE_ID_TO_KEY[tribeId] ?? 'teuton'
  const columns = TRIBE_UNIT_COLUMNS[tribe]
  const loc = normalizeCropFarmLocale(locale)
  const parts = []
  for (let i = 1; i <= 10; i++) {
    const n = troop[`t${i}`] ?? 0
    if (n <= 0) continue
    const unitId = columns[i - 1]
    if (!unitId || unitId === 'hero') continue
    parts.push(`${n}× ${getUnitLabel(tribe, unitId, loc)}`)
  }
  return parts.length ? parts.join(', ') : '—'
}

/** @param {{ name?: string, type?: number }} target */
export function isNatarTarget(target) {
  if (!target) return false
  const name = String(target.name ?? '')
  return /natar/i.test(name)
}

/**
 * @param {{ intervalMinutes: number, startHour: number, endHour: number }} schedule
 */
export function projectFarmLoot(totals, schedule) {
  const { intervalMinutes, startHour, endHour } = schedule
  const activeHours = Math.max(0, endHour - startHour)
  const activeMinutes = activeHours * 60
  const raidsPerDay =
    intervalMinutes > 0 && activeMinutes > 0
      ? Math.floor(activeMinutes / intervalMinutes)
      : 0
  const raidsPerActiveHour = intervalMinutes > 0 ? 60 / intervalMinutes : 0

  return {
    activeHours,
    raidsPerDay,
    raidsPerActiveHour,
    perClick: { ...totals },
    perHour: scaleResources(totals, raidsPerActiveHour),
    perDay: scaleResources(totals, raidsPerDay),
  }
}

/** Signed crop/h from prefix and digits-only input */
export function cropBalancePerHour(sign, digitsRaw) {
  const digits = String(digitsRaw ?? '').replace(/\D/g, '')
  if (!digits) return NaN
  const n = parseInt(digits, 10)
  if (!Number.isFinite(n)) return NaN
  return sign === '-' ? -n : n
}

/** Non-negative crop/h from digits-only input (empty → 0) */
export function tradeRoutesPerHour(digitsRaw) {
  const digits = String(digitsRaw ?? '').replace(/\D/g, '')
  if (!digits) return 0
  const n = parseInt(digits, 10)
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {import('./farmListPasteParser').FarmListSlotSummary[]} slots
 */
function aggregateSlots(slots) {
  let totals = { ...EMPTY_RESOURCES }
  for (const slot of slots) {
    if (!slot.raidedResources) continue
    totals = addResources(totals, slot.raidedResources)
  }
  return totals
}

/**
 * @param {import('./farmListPasteParser').FarmListSummary[]} farmLists
 * @param {Set<number>} selectedListIds
 */
export function aggregateSelectedLists(farmLists, selectedListIds) {
  let totals = { ...EMPTY_RESOURCES }
  /** @type {import('./farmListPasteParser').FarmListSlotSummary[]} */
  const slots = []
  for (const list of farmLists) {
    if (!selectedListIds.has(list.id)) continue
    totals = addResources(totals, list.perRaidTotals)
    slots.push(...list.slots)
  }
  return { totals, slots }
}

/**
 * @param {import('./farmListPasteParser').FarmListSlotSummary} slot
 */
export function analyzeSlotEfficiency(slot) {
  if (!slot.raidedResources || !slot.bootyMax || slot.bootyMax <= 0) {
    return { utilization: null, stolenTotal: null, recommendation: null }
  }
  const stolenTotal = resourceTotal(slot.raidedResources)
  const utilization = stolenTotal / slot.bootyMax
  let recommendation = null
  if (utilization >= 0.95) recommendation = 'increase'
  else if (utilization < 0.5) recommendation = 'decrease'
  return { utilization, stolenTotal, recommendation }
}

/**
 * Sort priority (descending): capped raids first, then big over-trooping, then small targets.
 * @param {{ recommendation: string, utilization: number|null, bootyMax: number|null, stolenTotal: number|null }} rec
 */
export function getRecommendationPriority(rec) {
  const bootyMax = rec.bootyMax ?? 0
  const stolen = rec.stolenTotal ?? 0
  const util = rec.utilization ?? 0
  const waste = Math.max(0, bootyMax - stolen)

  if (rec.recommendation === 'increase') {
    // Tier 3: capped — highest priority (100% raids, add troops)
    return 3_000_000 + util * 100_000 + bootyMax
  }

  if (rec.recommendation === 'decrease') {
    // Tier 2: large carry, tiny loot (e.g. 1100 max, 30 stolen) — free troops
    if (bootyMax > 350) {
      return 2_000_000 + waste * 100 + bootyMax
    }
    // Tier 1: already near minimum practical troops (e.g. 220 max, 2×110) — low impact
    return 1_000_000 + waste
  }

  return 0
}

/**
 * @param {import('./farmListPasteParser').FarmListSlotSummary[]} slots
 * @param {import('../i18n/cropFarmSimulator.js').CropFarmLocale} [locale='en']
 * @param {string|null} [serverBase=null]
 */
export function buildSlotRecommendations(slots, locale = 'en', serverBase = null) {
  const loc = normalizeCropFarmLocale(locale)
  const t = getCropFarmStrings(loc)
  return slots
    .map((slot) => {
      const { utilization, stolenTotal, recommendation } = analyzeSlotEfficiency(slot)
      if (!recommendation) return null
      const coords =
        slot.coords != null ? `(${slot.coords.x}|${slot.coords.y})` : ''
      const utilPct = utilization != null ? Math.round(utilization * 100) : null
      const stolen = formatNum(stolenTotal, loc)
      const max = formatNum(slot.bootyMax, loc)
      const message =
        recommendation === 'increase'
          ? t.recIncrease(utilPct, stolen, max)
          : t.recDecrease(utilPct, stolen, max)
      const item = {
        slotId: slot.id,
        targetName: slot.targetName,
        coords,
        slotCoords: slot.coords,
        mapUrl:
          slot.coords != null
            ? buildMapUrl(serverBase, slot.coords.x, slot.coords.y)
            : null,
        isNatar: slot.isNatar,
        troopLabel: slot.troopLabel,
        utilization,
        utilPct,
        bootyMax: slot.bootyMax,
        stolenTotal,
        wastedCapacity: Math.max(0, (slot.bootyMax ?? 0) - (stolenTotal ?? 0)),
        recommendation,
        message,
        natarWarning:
          slot.isNatar && recommendation === 'decrease' ? t.natarWarning : null,
      }
      return item
    })
    .filter(Boolean)
    .sort((a, b) => getRecommendationPriority(b) - getRecommendationPriority(a))
}

/**
 * @param {number} cropBalancePerHour — village net crop/h (negative = deficit)
 * @param {import('./farmListPasteParser').FarmListSummary[]} farmLists
 * @param {Set<number>} selectedListIds
 * @param {{ intervalMinutes: number, startHour: number, endHour: number }} schedule
 * @param {number} [tradeRoutesCropPerHour=0] — incoming crop/h from automated trade routes
 */
export function computeFeedingBalance(
  cropBalancePerHour,
  farmLists,
  selectedListIds,
  schedule,
  tradeRoutesCropPerHour = 0,
) {
  if (!Number.isFinite(cropBalancePerHour)) {
    return { ok: false, reason: 'missing_balance' }
  }

  const tradeRoutes = Math.max(0, tradeRoutesCropPerHour || 0)
  const baseCropPerHour = cropBalancePerHour + tradeRoutes

  const { totals, slots } = aggregateSelectedLists(farmLists, selectedListIds)
  const projection = projectFarmLoot(totals, schedule)

  const raidCropPerActiveHour = projection.perHour.crop
  const raidCropPerDay = projection.perDay.crop
  const netActiveHour = baseCropPerHour + raidCropPerActiveHour
  const netDay = baseCropPerHour * 24 + raidCropPerDay

  const slotsWithCrop = slots.filter((s) => s.raidedResources && s.raidedResources.crop > 0)
  const avgCropPerSlotPerClick =
    slotsWithCrop.length > 0
      ? slotsWithCrop.reduce((sum, s) => sum + (s.raidedResources?.crop ?? 0), 0) /
        slotsWithCrop.length
      : 0

  const gapActiveHour = Math.max(0, -netActiveHour)
  const gapDay = Math.max(0, -netDay)

  const cropPerClickFromNewSlot = avgCropPerSlotPerClick
  const cropPerDayFromNewSlot =
    cropPerClickFromNewSlot * projection.raidsPerDay
  const cropPerActiveHourFromNewSlot =
    cropPerClickFromNewSlot * projection.raidsPerActiveHour

  const extraSlotsForDay =
    cropPerDayFromNewSlot > 0 ? Math.ceil(gapDay / cropPerDayFromNewSlot) : null
  const extraSlotsForActiveHour =
    cropPerActiveHourFromNewSlot > 0
      ? Math.ceil(gapActiveHour / cropPerActiveHourFromNewSlot)
      : null

  const dailyBurn = baseCropPerHour < 0 ? Math.abs(baseCropPerHour) * 24 : 0
  const feedingCoveragePct =
    baseCropPerHour < 0 && dailyBurn > 0 ? (raidCropPerDay / dailyBurn) * 100 : null

  return {
    ok: true,
    cropBalancePerHour,
    tradeRoutesPerHour: tradeRoutes,
    baseCropPerHour,
    dailyBurn,
    feedingCoveragePct,
    cropPerClick: totals.crop,
    raidCropPerActiveHour,
    raidCropPerDay,
    netActiveHour,
    netDay,
    activeHours: projection.activeHours,
    raidsPerDay: projection.raidsPerDay,
    selectedListCount: selectedListIds.size,
    selectedSlotCount: slots.length,
    avgCropPerSlotPerClick,
    gapActiveHour,
    gapDay,
    extraSlotsForDay,
    extraSlotsForActiveHour,
    activeHourOk: netActiveHour >= 0,
    dayOk: netDay >= 0,
  }
}

/** Try to read crop balance from stock bar script on same paste */
export function parseCropBalanceFromPaste(text) {
  const m = text.match(/production:\s*\{[^}]*"l4"\s*:\s*(-?\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (!Number.isFinite(n)) return null
  return {
    sign: n < 0 ? '-' : '+',
    digits: String(Math.abs(n)),
    value: n,
  }
}

/**
 * @typedef {{ lumber: number, clay: number, iron: number, crop: number }} RaidedResources
 * @typedef {{ t1: number, t2: number, t3: number, t4: number, t5: number, t6: number, t7: number, t8: number, t9: number, t10: number }} TroopCounts
 * @typedef {{ id: number, targetName: string, coords: { x: number, y: number }|null, targetType: number|null, isNatar: boolean, distance: number, isActive: boolean, troop: TroopCounts|null, troopLabel: string, raidedResources: RaidedResources|null, bootyMax: number|null, lastRaidTime: number|null }} FarmListSlotSummary
 * @typedef {{ id: number, name: string, ownerVillageId: number|null, ownerVillageName: string|null, slotsAmount: number, runningRaidsAmount: number, isExpanded: boolean, slotsWithLoot: number, slotsMissingLoot: number, perRaidTotals: RaidedResources, slots: FarmListSlotSummary[] }} FarmListSummary
 * @typedef {{ id: number, name: string }} VillageSummary
 * @typedef {{ timestamp: number|null, tribeId: number|null, currentVillageId: number|null, serverBase: string, villages: VillageSummary[], farmLists: FarmListSummary[], grandTotals: RaidedResources, cropBalanceFromPaste: ReturnType<typeof parseCropBalanceFromPaste>, notes: string[] }} FarmListParseResult
 */

/**
 * @param {string} text
 * @param {import('../i18n/cropFarmSimulator.js').CropFarmLocale} [locale='en']
 * @returns {FarmListParseResult|null}
 */
export function parseFarmListPaste(text, locale = 'en') {
  const raw = String(text ?? '').trim()
  if (!raw) return null

  const loc = normalizeCropFarmLocale(locale)
  const t = getCropFarmStrings(loc)
  const notes = []

  if (!FARM_LIST_PAGE_RE.test(raw)) {
    notes.push(t.parserNotes.notFarmList)
  }

  const viewDataJson =
    extractJsonObjectAfterMarker(raw, 'viewData:') ??
    extractJsonObjectAfterMarker(raw, '"viewData":')

  const cropBalanceFromPaste = parseCropBalanceFromPaste(raw)
  const serverBase = parseServerBaseFromPaste(raw)

  if (!viewDataJson) {
    notes.push(t.parserNotes.noViewData)
    return {
      timestamp: null,
      tribeId: null,
      currentVillageId: null,
      serverBase,
      villages: [],
      farmLists: [],
      grandTotals: { ...EMPTY_RESOURCES },
      cropBalanceFromPaste,
      notes,
    }
  }

  let viewData
  try {
    viewData = JSON.parse(viewDataJson)
  } catch {
    notes.push(t.parserNotes.invalidViewData)
    return {
      timestamp: null,
      tribeId: null,
      currentVillageId: null,
      serverBase,
      villages: [],
      farmLists: [],
      grandTotals: { ...EMPTY_RESOURCES },
      cropBalanceFromPaste,
      notes,
    }
  }

  const timestamp = viewData.bootstrapData?.timestamp ?? null
  const tribeId = viewData.ownPlayer?.village?.tribeId ?? null
  const currentVillageId = viewData.ownPlayer?.village?.id ?? null
  const villages = (viewData.ownPlayer?.villages ?? []).map((v) => ({
    id: v.id,
    name: v.name,
  }))
  const villageById = new Map(villages.map((v) => [v.id, v.name]))

  /** @type {FarmListSummary[]} */
  const farmLists = (viewData.ownPlayer?.farmLists ?? []).map((list) => {
    const ownerVillageId = list.ownerVillage?.id ?? null
    const ownerVillageName = ownerVillageId != null ? villageById.get(ownerVillageId) ?? null : null

    /** @type {FarmListSlotSummary[]} */
    const slots = (list.slots ?? []).map((slot) => {
      const troop = slot.troop ? { ...slot.troop } : null
      const target = slot.target ?? null
      return {
        id: slot.id,
        targetName: target?.name ?? '—',
        coords:
          target && Number.isFinite(target.x) && Number.isFinite(target.y)
            ? { x: target.x, y: target.y }
            : null,
        targetType: target?.type ?? null,
        isNatar: isNatarTarget(target),
        distance: slot.distance ?? null,
        isActive: Boolean(slot.isActive),
        troop,
        troopLabel: formatTroopShort(troop, tribeId, loc),
        raidedResources: slot.lastRaid?.raidedResources
          ? { ...slot.lastRaid.raidedResources }
          : null,
        bootyMax: slot.lastRaid?.bootyMax ?? null,
        lastRaidTime: slot.lastRaid?.time ?? null,
      }
    })

    const slotsWithLoot = slots.filter((s) => s.raidedResources).length
    const configuredSlots = list.slotsAmount ?? list.slotsStates?.length ?? slots.length
    const slotsMissingLoot = Math.max(0, configuredSlots - slotsWithLoot)

    if (!list.isExpanded && configuredSlots > 0) {
      notes.push(t.parserNotes.listCollapsed(list.name))
    } else if (list.isExpanded && slotsMissingLoot > 0) {
      notes.push(t.parserNotes.slotsMissingLoot(list.name, slotsMissingLoot))
    }

    const perRaidTotals = aggregateSlots(slots)

    return {
      id: list.id,
      name: list.name,
      ownerVillageId,
      ownerVillageName,
      slotsAmount: configuredSlots,
      runningRaidsAmount: list.runningRaidsAmount ?? 0,
      isExpanded: Boolean(list.isExpanded),
      slotsWithLoot,
      slotsMissingLoot,
      perRaidTotals,
      slots,
    }
  })

  let grandTotals = { ...EMPTY_RESOURCES }
  for (const list of farmLists) {
    grandTotals = addResources(grandTotals, list.perRaidTotals)
  }

  if (!farmLists.length) {
    notes.push(t.parserNotes.noLists)
  }

  return {
    timestamp,
    tribeId,
    currentVillageId,
    serverBase,
    villages,
    farmLists,
    grandTotals,
    cropBalanceFromPaste,
    notes: [...new Set(notes)],
  }
}

/** @param {number} n @param {import('../i18n/cropFarmSimulator.js').CropFarmLocale} [locale='en'] */
export function formatNum(n, locale = 'en') {
  return formatCropNum(n, normalizeCropFarmLocale(locale))
}

/** @param {number} n @param {import('../i18n/cropFarmSimulator.js').CropFarmLocale} [locale='en'] */
export function formatSignedNum(n, locale = 'en') {
  return formatCropSignedNum(n, normalizeCropFarmLocale(locale))
}

export function resourceTotal(r) {
  return (r.lumber || 0) + (r.clay || 0) + (r.iron || 0) + (r.crop || 0)
}

export function formatPercent(fraction) {
  if (fraction == null || !Number.isFinite(fraction)) return '—'
  return `${Math.round(fraction * 100)}%`
}
