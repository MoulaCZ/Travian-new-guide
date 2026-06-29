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
import { getCropFarmStrings } from '../i18n/cropFarmSimulator'

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
  lumber: { value: '#e8c4a0', dim: '#c4a070' },
  clay: { value: '#fb923c', dim: '#ea580c' },
  iron: { value: '#7dd3fc', dim: '#38bdf8' },
  crop: { value: '#fde047', dim: '#facc15' },
}

const FARM_LIST_EXPAND_IMG = `${import.meta.env.BASE_URL}images/farm-list-expand.png`

function LangToggle({ lang, onChange }) {
  const t = getCropFarmStrings(lang)
  const btn =
    'w-9 h-9 rounded-lg border flex items-center justify-center text-lg transition-colors hover:bg-[#241d14]'
  return (
    <div className="flex gap-1.5 flex-shrink-0">
      <button
        type="button"
        className={btn}
        style={{
          borderColor: lang === 'en' ? `${C.gold}80` : C.border,
          background: lang === 'en' ? `${C.gold}15` : C.bg,
        }}
        onClick={() => onChange('en')}
        title={t.switchToEn}
        aria-label={t.switchToEn}
      >
        🇬🇧
      </button>
      <button
        type="button"
        className={btn}
        style={{
          borderColor: lang === 'fr' ? `${C.gold}80` : C.border,
          background: lang === 'fr' ? `${C.gold}15` : C.bg,
        }}
        onClick={() => onChange('fr')}
        title={t.switchToFr}
        aria-label={t.switchToFr}
      >
        🇫🇷
      </button>
    </div>
  )
}

function ResourceRow({ resourceKey, value, label, lang }) {
  const res = R[resourceKey]
  return (
    <div className="flex justify-between gap-4 text-sm py-0.5">
      <span className="font-medium" style={{ color: res.dim }}>
        {label}
      </span>
      <span className="tabular-nums font-semibold" style={{ color: res.value }}>
        {formatNum(value, lang)}
      </span>
    </div>
  )
}

function ResourceBlock({ title, resources, accent, labels, lang }) {
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
          Σ {formatNum(total, lang)}
        </span>
      </div>
      <ResourceRow resourceKey="lumber" value={resources.lumber} label={labels.lumber} lang={lang} />
      <ResourceRow resourceKey="clay" value={resources.clay} label={labels.clay} lang={lang} />
      <ResourceRow resourceKey="iron" value={resources.iron} label={labels.iron} lang={lang} />
      <ResourceRow resourceKey="crop" value={resources.crop} label={labels.crop} lang={lang} />
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

function FeedingBalancePanel({ feeding, schedule, t, lang }) {
  if (!feeding?.ok) {
    return (
      <div
        className="rounded-xl border p-4 text-sm"
        style={{ background: C.surface2, borderColor: C.border, color: C.muted }}
      >
        {t.feedingEnterBalance}
      </div>
    )
  }

  const ok = feeding.activeHourOk && feeding.dayOk
  const borderColor = ok ? `${C.ok}55` : `${C.bad}55`
  const bg = ok ? 'rgba(74, 222, 128, 0.08)' : 'rgba(248, 113, 113, 0.08)'
  const listWord = feeding.selectedListCount === 1 ? t.list : t.lists

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
            {ok ? t.feedingOk : t.feedingBad}
          </p>
          <p style={{ color: C.text }}>
            {t.villageBalance}:{' '}
            <strong className="tabular-nums">
              {formatSignedNum(feeding.cropBalancePerHour, lang)}
            </strong>{' '}
            {t.cropPerHour}
            {feeding.tradeRoutesPerHour > 0 && (
              <>
                {' · '}
                {t.tradeRoutes}:{' '}
                <strong className="tabular-nums" style={{ color: C.ok }}>
                  +{formatNum(feeding.tradeRoutesPerHour, lang)}
                </strong>{' '}
                {t.cropPerHour}
              </>
            )}
            {feeding.tradeRoutesPerHour > 0 && (
              <>
                {' → '}
                {t.base}{' '}
                <strong className="tabular-nums">
                  {formatSignedNum(feeding.baseCropPerHour, lang)}
                </strong>{' '}
                {t.cropPerHour}
              </>
            )}
            {' · '}
            {t.raids}:{' '}
            <strong className="tabular-nums">
              {formatNum(feeding.raidCropPerActiveHour, lang)}
            </strong>{' '}
            {t.cropPerHour} ({feeding.selectedListCount} {listWord},{' '}
            {feeding.selectedSlotCount} {t.slots})
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div
          className="rounded-lg border p-3"
          style={{ background: C.surface, borderColor: C.border }}
        >
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: C.muted }}>
            {t.netActiveHours(schedule.startHour, schedule.endHour)}
          </div>
          <div
            className="text-xl font-bold tabular-nums"
            style={{ color: feeding.netActiveHour >= 0 ? C.ok : C.bad }}
          >
            {formatSignedNum(feeding.netActiveHour, lang)} {t.cropPerHour}
          </div>
          {feeding.netActiveHour >= 0 ? (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              {t.surplusActive(
                formatNum(feeding.netActiveHour, lang),
                feeding.activeHours,
              )}
            </p>
          ) : (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              {t.needActive(formatNum(feeding.gapActiveHour, lang))}
              {feeding.extraSlotsForActiveHour != null && feeding.avgCropPerSlotPerClick > 0 &&
                t.moreTargetsActive(
                  feeding.extraSlotsForActiveHour,
                  formatNum(feeding.avgCropPerSlotPerClick, lang),
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
            {t.netFullDay}
          </div>
          <div
            className="text-xl font-bold tabular-nums"
            style={{ color: feeding.netDay >= 0 ? C.ok : C.bad }}
          >
            {formatSignedNum(feeding.netDay, lang)} {t.cropPerDay}
          </div>
          {feeding.netDay >= 0 ? (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              {feeding.tradeRoutesPerHour > 0
                ? t.surplusDay(formatNum(feeding.netDay, lang))
                : t.surplusDayNoRoutes(formatNum(feeding.netDay, lang))}
            </p>
          ) : (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              {t.needDay(formatNum(feeding.gapDay, lang))}
              {feeding.extraSlotsForDay != null && feeding.avgCropPerSlotPerClick > 0 &&
                t.moreTargetsDay(
                  feeding.extraSlotsForDay,
                  formatNum(feeding.avgCropPerSlotPerClick, lang),
                  feeding.raidsPerDay,
                )}
              .
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function FarmListCard({
  list,
  schedule,
  expanded,
  onToggle,
  advanceMode,
  showInSelection,
  t,
  lang,
}) {
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
            {list.ownerVillageName ?? t.unknownVillage}
            {list.slotsAmount != null &&
              ` · ${t.slotsWithLoot(list.slotsWithLoot, list.slotsAmount)}`}
            {!list.isExpanded && list.slotsAmount > 0 && ` · ${t.collapsedInPaste}`}
            {advanceMode && showInSelection === false && ` · ${t.notSelected}`}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold tabular-nums" style={{ color: R.crop.value }}>
            {formatNum(list.perRaidTotals.crop, lang)} {t.resources.crop.toLowerCase()}
          </div>
          <div className="text-xs tabular-nums font-medium" style={{ color: C.muted }}>
            {formatNum(resourceTotal(list.perRaidTotals), lang)} {t.perRaid}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: C.border }}>
          <div className="grid sm:grid-cols-3 gap-3 pt-4">
            <ResourceBlock
              title={t.perClickLastRaids}
              resources={projection.perClick}
              labels={t.resources}
              lang={lang}
            />
            <ResourceBlock
              title={t.perActiveHour}
              resources={projection.perHour}
              accent={C.gold}
              labels={t.resources}
              lang={lang}
            />
            <ResourceBlock
              title={t.perDay}
              resources={projection.perDay}
              accent={R.crop.value}
              labels={t.resources}
              lang={lang}
            />
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
                <span className="font-medium">{t.targets}</span>
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
                          {t.target}
                        </th>
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: C.muted }}>
                          {t.dist}
                        </th>
                        {advanceMode && (
                          <>
                            <th
                              className="text-left px-3 py-2 font-semibold min-w-[120px]"
                              style={{ color: C.muted }}
                            >
                              {t.troops}
                            </th>
                            <th className="text-right px-3 py-2 font-semibold" style={{ color: C.muted }}>
                              {t.lootMax}
                            </th>
                            <th className="text-right px-3 py-2 font-semibold" style={{ color: C.muted }}>
                              {t.util}
                            </th>
                          </>
                        )}
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: R.lumber.dim }}>
                          {t.resources.lumber}
                        </th>
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: R.clay.dim }}>
                          {t.resources.clay}
                        </th>
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: R.iron.dim }}>
                          {t.resources.iron}
                        </th>
                        <th className="text-right px-3 py-2 font-semibold" style={{ color: R.crop.dim }}>
                          {t.resources.crop}
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
                                    title={t.natars}
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
                                    color: recommendation === 'increase' ? C.ok : '#fbbf24',
                                  }}
                                >
                                  {recommendation === 'increase'
                                    ? t.increaseTroops
                                    : t.reduceTroops}
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
                                    ? `${formatNum(resourceTotal(loot), lang)} / ${formatNum(slot.bootyMax, lang)}`
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <UtilBadge
                                    utilization={utilization}
                                    recommendation={recommendation}
                                  />
                                </td>
                              </>
                            )}
                            <td
                              className="px-3 py-2 text-right tabular-nums font-semibold"
                              style={{ color: loot ? R.lumber.value : C.muted }}
                            >
                              {loot ? formatNum(loot.lumber, lang) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums font-semibold"
                              style={{ color: loot ? R.clay.value : C.muted }}
                            >
                              {loot ? formatNum(loot.clay, lang) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums font-semibold"
                              style={{ color: loot ? R.iron.value : C.muted }}
                            >
                              {loot ? formatNum(loot.iron, lang) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums font-semibold"
                              style={{ color: loot ? R.crop.value : C.muted }}
                            >
                              {loot ? formatNum(loot.crop, lang) : '—'}
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
  const [lang, setLang] = useState('en')
  const t = useMemo(() => getCropFarmStrings(lang), [lang])

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

  const parsed = useMemo(
    () => (paste.trim() ? parseFarmListPaste(paste, lang) : null),
    [paste, lang],
  )

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
    return buildSlotRecommendations(slots, lang)
  }, [advanceMode, parsed, selectedListIds, lang])

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
        ? t.copy.scopeSelected(selectedListIds.size)
        : t.copy.scopeAll
    const res = t.resources
    const lines = [
      t.copy.title(
        schedule.startHour,
        schedule.endHour,
        schedule.intervalMinutes,
        scope,
      ),
      t.copy.raidsPerDay(
        grandProjection.raidsPerDay,
        grandProjection.raidsPerActiveHour.toFixed(1),
      ),
      '',
      t.copy.perClick,
      `  ${res.lumber.toLowerCase()} ${formatNum(grandProjection.perClick.lumber, lang)} | ${res.clay.toLowerCase()} ${formatNum(grandProjection.perClick.clay, lang)} | ${res.iron.toLowerCase()} ${formatNum(grandProjection.perClick.iron, lang)} | ${res.crop.toLowerCase()} ${formatNum(grandProjection.perClick.crop, lang)}`,
      '',
      t.copy.perActiveHour,
      `  ${res.lumber.toLowerCase()} ${formatNum(grandProjection.perHour.lumber, lang)} | ${res.clay.toLowerCase()} ${formatNum(grandProjection.perHour.clay, lang)} | ${res.iron.toLowerCase()} ${formatNum(grandProjection.perHour.iron, lang)} | ${res.crop.toLowerCase()} ${formatNum(grandProjection.perHour.crop, lang)}`,
      '',
      t.copy.perDay,
      `  ${res.lumber.toLowerCase()} ${formatNum(grandProjection.perDay.lumber, lang)} | ${res.clay.toLowerCase()} ${formatNum(grandProjection.perDay.clay, lang)} | ${res.iron.toLowerCase()} ${formatNum(grandProjection.perDay.iron, lang)} | ${res.crop.toLowerCase()} ${formatNum(grandProjection.perDay.crop, lang)}`,
    ]
    if (feeding?.ok) {
      lines.push('', t.copy.feeding(formatSignedNum(feeding.cropBalancePerHour, lang)))
      if (feeding.tradeRoutesPerHour > 0) {
        lines.push(t.copy.tradeRoutes(formatNum(feeding.tradeRoutesPerHour, lang)))
        lines.push(t.copy.base(formatSignedNum(feeding.baseCropPerHour, lang)))
      }
      lines.push(
        t.copy.netActive(formatSignedNum(feeding.netActiveHour, lang)),
        t.copy.netDay(formatSignedNum(feeding.netDay, lang)),
      )
    }
    if (recommendations.length) {
      lines.push('', t.copy.slotRecs)
      recommendations.forEach((r) => {
        lines.push(`  ${r.targetName} ${r.coords}: ${r.message}`)
        if (r.natarWarning) lines.push(`    ⚠ ${r.natarWarning}`)
      })
    }
    lines.push(
      '',
      t.copy.byList,
      ...parsed.farmLists
        .filter((l) => !advanceMode || selectedListIds.size === 0 || selectedListIds.has(l.id))
        .map(
          (l) =>
            `  ${l.name}: ${res.crop.toLowerCase()} ${formatNum(l.perRaidTotals.crop, lang)}, total ${formatNum(resourceTotal(l.perRaidTotals), lang)}`,
        ),
    )
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [parsed, grandProjection, schedule, advanceMode, selectedListIds, feeding, recommendations, t, lang])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border"
          style={{ background: `${C.gold}15`, borderColor: `${C.gold}40` }}
        >
          <Sprout className="w-6 h-6" style={{ color: C.gold }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold mb-1" style={{ color: C.heading }}>
              {t.title}
            </h1>
            <LangToggle lang={lang} onChange={setLang} />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
            {t.intro}
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
            {t.howTo}
          </span>
        </button>

        {howToOpen && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t" style={{ borderColor: C.border }}>
            <ol className="text-sm space-y-2 list-decimal list-inside pt-4" style={{ color: C.text }}>
              {t.howToSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <figure className="space-y-2">
              <img
                src={FARM_LIST_EXPAND_IMG}
                alt={t.howToImgAlt}
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
          {t.pasteLabel}
        </label>
        <textarea
          value={paste}
          onChange={(e) => {
            setPaste(e.target.value)
            setListSelectionTouched(false)
          }}
          placeholder={t.pastePlaceholder}
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
            {t.raidSchedule}
          </h2>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={advanceMode}
              onChange={(e) => setAdvanceMode(e.target.checked)}
              className="rounded"
            />
            <span style={{ color: C.text }}>{t.advanceMode}</span>
            <span className="text-xs" style={{ color: C.muted }}>
              {t.advanceModeHint}
            </span>
          </label>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs mb-1 block" style={{ color: C.muted }}>
              {t.intervalMinutes}
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
              {t.activeFrom}
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
              {t.activeUntil}
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
            {t.scheduleHint(
              grandProjection.activeHours,
              grandProjection.raidsPerDay,
              grandProjection.raidsPerActiveHour.toFixed(1),
            )}
          </p>
        )}
      </div>

      {advanceMode && parsed && parsed.farmLists.length > 0 && (
        <div
          className="rounded-xl border p-4 space-y-4"
          style={{ background: C.surface, borderColor: `${C.gold}40` }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: C.gold }}>
            {t.advanceFeeding}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs mb-2" style={{ color: C.muted }}>
                {t.cropBalanceLabel}
              </label>
              <div className="flex gap-2">
                <select
                  value={cropBalanceSign}
                  onChange={(e) => setCropBalanceSign(e.target.value)}
                  aria-label={t.cropBalanceLabel}
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
                  placeholder={t.cropBalancePlaceholder}
                  aria-label={t.cropBalanceLabel}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm tabular-nums"
                  style={{
                    background: C.bg,
                    borderColor: cropBalanceDigits ? C.goldDim : C.border,
                    color: C.text,
                  }}
                />
              </div>
              <span className="text-xs mt-1 block" style={{ color: C.muted }}>
                {t.cropBalanceHint}
              </span>
            </div>

            <div>
              <label className="block text-xs mb-2" style={{ color: C.muted }}>
                {t.tradeRoutesLabel}
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={tradeRoutesDigits}
                onChange={(e) => setTradeRoutesDigits(e.target.value.replace(/\D/g, ''))}
                placeholder={t.tradeRoutesPlaceholder}
                aria-label={t.tradeRoutesLabel}
                className="w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                style={{
                  background: C.bg,
                  borderColor: tradeRoutesDigits ? C.goldDim : C.border,
                  color: C.text,
                }}
              />
              <span className="text-xs mt-1 block" style={{ color: C.muted }}>
                {t.tradeRoutesHint}
              </span>
            </div>
          </div>

          {parsed.villages.length > 0 && (
            <div>
              <label className="block text-xs mb-2" style={{ color: C.muted }}>
                {t.sendingVillage}
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
              {t.farmListsInclude}
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
                      {formatNum(list.perRaidTotals.crop, lang)}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <FeedingBalancePanel feeding={feeding} schedule={schedule} t={t} lang={lang} />
        </div>
      )}

      {parsed && parsed.farmLists.length > 0 && grandProjection && (
        <>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold" style={{ color: C.heading }}>
              {advanceMode && selectedListIds.size > 0 ? t.totalsSelected : t.totalsAll}
            </h2>
            <button
              type="button"
              onClick={copySummary}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors hover:bg-[#241d14]"
              style={{ borderColor: C.border, color: C.text }}
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? t.copied : t.copySummary}
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <ResourceBlock
              title={t.perClick}
              resources={grandProjection.perClick}
              labels={t.resources}
              lang={lang}
            />
            <ResourceBlock
              title={t.perActiveHour}
              resources={grandProjection.perHour}
              accent={C.gold}
              labels={t.resources}
              lang={lang}
            />
            <ResourceBlock
              title={t.perDay}
              resources={grandProjection.perDay}
              accent={R.crop.value}
              labels={t.resources}
              lang={lang}
            />
          </div>

          {advanceMode && recommendations.length > 0 && (
            <div
              className="rounded-xl border p-4 space-y-3"
              style={{ background: C.surface, borderColor: C.border }}
            >
              <h2 className="text-lg font-semibold" style={{ color: C.heading }}>
                {t.troopRecs}
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
                              {t.natars}
                            </span>
                          )}
                        </div>
                        <div style={{ color: C.muted }}>{rec.message}</div>
                        <div className="text-xs mt-1" style={{ color: C.muted }}>
                          {t.troopsCarry(
                            rec.troopLabel,
                            formatPercent(rec.utilization),
                            formatNum(rec.bootyMax, lang),
                          )}
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
              {t.farmLists}
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
                t={t}
                lang={lang}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
