import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Sprout,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  parseFarmListPaste,
  projectFarmLoot,
  formatNum,
  formatSignedNum,
  formatPercent,
  resourceTotal,
  cropBalancePerHour,
  tradeRoutesPerHour,
  aggregateSelectedLists,
  computeFeedingBalance,
  buildSlotRecommendations,
  analyzeSlotEfficiency,
} from '../utils/farmListPasteParser'

const C = {
  bg: '#0f0c09',
  surface: '#1a1510',
  surface2: '#241d14',
  surfaceLift: '#2c241a',
  border: '#4a3d30',
  gold: '#f0a820',
  goldDim: '#c48818',
  text: '#e8dcc8',
  muted: '#a89880',
  heading: '#f0e6d0',
  ok: '#4ade80',
  bad: '#f87171',
}

const R = {
  lumber: { label: 'Lumber', value: '#e8c4a0', dim: '#c4a070' },
  clay: { label: 'Clay', value: '#fb923c', dim: '#ea580c' },
  iron: { label: 'Iron', value: '#7dd3fc', dim: '#38bdf8' },
  crop: { label: 'Crop', value: '#fde047', dim: '#facc15' },
}

const PLACEHOLDER =
  'Ctrl+V here — full page source from View page source (Ctrl+U) after expanding every farm list.'

const FARM_LIST_EXPAND_IMG = `${import.meta.env.BASE_URL}images/farm-list-expand.png`

function ResourceRow({ resourceKey, value }) {
  const res = R[resourceKey]
  return (
    <div className="flex justify-between gap-4 text-sm py-0.5">
      <span className="font-medium" style={{ color: res.dim }}>
        {res.label}
      </span>
      <span className="tabular-nums font-semibold" style={{ color: res.value }}>
        {formatNum(value)}
      </span>
    </div>
  )
}

function ResourceBlock({ title, resources, accent }) {
  const total = resourceTotal(resources)
  return (
    <div
      className="rounded-lg border p-4 space-y-1.5"
      style={{ background: C.surfaceLift, borderColor: C.border }}
    >
      <div
        className="flex items-center justify-between gap-2 mb-2 pb-2 border-b"
        style={{ borderColor: C.border }}
      >
        <span className="text-xs uppercase tracking-wide font-semibold" style={{ color: C.muted }}>
          {title}
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color: accent ?? C.gold }}>
          Σ {formatNum(total)}
        </span>
      </div>
      <ResourceRow resourceKey="lumber" value={resources.lumber} />
      <ResourceRow resourceKey="clay" value={resources.clay} />
      <ResourceRow resourceKey="iron" value={resources.iron} />
      <ResourceRow resourceKey="crop" value={resources.crop} />
    </div>
  )
}

function UtilBadge({ utilization, recommendation }) {
  if (utilization == null) return <span style={{ color: C.muted }}>—</span>
  const pct = Math.round(utilization * 100)
  let color = C.muted
  if (recommendation === 'increase') color = C.ok
  else if (recommendation === 'decrease') color = '#fbbf24'
  return (
    <span className="tabular-nums font-semibold" style={{ color }}>
      {pct}%
    </span>
  )
}

function FeedingBalancePanel({ feeding, schedule }) {
  if (!feeding?.ok) {
    return (
      <div
        className="rounded-xl border p-4 text-sm"
        style={{ background: C.surface2, borderColor: C.border, color: C.muted }}
      >
        Enter net crop/h above (from your village stock bar) to see whether farming covers troop
        upkeep.
      </div>
    )
  }

  const ok = feeding.activeHourOk && feeding.dayOk
  const borderColor = ok ? `${C.ok}55` : `${C.bad}55`
  const bg = ok ? 'rgba(74, 222, 128, 0.08)' : 'rgba(248, 113, 113, 0.08)'

  return (
    <div className="rounded-xl border p-4 space-y-4" style={{ background: bg, borderColor }}>
      <div className="flex items-start gap-3">
        {ok ? (
          <TrendingUp className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: C.ok }} />
        ) : (
          <TrendingDown className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: C.bad }} />
        )}
        <div className="space-y-2 text-sm">
          <p className="font-semibold" style={{ color: ok ? C.ok : C.bad }}>
            {ok
              ? 'Farming covers your crop burn during active raiding.'
              : 'Farming does not fully cover your crop burn.'}
          </p>
          <p style={{ color: C.text }}>
            Village balance:{' '}
            <strong className="tabular-nums">{formatSignedNum(feeding.cropBalancePerHour)}</strong>{' '}
            crop/h
            {feeding.tradeRoutesPerHour > 0 && (
              <>
                {' '}
                · Trade routes:{' '}
                <strong className="tabular-nums" style={{ color: C.ok }}>
                  +{formatNum(feeding.tradeRoutesPerHour)}
                </strong>{' '}
                crop/h
              </>
            )}
            {feeding.tradeRoutesPerHour > 0 && (
              <>
                {' '}
                → base{' '}
                <strong className="tabular-nums">{formatSignedNum(feeding.baseCropPerHour)}</strong>{' '}
                crop/h
              </>
            )}
            {' · '}
            Raids:{' '}
            <strong className="tabular-nums">{formatNum(feeding.raidCropPerActiveHour)}</strong>{' '}
            crop/h ({feeding.selectedListCount} list
            {feeding.selectedListCount !== 1 ? 's' : ''}, {feeding.selectedSlotCount} slots)
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div
          className="rounded-lg border p-3"
          style={{ background: C.surface, borderColor: C.border }}
        >
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: C.muted }}>
            Net during active hours ({schedule.startHour}:00–{schedule.endHour}:00)
          </div>
          <div
            className="text-xl font-bold tabular-nums"
            style={{ color: feeding.netActiveHour >= 0 ? C.ok : C.bad }}
          >
            {formatSignedNum(feeding.netActiveHour)} crop/h
          </div>
          {feeding.netActiveHour >= 0 ? (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Surplus while clicking — you can support about{' '}
              <strong style={{ color: C.ok }}>{formatNum(feeding.netActiveHour)}</strong> crop/h of
              extra troop upkeep during your {feeding.activeHours}h window.
            </p>
          ) : (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Need <strong style={{ color: C.bad }}>{formatNum(feeding.gapActiveHour)}</strong>{' '}
              more crop/h while raiding
              {feeding.extraSlotsForActiveHour != null && feeding.avgCropPerSlotPerClick > 0 && (
                <>
                  {' '}
                  — roughly <strong>{feeding.extraSlotsForActiveHour}</strong> more target
                  {feeding.extraSlotsForActiveHour !== 1 ? 's' : ''} at ~
                  {formatNum(feeding.avgCropPerSlotPerClick)} crop/click each
                </>
              )}
              .
            </p>
          )}
        </div>

        <div
          className="rounded-lg border p-3"
          style={{ background: C.surface, borderColor: C.border }}
        >
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: C.muted }}>
            Net over full day (base × 24 + raids)
          </div>
          <div
            className="text-xl font-bold tabular-nums"
            style={{ color: feeding.netDay >= 0 ? C.ok : C.bad }}
          >
            {formatSignedNum(feeding.netDay)} crop/day
          </div>
          {feeding.netDay >= 0 ? (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Full-day surplus — village production
              {feeding.tradeRoutesPerHour > 0 ? ', trade routes,' : ''} and farming nets{' '}
              <strong style={{ color: C.ok }}>{formatNum(feeding.netDay)}</strong> crop/day (raids
              only run in your active window; production runs 24h).
            </p>
          ) : (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Need <strong style={{ color: C.bad }}>{formatNum(feeding.gapDay)}</strong> more
              crop/day
              {feeding.extraSlotsForDay != null && feeding.avgCropPerSlotPerClick > 0 && (
                <>
                  {' '}
                  — add ~<strong>{feeding.extraSlotsForDay}</strong> target
                  {feeding.extraSlotsForDay !== 1 ? 's' : ''} (~
                  {formatNum(feeding.avgCropPerSlotPerClick)} crop/click,{' '}
                  {feeding.raidsPerDay} clicks/day)
                </>
              )}
              .
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function FarmListCard({ list, schedule, expanded, onToggle, advanceMode, showInSelection }) {
  const [targetsOpen, setTargetsOpen] = useState(false)

  useEffect(() => {
    if (!expanded) setTargetsOpen(false)
  }, [expanded])

  const projection = useMemo(
    () => projectFarmLoot(list.perRaidTotals, schedule),
    [list.perRaidTotals, schedule],
  )

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: C.surface,
        borderColor: showInSelection === false ? C.border : `${C.gold}40`,
        opacity: showInSelection === false ? 0.65 : 1,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#241d14] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: C.gold }} />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: C.muted }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate" style={{ color: C.text }}>
            {list.name}
          </div>
          <div className="text-xs truncate" style={{ color: C.muted }}>
            {list.ownerVillageName ?? 'Unknown village'}
            {list.slotsAmount != null && ` · ${list.slotsWithLoot}/${list.slotsAmount} slots with loot`}
            {!list.isExpanded && list.slotsAmount > 0 && ' · collapsed in paste'}
            {advanceMode && showInSelection === false && ' · not selected'}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold tabular-nums" style={{ color: R.crop.value }}>
            {formatNum(list.perRaidTotals.crop)} crop
          </div>
          <div className="text-xs tabular-nums font-medium" style={{ color: C.muted }}>
            {formatNum(resourceTotal(list.perRaidTotals))} / raid
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: C.border }}>
          <div className="grid sm:grid-cols-3 gap-3 pt-4">
            <ResourceBlock title="Per click (last raids)" resources={projection.perClick} />
            <ResourceBlock title="Per active hour" resources={projection.perHour} accent={C.gold} />
            <ResourceBlock title="Per day" resources={projection.perDay} accent={R.crop.value} />
          </div>

          {list.slots.length > 0 && (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: C.border }}>
              <button
                type="button"
                onClick={() => setTargetsOpen((o) => !o)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#241d14] transition-colors"
                style={{ background: C.surface2, color: C.text }}
              >
                {targetsOpen ? (
                  <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: C.muted }} />
                ) : (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: C.muted }} />
                )}
                <span className="font-medium">Targets</span>
                <span className="text-xs" style={{ color: C.muted }}>
                  ({list.slots.length})
                </span>
              </button>

              {targetsOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: C.surfaceLift }}>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: C.text }}>
                          Target
                        </th>
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: C.muted }}>
                          Dist
                        </th>
                        {advanceMode && (
                          <>
                            <th
                              className="text-left px-3 py-2 font-semibold min-w-[120px]"
                              style={{ color: C.muted }}
                            >
                              Troops
                            </th>
                            <th className="text-right px-3 py-2 font-semibold" style={{ color: C.muted }}>
                              Loot / max
                            </th>
                            <th className="text-right px-3 py-2 font-semibold" style={{ color: C.muted }}>
                              Util
                            </th>
                          </>
                        )}
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: R.lumber.dim }}>
                          Lumber
                        </th>
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: R.clay.dim }}>
                          Clay
                        </th>
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: R.iron.dim }}>
                          Iron
                        </th>
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: R.crop.dim }}>
                          Crop
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.slots.map((slot) => {
                        const loot = slot.raidedResources
                        const inactive = !slot.isActive
                        const { utilization, recommendation } = analyzeSlotEfficiency(slot)
                        return (
                          <tr
                            key={slot.id}
                            className="border-t"
                            style={{
                              borderColor: C.border,
                              opacity: inactive ? 0.5 : 1,
                              background: inactive ? undefined : 'rgba(44, 36, 26, 0.35)',
                            }}
                          >
                            <td className="px-3 py-2" style={{ color: C.text }}>
                              <div className="truncate max-w-[180px] font-medium flex items-center gap-1">
                                {slot.isNatar && (
                                  <AlertTriangle
                                    className="w-3.5 h-3.5 flex-shrink-0"
                                    style={{ color: '#fbbf24' }}
                                    title="Natars"
                                  />
                                )}
                                <span className="truncate">{slot.targetName}</span>
                              </div>
                              {slot.coords && (
                                <div className="text-xs" style={{ color: C.muted }}>
                                  ({slot.coords.x}|{slot.coords.y})
                                </div>
                              )}
                              {advanceMode && recommendation && (
                                <div
                                  className="text-xs mt-0.5 font-medium"
                                  style={{
                                    color:
                                      recommendation === 'increase' ? C.ok : '#fbbf24',
                                  }}
                                >
                                  {recommendation === 'increase' ? '↑ increase troops' : '↓ reduce troops'}
                                </div>
                              )}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums font-medium"
                              style={{ color: C.muted }}
                            >
                              {slot.distance != null ? slot.distance.toFixed(1) : '—'}
                            </td>
                            {advanceMode && (
                              <>
                                <td
                                  className="px-3 py-2 text-xs max-w-[160px]"
                                  style={{ color: C.muted }}
                                  title={slot.troopLabel}
                                >
                                  <span className="line-clamp-2">{slot.troopLabel}</span>
                                </td>
                                <td
                                  className="px-3 py-2 text-right tabular-nums text-xs whitespace-nowrap"
                                  style={{ color: C.text }}
                                >
                                  {loot && slot.bootyMax
                                    ? `${formatNum(resourceTotal(loot))} / ${formatNum(slot.bootyMax)}`
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <UtilBadge utilization={utilization} recommendation={recommendation} />
                                </td>
                              </>
                            )}
                            <td
                              className="px-3 py-2 text-right tabular-nums font-semibold"
                              style={{ color: loot ? R.lumber.value : C.muted }}
                            >
                              {loot ? formatNum(loot.lumber) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums font-semibold"
                              style={{ color: loot ? R.clay.value : C.muted }}
                            >
                              {loot ? formatNum(loot.clay) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums font-semibold"
                              style={{ color: loot ? R.iron.value : C.muted }}
                            >
                              {loot ? formatNum(loot.iron) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums font-semibold"
                              style={{ color: loot ? R.crop.value : C.muted }}
                            >
                              {loot ? formatNum(loot.crop) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CropFarmSimulator() {
  const [paste, setPaste] = useState('')
  const [intervalMinutes, setIntervalMinutes] = useState('30')
  const [startHour, setStartHour] = useState('6')
  const [endHour, setEndHour] = useState('22')
  const [expandedLists, setExpandedLists] = useState(() => new Set())
  const [howToOpen, setHowToOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  const [advanceMode, setAdvanceMode] = useState(false)
  const [cropBalanceSign, setCropBalanceSign] = useState('-')
  const [cropBalanceDigits, setCropBalanceDigits] = useState('')
  const [tradeRoutesDigits, setTradeRoutesDigits] = useState('')
  const [selectedVillageId, setSelectedVillageId] = useState('')
  const [selectedListIds, setSelectedListIds] = useState(() => new Set())
  const [listSelectionTouched, setListSelectionTouched] = useState(false)

  const parsed = useMemo(() => (paste.trim() ? parseFarmListPaste(paste) : null), [paste])

  const schedule = useMemo(() => {
    const interval = Math.max(1, parseInt(intervalMinutes, 10) || 30)
    let start = parseInt(startHour, 10)
    let end = parseInt(endHour, 10)
    if (!Number.isFinite(start)) start = 6
    if (!Number.isFinite(end)) end = 22
    if (end <= start) end = start + 1
    return { intervalMinutes: interval, startHour: start, endHour: end }
  }, [intervalMinutes, startHour, endHour])

  useEffect(() => {
    if (!parsed?.cropBalanceFromPaste || cropBalanceDigits) return
    setCropBalanceSign(parsed.cropBalanceFromPaste.sign)
    setCropBalanceDigits(parsed.cropBalanceFromPaste.digits)
  }, [parsed?.cropBalanceFromPaste, cropBalanceDigits])

  useEffect(() => {
    if (!parsed?.villages?.length) return
    const fallback =
      parsed.currentVillageId != null
        ? String(parsed.currentVillageId)
        : String(parsed.villages[0].id)
    setSelectedVillageId((prev) => {
      if (prev && parsed.villages.some((v) => String(v.id) === prev)) return prev
      return fallback
    })
  }, [parsed?.villages, parsed?.currentVillageId])

  useEffect(() => {
    if (!parsed?.farmLists?.length || !selectedVillageId || listSelectionTouched) return
    const vid = parseInt(selectedVillageId, 10)
    const ids = new Set(
      parsed.farmLists.filter((l) => l.ownerVillageId === vid).map((l) => l.id),
    )
    if (ids.size === 0) {
      parsed.farmLists.forEach((l) => ids.add(l.id))
    }
    setSelectedListIds(ids)
  }, [parsed?.farmLists, selectedVillageId, listSelectionTouched])

  const handleVillageChange = useCallback((villageId) => {
    setSelectedVillageId(villageId)
    setListSelectionTouched(false)
  }, [])

  const toggleListSelection = useCallback((listId) => {
    setListSelectionTouched(true)
    setSelectedListIds((prev) => {
      const next = new Set(prev)
      if (next.has(listId)) next.delete(listId)
      else next.add(listId)
      return next
    })
  }, [])

  const grandProjection = useMemo(() => {
    if (!parsed?.farmLists.length) return null
    if (advanceMode && selectedListIds.size > 0) {
      const { totals } = aggregateSelectedLists(parsed.farmLists, selectedListIds)
      return projectFarmLoot(totals, schedule)
    }
    return projectFarmLoot(parsed.grandTotals, schedule)
  }, [parsed, schedule, advanceMode, selectedListIds])

  const balancePerHour = useMemo(
    () => cropBalancePerHour(cropBalanceSign, cropBalanceDigits),
    [cropBalanceSign, cropBalanceDigits],
  )

  const tradeRoutesCropPerHour = useMemo(
    () => tradeRoutesPerHour(tradeRoutesDigits),
    [tradeRoutesDigits],
  )

  const feeding = useMemo(() => {
    if (!advanceMode || !parsed?.farmLists.length || selectedListIds.size === 0) return null
    return computeFeedingBalance(
      balancePerHour,
      parsed.farmLists,
      selectedListIds,
      schedule,
      tradeRoutesCropPerHour,
    )
  }, [advanceMode, parsed, selectedListIds, balancePerHour, schedule, tradeRoutesCropPerHour])

  const recommendations = useMemo(() => {
    if (!advanceMode || !parsed?.farmLists.length) return []
    const { slots } = aggregateSelectedLists(
      parsed.farmLists,
      selectedListIds.size > 0 ? selectedListIds : new Set(parsed.farmLists.map((l) => l.id)),
    )
    return buildSlotRecommendations(slots)
  }, [advanceMode, parsed, selectedListIds])

  const toggleList = useCallback((id) => {
    setExpandedLists((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const copySummary = useCallback(() => {
    if (!parsed || !grandProjection) return
    const scope =
      advanceMode && selectedListIds.size > 0
        ? `${selectedListIds.size} selected list(s)`
        : 'all lists'
    const lines = [
      `Farm loot simulator — ${schedule.startHour}:00–${schedule.endHour}:00, every ${schedule.intervalMinutes} min (${scope})`,
      `Raids per day: ${grandProjection.raidsPerDay} (${grandProjection.raidsPerActiveHour.toFixed(1)}/h active)`,
      '',
      'Per click (sum of last raids):',
      `  lumber ${formatNum(grandProjection.perClick.lumber)} | clay ${formatNum(grandProjection.perClick.clay)} | iron ${formatNum(grandProjection.perClick.iron)} | crop ${formatNum(grandProjection.perClick.crop)}`,
      '',
      'Per active hour:',
      `  lumber ${formatNum(grandProjection.perHour.lumber)} | clay ${formatNum(grandProjection.perHour.clay)} | iron ${formatNum(grandProjection.perHour.iron)} | crop ${formatNum(grandProjection.perHour.crop)}`,
      '',
      'Per day:',
      `  lumber ${formatNum(grandProjection.perDay.lumber)} | clay ${formatNum(grandProjection.perDay.clay)} | iron ${formatNum(grandProjection.perDay.iron)} | crop ${formatNum(grandProjection.perDay.crop)}`,
    ]
    if (feeding?.ok) {
      lines.push(
        '',
        `Feeding balance: village ${formatSignedNum(feeding.cropBalancePerHour)} crop/h`,
      )
      if (feeding.tradeRoutesPerHour > 0) {
        lines.push(`  Trade routes: +${formatNum(feeding.tradeRoutesPerHour)} crop/h`)
        lines.push(`  Base (village + routes): ${formatSignedNum(feeding.baseCropPerHour)} crop/h`)
      }
      lines.push(
        `  Net active hour: ${formatSignedNum(feeding.netActiveHour)} crop/h`,
        `  Net full day: ${formatSignedNum(feeding.netDay)} crop/day`,
      )
    }
    if (recommendations.length) {
      lines.push('', 'Slot recommendations:')
      recommendations.forEach((r) => {
        lines.push(`  ${r.targetName} ${r.coords}: ${r.message}`)
        if (r.natarWarning) lines.push(`    ⚠ ${r.natarWarning}`)
      })
    }
    lines.push(
      '',
      'By farm list (crop / total per click):',
      ...parsed.farmLists
        .filter((l) => !advanceMode || selectedListIds.size === 0 || selectedListIds.has(l.id))
        .map(
          (l) =>
            `  ${l.name}: crop ${formatNum(l.perRaidTotals.crop)}, total ${formatNum(resourceTotal(l.perRaidTotals))}`,
        ),
    )
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [parsed, grandProjection, schedule, advanceMode, selectedListIds, feeding, recommendations])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border"
          style={{ background: `${C.gold}15`, borderColor: `${C.gold}40` }}
        >
          <Sprout className="w-6 h-6" style={{ color: C.gold }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: C.heading }}>
            Crop Farm Simulator
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
            Paste your Farm List page. The tool sums loot from each slot&apos;s{' '}
            <em>last raid</em> per list, then estimates haul per click, per active hour, and per
            day from your raid interval and playing window. Enable <strong>Advance mode</strong> to
            check crop feeding balance and troop efficiency per target.
          </p>
        </div>
      </div>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <button
          type="button"
          onClick={() => setHowToOpen((o) => !o)}
          className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-[#241d14] transition-colors"
        >
          {howToOpen ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: C.gold }} />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: C.muted }} />
          )}
          <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: C.muted }}>
            How to use
          </span>
        </button>

        {howToOpen && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t" style={{ borderColor: C.border }}>
            <ol className="text-sm space-y-2 list-decimal list-inside pt-4" style={{ color: C.text }}>
              <li>
                In Travian, open <strong>Rally Point</strong> → <strong>Farm List</strong> tab.
              </li>
              <li>
                For <strong>each</strong> farm list, click the arrow on the right to expand it.
              </li>
              <li>
                Open <strong>View page source</strong> (<kbd className="px-1.5 py-0.5 rounded text-xs border" style={{ borderColor: C.border, background: C.bg }}>Ctrl+U</kbd>
                ).
              </li>
              <li>
                <kbd className="px-1.5 py-0.5 rounded text-xs border" style={{ borderColor: C.border, background: C.bg }}>Ctrl+A</kbd>
                {' → '}
                <kbd className="px-1.5 py-0.5 rounded text-xs border" style={{ borderColor: C.border, background: C.bg }}>Ctrl+C</kbd>
                , paste here.
              </li>
            </ol>
            <figure className="space-y-2">
              <img
                src={FARM_LIST_EXPAND_IMG}
                alt="Travian Farm List — expand every list"
                className="w-full max-w-2xl rounded-lg border"
                style={{ borderColor: C.border }}
              />
            </figure>
          </div>
        )}
      </div>

      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <label className="block text-sm font-medium" style={{ color: C.text }}>
          Paste copied HTML
        </label>
        <textarea
          value={paste}
          onChange={(e) => {
            setPaste(e.target.value)
            setListSelectionTouched(false)
          }}
          placeholder={PLACEHOLDER}
          rows={8}
          className="w-full rounded-lg border px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-1"
          style={{ background: C.bg, borderColor: C.border, color: C.text }}
        />
        {parsed?.notes?.length > 0 && (
          <ul className="text-xs space-y-1 list-disc pl-4" style={{ color: '#fbbf24' }}>
            {parsed.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="rounded-xl border p-4 space-y-4"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: C.muted }}>
            Raid schedule
          </h2>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={advanceMode}
              onChange={(e) => setAdvanceMode(e.target.checked)}
              className="rounded"
            />
            <span style={{ color: C.text }}>Advance mode</span>
            <span className="text-xs" style={{ color: C.muted }}>
              (feeding balance + troop efficiency)
            </span>
          </label>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs mb-1 block" style={{ color: C.muted }}>
              Interval (minutes)
            </span>
            <input
              type="number"
              min={1}
              max={120}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
              style={{ background: C.bg, borderColor: C.border, color: C.text }}
            />
          </label>
          <label className="block">
            <span className="text-xs mb-1 block" style={{ color: C.muted }}>
              Active from (hour)
            </span>
            <input
              type="number"
              min={0}
              max={23}
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
              style={{ background: C.bg, borderColor: C.border, color: C.text }}
            />
          </label>
          <label className="block">
            <span className="text-xs mb-1 block" style={{ color: C.muted }}>
              Active until (hour)
            </span>
            <input
              type="number"
              min={1}
              max={24}
              value={endHour}
              onChange={(e) => setEndHour(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
              style={{ background: C.bg, borderColor: C.border, color: C.text }}
            />
          </label>
        </div>
        {grandProjection && (
          <p className="text-xs" style={{ color: C.muted }}>
            {grandProjection.activeHours}h window → ~{grandProjection.raidsPerDay} raid clicks/day
            ({grandProjection.raidsPerActiveHour.toFixed(1)} per active hour)
          </p>
        )}
      </div>

      {advanceMode && parsed && parsed.farmLists.length > 0 && (
        <div
          className="rounded-xl border p-4 space-y-4"
          style={{ background: C.surface, borderColor: `${C.gold}40` }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: C.gold }}>
            Advance — crop feeding
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs mb-2" style={{ color: C.muted }}>
                Net crop/h from village stock bar (production − upkeep)
              </label>
              <div className="flex gap-2">
                <select
                  value={cropBalanceSign}
                  onChange={(e) => setCropBalanceSign(e.target.value)}
                  aria-label="Surplus or deficit"
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{
                    background: C.bg,
                    borderColor: cropBalanceDigits ? C.goldDim : C.border,
                    color: C.text,
                  }}
                >
                  <option value="-">−</option>
                  <option value="+">+</option>
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cropBalanceDigits}
                  onChange={(e) => setCropBalanceDigits(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 5299"
                  aria-label="Crop balance per hour"
                  className="flex-1 rounded-lg border px-3 py-2 text-sm tabular-nums"
                  style={{
                    background: C.bg,
                    borderColor: cropBalanceDigits ? C.goldDim : C.border,
                    color: C.text,
                  }}
                />
              </div>
              <span className="text-xs mt-1 block" style={{ color: C.muted }}>
                Use − for deficit (red number in Travian). Auto-filled from paste when available.
              </span>
            </div>

            <div>
              <label className="block text-xs mb-2" style={{ color: C.muted }}>
                Trade routes crop/h (from other villages)
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={tradeRoutesDigits}
                onChange={(e) => setTradeRoutesDigits(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 15000"
                aria-label="Trade routes crop per hour"
                className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                style={{
                  background: C.bg,
                  borderColor: tradeRoutesDigits ? C.goldDim : C.border,
                  color: C.text,
                }}
              />
              <span className="text-xs mt-1 block" style={{ color: C.muted }}>
                Sum of automated merchant deliveries to this village, expressed as crop/h (runs
                24/7).
              </span>
            </div>
          </div>

          {parsed.villages.length > 0 && (
            <div>
              <label className="block text-xs mb-2" style={{ color: C.muted }}>
                Sending village
              </label>
              <select
                value={selectedVillageId}
                onChange={(e) => handleVillageChange(e.target.value)}
                className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
                style={{ background: C.bg, borderColor: C.border, color: C.text }}
              >
                {parsed.villages.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="text-xs mb-2" style={{ color: C.muted }}>
              Farm lists to include (defaults to lists from selected village)
            </div>
            <div className="flex flex-wrap gap-2">
              {parsed.farmLists.map((list) => {
                const checked = selectedListIds.has(list.id)
                return (
                  <label
                    key={list.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer select-none"
                    style={{
                      background: checked ? `${C.gold}15` : C.bg,
                      borderColor: checked ? `${C.gold}55` : C.border,
                      color: C.text,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleListSelection(list.id)}
                    />
                    <span className="truncate max-w-[200px]">{list.name}</span>
                    <span className="text-xs tabular-nums" style={{ color: R.crop.value }}>
                      {formatNum(list.perRaidTotals.crop)}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <FeedingBalancePanel feeding={feeding} schedule={schedule} />
        </div>
      )}

      {parsed && parsed.farmLists.length > 0 && grandProjection && (
        <>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold" style={{ color: C.heading }}>
              Totals {advanceMode && selectedListIds.size > 0 ? '(selected lists)' : '(all lists)'}
            </h2>
            <button
              type="button"
              onClick={copySummary}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors hover:bg-[#241d14]"
              style={{ borderColor: C.border, color: C.text }}
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy summary'}
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <ResourceBlock title="Per click" resources={grandProjection.perClick} />
            <ResourceBlock title="Per active hour" resources={grandProjection.perHour} accent={C.gold} />
            <ResourceBlock title="Per day" resources={grandProjection.perDay} accent={R.crop.value} />
          </div>

          {advanceMode && recommendations.length > 0 && (
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{ background: C.surface, borderColor: C.border }}
            >
              <h2 className="text-lg font-semibold" style={{ color: C.heading }}>
                Troop efficiency recommendations
              </h2>
              <ul className="space-y-2 text-sm">
                {recommendations.map((rec) => (
                  <li
                    key={rec.slotId}
                    className="rounded-lg border px-3 py-2"
                    style={{ background: C.surface2, borderColor: C.border }}
                  >
                    <div className="flex items-start gap-2">
                      {rec.recommendation === 'increase' ? (
                        <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.ok }} />
                      ) : (
                        <TrendingDown
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          style={{ color: '#fbbf24' }}
                        />
                      )}
                      <div>
                        <div className="font-medium" style={{ color: C.text }}>
                          {rec.targetName}{' '}
                          <span style={{ color: C.muted }}>{rec.coords}</span>
                          {rec.isNatar && (
                            <span className="ml-1 text-xs" style={{ color: '#fbbf24' }}>
                              Natars
                            </span>
                          )}
                        </div>
                        <div style={{ color: C.muted }}>{rec.message}</div>
                        <div className="text-xs mt-1" style={{ color: C.muted }}>
                          Troops: {rec.troopLabel} · {formatPercent(rec.utilization)} of{' '}
                          {formatNum(rec.bootyMax)} carry
                        </div>
                        {rec.natarWarning && (
                          <div
                            className="flex items-center gap-1 text-xs mt-1"
                            style={{ color: '#fbbf24' }}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {rec.natarWarning}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: C.heading }}>
              Farm lists
            </h2>
            {parsed.farmLists.map((list) => (
              <FarmListCard
                key={list.id}
                list={list}
                schedule={schedule}
                expanded={expandedLists.has(list.id)}
                onToggle={() => toggleList(list.id)}
                advanceMode={advanceMode}
                showInSelection={
                  advanceMode && selectedListIds.size > 0
                    ? selectedListIds.has(list.id)
                    : undefined
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
