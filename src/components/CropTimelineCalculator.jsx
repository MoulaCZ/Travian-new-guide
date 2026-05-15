import { useState, useCallback, useRef } from 'react'
import { Wheat, Sparkles, Copy, Check, ExternalLink } from 'lucide-react'
import { parseMarketplacePaste, buildMapUrl } from '../utils/cropPasteParser'
import {
  simulateCropTimeline,
  buildDiscordReport,
  buildHourlyOverview,
  formatNum,
  formatDuration,
  formatClockFromServer,
} from '../utils/cropTimeline'
import CropTimelineChart from './CropTimelineChart'

const C = {
  bg:       '#0f0c09',
  surface:  '#1a1510',
  surface2: '#241d14',
  border:   '#3e3226',
  gold:     '#f0a820',
  goldDim:  '#b87d18',
  text:     '#d4c4a8',
  muted:    '#7a6a55',
  win:      '#4ade80',
  lose:     '#f87171',
}

const HORIZON_HOURS = 12

function findSendMarkerHint(text) {
  return /Poslat suroviny|Send resources|Rohstoffe senden|Stuur grondstoffen/i.test(text)
}

const SAMPLE_PLACEHOLDER =
  'Open the Marketplace → second tab (send resources). Select all (Ctrl+A), copy (Ctrl+C), and paste here.'

/** Signed crop/h from prefix (+ surplus / − deficit) and digits-only input */
function cropBalancePerHour(sign, digitsRaw) {
  const digits = String(digitsRaw ?? '').replace(/\D/g, '')
  if (!digits) return NaN
  const n = parseInt(digits, 10)
  if (!Number.isFinite(n)) return NaN
  return sign === '-' ? -n : n
}

export default function CropTimelineCalculator() {
  const [paste, setPaste] = useState('')
  const [cropBalanceSign, setCropBalanceSign] = useState('-')
  const [cropBalanceDigits, setCropBalanceDigits] = useState('')
  const [parsedSnapshot, setParsedSnapshot] = useState(null)
  const [report, setReport] = useState('')
  const [simulation, setSimulation] = useState(null)
  const [hourlyOverview, setHourlyOverview] = useState([])
  const [mapUrl, setMapUrl] = useState(null)
  const [parseNotes, setParseNotes] = useState([])
  const [copiedText, setCopiedText] = useState(false)
  const [copiedChart, setCopiedChart] = useState(false)
  const chartSvgRef = useRef(null)

  const applyParse = useCallback((text) => {
    const parsed = parseMarketplacePaste(text)
    const notes = []

    if (parsed.serverTime) {
      notes.push(`Server time: ${parsed.serverTime.label}`)
    } else {
      notes.push('Server time not found — ETAs use duration only.')
    }

    if (parsed.currentCrop != null) {
      notes.push(`Crop in granary: ${formatNum(parsed.currentCrop)}`)
    } else {
      notes.push('⚠️ Crop stock not detected — paste the full marketplace page.')
    }

    if (parsed.granaryCapacity != null) {
      notes.push(`Granary capacity: ${formatNum(parsed.granaryCapacity)}`)
    }

    if (parsed.villageName) {
      const coord =
        parsed.villageCoords
          ? ` (${parsed.villageCoords.x}|${parsed.villageCoords.y})`
          : ''
      notes.push(`Village: ${parsed.villageName}${coord}`)
    }

    const coords = parsed.villageCoords
    const url = parsed.mapUrl ?? (coords ? buildMapUrl(parsed.serverBase, coords.x, coords.y) : null)

    if (coords) {
      notes.push(`Coordinates (from paste): (${coords.x}|${coords.y})`)
      if (url) notes.push(`Map: ${url}`)
    } else if (parsed.villageName) {
      notes.push(
        '⚠️ Coordinates not found — include the footer village/coordinates block from the same marketplace paste.',
      )
    }

    if (parsed.incoming.length) {
      const withCrop = parsed.incoming.filter((d) => d.crop > 0).length
      notes.push(`Incoming deliveries: ${parsed.incoming.length} (${withCrop} with crop)`)
    } else {
      notes.push('No incoming deliveries.')
    }

    setParsedSnapshot(parsed)
    setMapUrl(url)
    setParseNotes(notes)
    return { parsed, coords, mapUrl: url }
  }, [])

  const handleGenerate = () => {
    const text = paste.trim()
    if (!text) {
      setReport(
        '⚠️ Paste the Travian marketplace page first — Marketplace → send-resources tab → Ctrl+A, Ctrl+C.',
      )
      setSimulation(null)
      setHourlyOverview([])
      return
    }

    const { parsed, coords, mapUrl: url } = applyParse(text)

    const stock = parsed.currentCrop
    const capacity = parsed.granaryCapacity ?? null
    const balance = cropBalancePerHour(cropBalanceSign, cropBalanceDigits)

    if (stock == null || !Number.isFinite(stock) || stock < 0) {
      const hints = []
      if (!parsed.serverTime) hints.push('server time missing')
      if (findSendMarkerHint(text)) hints.push('found send-resources section')
      else hints.push('missing Send resources / Poslat suroviny / Stuur grondstoffen section')
      setReport(
        `⚠️ Could not read crop stock from paste.\n` +
          `Use the Marketplace send-resources tab (second tab): Ctrl+A on that screen.\n` +
          (hints.length ? `Detected: ${hints.join(', ')}.` : ''),
      )
      setSimulation(null)
      setHourlyOverview([])
      return
    }
    if (!Number.isFinite(balance)) {
      setReport(
        '⚠️ Enter net crop per hour: pick − or + above, type digits only (no minus inside the box). Example: − with 20000 = −20,000 crop/h.',
      )
      setSimulation(null)
      setHourlyOverview([])
      return
    }

    const incoming = parsed.incoming.map((d) => ({
      minutesFromNow: d.minutesFromNow ?? 0,
      crop: d.crop ?? 0,
      village: d.village,
      player: d.player,
    }))

    const serverTime = parsed.serverTime ?? null

    const sim = simulateCropTimeline({
      stockStart: stock,
      capacity: Number.isFinite(capacity) ? capacity : null,
      balancePerHour: balance,
      incoming,
      horizonHours: HORIZON_HOURS,
      stepMinutes: 60,
    })

    const hourly = buildHourlyOverview({
      stockStart: stock,
      balancePerHour: balance,
      incoming,
      serverTime,
      hours: HORIZON_HOURS,
    })

    const out = buildDiscordReport({
      villageName: parsed.villageName || 'Village',
      villageCoords: coords,
      mapUrl: url,
      stockStart: stock,
      capacity: Number.isFinite(capacity) ? capacity : null,
      balancePerHour: balance,
      serverTimeLabel: serverTime?.label ?? '',
      hourlyOverview: hourly,
      simulation: sim,
    })

    setSimulation(sim)
    setHourlyOverview(hourly)
    setReport(out)
  }

  const handleCopy = async (wrapCodeBlock = false) => {
    if (!report) return
    const text = wrapCodeBlock ? `\`\`\`\n${report}\n\`\`\`` : report
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } catch {
      /* ignored */
    }
  }

  const handleCopyChart = async () => {
    const svg = chartSvgRef.current
    if (!svg) return
    try {
      const svgString = new XMLSerializer().serializeToString(svg)
      const url = URL.createObjectURL(
        new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }),
      )
      const img = await new Promise((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = reject
        el.src = url
      })
      URL.revokeObjectURL(url)
      const W = 800
      const H = 220
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = W * scale
      canvas.height = H * scale
      const ctx = canvas.getContext('2d')
      ctx.scale(scale, scale)
      ctx.fillStyle = '#0a0806'
      ctx.fillRect(0, 0, W, H)
      ctx.drawImage(img, 0, 0, W, H)
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png')
      })
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
      setCopiedChart(true)
      setTimeout(() => setCopiedChart(false), 2000)
    } catch {
      /* ignored */
    }
  }

  const inputStyle = {
    width: '100%',
    background: '#0f0c09',
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.text,
    fontSize: '0.85rem',
    padding: '8px 10px',
    fontFamily: 'inherit',
    outline: 'none',
  }

  const hasReport = Boolean(report && simulation)

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100%',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        flex: 1,
        minWidth: 0,
        fontFamily: 'system-ui, sans-serif',
        color: C.text,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Wheat size={24} color={C.gold} />
        <h1
          style={{
            fontFamily: 'Cinzel, serif',
            color: C.gold,
            fontSize: '1.35rem',
            fontWeight: 700,
            margin: 0,
            letterSpacing: '0.06em',
          }}
        >
          Crop Timeline
        </h1>
      </div>

      <p style={{ color: C.muted, fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>
        Open the{' '}
        <strong style={{ color: C.text }}>Marketplace</strong>, switch to the{' '}
        <strong style={{ color: C.text }}>second tab</strong> (send resources / ships merchants).{' '}
        <strong style={{ color: C.text }}>Ctrl+A</strong>, then <strong style={{ color: C.text }}>Ctrl+C</strong>{' '}
        from that tab and paste below. Enter{' '}
        <strong style={{ color: C.text }}>net crop/h</strong> with the sign dropdown + digits only; village name and map link are read from the paste.
      </p>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: 14,
        }}
      >
        <label
          style={{
            display: 'block',
            color: C.muted,
            fontSize: '0.72rem',
            marginBottom: 6,
            fontFamily: 'Cinzel, serif',
          }}
        >
          Travian page paste
        </label>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={SAMPLE_PLACEHOLDER}
          rows={10}
          style={{
            width: '100%',
            background: '#0f0c09',
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.text,
            resize: 'vertical',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            padding: '8px 10px',
            outline: 'none',
          }}
        />
        {parseNotes.length > 0 && (
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: C.muted, fontSize: '0.78rem' }}>
            {parseNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </div>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: 14,
          maxWidth: 360,
        }}
      >
        <label style={{ fontSize: '0.72rem', color: C.gold, display: 'block', marginBottom: 6 }}>
          Net crop per hour *
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 8,
            maxWidth: '100%',
          }}
        >
          <select
            value={cropBalanceSign}
            onChange={(e) => setCropBalanceSign(e.target.value)}
            aria-label="Surplus or deficit"
            style={{
              flex: '0 0 auto',
              background: '#0f0c09',
              border: `1px solid ${cropBalanceDigits ? C.goldDim : C.border}`,
              borderRadius: 6,
              color: C.text,
              fontSize: '1rem',
              padding: '8px 10px',
              fontFamily: 'inherit',
              cursor: 'pointer',
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
            placeholder="e.g. 20000"
            aria-label="Amount per hour, digits only"
            style={{
              ...inputStyle,
              flex: 1,
              minWidth: 0,
              borderColor: cropBalanceDigits ? C.goldDim : C.border,
            }}
          />
        </div>
        <span style={{ fontSize: '0.65rem', color: C.muted, display: 'block', marginTop: 6 }}>
          Use the dropdown for − / +; this box accepts digits only (no long dashes or spaces).
        </span>

        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: C.gold,
              fontSize: '0.72rem',
              marginTop: 8,
            }}
          >
            <ExternalLink size={12} />
            Map link (from paste)
          </a>
        )}
      </div>

      {parsedSnapshot?.incoming?.length > 0 && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 14,
            overflowX: 'auto',
          }}
        >
          <div
            style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '0.8rem', marginBottom: 10 }}
          >
            Parsed incoming deliveries
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ color: C.muted, textAlign: 'left' }}>
                <th style={{ padding: '4px 8px' }}>From</th>
                <th style={{ padding: '4px 8px' }}>Crop</th>
                <th style={{ padding: '4px 8px' }}>In</th>
                <th style={{ padding: '4px 8px' }}>ETA</th>
              </tr>
            </thead>
            <tbody>
              {parsedSnapshot.incoming.map((d, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '6px 8px' }}>
                    {d.village} ({d.player})
                  </td>
                  <td style={{ padding: '6px 8px', color: d.crop > 0 ? C.win : C.muted }}>
                    {formatNum(d.crop)}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {d.minutesFromNow != null ? formatDuration(d.minutesFromNow) : '—'}
                  </td>
                  <td style={{ padding: '6px 8px', color: C.muted }}>
                    {d.minutesFromNow != null && parsedSnapshot.serverTime
                      ? formatClockFromServer(parsedSnapshot.serverTime, d.minutesFromNow) ?? '—'
                      : d.arrivalLabel ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          width: '100%',
          padding: '14px 20px',
          background: `linear-gradient(180deg, ${C.gold} 0%, ${C.goldDim} 100%)`,
          border: 'none',
          borderRadius: 8,
          color: '#0f0c09',
          fontFamily: 'Cinzel, serif',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: 'pointer',
          letterSpacing: '0.08em',
        }}
      >
        <Sparkles size={20} />
        Generate report
      </button>

      {(hasReport || (report && !simulation)) && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.goldDim}`,
            borderRadius: 8,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <span style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '0.9rem' }}>
            Report — chart + Discord (12h)
          </span>

          {simulation && (
            <CropTimelineChart
              ref={chartSvgRef}
              points={simulation.points}
              capacity={parsedSnapshot?.granaryCapacity ?? null}
              serverTime={parsedSnapshot?.serverTime ?? null}
            />
          )}

          {hourlyOverview.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 6,
                fontSize: '0.72rem',
              }}
            >
              {hourlyOverview.map((row) => (
                <div
                  key={row.hourIndex}
                  style={{
                    padding: '6px 8px',
                    background: '#0a0806',
                    borderRadius: 4,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <span style={{ color: C.muted }}>{row.hourEmoji}</span>{' '}
                  <strong>{row.clock}</strong>
                  <br />
                  {formatNum(row.stock)}
                  {row.need > 0 && (
                    <span style={{ color: C.lose }}> · −{formatNum(row.need)}</span>
                  )}{' '}
                  {row.statusEmoji}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              paddingTop: 4,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <button
              type="button"
              onClick={() => handleCopy(false)}
              disabled={!report}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: copiedText ? '#1a2e1f' : C.surface2,
                border: `1px solid ${copiedText ? C.win : C.border}`,
                borderRadius: 6,
                color: copiedText ? C.win : C.text,
                cursor: report ? 'pointer' : 'default',
                fontSize: '0.75rem',
              }}
            >
              {copiedText ? <Check size={14} /> : <Copy size={14} />}
              {copiedText ? 'Copied' : 'Copy Discord'}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(true)}
              disabled={!report}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: C.surface2,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.text,
                cursor: report ? 'pointer' : 'default',
                fontSize: '0.75rem',
              }}
            >
              Copy ```
            </button>
            {simulation && (
              <button
                type="button"
                onClick={handleCopyChart}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: copiedChart ? '#1a2e1f' : C.surface2,
                  border: `1px solid ${copiedChart ? C.win : C.border}`,
                  borderRadius: 6,
                  color: copiedChart ? C.win : C.text,
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                {copiedChart ? <Check size={14} /> : <Copy size={14} />}
                {copiedChart ? 'Chart copied' : 'Copy chart'}
              </button>
            )}
            <span style={{ fontSize: '0.68rem', color: C.muted, flex: '1 1 200px' }}>
              Paste chart (Ctrl+V), then Discord text below.
            </span>
          </div>

          <pre
            style={{
              margin: 0,
              padding: 12,
              background: '#0a0806',
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              color: C.text,
              fontSize: '0.78rem',
              lineHeight: 1.45,
              whiteSpace: 'pre-wrap',
              fontFamily: 'ui-monospace, Consolas, monospace',
            }}
          >
            {report}
          </pre>
        </div>
      )}
    </div>
  )
}