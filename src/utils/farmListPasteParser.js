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
 * @typedef {{ lumber: number, clay: number, iron: number, crop: number }} RaidedResources
 * @typedef {{ id: number, targetName: string, coords: { x: number, y: number }|null, distance: number, isActive: boolean, raidedResources: RaidedResources|null, lastRaidTime: number|null }} FarmListSlotSummary
 * @typedef {{ id: number, name: string, ownerVillageId: number|null, ownerVillageName: string|null, slotsAmount: number, runningRaidsAmount: number, isExpanded: boolean, slotsWithLoot: number, slotsMissingLoot: number, perRaidTotals: RaidedResources, slots: FarmListSlotSummary[] }} FarmListSummary
 * @typedef {{ timestamp: number|null, farmLists: FarmListSummary[], grandTotals: RaidedResources, notes: string[] }} FarmListParseResult
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

  if (!viewDataJson) {
    notes.push('Could not find viewData JSON in the paste. Open Farm List (tt=99), expand lists you care about, then Ctrl+A and paste.')
    return { timestamp: null, farmLists: [], grandTotals: { ...EMPTY_RESOURCES }, notes }
  }

  let viewData
  try {
    viewData = JSON.parse(viewDataJson)
  } catch {
    notes.push('viewData JSON is truncated or invalid — try copying the page again.')
    return { timestamp: null, farmLists: [], grandTotals: { ...EMPTY_RESOURCES }, notes }
  }

  const timestamp = viewData.bootstrapData?.timestamp ?? null
  const villages = viewData.ownPlayer?.villages ?? []
  const villageById = new Map(villages.map((v) => [v.id, v.name]))

  /** @type {FarmListSummary[]} */
  const farmLists = (viewData.ownPlayer?.farmLists ?? []).map((list) => {
    const ownerVillageId = list.ownerVillage?.id ?? null
    const ownerVillageName = ownerVillageId != null ? villageById.get(ownerVillageId) ?? null : null

    /** @type {FarmListSlotSummary[]} */
    const slots = (list.slots ?? []).map((slot) => ({
      id: slot.id,
      targetName: slot.target?.name ?? '—',
      coords:
        slot.target && Number.isFinite(slot.target.x) && Number.isFinite(slot.target.y)
          ? { x: slot.target.x, y: slot.target.y }
          : null,
      distance: slot.distance ?? null,
      isActive: Boolean(slot.isActive),
      raidedResources: slot.lastRaid?.raidedResources
        ? { ...slot.lastRaid.raidedResources }
        : null,
      lastRaidTime: slot.lastRaid?.time ?? null,
    }))

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

  return { timestamp, farmLists, grandTotals, notes: [...new Set(notes)] }
}

export function formatNum(n) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US')
}

export function resourceTotal(r) {
  return (r.lumber || 0) + (r.clay || 0) + (r.iron || 0) + (r.crop || 0)
}
