import { useState, useMemo, useCallback } from 'react'
import {
  Warehouse,
  ExternalLink,
  AlertTriangle,
  Copy,
  Check,
  Wheat,
} from 'lucide-react'
import {
  parseWarehouseOverviewPaste,
  suggestMainVillageNames,
  buildSendPlan,
  flaggedResources,
  formatDuration,
  formatNum,
  MAIN_CROP_LOW_PCT,
  FEEDER_HIGH_PCT,
  FEEDER_LEAVE_PCT,
  buildMarketplaceUrl,
} from '../utils/warehouseOverviewParser'

const C = {
  bg: '#0f0c09',
  surface: '#1a1510',
  surface2: '#241d14',
  border: '#4a3d30',
  gold: '#f0a820',
  text: '#e8dcc8',
  muted: '#a89880',
  heading: '#f0e6d0',
  ok: '#4ade80',
  bad: '#f87171',
}

const RES_LABEL = {
  lumber: 'Wood',
  clay: 'Clay',
  iron: 'Iron',
  crop: 'Crop',
}

const RES_COLOR = {
  lumber: '#e8c4a0',
  clay: '#fb923c',
  iron: '#7dd3fc',
  crop: '#fde047',
}

function PctCell({ value, flagged }) {
  return (
    <td
      className="px-2 py-1.5 text-right tabular-nums font-medium"
      style={{
        color: flagged ? C.bad : C.text,
        background: flagged ? `${C.bad}18` : undefined,
        boxShadow: flagged ? `inset 0 0 0 1px ${C.bad}55` : undefined,
      }}
    >
      {value}%
    </td>
  )
}

export default function WarehouseOptimizer() {
  const [paste, setPaste] = useState('')
  const [mainNames, setMainNames] = useState(() => new Set())
  const [mainsTouched, setMainsTouched] = useState(false)
  const [copied, setCopied] = useState(false)

  const parsed = useMemo(() => parseWarehouseOverviewPaste(paste), [paste])

  const villages = parsed?.villages ?? []
  const serverBase = parsed?.serverBase ?? 'https://ts10.x1.europe.travian.com'
  const notes = parsed?.notes ?? []

  // Auto-suggest mains (crop deficit) until user toggles manually
  const effectiveMains = useMemo(() => {
    if (mainsTouched) return mainNames
    if (!villages.length) return mainNames
    return new Set(suggestMainVillageNames(villages))
  }, [mainsTouched, mainNames, villages])

  const plan = useMemo(
    () => buildSendPlan(villages, effectiveMains, serverBase),
    [villages, effectiveMains, serverBase],
  )

  const onPaste = useCallback((e) => {
    const text = e.target.value
    setPaste(text)
    setMainsTouched(false)
    const result = parseWarehouseOverviewPaste(text)
    if (result?.villages?.length) {
      setMainNames(new Set(suggestMainVillageNames(result.villages)))
    } else {
      setMainNames(new Set())
    }
  }, [])

  const toggleMain = (name) => {
    setMainsTouched(true)
    setMainNames((prev) => {
      const next = new Set(effectiveMains)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const selectDeficitMains = () => {
    setMainsTouched(true)
    setMainNames(new Set(suggestMainVillageNames(villages)))
  }

  const clearMains = () => {
    setMainsTouched(true)
    setMainNames(new Set())
  }

  const copyPlan = async () => {
    if (!plan.length) return
    const lines = [
      `Warehouse optimizer — leave feeders at ~${FEEDER_LEAVE_PCT}%`,
      `Mains: ${[...effectiveMains].join(', ') || '(none)'}`,
      '',
      ...plan.map((t) => {
        const amt = t.amountIsAbsolute
          ? `${formatNum(t.sendAmount)} ${RES_LABEL[t.resource]}`
          : `~${t.sendPctPoints}% of capacity ${RES_LABEL[t.resource]}`
        return `• ${t.from} → ${t.to}: ${amt} (${t.fromPct}% → ~${t.leavePct}%)${t.marketUrl ? `\n  Market: ${t.marketUrl}` : ''}`
      }),
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0"
          style={{ borderColor: `${C.gold}55`, background: `${C.gold}15` }}
        >
          <Warehouse className="w-5 h-5" style={{ color: C.gold }} />
        </div>
        <div>
          <h1
            className="text-xl font-bold tracking-wide"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: C.heading }}
          >
            Warehouse Optimizer
          </h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>
            Paste Village overview → Resources. Mark troop villages as mains. Squeeze feeders
            (leave ~{FEEDER_LEAVE_PCT}%) into mains that need crop / materials.
          </p>
        </div>
      </div>

      <section
        className="rounded-xl border p-4 space-y-3"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <label className="block text-sm font-medium" style={{ color: C.gold }}>
          Paste warehouse overview
        </label>
        <p className="text-xs" style={{ color: C.muted }}>
          Travian → Village overview → <strong style={{ color: C.text }}>Resources → Warehouse</strong>.
          Paste <strong style={{ color: C.text }}>Ctrl+U</strong> page source (best: village IDs + absolute
          stock) or the visible table.
        </p>
        <textarea
          value={paste}
          onChange={onPaste}
          rows={8}
          placeholder="Paste Ctrl+U source of /village/statistics/resources/warehouse …"
          className="w-full rounded-lg border px-3 py-2 text-sm font-mono resize-y"
          style={{
            background: C.bg,
            borderColor: C.border,
            color: C.text,
          }}
        />
        {notes.map((n) => (
          <div
            key={n}
            className="flex items-start gap-2 text-xs rounded-lg border px-3 py-2"
            style={{ borderColor: `${C.gold}40`, color: C.muted, background: `${C.gold}08` }}
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: C.gold }} />
            {n}
          </div>
        ))}
      </section>

      {villages.length > 0 && (
        <>
          <section
            className="rounded-xl border p-4 space-y-3"
            style={{ background: C.surface, borderColor: C.border }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold" style={{ color: C.heading }}>
                Main villages (troop producers)
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectDeficitMains}
                  className="text-xs px-2.5 py-1.5 rounded-lg border"
                  style={{ borderColor: C.border, color: C.gold }}
                >
                  Auto: crop deficit
                </button>
                <button
                  type="button"
                  onClick={clearMains}
                  className="text-xs px-2.5 py-1.5 rounded-lg border"
                  style={{ borderColor: C.border, color: C.muted }}
                >
                  Clear
                </button>
              </div>
            </div>
            <p className="text-xs" style={{ color: C.muted }}>
              Pre-selected villages with emptying granary (negative crop duration). Click to toggle.
              Mains: crop &lt; {MAIN_CROP_LOW_PCT}% is red. Feeders: any resource &gt; {FEEDER_HIGH_PCT}% is
              red.
            </p>
            <div className="flex flex-wrap gap-2">
              {villages.map((v) => {
                const on = effectiveMains.has(v.name)
                return (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => toggleMain(v.name)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                    style={{
                      borderColor: on ? `${C.gold}90` : C.border,
                      background: on ? `${C.gold}18` : C.bg,
                      color: on ? C.gold : C.text,
                    }}
                  >
                    {on ? '★ ' : ''}
                    {v.name}
                    {v.cropDeficit ? ' · deficit' : ''}
                  </button>
                )
              })}
            </div>
          </section>

          <section
            className="rounded-xl border overflow-hidden"
            style={{ background: C.surface, borderColor: C.border }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
              <h2 className="text-lg font-semibold" style={{ color: C.heading }}>
                Warehouse fill
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: C.muted, background: C.surface2 }}>
                    <th className="text-left px-3 py-2 font-medium">Village</th>
                    <th className="text-left px-2 py-2 font-medium">Role</th>
                    <th className="text-right px-2 py-2 font-medium" style={{ color: RES_COLOR.lumber }}>
                      Wood
                    </th>
                    <th className="text-right px-2 py-2 font-medium" style={{ color: RES_COLOR.clay }}>
                      Clay
                    </th>
                    <th className="text-right px-2 py-2 font-medium" style={{ color: RES_COLOR.iron }}>
                      Iron
                    </th>
                    <th className="text-right px-2 py-2 font-medium" style={{ color: RES_COLOR.crop }}>
                      Crop
                    </th>
                    <th className="text-right px-3 py-2 font-medium">Granary</th>
                  </tr>
                </thead>
                <tbody>
                  {villages.map((v) => {
                    const isMain = effectiveMains.has(v.name)
                    const flags = new Set(flaggedResources(v, isMain))
                    return (
                      <tr
                        key={v.name}
                        className="border-t"
                        style={{ borderColor: C.border }}
                      >
                        <td className="px-3 py-1.5 font-medium" style={{ color: C.text }}>
                          {v.name}
                          {v.coords && (
                            <span className="ml-1 text-xs" style={{ color: C.muted }}>
                              ({v.coords.x}|{v.coords.y})
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
                            style={{
                              background: isMain ? `${C.gold}20` : `${C.muted}15`,
                              color: isMain ? C.gold : C.muted,
                            }}
                          >
                            {isMain ? 'main' : 'feeder'}
                          </span>
                        </td>
                        <PctCell value={v.lumberPct} flagged={flags.has('lumber')} />
                        <PctCell value={v.clayPct} flagged={flags.has('clay')} />
                        <PctCell value={v.ironPct} flagged={flags.has('iron')} />
                        <PctCell value={v.cropPct} flagged={flags.has('crop')} />
                        <td
                          className="px-3 py-1.5 text-right text-xs tabular-nums"
                          style={{ color: v.cropDeficit ? C.bad : C.muted }}
                        >
                          {formatDuration(v.granaryDuration)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section
            className="rounded-xl border p-4 space-y-4"
            style={{ background: C.surface, borderColor: C.border }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: C.heading }}>
                <Wheat className="w-5 h-5" style={{ color: C.gold }} />
                Send plan
              </h2>
              <button
                type="button"
                onClick={copyPlan}
                disabled={!plan.length}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: C.border, color: C.gold }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy plan'}
              </button>
            </div>
            <p className="text-xs" style={{ color: C.muted }}>
              With Ctrl+U paste, send amounts are absolute (leave ~{FEEDER_LEAVE_PCT}% in feeder).
              Market link opens send-tab on the <strong style={{ color: C.text }}>from</strong>{' '}
              village (<code>newdid</code>); pick <strong style={{ color: C.text }}>to</strong> as
              destination.
            </p>

            {!effectiveMains.size && (
              <div className="text-sm" style={{ color: C.bad }}>
                Select at least one main village to build a send plan.
              </div>
            )}

            {effectiveMains.size > 0 && !plan.length && (
              <div className="text-sm" style={{ color: C.muted }}>
                No feeder surpluses above {FEEDER_HIGH_PCT}% — nothing to squeeze right now.
              </div>
            )}

            <ul className="space-y-2">
              {plan.map((t) => (
                <li
                  key={`${t.from}-${t.to}-${t.resource}`}
                  className="rounded-lg border px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  style={{ background: C.surface2, borderColor: C.border }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium" style={{ color: C.text }}>
                      <span style={{ color: C.muted }}>{t.from}</span>
                      {' → '}
                      <span style={{ color: C.gold }}>{t.to}</span>
                      {' · '}
                      <span style={{ color: RES_COLOR[t.resource] }}>{RES_LABEL[t.resource]}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {t.fromPct}% → leave ~{t.leavePct}% · send{' '}
                      <strong style={{ color: C.text }}>
                        {t.amountIsAbsolute
                          ? formatNum(t.sendAmount)
                          : `≈${t.sendPctPoints}% of capacity`}
                      </strong>
                      {t.amountIsAbsolute ? ` ${RES_LABEL[t.resource].toLowerCase()}` : ''}
                      {' '}(receiver {t.toPct}%)
                      {t.fromId != null && (
                        <span className="ml-1 opacity-70">· id {t.fromId}</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={t.marketUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={
                      t.fromId != null
                        ? `Open marketplace in ${t.from} (newdid=${t.fromId})`
                        : `Open marketplace — switch to ${t.from} first if needed`
                    }
                    className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium self-start"
                    style={{
                      borderColor: C.border,
                      color: t.marketUrl ? C.gold : C.muted,
                      pointerEvents: t.marketUrl ? 'auto' : 'none',
                      opacity: t.marketUrl ? 1 : 0.5,
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Market ({t.from})
                  </a>
                </li>
              ))}
            </ul>

            {plan.length > 0 && plan.every((t) => t.fromId == null) && (
              <p className="text-xs" style={{ color: C.muted }}>
                Tip: marketplace links lack <code>newdid</code> — re-paste with Ctrl+U page source.
                Fallback:{' '}
                <code className="text-[10px]" style={{ color: C.text }}>
                  {buildMarketplaceUrl(serverBase, null)}
                </code>
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
