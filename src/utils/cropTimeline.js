/**
 * Minute-step crop stock simulation for a single village.
 */

export function formatDuration(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return '—'
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}m`
  if (r === 0) return `${h}h`
  return `${h}h ${r}m`
}

export function formatClockFromServer(serverTime, addMinutes) {
  if (!serverTime || addMinutes == null) return null
  let total = serverTime.hours * 60 + serverTime.minutes + Math.round(addMinutes)
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatNum(n) {
  if (n == null || !Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('en-US')
}

/** Twelve distinct Unicode emoji — renders reliably in Discord (colon aliases differ from Slack). */
export const HOUR_DISCORD_EMOJIS = [
  '🌱',
  '☀️',
  '🌤️',
  '⛅',
  '☁️',
  '🌧️',
  '❄️',
  '🌊',
  '🌀',
  '🌫️',
  '🔥',
  '⚡',
]

const HOURS_OVERVIEW = 12

/**
 * Hour-by-hour stock snapshot for the next 12 hours (at each full hour).
 */
export function buildHourlyOverview({
  stockStart,
  balancePerHour,
  incoming = [],
  serverTime = null,
  hours = HOURS_OVERVIEW,
}) {
  const hourlyBurn = balancePerHour < 0 ? -balancePerHour : 0
  const opts = { stockStart, balancePerHour, incoming }
  const rows = []

  for (let h = 0; h < hours; h++) {
    const minutes = h * 60
    const stock = Math.round(getStockAtMinute(opts, minutes))
    const need =
      hourlyBurn > 0
        ? stock <= 0
          ? hourlyBurn
          : Math.max(0, Math.ceil(hourlyBurn - stock))
        : 0
    const covered = need === 0
    const critical = stock <= 0 && need > 0

    rows.push({
      hourIndex: h,
      hourEmoji: HOUR_DISCORD_EMOJIS[h] ?? '⌛',
      clock: serverTime ? formatClockFromServer(serverTime, minutes) : `+${h}h`,
      stock,
      need,
      covered,
      critical,
      statusEmoji: critical ? '💀' : covered ? '✅' : '⚠️',
    })
  }

  return rows
}

/**
 * @param {object} opts
 * @param {number} opts.stockStart
 * @param {number|null} opts.capacity
 * @param {number} opts.balancePerHour  negative = deficit
 * @param {{ minutesFromNow: number, crop: number, label?: string }[]} opts.incoming
 * @param {number} opts.horizonHours
 * @param {number} opts.stepMinutes
 */
export function simulateCropTimeline({
  stockStart,
  capacity = null,
  balancePerHour,
  incoming = [],
  horizonHours = 12,
  stepMinutes = 30,
}) {
  const events = incoming
    .filter((d) => d.minutesFromNow != null && Number.isFinite(d.minutesFromNow))
    .map((d) => ({
      t: Math.max(0, Math.round(d.minutesFromNow)),
      crop: d.crop ?? 0,
      label: d.label ?? '',
    }))
    .sort((a, b) => a.t - b.t)

  const totalMinutes = Math.max(stepMinutes, Math.round(horizonHours * 60))
  const points = []
  let stock = stockStart
  let eventIdx = 0
  let minStock = stockStart
  let minAt = 0
  let emptyAt = null

  for (let m = 0; m <= totalMinutes; m += stepMinutes) {
    while (eventIdx < events.length && events[eventIdx].t <= m) {
      stock += events[eventIdx].crop
      eventIdx++
    }
    stock = Math.max(0, stock)

    const capped =
      capacity != null && capacity > 0 ? Math.min(stock, capacity) : stock
    const overflow =
      capacity != null && capacity > 0 && stock > capacity ? stock - capacity : 0

    points.push({
      minutes: m,
      stock: Math.round(stock),
      capped: Math.round(capped),
      overflow: Math.round(overflow),
    })

    if (stock < minStock) {
      minStock = stock
      minAt = m
    }
    if (emptyAt == null && stock <= 0) emptyAt = m

    const dt = stepMinutes
    stock += (balancePerHour / 60) * dt
    stock = Math.max(0, stock)
  }

  if (emptyAt == null && balancePerHour < 0 && stockStart > 0) {
    const ratePerMin = balancePerHour / 60
    let projected = stockStart
    let m = 0
    let eIdx = 0
    while (m <= totalMinutes * 2 && projected > 0) {
      while (eIdx < events.length && events[eIdx].t <= m) {
        projected += events[eIdx].crop
        eIdx++
      }
      if (projected <= 0) {
        emptyAt = m
        break
      }
      projected += ratePerMin
      m += 1
    }
  }

  return {
    points,
    minStock: Math.round(minStock),
    minAt,
    emptyAt,
    finalStock: Math.round(stock),
  }
}

/** Stock at exact minute (before deliveries at that minute are applied). */
export function getStockAtMinute({ stockStart, balancePerHour, incoming }, minute) {
  const events = (incoming || [])
    .filter((d) => d.minutesFromNow != null && Number.isFinite(d.minutesFromNow))
    .map((d) => ({
      t: Math.max(0, Math.round(d.minutesFromNow)),
      crop: d.crop ?? 0,
    }))
    .sort((a, b) => a.t - b.t)

  let stock = stockStart
  let eventIdx = 0
  const m = Math.max(0, Math.round(minute))

  for (let i = 0; i < m; i++) {
    while (eventIdx < events.length && events[eventIdx].t <= i) {
      stock += events[eventIdx].crop
      eventIdx++
    }
    stock += balancePerHour / 60
    stock = Math.max(0, stock)
  }
  while (eventIdx < events.length && events[eventIdx].t <= m) {
    stock += events[eventIdx].crop
    eventIdx++
  }
  return Math.max(0, stock)
}

export function computeHorizonHours(incoming, fallback = 12) {
  const maxIn = incoming.reduce(
    (mx, d) =>
      d.minutesFromNow != null && Number.isFinite(d.minutesFromNow)
        ? Math.max(mx, d.minutesFromNow)
        : mx,
    0,
  )
  const hours = Math.ceil((maxIn + 120) / 60)
  return Math.min(24, Math.max(fallback, hours))
}

/**
 * Per-arrival slots: crop needed to cover the next 60 minutes after delivery.
 */
export function buildArrivalPlan({
  stockStart,
  balancePerHour,
  incoming = [],
  serverTime = null,
  bufferMinutes = 60,
}) {
  const hourlyNeed = balancePerHour < 0 ? -balancePerHour : 0
  const burnForBuffer = (hourlyNeed / 60) * bufferMinutes
  const opts = { stockStart, balancePerHour, incoming }
  const slots = []

  if (hourlyNeed > 0) {
    const needNow = Math.max(0, burnForBuffer - stockStart)
    if (needNow > 0) {
      slots.push({
        kind: 'now',
        minutes: 0,
        clock: serverTime ? formatClockFromServer(serverTime, 0) : 'NOW',
        amountNeeded: Math.ceil(needNow),
        covered: false,
        emoji: '💀',
      })
    }
  }

  const cropDel = [...incoming]
    .filter((d) => (d.crop ?? 0) > 0 && d.minutesFromNow != null)
    .sort((a, b) => a.minutesFromNow - b.minutesFromNow)

  for (const d of cropDel) {
    const stockAt = getStockAtMinute(opts, d.minutesFromNow)
    const after = stockAt + (d.crop ?? 0)
    const need60 = Math.max(0, burnForBuffer - after)
    const covered = need60 === 0
    slots.push({
      kind: 'arrival',
      minutes: d.minutesFromNow,
      clock: formatClockFromServer(serverTime, d.minutesFromNow) ?? formatDuration(d.minutesFromNow),
      amountNeeded: Math.ceil(need60),
      covered,
      emoji: covered ? '☀️' : '💀',
      incomingCrop: d.crop,
      village: d.village,
      player: d.player,
    })
  }

  return slots
}

/**
 * Build Discord-friendly plain-text report (monospace block).
 */
export function buildDiscordReport({
  villageName = 'Village',
  villageCoords = null,
  mapUrl = null,
  stockStart,
  capacity,
  balancePerHour,
  serverTimeLabel = '',
  hourlyOverview = [],
  simulation = null,
}) {
  const lines = []
  const bal = balancePerHour
  const balStr = bal >= 0 ? `+${formatNum(bal)}` : formatNum(bal)
  const coordLabel =
    villageCoords && Number.isFinite(villageCoords.x) && Number.isFinite(villageCoords.y)
      ? ` (${villageCoords.x}|${villageCoords.y})`
      : ''

  lines.push(`🌾 ${villageName}${coordLabel}`)
  lines.push(
    `Stock ${formatNum(stockStart)}${capacity ? ` / ${formatNum(capacity)}` : ''} · ${balStr}/h`,
  )
  if (serverTimeLabel) lines.push(`Server: ${serverTimeLabel}`)
  lines.push('')

  if (mapUrl) {
    lines.push(`📍 Send crop here: ${mapUrl}`)
    lines.push('')
  }

  if (hourlyOverview.length) {
    lines.push('12h overview (stock at each hour):')
    for (const row of hourlyOverview) {
      const needPart = row.need > 0 ? ` · send ${formatNum(row.need)}` : ''
      lines.push(
        `${row.hourEmoji} ${row.clock} — ${formatNum(row.stock)} crop${needPart} — ${row.statusEmoji}`,
      )
    }
    lines.push('')
    lines.push(
      '_Covered an hour? React with that row\'s emoji so others know it\'s handled._',
    )
    lines.push('')
  }

  if (simulation) {
    if (simulation.minStock <= 0) {
      lines.push(
        `☠️ STARVATION RISK — hits 0 in ~${formatDuration(simulation.emptyAt ?? simulation.minAt)}`,
      )
    } else if (balancePerHour < 0) {
      lines.push(
        `📉 Minimum stock: ${formatNum(simulation.minStock)} at +${formatDuration(simulation.minAt)}`,
      )
    }
    if (balancePerHour < 0 && simulation.emptyAt == null && stockStart > 0) {
      const roughH = stockStart / Math.abs(balancePerHour)
      lines.push(`⏳ ~${formatDuration(roughH * 60)} to empty (linear, no extra crop)`)
    }
    if (capacity && simulation.points.some((p) => p.overflow > 0)) {
      lines.push(`⚠️ Granary over capacity at some steps`)
    }
  }

  return lines.join('\n')
}
