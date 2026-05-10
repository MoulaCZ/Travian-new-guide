import { useState, useMemo, useCallback } from 'react'
import {
  Shield, Swords, Flame, Skull, Crown,
  ChevronUp, ChevronDown, Info, Plus, Trash2, User, Zap,
} from 'lucide-react'
import { UNITS, WALL_NAMES, TRIBE_LABELS } from '../data/units'
import { calculateBattle } from '../utils/combat'

// ─── Colour tokens ────────────────────────────────────────────────────────────
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
  winDim:   '#166534',
  loseDim:  '#7f1d1d',
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
            background:  selected === tribe ? C.gold : C.surface2,
            color:       selected === tribe ? '#0f0c09' : C.text,
            border:      `1px solid ${selected === tribe ? C.gold : C.border}`,
            fontFamily:  'Cinzel, serif',
            fontWeight:  selected === tribe ? 700 : 400,
            fontSize:    '0.7rem',
            padding:     '4px 10px',
            borderRadius: 4,
            cursor:      'pointer',
            transition:  'all 0.15s',
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
        background:  active ? C.surface2 : C.surface,
        border:      `1px solid ${active ? C.gold : C.border}`,
        borderRadius: 6,
        padding:     '6px 7px',
        display:     'flex',
        flexDirection: 'column',
        gap:         3,
        transition:  'border-color 0.15s, background 0.15s',
        minWidth:    0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <UnitTypeIcon type={unit.type} />
        <span
          style={{
            color:      active ? C.gold : C.text,
            fontSize:   '0.65rem',
            fontFamily: 'Cinzel, serif',
            fontWeight: active ? 600 : 400,
            lineHeight: 1.2,
            overflow:   'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={unit.name}
        >
          {unit.name}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, fontSize: '0.58rem', color: C.muted, lineHeight: 1 }}>
        <span title="Attack">⚔ {unit.attack}</span>
        <span title="Def vs Inf">🛡{unit.defInf}</span>
        <span title="Def vs Cav">🐴{unit.defCav}</span>
      </div>
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
          width:       '100%',
          background:  '#0f0c09',
          border:      `1px solid ${active ? C.goldDim : C.border}`,
          borderRadius: 3,
          color:       active ? C.gold : C.text,
          fontSize:    '0.72rem',
          padding:     '2px 4px',
          textAlign:   'right',
          outline:     'none',
          fontFamily:  'inherit',
        }}
      />
    </div>
  )
}

// ─── Bonus row (small labelled number input) ─────────────────────────────────
function BonusInput({ label, value, onChange, min = 0, max, suffix = '', hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem' }}>
      <span style={{ color: C.muted, flex: 1, whiteSpace: 'nowrap' }} title={hint}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value === 0 ? '' : value}
        placeholder="0"
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          onChange(isNaN(v) || v < min ? 0 : max !== undefined ? Math.min(v, max) : v)
        }}
        style={{
          width:       52,
          background:  '#0f0c09',
          border:      `1px solid ${C.border}`,
          borderRadius: 3,
          color:       value > 0 ? C.gold : C.text,
          fontSize:    '0.72rem',
          padding:     '2px 5px',
          textAlign:   'right',
          outline:     'none',
          fontFamily:  'inherit',
        }}
      />
      {suffix && <span style={{ color: C.muted, fontSize: '0.68rem' }}>{suffix}</span>}
    </div>
  )
}

// ─── Extras panel (hero / smithy / building) ──────────────────────────────────
function ExtrasPanel({ title, accentColor, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        background:   C.surface2,
        border:       `1px solid ${C.border}`,
        borderRadius:  6,
        overflow:     'hidden',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:      '100%',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding:    '6px 10px',
          background: 'transparent',
          border:     'none',
          cursor:     'pointer',
          color:      accentColor,
          fontFamily: 'Cinzel, serif',
          fontSize:   '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={12} />
          {title}
        </div>
        {open
          ? <ChevronUp size={12} color={C.muted} />
          : <ChevronDown size={12} color={C.muted} />}
      </button>
      {open && (
        <div style={{ padding: '6px 10px 10px', display: 'flex', flexDirection: 'column', gap: 7, borderTop: `1px solid ${C.border}` }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Single army group (tribe + units) ───────────────────────────────────────
function ArmyGroup({ tribe, counts, onTribeChange, onCountChange }) {
  const units = UNITS[tribe]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TribeSelector selected={tribe} onChange={onTribeChange} />
      <div
        style={{
          display:               'grid',
          gridTemplateColumns:   'repeat(auto-fill, minmax(110px, 1fr))',
          gap:                   6,
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
    </div>
  )
}

// ─── Army panel (attacker OR defender) ───────────────────────────────────────
function ArmyPanel({
  title, icon: Icon, accentColor,
  groups, onAddGroup, onRemoveGroup,
  onTribeChange, onCountChange,
  // attacker only
  showWall, wallLevel, onWallChange, defenderTribe,
  // extras
  heroAtk, onHeroAtk,
  heroDef, onHeroDef,
  upgrade, onUpgrade,
  buildingDef, onBuildingDef,
  // summary
  totalAttack, totalDefense,
}) {
  return (
    <div
      style={{
        background:    C.surface,
        border:        `1px solid ${C.border}`,
        borderRadius:  8,
        padding:       '14px 14px 12px',
        display:       'flex',
        flexDirection: 'column',
        gap:           12,
        flex:          1,
        minWidth:      0,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={18} color={accentColor} strokeWidth={2} />
        <span
          style={{
            fontFamily: 'Cinzel, serif',
            color:      accentColor,
            fontSize:   '1rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          {title}
        </span>
      </div>

      {/* Wall (defender only) */}
      {showWall && (
        <div
          style={{
            background:   C.surface2,
            border:       `1px solid ${C.border}`,
            borderRadius: 6,
            padding:      '8px 10px',
            display:      'flex',
            alignItems:   'center',
            gap:          10,
          }}
        >
          <Shield size={14} color={C.muted} />
          <span style={{ color: C.text, fontSize: '0.78rem', fontFamily: 'Cinzel, serif', flex: 1 }}>
            {WALL_NAMES[defenderTribe] ?? 'Wall'} Level
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
            onChange={(e) => onWallChange(Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0)))}
            style={{
              width:       42,
              background:  '#0f0c09',
              border:      `1px solid ${C.border}`,
              borderRadius: 3,
              color:       C.gold,
              fontSize:    '0.8rem',
              padding:     '2px 4px',
              textAlign:   'center',
              fontFamily:  'inherit',
              outline:     'none',
            }}
          />
        </div>
      )}

      {/* Unit groups */}
      {groups.map((g, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {groups.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: C.muted, fontSize: '0.68rem', fontFamily: 'Cinzel, serif' }}>
                {i === 0 ? 'Main Army' : `Reinforcement ${i}`}
              </span>
              {i > 0 && (
                <button
                  onClick={() => onRemoveGroup(i)}
                  style={{
                    background: 'transparent',
                    border:     'none',
                    cursor:     'pointer',
                    color:      C.muted,
                    padding:    '2px 4px',
                    borderRadius: 4,
                    display:    'flex',
                    alignItems: 'center',
                  }}
                  title="Remove group"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
          <ArmyGroup
            tribe={g.tribe}
            counts={g.counts}
            onTribeChange={(tribe) => onTribeChange(i, tribe)}
            onCountChange={(id, val) => onCountChange(i, id, val)}
          />
        </div>
      ))}

      {/* Add reinforcement button (defender only) */}
      {showWall && (
        <button
          onClick={onAddGroup}
          style={{
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            gap:          6,
            padding:      '6px 10px',
            background:   'transparent',
            border:       `1px dashed ${C.border}`,
            borderRadius: 6,
            color:        C.muted,
            fontSize:     '0.72rem',
            cursor:       'pointer',
            fontFamily:   'Cinzel, serif',
            transition:   'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
        >
          <Plus size={13} />
          Add Reinforcement
        </button>
      )}

      {/* Extras */}
      <ExtrasPanel title="Bonuses & Modifiers" accentColor={accentColor}>
        <BonusInput
          label="Hero attack"
          value={heroAtk}
          onChange={onHeroAtk}
          hint="Hero's attack contribution (base strength + items)"
        />
        {showWall ? (
          <>
            <BonusInput
              label="Hero defense"
              value={heroDef}
              onChange={onHeroDef}
              hint="Hero's defense contribution"
            />
            <BonusInput
              label="Building defense"
              value={buildingDef}
              onChange={onBuildingDef}
              hint="Passive defense from Residence / Palace / Command Center"
            />
          </>
        ) : null}
        <BonusInput
          label="Smithy upgrade"
          value={upgrade}
          onChange={onUpgrade}
          min={0}
          max={100}
          suffix="%"
          hint="Smithy upgrade bonus on attack (attacker) or defense (defender). Level 20 ≈ +100%."
        />
      </ExtrasPanel>

      {/* Strength summary */}
      <div
        style={{
          display:      'flex',
          gap:          10,
          padding:      '6px 10px',
          background:   C.surface2,
          borderRadius: 6,
          border:       `1px solid ${C.border}`,
          fontSize:     '0.75rem',
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
  const barColor = side === 'winner' ? C.win : C.lose

  return (
    <div
      style={{
        display:       'grid',
        gridTemplateColumns: '1fr 50px 50px 50px 80px',
        gap:           6,
        alignItems:    'center',
        padding:       '5px 8px',
        borderBottom:  `1px solid ${C.border}`,
        fontSize:      '0.75rem',
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
      <div style={{ position: 'relative', height: 8, background: C.surface2, borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            position:   'absolute',
            left:       0,
            top:        0,
            height:     '100%',
            width:      `${lossPercent}%`,
            background: barColor,
            borderRadius: 4,
            opacity:    0.8,
            transition: 'width 0.3s ease',
          }}
        />
        <span
          style={{
            position:  'absolute',
            right:     3,
            top:       '50%',
            transform: 'translateY(-50%)',
            fontSize:  '0.6rem',
            color:     '#fff',
            lineHeight: 1,
          }}
        >
          {lossPercent.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

// ─── Casualty table ───────────────────────────────────────────────────────────
function CasualtyTable({ title, results, wins, accentColor, Icon }) {
  const hasAny = results.some(r => r.initial > 0)
  if (!hasAny) return null
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          padding:      '6px 8px',
          background:   wins ? C.winDim : C.loseDim,
          borderBottom: `1px solid ${C.border}`,
          display:      'flex',
          alignItems:   'center',
          gap:          6,
        }}
      >
        <Icon size={12} color={accentColor} />
        <span style={{ color: accentColor, fontFamily: 'Cinzel, serif', fontSize: '0.72rem', fontWeight: 700 }}>
          {title}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 50px 50px 80px', gap: 6, padding: '4px 8px', fontSize: '0.62rem', color: C.muted, borderBottom: `1px solid ${C.border}` }}>
        <span>Unit</span>
        <span style={{ textAlign: 'right' }}>Sent</span>
        <span style={{ textAlign: 'right' }}>Lost</span>
        <span style={{ textAlign: 'right' }}>Left</span>
        <span style={{ textAlign: 'right' }}>Loss %</span>
      </div>
      {results.map((r) => (
        <CasualtyRow key={r.unit.id} result={r} side={wins ? 'winner' : 'loser'} />
      ))}
    </div>
  )
}

// ─── Results section ──────────────────────────────────────────────────────────
function ResultsSection({ result }) {
  const {
    attackerWins, totalAttack, totalDefense, effectiveDefense,
    wallMult, infRatio, cavRatio,
    attackerLossRatio, defenderLossRatio,
    attackerResults, defenderResults,
  } = result

  const [expanded, setExpanded] = useState(true)
  const hasAttackers = attackerResults.some(r => r.initial > 0)
  const hasDefenders = defenderResults.some(r => r.initial > 0)
  if (!hasAttackers && !hasDefenders) return null

  const attackerColor = attackerWins ? C.win : C.lose
  const defenderColor = attackerWins ? C.lose : C.win

  return (
    <div
      style={{
        background:   C.surface,
        border:       `1px solid ${C.border}`,
        borderRadius: 8,
        overflow:     'hidden',
      }}
    >
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '10px 14px',
          background:     C.surface2,
          borderBottom:   `1px solid ${C.border}`,
          cursor:         'pointer',
          userSelect:     'none',
        }}
        onClick={() => setExpanded(p => !p)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skull size={16} color={C.gold} />
          <span style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '0.9rem', fontWeight: 700 }}>
            Battle Results
          </span>
          <span
            style={{
              background:  attackerWins ? C.winDim : C.loseDim,
              color:       attackerWins ? C.win : C.lose,
              border:      `1px solid ${attackerWins ? C.win : C.lose}`,
              borderRadius: 4,
              padding:     '1px 8px',
              fontSize:    '0.65rem',
              fontFamily:  'Cinzel, serif',
              fontWeight:  700,
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
          {/* Stats grid */}
          <div
            style={{
              display:               'grid',
              gridTemplateColumns:   'repeat(auto-fill, minmax(160px, 1fr))',
              gap:                   8,
              padding:               '10px 14px',
              borderBottom:          `1px solid ${C.border}`,
            }}
          >
            {[
              { label: 'Total Attack',     value: Math.round(totalAttack).toLocaleString(),       color: C.gold },
              { label: 'Raw Defense',      value: Math.round(totalDefense).toLocaleString(),      color: C.gold },
              { label: `Wall ×${wallMult.toFixed(3)}`, value: Math.round(effectiveDefense).toLocaleString(), color: '#a78bfa' },
              { label: 'Inf / Cav ratio',  value: `${(infRatio*100).toFixed(0)}% / ${(cavRatio*100).toFixed(0)}%`, color: C.text },
              { label: 'Attacker losses',  value: `${(attackerLossRatio*100).toFixed(1)}%`,       color: attackerColor },
              { label: 'Defender losses',  value: `${(defenderLossRatio*100).toFixed(1)}%`,       color: defenderColor },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px' }}
              >
                <div style={{ color: C.muted, fontSize: '0.65rem', marginBottom: 2 }}>{label}</div>
                <div style={{ color, fontSize: '0.9rem', fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Casualty tables */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280, borderRight: `1px solid ${C.border}` }}>
              <CasualtyTable
                title="Attacker"
                results={attackerResults}
                wins={attackerWins}
                accentColor={attackerColor}
                Icon={Swords}
              />
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <CasualtyTable
                title="Defender"
                results={defenderResults}
                wins={!attackerWins}
                accentColor={defenderColor}
                Icon={Shield}
              />
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', color: C.muted, fontSize: '0.65rem' }}>
            <Info size={10} />
            <span>
              Formula: winner losses = (loser / winner)^1.5 — approximation, excludes morale, tribe bonuses and artefacts
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function emptyGroup(tribe = 'roman') {
  return { tribe, counts: {} }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BattleCalculator() {
  // Attacker: single group
  const [attackerGroups, setAttackerGroups] = useState([emptyGroup('roman')])
  const [attackerHeroAtk, setAttackerHeroAtk] = useState(0)
  const [attackerUpgrade, setAttackerUpgrade] = useState(0)

  // Defender: one or more groups
  const [defenderGroups, setDefenderGroups] = useState([emptyGroup('teuton')])
  const [wallLevel, setWallLevel] = useState(0)
  const [defenderHeroAtk, setDefenderHeroAtk] = useState(0)   // unused in formula but stored
  const [defenderHeroDef, setDefenderHeroDef] = useState(0)
  const [defenderUpgrade, setDefenderUpgrade] = useState(0)
  const [buildingDef, setBuildingDef] = useState(0)

  // ── Attacker handlers ──────────────────────────────────────────────────────
  const setAttackerTribe = useCallback((groupIdx, tribe) => {
    setAttackerGroups(gs => gs.map((g, i) => i === groupIdx ? { ...g, tribe } : g))
  }, [])
  const setAttackerCount = useCallback((groupIdx, id, val) => {
    setAttackerGroups(gs => gs.map((g, i) =>
      i === groupIdx ? { ...g, counts: { ...g.counts, [id]: val } } : g
    ))
  }, [])

  // ── Defender handlers ──────────────────────────────────────────────────────
  const setDefenderTribe = useCallback((groupIdx, tribe) => {
    setDefenderGroups(gs => gs.map((g, i) => i === groupIdx ? { ...g, tribe } : g))
  }, [])
  const setDefenderCount = useCallback((groupIdx, id, val) => {
    setDefenderGroups(gs => gs.map((g, i) =>
      i === groupIdx ? { ...g, counts: { ...g.counts, [id]: val } } : g
    ))
  }, [])
  const addDefenderGroup = useCallback(() => {
    setDefenderGroups(gs => [...gs, emptyGroup('roman')])
  }, [])
  const removeDefenderGroup = useCallback((idx) => {
    setDefenderGroups(gs => gs.filter((_, i) => i !== idx))
  }, [])

  // ── Build army arrays ──────────────────────────────────────────────────────
  const attackerArmy = useMemo(() =>
    attackerGroups[0]
      ? UNITS[attackerGroups[0].tribe].map(unit => ({ unit, count: attackerGroups[0].counts[unit.id] ?? 0 }))
      : []
  , [attackerGroups])

  const defenderArmyGroups = useMemo(() =>
    defenderGroups.map(g =>
      UNITS[g.tribe].map(unit => ({ unit, count: g.counts[unit.id] ?? 0 }))
    )
  , [defenderGroups])

  // Primary tribe for wall calc = first group's tribe
  const defenderTribe = defenderGroups[0]?.tribe ?? 'roman'

  // ── Preview stats for panels ───────────────────────────────────────────────
  const attackMult  = 1 + attackerUpgrade / 100
  const defenseMult = 1 + defenderUpgrade / 100

  const attackerPanelAtk = useMemo(() =>
    attackerArmy.reduce((s, { unit, count }) => s + unit.attack * count * attackMult, 0) + attackerHeroAtk
  , [attackerArmy, attackMult, attackerHeroAtk])

  const attackerPanelDef = useMemo(() =>
    attackerArmy.reduce((s, { unit, count }) => s + (unit.defInf * 0.5 + unit.defCav * 0.5) * count * attackMult, 0)
  , [attackerArmy, attackMult])

  const defenderPanelDef = useMemo(() => {
    const troopDef = defenderArmyGroups.flat().reduce(
      (s, { unit, count }) => s + (unit.defInf * 0.5 + unit.defCav * 0.5) * count * defenseMult, 0
    )
    return troopDef + defenderHeroDef + buildingDef
  }, [defenderArmyGroups, defenseMult, defenderHeroDef, buildingDef])

  const defenderPanelAtk = useMemo(() =>
    defenderArmyGroups.flat().reduce((s, { unit, count }) => s + unit.attack * count, 0)
  , [defenderArmyGroups])

  // ── Battle result ──────────────────────────────────────────────────────────
  const battleResult = useMemo(() => {
    const hasAny =
      attackerArmy.some(x => x.count > 0) ||
      defenderArmyGroups.flat().some(x => x.count > 0)
    if (!hasAny) return null
    return calculateBattle(attackerArmy, defenderArmyGroups, wallLevel, defenderTribe, {
      heroAttack:     attackerHeroAtk,
      heroDefense:    defenderHeroDef,
      buildingDefense: buildingDef,
      attackerUpgrade,
      defenderUpgrade,
    })
  }, [attackerArmy, defenderArmyGroups, wallLevel, defenderTribe, attackerHeroAtk, defenderHeroDef, buildingDef, attackerUpgrade, defenderUpgrade])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background:    C.bg,
        minHeight:     '100%',
        padding:       '16px',
        display:       'flex',
        flexDirection: 'column',
        gap:           16,
        fontFamily:    'system-ui, sans-serif',
        color:         C.text,
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Swords size={22} color={C.gold} />
        <h1
          style={{
            fontFamily: 'Cinzel, serif',
            color:      C.gold,
            fontSize:   '1.25rem',
            fontWeight: 700,
            margin:     0,
            letterSpacing: '0.08em',
          }}
        >
          Battle Calculator
        </h1>
      </div>

      {/* Army panels */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Attacker */}
        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          <ArmyPanel
            title="Attacker"
            icon={Swords}
            accentColor={C.lose}
            groups={attackerGroups}
            onTribeChange={setAttackerTribe}
            onCountChange={setAttackerCount}
            onAddGroup={() => {}}
            onRemoveGroup={() => {}}
            showWall={false}
            heroAtk={attackerHeroAtk}
            onHeroAtk={setAttackerHeroAtk}
            heroDef={0}
            onHeroDef={() => {}}
            upgrade={attackerUpgrade}
            onUpgrade={setAttackerUpgrade}
            buildingDef={0}
            onBuildingDef={() => {}}
            totalAttack={attackerPanelAtk}
            totalDefense={attackerPanelDef}
          />
        </div>

        {/* VS divider */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 4px', alignSelf: 'stretch', gap: 6 }}>
          <div style={{ width: 1, flex: 1, background: C.border }} />
          <div style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.1em' }}>
            VS
          </div>
          <div style={{ width: 1, flex: 1, background: C.border }} />
        </div>

        {/* Defender */}
        <div style={{ flex: '1 1 340px', minWidth: 0 }}>
          <ArmyPanel
            title="Defender"
            icon={Shield}
            accentColor="#60a5fa"
            groups={defenderGroups}
            onTribeChange={setDefenderTribe}
            onCountChange={setDefenderCount}
            onAddGroup={addDefenderGroup}
            onRemoveGroup={removeDefenderGroup}
            showWall={true}
            wallLevel={wallLevel}
            onWallChange={setWallLevel}
            defenderTribe={defenderTribe}
            heroAtk={defenderHeroAtk}
            onHeroAtk={setDefenderHeroAtk}
            heroDef={defenderHeroDef}
            onHeroDef={setDefenderHeroDef}
            upgrade={defenderUpgrade}
            onUpgrade={setDefenderUpgrade}
            buildingDef={buildingDef}
            onBuildingDef={setBuildingDef}
            totalAttack={defenderPanelAtk}
            totalDefense={defenderPanelDef}
          />
        </div>
      </div>

      {/* Results */}
      {battleResult && <ResultsSection result={battleResult} />}

      {!battleResult && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.8rem', padding: '20px 0', fontStyle: 'italic' }}>
          Enter unit counts above to see battle results instantly.
        </div>
      )}
    </div>
  )
}
