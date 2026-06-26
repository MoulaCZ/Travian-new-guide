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
  border: '#3e3226',
  gold: '#f0a820',
  text: '#d4c4a8',
  muted: '#7a6a55',
  crop: '#f0a820',
  lumber: '#8b5e3c',
  clay: '#d97706',
  iron: '#94a3b8',
}

const PLACEHOLDER =
  'Rally Point → Farm List tab: expand each farm list you want included, then Ctrl+A, Ctrl+C, paste here.'

function ResourceRow({ label, value, color }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span style={{ color: C.muted }}>{label}</span>
      <span className="tabular-nums font-medium" style={{ color: color ?? C.text }}>
        {formatNum(value)}
      </span>
    </div>
  )
}

function ResourceBlock({ title, resources, accent }) {
  const total = resourceTotal(resources)
  return (
    <div
      className="rounded-lg border p-4 space-y-2"
      style={{ background: C.surface2, borderColor: C.border }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs uppercase tracking-wide" style={{ color: C.muted }}>
          {title}
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: accent ?? C.gold }}>
          Σ {formatNum(total)}
        </span>
      </div>
      <ResourceRow label="Lumber" value={resources.lumber} color={C.lumber} />
      <ResourceRow label="Clay" value={resources.clay} color={C.clay} />
      <ResourceRow label="Iron" value={resources.iron} color={C.iron} />
      <ResourceRow label="Crop" value={resources.crop} color={C.crop} />
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
          <div className="text-sm font-semibold tabular-nums" style={{ color: C.crop }}>
            {formatNum(list.perRaidTotals.crop)} crop
          </div>
          <div className="text-xs tabular-nums" style={{ color: C.muted }}>
            {formatNum(resourceTotal(list.perRaidTotals))} / raid
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: C.border }}>
          <div className="grid sm:grid-cols-3 gap-3 pt-4">
            <ResourceBlock title="Per click (last raids)" resources={projection.perClick} />
            <ResourceBlock title="Per active hour" resources={projection.perHour} accent={C.gold} />
            <ResourceBlock title="Per day" resources={projection.perDay} accent={C.crop} />
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
                      <tr style={{ background: C.surface2, color: C.muted }}>
                        <th className="text-left px-3 py-2 font-medium">Target</th>
                        <th className="text-right px-3 py-2 font-medium">Dist</th>
                        <th className="text-right px-3 py-2 font-medium">Lumber</th>
                        <th className="text-right px-3 py-2 font-medium">Clay</th>
                        <th className="text-right px-3 py-2 font-medium">Iron</th>
                        <th className="text-right px-3 py-2 font-medium">Crop</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.slots.map((slot) => {
                        const r = slot.raidedResources
                        const inactive = !slot.isActive
                        return (
                          <tr
                            key={slot.id}
                            className="border-t"
                            style={{
                              borderColor: C.border,
                              opacity: inactive ? 0.55 : 1,
                              color: C.text,
                            }}
                          >
                            <td className="px-3 py-2">
                              <div className="truncate max-w-[200px]">{slot.targetName}</div>
                              {slot.coords && (
                                <div className="text-xs" style={{ color: C.muted }}>
                                  ({slot.coords.x}|{slot.coords.y})
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {slot.distance != null ? slot.distance.toFixed(1) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums"
                              style={{ color: r ? C.lumber : undefined }}
                            >
                              {r ? formatNum(r.lumber) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums"
                              style={{ color: r ? C.clay : undefined }}
                            >
                              {r ? formatNum(r.clay) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums"
                              style={{ color: r ? C.iron : undefined }}
                            >
                              {r ? formatNum(r.iron) : '—'}
                            </td>
                            <td
                              className="px-3 py-2 text-right tabular-nums"
                              style={{ color: r ? C.crop : undefined }}
                            >
                              {r ? formatNum(r.crop) : '—'}
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
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#f0e6d0' }}>
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
        className="rounded-xl border p-4 space-y-3"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <label className="block text-sm font-medium" style={{ color: C.text }}>
          Farm List HTML paste
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
            <h2 className="text-lg font-semibold" style={{ color: '#f0e6d0' }}>
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
            <ResourceBlock title="Per day" resources={grandProjection.perDay} accent={C.crop} />
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: '#f0e6d0' }}>
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
