import { useState, useMemo, useCallback } from 'react'
import { Shield, Swords, Flame, Skull, Crown, ChevronUp, ChevronDown, Info } from 'lucide-react'
import { UNITS, WALL_NAMES, TRIBE_LABELS } from '../data/units'
import { calculateBattle } from '../utils/combat'

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0f0c09',
  surface: '#1a1510',
  surface2: '#241d14',
  border: '#3e3226',
  gold: '#f0a820',
  goldDim: '#b87d18',
  text: '#d4c4a8',
  muted: '#7a6a55',
  win: '#4ade80',   // green-400
  lose: '#f87171',  // red-400
  winDim: '#166534',
  loseDim: '#7f1d1d',
}

// ─── Tribe selector ───────────────────────────────────────────────────────────
function TribeSelector({ selected, onChange }) {
  return (
    <div className="flex gap-1">
      {Object.entries(TRIBE_LABELS).map(([tribe, label]) => (
        <button
          key={tribe}
          onClick={() => onChange(tribe)}
          style={{
            background: selected === tribe ? C.gold : C.surface2,
            color: selected === tribe ? '#0f0c09' : C.text,
            border: `1px solid ${selected === tribe ? C.gold : C.border}`,
            fontFamily: 'Cinzel, serif',
            fontWeight: selected === tribe ? 700 : 400,
            fontSize: '0.7rem',
            padding: '4px 10px',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.15s',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Unit type icon ───────────────────────────────────────────────────────────
function UnitTypeIcon({ type }) {
  const props = { size: 10, strokeWidth: 2 }
  if (type === 'cavalry') return <span title="Cavalry" style={{ color: C.goldDim }}><Swords {...props} /></span>
  if (type === 'siege')   return <span title="Siege"   style={{ color: '#a78bfa' }}><Flame {...props} /></span>
  if (type === 'chief')   return <span title="Chief"   style={{ color: C.gold }}><Crown {...props} /></span>
  return <span title="Infantry" style={{ color: '#60a5fa' }}><Shield {...props} /></span>
}

// ─── Unit card ────────────────────────────────────────────────────────────────
function UnitCard({ unit, count, onChange }) {
  const active = count > 0

  return (
    <div
      style={{
        background: active ? C.surface2 : C.surface,
        border: `1px solid ${active ? C.gold : C.border}`,
        borderRadius: 6,
        padding: '6px 7px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        transition: 'border-color 0.15s, background 0.15s',
        minWidth: 0,
      }}
    >
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <UnitTypeIcon type={unit.type} />
        <span
          style={{
            color: active ? C.gold : C.text,
            fontSize: '0.65rem',
            fontFamily: 'Cinzel, serif',
            fontWeight: active ? 600 : 400,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={unit.name}
        >
          {unit.name}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 6, fontSize: '0.58rem', color: C.muted, lineHeight: 1 }}>
        <span title="Attack">⚔ {unit.attack}</span>
        <span title="Def vs Inf">🛡{unit.defInf}</span>
        <span title="Def vs Cav">🐴{unit.defCav}</span>
      </div>

      {/* Count input */}
      <input
        type="number"
        min={0}
        value={count === 0 ? '' : count}
        placeholder="0"
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          onChange(unit.id, isNaN(v) || v < 0 ? 0 : v)
        }}
        style={{
          width: '100%',
          background: '#0f0c09',
          border: `1px solid ${active ? C.goldDim : C.border}`,
          borderRadius: 3,
          color: active ? C.gold : C.text,
          fontSize: '0.72rem',
          padding: '2px 4px',
          textAlign: 'right',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

// ─── Army panel ───────────────────────────────────────────────────────────────
function ArmyPanel({
  title,
  icon: Icon,
  tribe,
  onTribeChange,
  counts,
  onCountChange,
  wallLevel,
  onWallChange,
  showWall,
  totalAttack,
  totalDefense,
  accentColor,
}) {
  const units = UNITS[tribe]

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: '14px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Panel header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={18} color={accentColor} strokeWidth={2} />
          <span
            style={{
              fontFamily: 'Cinzel, serif',
              color: accentColor,
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            {title}
          </span>
        </div>
        <TribeSelector selected={tribe} onChange={onTribeChange} />
      </div>

      {/* Wall control (defender only) */}
      {showWall && (
        <div
          style={{
            background: C.surface2,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Shield size={14} color={C.muted} />
          <span style={{ color: C.text, fontSize: '0.78rem', fontFamily: 'Cinzel, serif', flex: 1 }}>
            {WALL_NAMES[tribe]} Level
          </span>
          <input
            type="range"
            min={0}
            max={20}
            value={wallLevel}
            onChange={(e) => onWallChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: C.gold, cursor: 'pointer' }}
          />
          <input
            type="number"
            min={0}
            max={20}
            value={wallLevel}
            onChange={(e) => {
              const v = Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0))
              onWallChange(v)
            }}
            style={{
              width: 42,
              background: '#0f0c09',
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              color: C.gold,
              fontSize: '0.8rem',
              padding: '2px 4px',
              textAlign: 'center',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Unit grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: 6,
        }}
      >
        {units.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            count={counts[unit.id] ?? 0}
            onChange={onCountChange}
          />
        ))}
      </div>

      {/* Strength summary */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '6px 10px',
          background: C.surface2,
          borderRadius: 6,
          border: `1px solid ${C.border}`,
          fontSize: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Swords size={12} color={C.muted} />
          <span style={{ color: C.muted }}>ATK:</span>
          <span style={{ color: C.gold, fontWeight: 700 }}>{Math.round(totalAttack).toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Shield size={12} color={C.muted} />
          <span style={{ color: C.muted }}>DEF:</span>
          <span style={{ color: C.gold, fontWeight: 700 }}>{Math.round(totalDefense).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Casualty row ─────────────────────────────────────────────────────────────
function CasualtyRow({ result, side }) {
  const { unit, initial, lost, survived } = result
  if (initial === 0) return null
  const lossPercent = initial > 0 ? (lost / initial) * 100 : 0
  const isWinningSide = side === 'winner'
  const barColor = isWinningSide ? C.win : C.lose

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 50px 50px 50px 80px',
        gap: 6,
        alignItems: 'center',
        padding: '5px 8px',
        borderBottom: `1px solid ${C.border}`,
        fontSize: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.text, overflow: 'hidden' }}>
        <UnitTypeIcon type={unit.type} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unit.name}</span>
      </div>
      <div style={{ color: C.text, textAlign: 'right' }}>{initial.toLocaleString()}</div>
      <div style={{ color: lost > 0 ? C.lose : C.muted, textAlign: 'right' }}>
        {lost > 0 ? `-${lost.toLocaleString()}` : '—'}
      </div>
      <div style={{ color: survived > 0 ? C.win : C.muted, textAlign: 'right' }}>
        {survived.toLocaleString()}
      </div>
      {/* Loss bar */}
      <div style={{ position: 'relative', height: 8, background: C.surface2, borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${lossPercent}%`,
            background: barColor,
            borderRadius: 4,
            opacity: 0.8,
            transition: 'width 0.3s ease',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: 3,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.6rem',
            color: '#fff',
            lineHeight: 1,
          }}
        >
          {lossPercent.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

// ─── Results section ──────────────────────────────────────────────────────────
function ResultsSection({ result }) {
  const {
    attackerWins,
    totalAttack,
    totalDefense,
    effectiveDefense,
    wallMult,
    infRatio,
    cavRatio,
    attackerLossRatio,
    defenderLossRatio,
    attackerResults,
    defenderResults,
  } = result

  const [expanded, setExpanded] = useState(true)

  const hasAttackers = attackerResults.some((r) => r.initial > 0)
  const hasDefenders = defenderResults.some((r) => r.initial > 0)

  if (!hasAttackers && !hasDefenders) return null

  const attackerColor = attackerWins ? C.win : C.lose
  const defenderColor = attackerWins ? C.lose : C.win

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Results header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: C.surface2,
          borderBottom: `1px solid ${C.border}`,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded((p) => !p)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skull size={16} color={C.gold} />
          <span style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '0.9rem', fontWeight: 700 }}>
            Battle Results
          </span>

          {/* Winner badge */}
          <span
            style={{
              background: attackerWins ? C.winDim : C.loseDim,
              color: attackerWins ? C.win : C.lose,
              border: `1px solid ${attackerWins ? C.win : C.lose}`,
              borderRadius: 4,
              padding: '1px 8px',
              fontSize: '0.65rem',
              fontFamily: 'Cinzel, serif',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            {attackerWins ? 'ATTACKER WINS' : 'DEFENDER WINS'}
          </span>
        </div>
        {expanded ? <ChevronUp size={14} color={C.muted} /> : <ChevronDown size={14} color={C.muted} />}
      </div>

      {expanded && (
        <>
          {/* Strength overview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 8,
              padding: '10px 14px',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            {[
              { label: 'Total Attack', value: Math.round(totalAttack).toLocaleString(), color: C.gold },
              { label: 'Raw Defense', value: Math.round(totalDefense).toLocaleString(), color: C.gold },
              {
                label: `Wall ×${wallMult.toFixed(3)}`,
                value: Math.round(effectiveDefense).toLocaleString(),
                color: '#a78bfa',
              },
              { label: 'Inf / Cav ratio', value: `${(infRatio * 100).toFixed(0)}% / ${(cavRatio * 100).toFixed(0)}%`, color: C.text },
              {
                label: 'Attacker losses',
                value: `${(attackerLossRatio * 100).toFixed(1)}%`,
                color: attackerColor,
              },
              {
                label: 'Defender losses',
                value: `${(defenderLossRatio * 100).toFixed(1)}%`,
                color: defenderColor,
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: '6px 10px',
                }}
              >
                <div style={{ color: C.muted, fontSize: '0.65rem', marginBottom: 2 }}>{label}</div>
                <div style={{ color, fontSize: '0.9rem', fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Casualty tables side by side */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            {/* Attacker casualties */}
            <div style={{ borderRight: `1px solid ${C.border}` }}>
              <div
                style={{
                  padding: '6px 8px',
                  background: attackerWins ? C.winDim : C.loseDim,
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Swords size={12} color={attackerColor} />
                <span style={{ color: attackerColor, fontFamily: 'Cinzel, serif', fontSize: '0.72rem', fontWeight: 700 }}>
                  Attacker
                </span>
              </div>
              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 50px 50px 50px 80px',
                  gap: 6,
                  padding: '4px 8px',
                  fontSize: '0.62rem',
                  color: C.muted,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span>Unit</span>
                <span style={{ textAlign: 'right' }}>Sent</span>
                <span style={{ textAlign: 'right' }}>Lost</span>
                <span style={{ textAlign: 'right' }}>Left</span>
                <span style={{ textAlign: 'right' }}>Loss %</span>
              </div>
              {attackerResults.map((r) => (
                <CasualtyRow key={r.unit.id} result={r} side={attackerWins ? 'winner' : 'loser'} />
              ))}
            </div>

            {/* Defender casualties */}
            <div>
              <div
                style={{
                  padding: '6px 8px',
                  background: attackerWins ? C.loseDim : C.winDim,
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Shield size={12} color={defenderColor} />
                <span style={{ color: defenderColor, fontFamily: 'Cinzel, serif', fontSize: '0.72rem', fontWeight: 700 }}>
                  Defender
                </span>
              </div>
              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 50px 50px 50px 80px',
                  gap: 6,
                  padding: '4px 8px',
                  fontSize: '0.62rem',
                  color: C.muted,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span>Unit</span>
                <span style={{ textAlign: 'right' }}>Sent</span>
                <span style={{ textAlign: 'right' }}>Lost</span>
                <span style={{ textAlign: 'right' }}>Left</span>
                <span style={{ textAlign: 'right' }}>Loss %</span>
              </div>
              {defenderResults.map((r) => (
                <CasualtyRow key={r.unit.id} result={r} side={attackerWins ? 'loser' : 'winner'} />
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              color: C.muted,
              fontSize: '0.65rem',
            }}
          >
            <Info size={10} />
            <span>Formula approximation — may differ slightly from in-game simulator</span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BattleCalculator() {
  // Tribe selections
  const [attackerTribe, setAttackerTribe] = useState('roman')
  const [defenderTribe, setDefenderTribe] = useState('teuton')

  // Unit counts: { unitId: number }
  const [attackerCounts, setAttackerCounts] = useState({})
  const [defenderCounts, setDefenderCounts] = useState({})

  // Wall
  const [wallLevel, setWallLevel] = useState(0)

  // When tribe changes, preserve counts for units whose IDs still exist
  const handleAttackerTribeChange = useCallback((tribe) => {
    setAttackerTribe(tribe)
  }, [])

  const handleDefenderTribeChange = useCallback((tribe) => {
    setDefenderTribe(tribe)
  }, [])

  const handleAttackerCount = useCallback((id, value) => {
    setAttackerCounts((prev) => ({ ...prev, [id]: value }))
  }, [])

  const handleDefenderCount = useCallback((id, value) => {
    setDefenderCounts((prev) => ({ ...prev, [id]: value }))
  }, [])

  // Build attacker/defender arrays from counts
  const attackerArmy = useMemo(
    () =>
      UNITS[attackerTribe].map((unit) => ({
        unit,
        count: attackerCounts[unit.id] ?? 0,
      })),
    [attackerTribe, attackerCounts]
  )

  const defenderArmy = useMemo(
    () =>
      UNITS[defenderTribe].map((unit) => ({
        unit,
        count: defenderCounts[unit.id] ?? 0,
      })),
    [defenderTribe, defenderCounts]
  )

  // Preview defense strength using infRatio = 0.5 for panel display
  const attackerPanelStats = useMemo(() => {
    const totalAttack = attackerArmy.reduce((s, { unit, count }) => s + unit.attack * count, 0)
    const totalDefense = attackerArmy.reduce(
      (s, { unit, count }) => s + (unit.defInf * 0.5 + unit.defCav * 0.5) * count,
      0
    )
    return { totalAttack, totalDefense }
  }, [attackerArmy])

  const defenderPanelStats = useMemo(() => {
    const totalAttack = defenderArmy.reduce((s, { unit, count }) => s + unit.attack * count, 0)
    const totalDefense = defenderArmy.reduce(
      (s, { unit, count }) => s + (unit.defInf * 0.5 + unit.defCav * 0.5) * count,
      0
    )
    return { totalAttack, totalDefense }
  }, [defenderArmy])

  // Real-time battle result
  const battleResult = useMemo(() => {
    const hasAny =
      attackerArmy.some((x) => x.count > 0) || defenderArmy.some((x) => x.count > 0)
    if (!hasAny) return null
    return calculateBattle(attackerArmy, defenderArmy, wallLevel, defenderTribe)
  }, [attackerArmy, defenderArmy, wallLevel, defenderTribe])

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100%',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontFamily: 'system-ui, sans-serif',
        color: C.text,
      }}
    >
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Swords size={22} color={C.gold} />
        <h1
          style={{
            fontFamily: 'Cinzel, serif',
            color: C.gold,
            fontSize: '1.25rem',
            fontWeight: 700,
            margin: 0,
            letterSpacing: '0.08em',
          }}
        >
          Battle Calculator
        </h1>
      </div>

      {/* Army panels */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* Attacker */}
        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          <ArmyPanel
            title="Attacker"
            icon={Swords}
            tribe={attackerTribe}
            onTribeChange={handleAttackerTribeChange}
            counts={attackerCounts}
            onCountChange={handleAttackerCount}
            showWall={false}
            totalAttack={attackerPanelStats.totalAttack}
            totalDefense={attackerPanelStats.totalDefense}
            accentColor={C.lose}
          />
        </div>

        {/* VS divider */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 4px',
            alignSelf: 'stretch',
            gap: 6,
          }}
        >
          <div style={{ width: 1, flex: 1, background: C.border }} />
          <div
            style={{
              fontFamily: 'Cinzel, serif',
              color: C.gold,
              fontSize: '1.1rem',
              fontWeight: 900,
              letterSpacing: '0.1em',
              padding: '4px 0',
            }}
          >
            VS
          </div>
          <div style={{ width: 1, flex: 1, background: C.border }} />
        </div>

        {/* Defender */}
        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          <ArmyPanel
            title="Defender"
            icon={Shield}
            tribe={defenderTribe}
            onTribeChange={handleDefenderTribeChange}
            counts={defenderCounts}
            onCountChange={handleDefenderCount}
            wallLevel={wallLevel}
            onWallChange={setWallLevel}
            showWall={true}
            totalAttack={defenderPanelStats.totalAttack}
            totalDefense={defenderPanelStats.totalDefense}
            accentColor="#60a5fa"
          />
        </div>
      </div>

      {/* Results */}
      {battleResult && <ResultsSection result={battleResult} />}

      {/* Empty state hint */}
      {!battleResult && (
        <div
          style={{
            textAlign: 'center',
            color: C.muted,
            fontSize: '0.8rem',
            padding: '20px 0',
            fontStyle: 'italic',
          }}
        >
          Enter unit counts above to see battle results instantly.
        </div>
      )}
    </div>
  )
}
