import { forwardRef, useMemo } from 'react'
import { formatClockFromServer } from '../utils/cropTimeline'

const C = {
  border: '#3e3226',
  gold: '#f0a820',
  muted: '#7a6a55',
  lose: '#f87171',
  line: '#c9a227',
  cap: '#6b5a45',
  zero: '#f87171',
}

const CropTimelineChart = forwardRef(function CropTimelineChart(
  { points, capacity, serverTime },
  ref,
) {
  const chart = useMemo(() => {
    if (!points?.length) return null

    const W = 800
    const H = 220
    const padL = 52
    const padR = 16
    const padT = 16
    const padB = 36
    const innerW = W - padL - padR
    const innerH = H - padT - padB

    const maxMin = points[points.length - 1].minutes || 1
    const yMax = Math.max(capacity || 0, ...points.map((p) => p.stock), 1)

    const x = (min) => padL + (min / maxMin) * innerW
    const y = (stock) => padT + innerH - (Math.max(0, stock) / yMax) * innerH

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.minutes).toFixed(1)} ${y(p.stock).toFixed(1)}`)
      .join(' ')

    const capY = capacity != null && capacity > 0 ? y(capacity) : null
    const zeroY = y(0)

    /** Vertical grid every minute (subtle); time labels every hour to stay readable */
    const minuteLines = []
    for (let m = 0; m <= maxMin; m += 1) {
      minuteLines.push({ minutes: m, x: x(m) })
    }

    const labelStep = 60
    const ticks = []
    for (let m = 0; m <= maxMin; m += labelStep) {
      ticks.push({
        minutes: m,
        x: x(m),
        label: serverTime ? formatClockFromServer(serverTime, m) : `+${m}m`,
      })
    }
    if (maxMin % labelStep !== 0) {
      ticks.push({
        minutes: maxMin,
        x: x(maxMin),
        label: serverTime ? formatClockFromServer(serverTime, maxMin) : `+${maxMin}m`,
      })
    }

    return { W, H, pathD, capY, zeroY, ticks, minuteLines, yMax, padL, innerH, padT, x, y }
  }, [points, capacity, serverTime])

  if (!chart) return null

  const { W, H, pathD, capY, zeroY, ticks, minuteLines, yMax, padL, innerH, padT, x, y } = chart

  return (
    <div
      style={{
        width: '100%',
        background: '#0a0806',
        borderRadius: 6,
        border: `1px solid ${C.border}`,
        padding: '8px 4px 4px',
      }}
    >
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Crop stock over time"
      >
        {minuteLines.map((t) => (
          <line
            key={`m-${t.minutes}`}
            x1={t.x}
            y1={padT}
            x2={t.x}
            y2={padT + innerH}
            stroke={C.border}
            strokeWidth={0.35}
            opacity={0.18}
          />
        ))}
        {ticks.map((t) => (
          <g key={`lbl-${t.minutes}`}>
            <line
              x1={t.x}
              y1={padT}
              x2={t.x}
              y2={padT + innerH}
              stroke={C.border}
              strokeWidth={0.65}
              strokeDasharray="4 5"
              opacity={0.45}
            />
            <text x={t.x} y={H - 8} textAnchor="middle" fill={C.muted} fontSize={10}>
              {t.label}
            </text>
          </g>
        ))}

        <text x={padL - 6} y={padT + 4} textAnchor="end" fill={C.muted} fontSize={9}>
          {Math.round(yMax).toLocaleString('en-US')}
        </text>
        <text x={padL - 6} y={padT + innerH} textAnchor="end" fill={C.muted} fontSize={9}>
          0
        </text>

        {capY != null && (
          <>
            <line
              x1={padL}
              y1={capY}
              x2={W - 16}
              y2={capY}
              stroke={C.cap}
              strokeWidth={1}
              strokeDasharray="6 4"
            />
            <text x={W - 14} y={capY - 4} textAnchor="end" fill={C.cap} fontSize={9}>
              max
            </text>
          </>
        )}

        <line
          x1={padL}
          y1={zeroY}
          x2={W - 16}
          y2={zeroY}
          stroke={C.zero}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.7}
        />

        <path d={pathD} fill="none" stroke={C.line} strokeWidth={2} />
        {points.length <= 96 &&
          points.map((p) => (
            <circle
              key={p.minutes}
              cx={x(p.minutes)}
              cy={y(p.stock)}
              r={p.minutes === 0 ? 4 : 2.5}
              fill={p.stock <= 0 ? C.lose : C.gold}
            />
          ))}
      </svg>
      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          fontSize: '0.68rem',
          color: C.muted,
          paddingBottom: 4,
        }}
      >
        <span>
          <span style={{ color: C.line }}>—</span> crop stock
        </span>
        {capY != null && (
          <span>
            <span style={{ color: C.cap }}>- -</span> granary max
          </span>
        )}
        <span>
          <span style={{ color: C.lose }}>- -</span> empty
        </span>
      </div>
    </div>
  )
})

export default CropTimelineChart
