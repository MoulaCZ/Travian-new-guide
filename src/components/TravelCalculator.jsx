import { useState, useCallback, useMemo, useEffect } from 'react'
import { Shield, Copy, Check, Plus, Trash2, Settings2 } from 'lucide-react'
import { parseCoordsInput, formatCoordsForInput } from '../utils/coordParse'
import { parseOwnUnitsPaste } from '../utils/travelPasteParser'
import {
  TRIBE_UNIT_COLUMNS,
  DEFAULT_DEF_UNIT_PRESET,
  MIN_DEF_UNITS_THRESHOLD,
  HERO_STANDARD_OPTIONS,
  getUnitLabel,
} from '../data/travelUnits.js'
import { TRIBE_LABELS } from '../data/units.js'
import {
  computeMarchTimes,
  formatTravelTime,
} from '../utils/travelTime.js'

const C = {
  bg: '#0f0c09',
  surface: '#1a1510',
  surface2: '#241d14',
  border: '#3e3226',
  gold: '#f0a820',
  text: '#d4c4a8',
  muted: '#7a6a55',
  win: '#4ade80',
  bad: '#f87171',
}

const TRIBE_OPTIONS = [
  { id: 'teuton', label: 'Teutons' },
  { id: 'roman', label: 'Romans' },
  { id: 'gaul', label: 'Gauls' },
]

const PRESET_LS = 'travian-travel-def-preset-v1'
const TRIBE_LS = 'travian-travel-tribe-v1'
const HERO_LS = 'travian-travel-hero-standard-v1'

function villageKey(v) {
  return `${v.name}|${v.coords?.x ?? ''}|${v.coords?.y ?? ''}`
}

function sumDefUnits(counts, preset) {
  let t = 0
  for (const [id, on] of Object.entries(preset)) {
    if (!on) continue
    t += counts[id] ?? 0
  }
  return t
}

function loadPreset(tribe) {
  try {
    const raw = localStorage.getItem(PRESET_LS)
    if (raw) {
      const all = JSON.parse(raw)
      if (all[tribe]) return { ...DEFAULT_DEF_UNIT_PRESET[tribe], ...all[tribe] }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_DEF_UNIT_PRESET[tribe] }
}

function savePreset(tribe, preset) {
  try {
    const raw = localStorage.getItem(PRESET_LS)
    const all = raw ? JSON.parse(raw) : {}
    all[tribe] = preset
    localStorage.setItem(PRESET_LS, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

export default function TravelCalculator() {
  const [paste, setPaste] = useState('')
  const [tribe, setTribe] = useState(() => {
    try {
      return localStorage.getItem(TRIBE_LS) || 'teuton'
    } catch {
      return 'teuton'
    }
  })
  const [defPreset, setDefPreset] = useState(() => loadPreset('teuton'))
  const [targets, setTargets] = useState([{ id: 1, label: 'Target A', raw: '' }])
  const [heroStandard, setHeroStandard] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem(HERO_LS) ?? '0', 10)
      return Number.isFinite(v) ? v : 0
    } catch {
      return 0
    }
  })
  const [villages, setVillages] = useState([])
  const [parseNotes, setParseNotes] = useState([])
  const [copied, setCopied] = useState(false)
  const [nextTargetId, setNextTargetId] = useState(2)
  const [showPreset, setShowPreset] = useState(true)

  useEffect(() => {
    setDefPreset(loadPreset(tribe))
    try {
      localStorage.setItem(TRIBE_LS, tribe)
    } catch {
      /* ignore */
    }
  }, [tribe])

  useEffect(() => {
    try {
      localStorage.setItem(HERO_LS, String(heroStandard))
    } catch {
      /* ignore */
    }
  }, [heroStandard])

  const unitColumns = TRIBE_UNIT_COLUMNS[tribe] ?? []
  const heroPct = HERO_STANDARD_OPTIONS.find((o) => o.id === heroStandard)?.pct ?? 0

  const parsedTargets = useMemo(
    () =>
      targets.map((t) => ({
        ...t,
        coords: parseCoordsInput(t.raw),
      })),
    [targets],
  )

  const activeUnitIds = useMemo(
    () => unitColumns.filter((id) => defPreset[id]),
    [unitColumns, defPreset],
  )

  const handleParse = useCallback(() => {
    const { villages: parsed, notes } = parseOwnUnitsPaste(paste, tribe)
    const preset = loadPreset(tribe)
    const withState = parsed.map((v) => {
      const defTotal = sumDefUnits(v.counts, preset)
      return {
        ...v,
        enabled: defTotal >= MIN_DEF_UNITS_THRESHOLD && !!v.coords,
        counts: { ...v.counts },
        defTotal,
        tournamentLevel: 0,
        heroHere: false,
      }
    })
    setVillages(withState)
    setParseNotes(notes)
  }, [paste, tribe])

  const togglePreset = (unitId) => {
    setDefPreset((prev) => {
      const next = { ...prev, [unitId]: !prev[unitId] }
      savePreset(tribe, next)
      setVillages((rows) =>
        rows.map((v) => ({
          ...v,
          defTotal: sumDefUnits(v.counts, next),
          enabled: sumDefUnits(v.counts, next) >= MIN_DEF_UNITS_THRESHOLD && !!v.coords,
        })),
      )
      return next
    })
  }

  const patchVillage = (vKey, patch) => {
    setVillages((rows) =>
      rows.map((v) => (villageKey(v) === vKey ? { ...v, ...patch } : v)),
    )
  }

  const updateCount = (vKey, unitId, value) => {
    const n = Math.max(0, parseInt(String(value).replace(/\D/g, ''), 10) || 0)
    setVillages((rows) =>
      rows.map((v) => {
        if (villageKey(v) !== vKey) return v
        const counts = { ...v.counts, [unitId]: n }
        return { ...v, counts, defTotal: sumDefUnits(counts, defPreset) }
      }),
    )
  }

  const setVillageHeroExclusive = (vKey, on) => {
    setVillages((rows) =>
      rows.map((v) => {
        if (villageKey(v) === vKey) return { ...v, heroHere: on }
        if (on && v.heroHere) return { ...v, heroHere: false }
        return v
      }),
    )
  }

  const marchRows = useMemo(() => {
    const enabled = villages.filter((v) => v.enabled && v.coords)
    const validTargets = parsedTargets.filter((t) => t.coords)
    if (!enabled.length || !validTargets.length || !activeUnitIds.length) return []

    const rows = []
    for (const v of enabled) {
      const bonuses = {
        tournamentLevel: v.tournamentLevel ?? 0,
        heroBonusPct: v.heroHere ? heroPct : 0,
      }
      for (const t of validTargets) {
        const march = computeMarchTimes(v.counts, activeUnitIds, v.coords, t.coords, bonuses)
        for (const u of march.unitTimes) {
          rows.push({
            from: v.name,
            fromCoords: v.coords,
            to: t.label,
            toCoords: t.coords,
            unitId: u.unitId,
            unitLabel: getUnitLabel(tribe, u.unitId),
            amount: u.count,
            seconds: u.seconds,
            slowestSeconds: march.totalSeconds,
            distance: march.distance,
            heroApplied: v.heroHere && heroPct > 0,
            tournamentLevel: v.tournamentLevel ?? 0,
          })
        }
      }
    }
    return rows
  }, [villages, parsedTargets, activeUnitIds, heroPct, tribe])

  const buildCopyReport = useCallback(() => {
    if (!marchRows.length) return ''

    // Group by source village, then by target — one block per village.
    const byVillage = new Map()
    for (const r of marchRows) {
      const key = `${r.from}|${r.fromCoords?.x ?? ''}|${r.fromCoords?.y ?? ''}`
      if (!byVillage.has(key)) {
        byVillage.set(key, { from: r.from, fromCoords: r.fromCoords, targets: new Map() })
      }
      const entry = byVillage.get(key)
      const tKey = `${r.to}|${r.toCoords?.x ?? ''}|${r.toCoords?.y ?? ''}`
      if (!entry.targets.has(tKey)) {
        entry.targets.set(tKey, {
          to: r.to,
          toCoords: r.toCoords,
          distance: r.distance,
          slowestSeconds: r.slowestSeconds,
          units: [],
        })
      }
      entry.targets.get(tKey).units.push({
        label: r.unitLabel,
        amount: r.amount,
        seconds: r.seconds,
      })
    }

    const lines = []
    lines.push('**Defense incoming**')
    lines.push('```')
    for (const v of byVillage.values()) {
      const vCoords = v.fromCoords ? ` (${formatCoordsForInput(v.fromCoords)})` : ''
      lines.push(`${v.from}${vCoords}`)
      for (const t of v.targets.values()) {
        const tCoords = t.toCoords ? ` ${formatCoordsForInput(t.toCoords)}` : ''
        const distance = Number.isFinite(t.distance) ? ` · ${t.distance.toFixed(1)}f` : ''
        lines.push(`  → ${t.to}${tCoords}${distance} — ETA ${formatTravelTime(t.slowestSeconds)}`)
        // Sort units by speed (slowest first matches the ETA).
        const sorted = [...t.units].sort((a, b) => b.seconds - a.seconds)
        for (const u of sorted) {
          const amount = u.amount.toLocaleString('en-US')
          lines.push(`      ${u.label.padEnd(18, ' ')} ${amount.padStart(7, ' ')}   ${formatTravelTime(u.seconds)}`)
        }
      }
      lines.push('')
    }
    // Drop trailing blank line before closing fence.
    if (lines[lines.length - 1] === '') lines.pop()
    lines.push('```')
    return lines.join('\n')
  }, [marchRows])

  const copyReport = async () => {
    const text = buildCopyReport()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const addTarget = () => {
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const idx = nextTargetId - 1
    setTargets((t) => [
      ...t,
      { id: nextTargetId, label: `Target ${labels[idx] ?? idx}`, raw: '' },
    ])
    setNextTargetId((n) => n + 1)
  }

  const removeTarget = (id) => {
    setTargets((t) => (t.length <= 1 ? t : t.filter((x) => x.id !== id)))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center border"
          style={{ borderColor: C.gold + '55', background: C.gold + '15' }}
        >
          <Shield className="w-5 h-5" style={{ color: C.gold }} />
        </div>
        <div>
          <h1
            className="text-xl font-bold tracking-wide"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#f0e6d0' }}
          >
            Defense Travel
          </h1>
          <p className="text-sm" style={{ color: C.muted }}>
            Paste own units → pick targets → travel times per unit, per village (Legends).
          </p>
        </div>
      </div>

      {/* 1. Tribe + paste */}
      <section
        className="rounded-xl border p-4 space-y-3"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wider" style={{ color: C.muted }}>
            Tribe:
          </span>
          {TRIBE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTribe(opt.id)}
              className="px-3 py-1 rounded-lg border text-sm transition-colors"
              style={{
                borderColor: tribe === opt.id ? C.gold : C.border,
                background: tribe === opt.id ? C.gold + '22' : C.surface2,
                color: tribe === opt.id ? C.gold : C.text,
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowPreset((s) => !s)}
            className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded border"
            style={{ borderColor: C.border, color: C.muted }}
          >
            <Settings2 className="w-3.5 h-3.5" />
            {showPreset ? 'Hide def preset' : 'Edit def preset'}
          </button>
        </div>

        {showPreset && (
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: C.border, background: C.bg }}
          >
            <p className="text-xs mb-2" style={{ color: C.muted }}>
              Checked types count toward the {MIN_DEF_UNITS_THRESHOLD} def threshold and travel
              time (slowest selected unit wins).
            </p>
            <div className="flex flex-wrap gap-2">
              {unitColumns
                .filter((id) => id !== 'hero')
                .map((id) => (
                  <label
                    key={id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded border text-xs cursor-pointer"
                    style={{
                      borderColor: defPreset[id] ? C.gold + '66' : C.border,
                      background: defPreset[id] ? C.gold + '12' : 'transparent',
                      color: C.text,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!defPreset[id]}
                      onChange={() => togglePreset(id)}
                      className="accent-[#f0a820]"
                    />
                    {getUnitLabel(tribe, id)}
                  </label>
                ))}
            </div>
          </div>
        )}

        <label className="text-xs uppercase tracking-wider block" style={{ color: C.muted }}>
          Paste — Village overview → Units → <strong>Jednotky ve vesnicích</strong> (Units in
          villages) — Ctrl+A
        </label>
        <p className="text-[11px] -mt-1" style={{ color: C.muted }}>
          Use "Units in villages" so units away (raiding / reinforcing) are <em>not</em> counted.
          Only the first unit table per village (matching your tribe) is read — reinforcements from
          other tribes and captured nature are ignored. The older "Vlastní jednotky" wide-table
          paste still works as a fallback.
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={6}
          placeholder="Ctrl+A on the Units in villages page (include the village list in the footer for coordinates), then paste here."
          className="w-full rounded-lg border px-3 py-2 text-sm font-mono resize-y"
          style={{ background: C.bg, borderColor: C.border, color: C.text }}
        />
        <button
          type="button"
          onClick={handleParse}
          disabled={!paste.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
          style={{ background: C.gold, color: '#1a1510' }}
        >
          Parse villages
        </button>
        {parseNotes.length > 0 && (
          <ul className="text-xs space-y-1" style={{ color: C.muted }}>
            {parseNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. Targets */}
      <section
        className="rounded-xl border p-4 space-y-3"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wider" style={{ color: C.muted }}>
            Targets — paste Travian map URL or type coordinates
          </p>
          <button
            type="button"
            onClick={addTarget}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded border"
            style={{ borderColor: C.border, color: C.gold }}
          >
            <Plus className="w-3 h-3" /> Add target
          </button>
        </div>
        <p className="text-[11px]" style={{ color: C.muted }}>
          Accepted formats: <code>-196|-33</code> · <code>(−196 | −33)</code> ·{' '}
          <code>X: -196 Y: -33</code> · <code>https://…/karte.php?x=-196&y=-33</code>
        </p>
        {targets.map((t) => {
          const parsed = parseCoordsInput(t.raw)
          return (
            <div key={t.id} className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={t.label}
                onChange={(e) =>
                  setTargets((rows) =>
                    rows.map((r) => (r.id === t.id ? { ...r, label: e.target.value } : r)),
                  )
                }
                className="w-32 rounded border px-2 py-1 text-sm"
                style={{ background: C.bg, borderColor: C.border, color: C.text }}
              />
              <input
                type="text"
                value={t.raw}
                onChange={(e) =>
                  setTargets((rows) =>
                    rows.map((r) => (r.id === t.id ? { ...r, raw: e.target.value } : r)),
                  )
                }
                placeholder="-196|-33  or  https://…/karte.php?x=-196&y=-33"
                className="flex-1 min-w-[220px] rounded border px-2 py-1 text-sm font-mono"
                style={{
                  background: C.bg,
                  borderColor: t.raw ? (parsed ? C.border : C.bad) : C.border,
                  color: C.text,
                }}
              />
              <span
                className="text-xs font-mono w-24 text-center"
                style={{ color: parsed ? C.win : C.muted }}
              >
                {parsed ? formatCoordsForInput(parsed) : t.raw ? 'invalid' : '—'}
              </span>
              {targets.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTarget(t.id)}
                  className="p-1.5 rounded border"
                  style={{ borderColor: C.border, color: C.muted }}
                  aria-label="Remove target"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
      </section>

      {/* 3. Hero standard */}
      <section
        className="rounded-xl border p-4 space-y-2"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <p className="text-xs uppercase tracking-wider" style={{ color: C.muted }}>
          Hero alliance standard (one hero across the account)
        </p>
        <div className="flex flex-wrap gap-2">
          {HERO_STANDARD_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setHeroStandard(o.id)}
              className="px-3 py-1 rounded border text-xs"
              style={{
                borderColor: heroStandard === o.id ? C.gold : C.border,
                background: heroStandard === o.id ? C.gold + '22' : C.surface2,
                color: heroStandard === o.id ? C.gold : C.text,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[11px]" style={{ color: C.muted }}>
          Then tick the village where the hero physically is — only that village gets the speed bonus.
        </p>
      </section>

      {/* 4. Villages */}
      {villages.length > 0 && (
        <section
          className="rounded-xl border overflow-hidden"
          style={{ background: C.surface, borderColor: C.border }}
        >
          <div
            className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2"
            style={{ borderColor: C.border }}
          >
            <span className="text-sm font-medium" style={{ color: C.text }}>
              {villages.length} villages — default off if &lt; {MIN_DEF_UNITS_THRESHOLD} def units.
              Set TS level + hero per village.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                  <th className="text-left p-2 w-8">Send</th>
                  <th className="text-left p-2">Village</th>
                  <th className="text-right p-2">Def</th>
                  <th className="text-center p-2 w-20">TS lvl</th>
                  <th className="text-center p-2 w-16">Hero</th>
                  <th className="text-left p-2">Unit counts (editable)</th>
                </tr>
              </thead>
              <tbody>
                {villages.map((v) => {
                  const vKey = villageKey(v)
                  return (
                    <tr
                      key={vKey}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        opacity: v.enabled ? 1 : 0.55,
                      }}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={v.enabled}
                          onChange={() => patchVillage(vKey, { enabled: !v.enabled })}
                          disabled={!v.coords}
                          className="accent-[#f0a820]"
                        />
                      </td>
                      <td className="p-2" style={{ color: C.text }}>
                        {v.name}
                        {v.coords && (
                          <span className="text-xs font-mono ml-1" style={{ color: C.muted }}>
                            ({formatCoordsForInput(v.coords)})
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono" style={{ color: C.muted }}>
                        {v.defTotal.toLocaleString('en-US')}
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={v.tournamentLevel ?? 0}
                          onChange={(e) =>
                            patchVillage(vKey, {
                              tournamentLevel: Math.min(
                                20,
                                Math.max(0, parseInt(e.target.value, 10) || 0),
                              ),
                            })
                          }
                          className="w-14 rounded border px-1 py-0.5 font-mono text-right"
                          style={{ background: C.bg, borderColor: C.border, color: C.text }}
                          title="Tournament square level (+20% per level if distance > 20 fields)"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!v.heroHere}
                          onChange={(e) => setVillageHeroExclusive(vKey, e.target.checked)}
                          disabled={heroPct === 0}
                          className="accent-[#f0a820]"
                          title={
                            heroPct === 0
                              ? 'Pick a hero standard above first'
                              : `Apply +${heroPct}% hero bonus to this village`
                          }
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1.5">
                          {unitColumns
                            .filter((id) => id !== 'hero' && defPreset[id])
                            .map((id) => (
                              <label
                                key={id}
                                className="flex items-center gap-1 text-[11px]"
                                style={{ color: C.muted }}
                              >
                                <span className="truncate max-w-[80px]">
                                  {getUnitLabel(tribe, id)}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  value={v.counts[id] ?? 0}
                                  onChange={(e) => updateCount(vKey, id, e.target.value)}
                                  className="w-16 rounded border px-1 py-0.5 font-mono text-right text-xs"
                                  style={{
                                    background: C.bg,
                                    borderColor: C.border,
                                    color: C.text,
                                  }}
                                />
                              </label>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. Results */}
      {marchRows.length > 0 && (
        <section
          className="rounded-xl border overflow-hidden"
          style={{ background: C.surface, borderColor: C.border }}
        >
          <div
            className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2"
            style={{ borderColor: C.border }}
          >
            <span className="text-sm font-medium" style={{ color: C.text }}>
              Travel times ({marchRows.length} rows)
            </span>
            <button
              type="button"
              onClick={copyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs"
              style={{ borderColor: C.border, color: C.gold }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy report'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                  <th className="text-left p-2">From</th>
                  <th className="text-left p-2">To</th>
                  <th className="text-left p-2">Unit</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-right p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {marchRows.map((r, i) => {
                  const isSlowest = r.seconds === r.slowestSeconds
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: `1px solid ${C.border}` }}
                    >
                      <td className="p-2" style={{ color: C.text }}>
                        {r.from}
                      </td>
                      <td className="p-2" style={{ color: C.text }}>
                        {r.to}{' '}
                        <span className="text-xs font-mono" style={{ color: C.muted }}>
                          {formatCoordsForInput(r.toCoords)}
                        </span>
                      </td>
                      <td className="p-2" style={{ color: C.text }}>
                        {r.unitLabel}
                      </td>
                      <td className="p-2 text-right font-mono" style={{ color: C.text }}>
                        {r.amount.toLocaleString('en-US')}
                      </td>
                      <td
                        className="p-2 text-right font-mono"
                        style={{
                          color: isSlowest ? C.win : C.text,
                          fontWeight: isSlowest ? 700 : 400,
                        }}
                        title={isSlowest ? 'Slowest unit — whole stack moves at this speed' : ''}
                      >
                        {formatTravelTime(r.seconds)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-[11px]" style={{ color: C.muted }}>
            Bold green = slowest unit in that march (whole army moves at this speed).
          </div>
        </section>
      )}
    </div>
  )
}
