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

/** @param {number} stock @param {number|null|undefined} capacity */
function applyGranaryFloorAndCap(stock, capacity) {
  let s = Math.max(0, stock)
  if (capacity != null && capacity > 0 && s > capacity) s = capacity
  return s
}

/**
 * Rows that actually affect stock simulation: excludes past multi-leg legs (`alreadyArrived`)
 * and deliveries with no parsed countdown (same filter as the chart / hourly overview).
 */
export function incomingDeliveriesUsedInModel(incoming = []) {
  return (incoming || []).filter(
    (d) =>
      !d.alreadyArrived && d.minutesFromNow != null && Number.isFinite(d.minutesFromNow),
  )
}

function sortedIncomingEvents(incoming) {
  return incomingDeliveriesUsedInModel(incoming)
    .map((d) => ({
      t: Math.max(0, Math.round(d.minutesFromNow)),
      crop: d.crop ?? 0,
    }))
    .sort((a, b) => a.t - b.t)
}

/**
 * Stock after deliveries at `minute`, before burn during that minute (granary-capped).
 * @param {{ stockStart: number, balancePerHour: number, incoming: object[], capacity?: number|null }} opts
 */
export function getStockAtMinute({ stockStart, balancePerHour, incoming, capacity = null }, minute) {
  const events = sortedIncomingEvents(incoming)
  const cap = (s) => applyGranaryFloorAndCap(s, capacity)
  let stock = stockStart
  let eventIdx = 0
  const m = Math.max(0, Math.round(minute))

  for (let i = 0; i < m; i++) {
    while (eventIdx < events.length && events[eventIdx].t <= i) {
      stock += events[eventIdx].crop
      stock = cap(stock)
      eventIdx++
    }
    stock = cap(stock + balancePerHour / 60)
  }
  while (eventIdx < events.length && events[eventIdx].t <= m) {
    stock += events[eventIdx].crop
    stock = cap(stock)
    eventIdx++
  }
  return cap(stock)
}

/**
 * Minimum stock during [hourStart, hourStart + span) after adding `extraCrop` at hourStart
 * (after deliveries at hourStart, before that minute's burn).
 * @param {{ stockStart: number, balancePerHour: number, incoming: object[], capacity?: number|null }} opts
 */
function minStockInHourWindowWithExtra(opts, hourStart, span, extraCrop) {
  const cap = (s) => applyGranaryFloorAndCap(s, opts.capacity)
  const eventsByMinute = new Map()
  for (const ev of sortedIncomingEvents(opts.incoming)) {
    const arr = eventsByMinute.get(ev.t)
    if (arr) arr.push(ev)
    else eventsByMinute.set(ev.t, [ev])
  }

  let stock = cap(getStockAtMinute(opts, hourStart) + (extraCrop ?? 0))
  let mn = stock
  const bal = opts.balancePerHour

  for (let u = 0; u < span; u++) {
    const m = hourStart + u
    if (u > 0) {
      for (const ev of eventsByMinute.get(m) ?? []) {
        stock = cap(stock + ev.crop)
      }
    }
    mn = Math.min(mn, stock)
    stock = cap(stock + bal / 60)
    mn = Math.min(mn, stock)
  }
  return mn
}

/** Smallest non-negative crop to add at hourStart so the next `span` minutes never hit 0 stock. */
function cropNeededAtHourStart(opts, hourStart, span) {
  if (opts.balancePerHour >= 0) return 0
  if (minStockInHourWindowWithExtra(opts, hourStart, span, 0) > 0) return 0

  let lo = 0
  let hi = 1
  while (minStockInHourWindowWithExtra(opts, hourStart, span, hi) <= 0 && hi < 5_000_000) {
    hi *= 2
  }
  if (minStockInHourWindowWithExtra(opts, hourStart, span, hi) <= 0) return Math.ceil(hi)

  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (minStockInHourWindowWithExtra(opts, hourStart, span, mid) > 0) hi = mid
    else lo = mid
  }
  return hi
}

/**
 * Hour-by-hour stock snapshot for the next 12 hours (at each full hour).
 * `need` respects minute-level burn + incoming deliveries in that hour (incl. mid-hour saves).
 */
export function buildHourlyOverview({
  stockStart,
  balancePerHour,
  incoming = [],
  capacity = null,
  serverTime = null,
  hours = HOURS_OVERVIEW,
  horizonMinutes = HOURS_OVERVIEW * 60,
}) {
  const opts = { stockStart, balancePerHour, incoming, capacity }
  const rows = []

  for (let h = 0; h < hours; h++) {
    const minutes = h * 60
    const span = Math.min(60, Math.max(0, horizonMinutes - minutes))
    const stock = Math.round(getStockAtMinute(opts, minutes))
    const need =
      balancePerHour < 0 && span > 0 ? cropNeededAtHourStart(opts, minutes, span) : 0
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
  stepMinutes = 1,
}) {
  const events = incomingDeliveriesUsedInModel(incoming)
    .map((d) => ({
      t: Math.max(0, Math.round(d.minutesFromNow)),
      crop: d.crop ?? 0,
      label: d.label ?? '',
    }))
    .sort((a, b) => a.t - b.t)

  const totalMinutes = Math.round(horizonHours * 60)
  const step = Math.max(1, Math.round(stepMinutes))
  const cap = (s) => applyGranaryFloorAndCap(s, capacity)
  const points = []
  let totalDiscarded = 0
  let rawStart = Math.max(0, stockStart)
  if (capacity != null && capacity > 0 && rawStart > capacity) {
    totalDiscarded += rawStart - capacity
  }
  let stock = cap(rawStart)
  let eventIdx = 0
  let minStock = Infinity
  let minAt = 0
  let emptyAt = null

  const addDiscarded = (beforeCap) => {
    if (capacity != null && capacity > 0 && beforeCap > capacity) {
      totalDiscarded += beforeCap - capacity
    }
  }

  for (let m = 0; m <= totalMinutes; m++) {
    while (eventIdx < events.length && events[eventIdx].t <= m) {
      const raw = stock + events[eventIdx].crop
      addDiscarded(Math.max(0, raw))
      stock = cap(raw)
      eventIdx++
    }

    if (stock < minStock) {
      minStock = stock
      minAt = m
    }
    if (emptyAt == null && stock <= 0) emptyAt = m

    if (m % step === 0 || m === totalMinutes) {
      points.push({
        minutes: m,
        stock: Math.round(stock),
        capped: Math.round(stock),
        overflow: 0,
      })
    }

    if (m === totalMinutes) break

    const rawBurn = stock + balancePerHour / 60
    addDiscarded(Math.max(0, rawBurn))
    stock = cap(rawBurn)

    if (stock < minStock) {
      minStock = stock
      minAt = m
    }
    if (emptyAt == null && stock <= 0) emptyAt = m
  }

  if (!Number.isFinite(minStock)) minStock = cap(stockStart)

  if (emptyAt == null && balancePerHour < 0 && stockStart > 0) {
    const ratePerMin = balancePerHour / 60
    let projected = stockStart
    let m = 0
    let eIdx = 0
    while (m <= totalMinutes * 2 && projected > 0) {
      while (eIdx < events.length && events[eIdx].t <= m) {
        const raw = projected + events[eIdx].crop
        projected = applyGranaryFloorAndCap(raw, capacity)
        eIdx++
      }
      if (projected <= 0) {
        emptyAt = m
        break
      }
      projected = applyGranaryFloorAndCap(projected + ratePerMin, capacity)
      m += 1
    }
  }

  return {
    points,
    minStock: Math.round(minStock),
    minAt,
    emptyAt,
    finalStock: Math.round(stock),
    totalDiscarded: Math.round(totalDiscarded),
  }
}

export function computeHorizonHours(incoming, fallback = 12) {
  const maxIn = incomingDeliveriesUsedInModel(incoming).reduce(
    (mx, d) => Math.max(mx, d.minutesFromNow ?? 0),
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
  capacity = null,
  serverTime = null,
  bufferMinutes = 60,
}) {
  const hourlyNeed = balancePerHour < 0 ? -balancePerHour : 0
  const burnForBuffer = (hourlyNeed / 60) * bufferMinutes
  const opts = { stockStart, balancePerHour, incoming, capacity }
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

  const cropDel = incomingDeliveriesUsedInModel(incoming)
    .filter((d) => (d.crop ?? 0) > 0)
    .sort((a, b) => a.minutesFromNow - b.minutesFromNow)

  for (const d of cropDel) {
    const stockAt = getStockAtMinute(opts, d.minutesFromNow)
    const after = applyGranaryFloorAndCap(stockAt + (d.crop ?? 0), capacity)
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
  incomingDeliveries: _incomingDeliveries = [],
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
    const alertRows = hourlyOverview.filter((row) => row.statusEmoji !== '✅')
    if (alertRows.length) {
      lines.push('Next hours:')
      for (const row of alertRows) {
        const needPart = row.need > 0 ? ` · send ${formatNum(row.need)}` : ''
        lines.push(
          `${row.hourEmoji} ${row.clock} — ${formatNum(row.stock)} crop${needPart} — ${row.statusEmoji}`,
        )
      }
      lines.push('')
      lines.push(
        "Covered an hour? React with that row's emoji so others know it's handled.",
      )
      lines.push('')
    }
  }

  return lines.join('\n')
}
