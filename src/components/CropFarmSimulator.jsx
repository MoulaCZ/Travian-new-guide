import { useState, useMemo, useCallback, useEffect } from 'react'
import { Sprout, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import {
  parseFarmListPaste,
  projectFarmLoot,
  formatNum,
  resourceTotal,
} from '../utils/farmListPasteParser'

const C = {
  bg: '#0f0c09',
  surface: '#1a1510',
  surface2: '#241d14',
  surfaceLift: '#2c241a',
  border: '#4a3d30',
  gold: '#f0a820',
  text: '#e8dcc8',
  muted: '#a89880',
  heading: '#f0e6d0',
}

/** Resource colors tuned for dark backgrounds — labels dim, values bright */
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
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b" style={{ borderColor: C.border }}>
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

function FarmListCard({ list, schedule, expanded, onToggle }) {
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
      style={{ background: C.surface, borderColor: C.border }}
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
                              <div className="truncate max-w-[200px] font-medium">{slot.targetName}</div>
                              {slot.coords && (
                                <div className="text-xs" style={{ color: C.muted }}>
                                  ({slot.coords.x}|{slot.coords.y})
                                </div>
                              )}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums font-medium"
                              style={{ color: C.muted }}
                            >
                              {slot.distance != null ? slot.distance.toFixed(1) : '—'}
                            </td>
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

  const grandProjection = useMemo(() => {
    if (!parsed?.farmLists.length) return null
    return projectFarmLoot(parsed.grandTotals, schedule)
  }, [parsed, schedule])

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
    const lines = [
      `Farm loot simulator — ${schedule.startHour}:00–${schedule.endHour}:00, every ${schedule.intervalMinutes} min`,
      `Raids per day: ${grandProjection.raidsPerDay} (${grandProjection.raidsPerActiveHour.toFixed(1)}/h active)`,
      '',
      'Per click (sum of last raids on all lists):',
      `  lumber ${formatNum(grandProjection.perClick.lumber)} | clay ${formatNum(grandProjection.perClick.clay)} | iron ${formatNum(grandProjection.perClick.iron)} | crop ${formatNum(grandProjection.perClick.crop)}`,
      '',
      'Per active hour:',
      `  lumber ${formatNum(grandProjection.perHour.lumber)} | clay ${formatNum(grandProjection.perHour.clay)} | iron ${formatNum(grandProjection.perHour.iron)} | crop ${formatNum(grandProjection.perHour.crop)}`,
      '',
      'Per day:',
      `  lumber ${formatNum(grandProjection.perDay.lumber)} | clay ${formatNum(grandProjection.perDay.clay)} | iron ${formatNum(grandProjection.perDay.iron)} | crop ${formatNum(grandProjection.perDay.crop)}`,
      '',
      'By farm list (crop / total per click):',
      ...parsed.farmLists.map(
        (l) =>
          `  ${l.name}: crop ${formatNum(l.perRaidTotals.crop)}, total ${formatNum(resourceTotal(l.perRaidTotals))}`,
      ),
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [parsed, grandProjection, schedule])

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
            day from your raid interval and playing window.
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
                For <strong>each</strong> farm list, click the arrow on the right to expand it (arrows
                in the red circles in the screenshot).
              </li>
              <li>
                Open the <strong>page source</strong>: right-click → <em>View page source</em>, or
                press <kbd className="px-1.5 py-0.5 rounded text-xs border" style={{ borderColor: C.border, background: C.bg }}>Ctrl+U</kbd>
                {' '}(<kbd className="px-1.5 py-0.5 rounded text-xs border" style={{ borderColor: C.border, background: C.bg }}>⌘+Option+U</kbd> on Mac).
              </li>
              <li>
                In the source view: <kbd className="px-1.5 py-0.5 rounded text-xs border" style={{ borderColor: C.border, background: C.bg }}>Ctrl+A</kbd>
                {' → '}
                <kbd className="px-1.5 py-0.5 rounded text-xs border" style={{ borderColor: C.border, background: C.bg }}>Ctrl+C</kbd>
                , then paste here with{' '}
                <kbd className="px-1.5 py-0.5 rounded text-xs border" style={{ borderColor: C.border, background: C.bg }}>Ctrl+V</kbd>
                .
              </li>
            </ol>
            <figure className="space-y-2">
              <img
                src={FARM_LIST_EXPAND_IMG}
                alt="Travian Farm List — expand every list using the arrow on the right of each row"
                className="w-full max-w-2xl rounded-lg border"
                style={{ borderColor: C.border }}
              />
              <figcaption className="text-xs" style={{ color: C.muted }}>
                Expand all farm lists, then View page source and copy from there.
              </figcaption>
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
          onChange={(e) => setPaste(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={8}
          className="w-full rounded-lg border px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-1"
          style={{
            background: C.bg,
            borderColor: C.border,
            color: C.text,
            focusRingColor: C.gold,
          }}
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
        className="rounded-xl border p-4"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: C.muted }}>
          Raid schedule
        </h2>
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
          <p className="text-xs mt-3" style={{ color: C.muted }}>
            {grandProjection.activeHours}h window → ~{grandProjection.raidsPerDay} raid clicks/day
            ({grandProjection.raidsPerActiveHour.toFixed(1)} per active hour)
          </p>
        )}
      </div>

      {parsed && parsed.farmLists.length > 0 && grandProjection && (
        <>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold" style={{ color: C.heading }}>
              Totals (all lists)
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
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
