import { useState, useCallback, useMemo, useEffect, Fragment } from 'react'
import { Shield, Copy, Check, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
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
  formatDistance,
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
}

const TRIBE_OPTIONS = [
  { id: 'teuton', label: 'Teutons' },
  { id: 'roman', label: 'Romans' },
  { id: 'gaul', label: 'Gauls' },
]

const PRESET_LS = 'travian-travel-def-preset-v1'
const TRIBE_LS = 'travian-travel-tribe-v1'

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
  const [tournamentLevel, setTournamentLevel] = useState(0)
  const [heroStandard, setHeroStandard] = useState(0)
  const [villages, setVillages] = useState([])
  const [parseNotes, setParseNotes] = useState([])
  const [expandedVillage, setExpandedVillage] = useState(null)
  const [copied, setCopied] = useState(false)
  const [nextTargetId, setNextTargetId] = useState(2)

  useEffect(() => {
    setDefPreset(loadPreset(tribe))
    try {
      localStorage.setItem(TRIBE_LS, tribe)
    } catch {
      /* ignore */
    }
  }, [tribe])

  const unitColumns = TRIBE_UNIT_COLUMNS[tribe] ?? []
  const heroPct = HERO_STANDARD_OPTIONS.find((o) => o.id === heroStandard)?.pct ?? 0
  const bonuses = useMemo(
    () => ({ tournamentLevel, heroBonusPct: heroPct }),
    [tournamentLevel, heroPct],
  )

  const parsedTargets = useMemo(() => {
    return targets.map((t) => {
      const coords = parseCoordsInput(t.raw)
      return { ...t, coords }
    })
  }, [targets])

  const activeUnitIds = useMemo(
    () => unitColumns.filter((id) => defPreset[id]),
    [unitColumns, defPreset],
  )

  const handleParse = useCallback(() => {
    const { villages: parsed, notes } = parseOwnUnitsPaste(paste, tribe)
    const preset = loadPreset(tribe)
    const withState = parsed.map((v) => {
      const defTotal = sumDefUnits(v.counts, preset)
      const enabled = defTotal >= MIN_DEF_UNITS_THRESHOLD && !!v.coords
      return {
        ...v,
        enabled,
        counts: { ...v.counts },
        defTotal,
      }
    })
    setVillages(withState)
    setParseNotes(notes)
    setExpandedVillage(null)
  }, [paste, tribe])

  const togglePreset = (unitId) => {
    setDefPreset((prev) => {
      const next = { ...prev, [unitId]: !prev[unitId] }
      savePreset(tribe, next)
      setVillages((rows) =>
        rows.map((v) => ({
          ...v,
          defTotal: sumDefUnits(v.counts, next),
          enabled:
            sumDefUnits(v.counts, next) >= MIN_DEF_UNITS_THRESHOLD && !!v.coords,
        })),
      )
      return next
    })
  }

  const updateCount = (vKey, unitId, value) => {
    const n = Math.max(0, parseInt(String(value).replace(/\D/g, ''), 10) || 0)
    setVillages((rows) =>
      rows.map((v) => {
        if (villageKey(v) !== vKey) return v
        const counts = { ...v.counts, [unitId]: n }
        const defTotal = sumDefUnits(counts, defPreset)
        return { ...v, counts, defTotal }
      }),
    )
  }

  const toggleVillage = (vKey) => {
    setVillages((rows) =>
      rows.map((v) => (villageKey(v) === vKey ? { ...v, enabled: !v.enabled } : v)),
    )
  }

  const results = useMemo(() => {
    const enabled = villages.filter((v) => v.enabled && v.coords)
    const validTargets = parsedTargets.filter((t) => t.coords)
    if (!enabled.length || !validTargets.length) return []

    return enabled.map((v) => {
      const perTarget = validTargets.map((t) => {
        const march = computeMarchTimes(v.counts, activeUnitIds, v.coords, t.coords, bonuses)
        return {
          targetId: t.id,
          label: t.label,
          coords: t.coords,
          ...march,
        }
      })
      return { village: v, perTarget }
    })
  }, [villages, parsedTargets, activeUnitIds, bonuses])

  const buildCopyReport = useCallback(() => {
    const lines = []
    lines.push(`Defense travel — ${TRIBE_LABELS[tribe] ?? tribe}`)
    if (tournamentLevel > 0) {
      lines.push(`Tournament square L${tournamentLevel} (+${tournamentLevel * 20}% speed if >20 fields)`)
    }
    if (heroPct > 0) lines.push(`Hero alliance standard +${heroPct}%`)
    lines.push('')

    for (const t of parsedTargets) {
      if (!t.coords) continue
      lines.push(`${t.label}: ${formatCoordsForInput(t.coords)}`)
    }
    lines.push('')

    for (const row of results) {
      const v = row.village
      const coordStr = v.coords ? ` (${formatCoordsForInput(v.coords)})` : ''
      lines.push(`${v.name}${coordStr} | def ${v.defTotal.toLocaleString('en-US')}`)
      for (const pt of row.perTarget) {
        lines.push(
          `  → ${pt.label} ${formatCoordsForInput(pt.coords)} | ${formatDistance(pt.distance)} fields | ${formatTravelTime(pt.totalSeconds)}`,
        )
        for (const u of pt.unitTimes) {
          lines.push(
            `      ${getUnitLabel(tribe, u.unitId)} ×${u.count}: ${formatTravelTime(u.seconds)}`,
          )
        }
      }
      lines.push('')
    }
    return lines.join('\n').trim()
  }, [results, tribe, tournamentLevel, heroPct, parsedTargets])

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
            Paste own units from all villages → times to one or more targets (Legends).
          </p>
        </div>
      </div>

      <section
        className="rounded-xl border p-4 space-y-3"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <label className="text-xs uppercase tracking-wider" style={{ color: C.muted }}>
          Tribe
        </label>
        <div className="flex flex-wrap gap-2">
          {TRIBE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTribe(opt.id)}
              className="px-3 py-1.5 rounded-lg border text-sm transition-colors"
              style={{
                borderColor: tribe === opt.id ? C.gold : C.border,
                background: tribe === opt.id ? C.gold + '22' : C.surface2,
                color: tribe === opt.id ? C.gold : C.text,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section
        className="rounded-xl border p-4 space-y-3"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <label className="text-xs uppercase tracking-wider block" style={{ color: C.muted }}>
          Paste — Village overview → Units → Own units
        </label>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={8}
          placeholder="Ctrl+A on the Own units table (include footer with village coordinates), then paste here."
          className="w-full rounded-lg border px-3 py-2 text-sm font-mono resize-y"
          style={{
            background: C.bg,
            borderColor: C.border,
            color: C.text,
          }}
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

      <section
        className="rounded-xl border p-4 space-y-3"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <p className="text-xs uppercase tracking-wider" style={{ color: C.muted }}>
          Defense unit preset ({TRIBE_LABELS[tribe]})
        </p>
        <p className="text-xs" style={{ color: C.muted }}>
          Checked types count toward the {MIN_DEF_UNITS_THRESHOLD} def threshold and travel time (slowest
          selected unit wins).
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
      </section>

      <section
        className="rounded-xl border p-4 space-y-3"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <p className="text-xs uppercase tracking-wider" style={{ color: C.muted }}>
          Bonuses
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-sm space-y-1">
            <span style={{ color: C.muted }}>Tournament square level</span>
            <input
              type="number"
              min={0}
              max={20}
              value={tournamentLevel}
              onChange={(e) =>
                setTournamentLevel(Math.min(20, Math.max(0, parseInt(e.target.value, 10) || 0)))
              }
              className="block w-20 rounded border px-2 py-1"
              style={{ background: C.bg, borderColor: C.border, color: C.text }}
            />
            <span className="text-xs" style={{ color: C.muted }}>
              +20% speed/level if distance &gt; 20 fields
            </span>
          </label>
          <label className="text-sm space-y-1">
            <span style={{ color: C.muted }}>Hero alliance standard</span>
            <select
              value={heroStandard}
              onChange={(e) => setHeroStandard(parseInt(e.target.value, 10))}
              className="block rounded border px-2 py-1"
              style={{ background: C.bg, borderColor: C.border, color: C.text }}
            >
              {HERO_STANDARD_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section
        className="rounded-xl border p-4 space-y-3"
        style={{ background: C.surface, borderColor: C.border }}
      >
        <p className="text-xs uppercase tracking-wider" style={{ color: C.muted }}>
          Targets (coordinates)
        </p>
        {targets.map((t) => (
          <div key={t.id} className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={t.label}
              onChange={(e) =>
                setTargets((rows) =>
                  rows.map((r) => (r.id === t.id ? { ...r, label: e.target.value } : r)),
                )
              }
              className="w-28 rounded border px-2 py-1 text-sm"
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
              placeholder="-196|-33"
              className="flex-1 min-w-[140px] rounded border px-2 py-1 text-sm font-mono"
              style={{
                background: C.bg,
                borderColor: t.coords ? C.border : '#7f1d1d',
                color: C.text,
              }}
            />
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
        ))}
        <button
          type="button"
          onClick={addTarget}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border"
          style={{ borderColor: C.border, color: C.gold }}
        >
          <Plus className="w-3 h-3" /> Add target
        </button>
      </section>

      {villages.length > 0 && (
        <section
          className="rounded-xl border overflow-hidden"
          style={{ background: C.surface, borderColor: C.border }}
        >
          <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2" style={{ borderColor: C.border }}>
            <span className="text-sm font-medium" style={{ color: C.text }}>
              {villages.length} villages — default off if &lt; {MIN_DEF_UNITS_THRESHOLD} def units
            </span>
            <button
              type="button"
              onClick={copyReport}
              disabled={!results.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs disabled:opacity-40"
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
                  <th className="text-left p-2 w-8" />
                  <th className="text-left p-2">Village</th>
                  <th className="text-right p-2">Def</th>
                  {parsedTargets.map((t) => (
                        <th key={t.id} className="text-center p-2 min-w-[120px]">
                          <div>{t.label}</div>
                          <div
                            className="text-[10px] font-mono font-normal"
                            style={{ color: t.coords ? C.muted : '#f87171' }}
                          >
                            {t.coords ? formatCoordsForInput(t.coords) : 'invalid coords'}
                          </div>
                        </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {villages.map((v) => {
                  const vKey = villageKey(v)
                  const rowResult = results.find((r) => villageKey(r.village) === vKey)
                  const isOpen = expandedVillage === vKey
                  return (
                    <Fragment key={vKey}>
                      <tr
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          opacity: v.enabled ? 1 : 0.45,
                        }}
                      >
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={v.enabled}
                            onChange={() => toggleVillage(vKey)}
                            disabled={!v.coords}
                            className="accent-[#f0a820]"
                          />
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-left"
                            style={{ color: C.text }}
                            onClick={() => setExpandedVillage(isOpen ? null : vKey)}
                          >
                            {isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                            )}
                            <span>
                              {v.name}
                              {v.coords && (
                                <span className="text-xs font-mono ml-1" style={{ color: C.muted }}>
                                  ({formatCoordsForInput(v.coords)})
                                </span>
                              )}
                            </span>
                          </button>
                        </td>
                        <td className="p-2 text-right font-mono" style={{ color: C.muted }}>
                          {v.defTotal.toLocaleString('en-US')}
                        </td>
                        {parsedTargets.map((t) => {
                          if (!t.coords) {
                            return (
                              <td key={t.id} className="p-2 text-center" style={{ color: C.muted }}>
                                —
                              </td>
                            )
                          }
                          const cell = rowResult?.perTarget.find((p) => p.targetId === t.id)
                          if (!v.enabled || !cell) {
                            return (
                              <td key={t.id} className="p-2 text-center" style={{ color: C.muted }}>
                                —
                              </td>
                            )
                          }
                          return (
                            <td key={t.id} className="p-2 text-center">
                              <div className="font-mono font-semibold" style={{ color: C.win }}>
                                {formatTravelTime(cell.totalSeconds)}
                              </div>
                              <div className="text-[10px]" style={{ color: C.muted }}>
                                {formatDistance(cell.distance)} fld
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                      {isOpen && (
                        <tr key={`${vKey}-detail`}>
                          <td colSpan={3 + parsedTargets.length} className="p-3" style={{ background: C.bg }}>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {unitColumns
                                .filter((id) => id !== 'hero')
                                .map((id) => (
                                  <label
                                    key={id}
                                    className="flex items-center gap-2 text-xs"
                                    style={{ color: defPreset[id] ? C.text : C.muted }}
                                  >
                                    <span className="w-24 truncate">{getUnitLabel(tribe, id)}</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={v.counts[id] ?? 0}
                                      onChange={(e) => updateCount(vKey, id, e.target.value)}
                                      className="w-20 rounded border px-1 py-0.5 font-mono text-right"
                                      style={{
                                        background: C.surface,
                                        borderColor: C.border,
                                        color: C.text,
                                      }}
                                    />
                                  </label>
                                ))}
                            </div>
                            {rowResult?.perTarget.map((pt) => (
                              <div key={pt.targetId} className="mt-3 text-xs" style={{ color: C.muted }}>
                                <span style={{ color: C.gold }}>{pt.label}</span>
                                {pt.unitTimes.map((u) => (
                                  <span key={u.unitId} className="ml-3 font-mono">
                                    {getUnitLabel(tribe, u.unitId)}: {formatTravelTime(u.seconds)}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
