/**
 * Parse Travian Rally Point → Farm List page paste (Ctrl+A on tt=99).
 * Loot data lives in embedded viewData JSON inside Travian.React.FarmList.render(...).
 */

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

const TEUTON_SHORT = ['', 'Leg', 'Praet', 'Imp', 'EL', 'EI', 'EC', 'Ram', 'Cat', 'Sen', 'Set']
const GAUL_SHORT = ['', 'P', 'S', 'Path', 'TT', 'Druid', 'Hae', 'Ram', 'Tre', 'Chieft', 'Set']
const ROMAN_SHORT = ['', 'Leg', 'Praet', 'Imp', 'EL', 'EI', 'EC', 'Ram', 'Cat', 'Sen', 'Set']

/** @param {number|null} tribeId */
function unitShortNames(tribeId) {
  if (tribeId === 2) return TEUTON_SHORT
  if (tribeId === 3) return GAUL_SHORT
  return ROMAN_SHORT
}

/** @param {Record<string, number>|null|undefined} troop @param {number|null} tribeId */
export function formatTroopShort(troop, tribeId) {
  if (!troop) return '—'
  const names = unitShortNames(tribeId)
  const parts = []
  for (let i = 1; i <= 10; i++) {
    const n = troop[`t${i}`] ?? 0
    if (n > 0) parts.push(`${n}× ${names[i] || `T${i}`}`)
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
 * @param {import('./farmListPasteParser').FarmListSlotSummary[]} slots
 */
export function buildSlotRecommendations(slots) {
  return slots
    .map((slot) => {
      const { utilization, stolenTotal, recommendation } = analyzeSlotEfficiency(slot)
      if (!recommendation) return null
      const coords =
        slot.coords != null ? `(${slot.coords.x}|${slot.coords.y})` : ''
      const utilPct = utilization != null ? Math.round(utilization * 100) : null
      let message = ''
      if (recommendation === 'increase') {
        message = `Raid capped at ${utilPct}% capacity (${formatNum(stolenTotal)}/${formatNum(slot.bootyMax)}) — increase troops.`
      } else {
        message = `Only ${utilPct}% of carry used (${formatNum(stolenTotal)}/${formatNum(slot.bootyMax)}) — consider fewer troops.`
      }
      return {
        slotId: slot.id,
        targetName: slot.targetName,
        coords,
        isNatar: slot.isNatar,
        troopLabel: slot.troopLabel,
        utilization,
        utilPct,
        bootyMax: slot.bootyMax,
        stolenTotal,
        recommendation,
        message,
        natarWarning:
          slot.isNatar && recommendation === 'decrease'
            ? 'Natars can build walls/residence — lowering troops may cause losses.'
            : null,
      }
    })
    .filter(Boolean)
}

/**
 * @param {number} cropBalancePerHour — village net crop/h (negative = deficit)
 * @param {import('./farmListPasteParser').FarmListSummary[]} farmLists
 * @param {Set<number>} selectedListIds
 * @param {{ intervalMinutes: number, startHour: number, endHour: number }} schedule
 */
export function computeFeedingBalance(cropBalancePerHour, farmLists, selectedListIds, schedule) {
  if (!Number.isFinite(cropBalancePerHour)) {
    return { ok: false, reason: 'missing_balance' }
  }

  const { totals, slots } = aggregateSelectedLists(farmLists, selectedListIds)
  const projection = projectFarmLoot(totals, schedule)

  const raidCropPerActiveHour = projection.perHour.crop
  const raidCropPerDay = projection.perDay.crop
  const netActiveHour = cropBalancePerHour + raidCropPerActiveHour
  const netDay = cropBalancePerHour * 24 + raidCropPerDay

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

  return {
    ok: true,
    cropBalancePerHour,
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
 * @typedef {{ timestamp: number|null, tribeId: number|null, currentVillageId: number|null, villages: VillageSummary[], farmLists: FarmListSummary[], grandTotals: RaidedResources, cropBalanceFromPaste: ReturnType<typeof parseCropBalanceFromPaste>, notes: string[] }} FarmListParseResult
 */

/**
 * @param {string} text
 * @returns {FarmListParseResult|null}
 */
export function parseFarmListPaste(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return null

  const notes = []

  if (!/FarmList\.render|farmLists|rallyPointFarmList/i.test(raw)) {
    notes.push('Paste does not look like a Farm List page (Rally Point → Farm List tab).')
  }

  const viewDataJson =
    extractJsonObjectAfterMarker(raw, 'viewData:') ??
    extractJsonObjectAfterMarker(raw, '"viewData":')

  const cropBalanceFromPaste = parseCropBalanceFromPaste(raw)

  if (!viewDataJson) {
    notes.push('Could not find viewData JSON in the paste. Open Farm List (tt=99), expand all lists, View page source (Ctrl+U), then Ctrl+A and paste.')
    return {
      timestamp: null,
      tribeId: null,
      currentVillageId: null,
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
    notes.push('viewData JSON is truncated or invalid — try copying the page again.')
    return {
      timestamp: null,
      tribeId: null,
      currentVillageId: null,
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
        troopLabel: formatTroopShort(troop, tribeId),
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
      notes.push(`"${list.name}" is collapsed — expand it on Travian and re-paste to include per-village loot.`)
    } else if (list.isExpanded && slotsMissingLoot > 0) {
      notes.push(`"${list.name}": ${slotsMissingLoot} slot(s) have no last-raid loot in the paste.`)
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
    notes.push('No farm lists found in viewData.')
  }

  return {
    timestamp,
    tribeId,
    currentVillageId,
    villages,
    farmLists,
    grandTotals,
    cropBalanceFromPaste,
    notes: [...new Set(notes)],
  }
}

export function formatNum(n) {
  if (!Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('en-US')
}

export function formatSignedNum(n) {
  if (!Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${formatNum(n)}`
}

export function resourceTotal(r) {
  return (r.lumber || 0) + (r.clay || 0) + (r.iron || 0) + (r.crop || 0)
}

export function formatPercent(fraction) {
  if (fraction == null || !Number.isFinite(fraction)) return '—'
  return `${Math.round(fraction * 100)}%`
}
