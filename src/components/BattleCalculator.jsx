import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Shield, Swords, Flame, Skull, Crown,
  ChevronUp, ChevronDown, Info, Plus, Trash2, Zap,
} from 'lucide-react'
import { UNITS, WALL_NAMES, TRIBE_LABELS } from '../data/units'
import { calculateBattle, smithyMult, buildingDefensePoints } from '../utils/combat'

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
    <div className="flex gap-1 flex-wrap">
      {Object.entries(TRIBE_LABELS).map(([tribe, label]) => (
        <button
          key={tribe}
          onClick={() => onChange(tribe)}
          style={{
            background:   selected === tribe ? C.gold : C.surface2,
            color:        selected === tribe ? '#0f0c09' : C.text,
            border:       `1px solid ${selected === tribe ? C.gold : C.border}`,
            fontFamily:   'Cinzel, serif',
            fontWeight:   selected === tribe ? 700 : 400,
            fontSize:     '0.7rem',
            padding:      '4px 10px',
            borderRadius: 4,
            cursor:       'pointer',
            transition:   'all 0.15s',
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
  const p = { size: 10, strokeWidth: 2 }
  if (type === 'cavalry') return <span title="Cavalry" style={{ color: C.goldDim }}><Swords {...p} /></span>
  if (type === 'siege')   return <span title="Siege"   style={{ color: '#a78bfa' }}><Flame {...p} /></span>
  if (type === 'chief')   return <span title="Chief"   style={{ color: C.gold }}><Crown {...p} /></span>
  return <span title="Infantry" style={{ color: '#60a5fa' }}><Shield {...p} /></span>
}

// ─── Unit card — count + per-unit smithy level ────────────────────────────────
function UnitCard({ unit, count, smithy, onCount, onSmithy }) {
  const active = count > 0
  const effectiveMult = smithyMult(smithy)
  const showSmithyEffect = smithy > 0

  return (
    <div
      style={{
        background:   active ? C.surface2 : C.surface,
        border:       `1px solid ${active ? C.gold : C.border}`,
        borderRadius: 6,
        padding:      '6px 7px',
        display:      'flex',
        flexDirection:'column',
        gap:          4,
        transition:   'border-color 0.15s, background 0.15s',
        minWidth:     0,
      }}
    >
      {/* Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <UnitTypeIcon type={unit.type} />
        <span
          style={{
            color:        active ? C.gold : C.text,
            fontSize:     '0.65rem',
            fontFamily:   'Cinzel, serif',
            fontWeight:   active ? 600 : 400,
            lineHeight:   1.2,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}
          title={unit.name}
        >
          {unit.name}
        </span>
      </div>

      {/* Base stats */}
      <div style={{ display: 'flex', gap: 5, fontSize: '0.58rem', color: C.muted, lineHeight: 1, flexWrap: 'wrap' }}>
        <span title="Attack">⚔ {showSmithyEffect ? <span style={{ color: C.gold }}>{Math.round(unit.attack * effectiveMult)}</span> : unit.attack}</span>
        <span title="Def vs Infantry">🛡 {showSmithyEffect ? <span style={{ color: C.gold }}>{Math.round(unit.defInf * effectiveMult)}</span> : unit.defInf}</span>
        <span title="Def vs Cavalry">🐴 {showSmithyEffect ? <span style={{ color: C.gold }}>{Math.round(unit.defCav * effectiveMult)}</span> : unit.defCav}</span>
      </div>

      {/* Count */}
      <input
        type="number"
        min={0}
        value={count === 0 ? '' : count}
        placeholder="Count"
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          onCount(unit.id, isNaN(v) || v < 0 ? 0 : v)
        }}
        style={{
          width:        '100%',
          background:   '#0f0c09',
          border:       `1px solid ${active ? C.goldDim : C.border}`,
          borderRadius: 3,
          color:        active ? C.gold : C.text,
          fontSize:     '0.72rem',
          padding:      '2px 4px',
          textAlign:    'right',
          outline:      'none',
          fontFamily:   'inherit',
        }}
      />

      {/* Smithy level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: C.muted, fontSize: '0.58rem', flex: 1 }}>
          Upg
          {showSmithyEffect && (
            <span style={{ color: C.gold, marginLeft: 3 }}>+{(smithy * 5)}%</span>
          )}
        </span>
        <input
          type="number"
          min={0}
          max={20}
          value={smithy === 0 ? '' : smithy}
          placeholder="0"
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            onSmithy(unit.id, isNaN(v) || v < 0 ? 0 : Math.min(20, v))
          }}
          style={{
            width:        38,
            background:   '#0f0c09',
            border:       `1px solid ${smithy > 0 ? C.goldDim : C.border}`,
            borderRadius: 3,
            color:        smithy > 0 ? C.gold : C.muted,
            fontSize:     '0.68rem',
            padding:      '1px 3px',
            textAlign:    'right',
            outline:      'none',
            fontFamily:   'inherit',
          }}
        />
        <span style={{ color: C.muted, fontSize: '0.58rem' }}>/20</span>
      </div>
    </div>
  )
}

// ─── Hero flat-bonus input ─────────────────────────────────────────────────────
function FlatInput({ label, value, onChange, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: C.muted, fontSize: '0.72rem', flex: 1 }} title={hint}>{label}</span>
      <input
        type="number"
        min={0}
        value={value === 0 ? '' : value}
        placeholder="0"
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          onChange(isNaN(v) || v < 0 ? 0 : v)
        }}
        style={{
          width:        60,
          background:   '#0f0c09',
          border:       `1px solid ${value > 0 ? C.goldDim : C.border}`,
          borderRadius: 3,
          color:        value > 0 ? C.gold : C.text,
          fontSize:     '0.72rem',
          padding:      '2px 5px',
          textAlign:    'right',
          outline:      'none',
          fontFamily:   'inherit',
        }}
      />
    </div>
  )
}

// ─── Army group (tribe + unit grid) ───────────────────────────────────────────
function ArmyGroup({ group, groupIdx, groupLabel, onTribeChange, onCount, onSmithy, onRemove }) {
  const units = UNITS[group.tribe]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <TribeSelector selected={group.tribe} onChange={(t) => onTribeChange(groupIdx, t)} />
        {onRemove && (
          <button
            onClick={() => onRemove(groupIdx)}
            title="Remove group"
            style={{
              background:   'transparent',
              border:       'none',
              cursor:       'pointer',
              color:        C.muted,
              padding:      '2px 4px',
              borderRadius: 4,
              display:      'flex',
              alignItems:   'center',
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {groupLabel && (
        <div style={{ fontSize: '0.65rem', color: C.muted, fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
          {groupLabel}
        </div>
      )}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
          gap:                 6,
        }}
      >
        {units.map((unit) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            count={group.counts[unit.id] ?? 0}
            smithy={group.smithy[unit.id] ?? 0}
            onCount={(id, val) => onCount(groupIdx, id, val)}
            onSmithy={(id, val) => onSmithy(groupIdx, id, val)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Army panel ───────────────────────────────────────────────────────────────
function ArmyPanel({
  title, icon: Icon, accentColor,
  groups, onTribeChange, onCount, onSmithy, onAddGroup, onRemoveGroup,
  // wall (defender)
  showWall, wallLevel, onWallChange, defenderTribe,
  // residence (defender)
  residenceLevel, onResidenceLevel,
  // hero
  heroAtk, onHeroAtk,
  heroDef, onHeroDef,
  // off/def bonus
  bonusPct, onBonusPct,
  // weapon
  weapon, onWeapon,
  // summary
  totalAttack, totalDefense,
}) {
  const [extrasOpen, setExtrasOpen] = useState(false)

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
        <span style={{ fontFamily: 'Cinzel, serif', color: accentColor, fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em' }}>
          {title}
        </span>
      </div>

      {/* Wall (defender only) */}
      {showWall && (
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={14} color={C.muted} />
          <span style={{ color: C.text, fontSize: '0.78rem', fontFamily: 'Cinzel, serif', flex: 1 }}>
            {WALL_NAMES[defenderTribe] ?? 'Wall'} Level
          </span>
          <input
            type="range" min={0} max={20} value={wallLevel}
            onChange={(e) => onWallChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: C.gold, cursor: 'pointer' }}
          />
          <input
            type="number" min={0} max={20} value={wallLevel}
            onChange={(e) => onWallChange(Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0)))}
            style={{ width: 42, background: '#0f0c09', border: `1px solid ${C.border}`, borderRadius: 3, color: C.gold, fontSize: '0.8rem', padding: '2px 4px', textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
      )}

      {/* Unit groups */}
      {groups.map((g, i) => (
        <ArmyGroup
          key={i}
          group={g}
          groupIdx={i}
          groupLabel={groups.length > 1 ? (i === 0 ? 'Main Army' : `Reinforcement ${i}`) : null}
          onTribeChange={onTribeChange}
          onCount={onCount}
          onSmithy={onSmithy}
          onRemove={i > 0 ? onRemoveGroup : null}
        />
      ))}

      {/* Add reinforcement (defender only) */}
      {showWall && (
        <button
          onClick={onAddGroup}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            6,
            padding:        '6px 10px',
            background:     'transparent',
            border:         `1px dashed ${C.border}`,
            borderRadius:   6,
            color:          C.muted,
            fontSize:       '0.72rem',
            cursor:         'pointer',
            fontFamily:     'Cinzel, serif',
            transition:     'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
        >
          <Plus size={13} />
          Add Reinforcement
        </button>
      )}

      {/* Extras (hero + residence) */}
      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
        <button
          onClick={() => setExtrasOpen(o => !o)}
          style={{
            width:          '100%',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '6px 10px',
            background:     'transparent',
            border:         'none',
            cursor:         'pointer',
            color:          accentColor,
            fontFamily:     'Cinzel, serif',
            fontSize:       '0.72rem',
            fontWeight:     600,
            letterSpacing:  '0.05em',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={12} />
            Hero &amp; Modifiers
          </div>
          {extrasOpen ? <ChevronUp size={12} color={C.muted} /> : <ChevronDown size={12} color={C.muted} />}
        </button>
        {extrasOpen && (
          <div style={{ padding: '8px 10px 10px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Off / Def bonus % from hero */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{ color: C.muted, fontSize: '0.72rem', flex: 1 }}
                title={showWall
                  ? 'Def bonus % — multiplies all defender troop defense. Found in Hero → Properties → Def bonus.'
                  : 'Off bonus % — multiplies all attacker troop attack. Found in Hero → Properties → Off bonus.'}
              >
                {showWall ? 'Def bonus %' : 'Off bonus %'}
              </span>
              <input
                type="number" min={0} step={0.1}
                value={bonusPct === 0 ? '' : bonusPct}
                placeholder="0"
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  onBonusPct(isNaN(v) || v < 0 ? 0 : v)
                }}
                style={{
                  width: 60, background: '#0f0c09',
                  border: `1px solid ${bonusPct > 0 ? C.goldDim : C.border}`,
                  borderRadius: 3, color: bonusPct > 0 ? C.gold : C.text,
                  fontSize: '0.72rem', padding: '2px 5px', textAlign: 'right',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <span style={{ color: C.muted, fontSize: '0.68rem' }}>%</span>
            </div>
            <FlatInput
              label="Hero Síla"
              value={showWall ? heroDef : heroAtk}
              onChange={showWall ? onHeroDef : onHeroAtk}
              hint="Hero's total Strength stat (hero points + equipment). Added directly to combat as flat attack (attacker) or defense (defender)."
            />
            {/* Weapon bonus */}
            {(() => {
              const tribeUnits = UNITS[groups[0]?.tribe] ?? []
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ color: C.muted, fontSize: '0.72rem' }}
                    title="Weapon bonus applies a flat value to attack (attacker) or defInf+defCav (defender) of a specific unit type. E.g. +6 to each Paladin.">
                    Weapon bonus (unit)
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      value={weapon?.unitId ?? ''}
                      onChange={(e) => onWeapon({ unitId: e.target.value, bonus: weapon?.bonus ?? 0 })}
                      style={{
                        flex: 1,
                        background: '#0f0c09',
                        border: `1px solid ${weapon?.unitId ? C.goldDim : C.border}`,
                        borderRadius: 3,
                        color: weapon?.unitId ? C.gold : C.muted,
                        fontSize: '0.7rem',
                        padding: '3px 5px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">— no weapon —</option>
                      {tribeUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={weapon?.bonus === 0 ? '' : (weapon?.bonus ?? '')}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        onWeapon({ unitId: weapon?.unitId ?? '', bonus: isNaN(v) || v < 0 ? 0 : v })
                      }}
                      disabled={!weapon?.unitId}
                      style={{
                        width: 52,
                        background: '#0f0c09',
                        border: `1px solid ${weapon?.bonus > 0 ? C.goldDim : C.border}`,
                        borderRadius: 3,
                        color: weapon?.bonus > 0 ? C.gold : C.muted,
                        fontSize: '0.72rem',
                        padding: '2px 5px',
                        textAlign: 'right',
                        outline: 'none',
                        fontFamily: 'inherit',
                        opacity: weapon?.unitId ? 1 : 0.4,
                      }}
                    />
                    <span style={{ color: C.muted, fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                      {showWall ? 'def+def' : 'atk'}
                    </span>
                  </div>
                </div>
              )
            })()}
            {showWall && (
              /* Residence / Palace slider */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: C.muted, fontSize: '0.72rem' }}>Residence / Palace level</span>
                  <span style={{ color: C.gold, fontSize: '0.72rem', fontWeight: 700 }}>
                    Lv {residenceLevel} → {buildingDefensePoints(residenceLevel)} def
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range" min={0} max={20} value={residenceLevel}
                    onChange={(e) => onResidenceLevel(Number(e.target.value))}
                    style={{ flex: 1, accentColor: C.gold, cursor: 'pointer' }}
                  />
                  <input
                    type="number" min={0} max={20} value={residenceLevel}
                    onChange={(e) => onResidenceLevel(Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0)))}
                    style={{ width: 42, background: '#0f0c09', border: `1px solid ${C.border}`, borderRadius: 3, color: C.gold, fontSize: '0.8rem', padding: '2px 4px', textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <span style={{ color: C.muted, fontSize: '0.62rem' }}>
                  Includes village base 10 · +40 per level · max lv20 = 810 total
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Strength summary */}
      <div style={{ display: 'flex', gap: 10, padding: '6px 10px', background: C.surface2, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: '0.75rem' }}>
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
function CasualtyRow({ result, wins }) {
  const { unit, initial, lost, survived } = result
  if (initial === 0) return null
  const pct = initial > 0 ? (lost / initial) * 100 : 0
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 52px 52px 76px', gap: 6, alignItems: 'center', padding: '5px 8px', borderBottom: `1px solid ${C.border}`, fontSize: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.text, overflow: 'hidden' }}>
        <UnitTypeIcon type={unit.type} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{unit.name}</span>
      </div>
      <div style={{ color: C.text,                           textAlign: 'right' }}>{initial.toLocaleString()}</div>
      <div style={{ color: lost > 0 ? C.lose : C.muted,     textAlign: 'right' }}>{lost > 0 ? `-${lost.toLocaleString()}` : '—'}</div>
      <div style={{ color: survived > 0 ? C.win : C.muted,  textAlign: 'right' }}>{survived.toLocaleString()}</div>
      <div style={{ position: 'relative', height: 8, background: C.surface2, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: wins ? C.win : C.lose, borderRadius: 4, opacity: 0.8, transition: 'width 0.3s ease' }} />
        <span style={{ position: 'absolute', right: 3, top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', color: '#fff', lineHeight: 1 }}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}

// ─── Results section ──────────────────────────────────────────────────────────
function ResultsSection({ result }) {
  const {
    attackerWins, totalAttack, totalDefense, effectiveDefense,
    wallMult, infRatio, cavRatio, attackerLossRatio, defenderLossRatio,
    attackerResults, defenderResults,
  } = result

  const [expanded, setExpanded] = useState(true)
  const hasAny = attackerResults.some(r => r.initial > 0) || defenderResults.some(r => r.initial > 0)
  if (!hasAny) return null

  const aColor = attackerWins ? C.win : C.lose
  const dColor = attackerWins ? C.lose : C.win

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: C.surface2, borderBottom: `1px solid ${C.border}`, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(p => !p)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skull size={16} color={C.gold} />
          <span style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '0.9rem', fontWeight: 700 }}>Battle Results</span>
          <span style={{ background: attackerWins ? C.winDim : C.loseDim, color: attackerWins ? C.win : C.lose, border: `1px solid ${attackerWins ? C.win : C.lose}`, borderRadius: 4, padding: '1px 8px', fontSize: '0.65rem', fontFamily: 'Cinzel, serif', fontWeight: 700, letterSpacing: '0.05em' }}>
            {attackerWins ? 'ATTACKER WINS' : 'DEFENDER WINS'}
          </span>
        </div>
        {expanded ? <ChevronUp size={14} color={C.muted} /> : <ChevronDown size={14} color={C.muted} />}
      </div>

      {expanded && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
            {[
              { label: 'Total Attack',      value: Math.round(totalAttack).toLocaleString(),     color: C.gold },
              { label: 'Raw Defense',       value: Math.round(totalDefense).toLocaleString(),    color: C.gold },
              { label: `Wall ×${wallMult.toFixed(3)}`, value: Math.round(effectiveDefense).toLocaleString(), color: '#a78bfa' },
              { label: 'Inf / Cav ratio',   value: `${(infRatio*100).toFixed(0)}% / ${(cavRatio*100).toFixed(0)}%`, color: C.text },
              { label: 'Attacker losses',   value: `${(attackerLossRatio*100).toFixed(1)}%`,    color: aColor },
              { label: 'Defender losses',   value: `${(defenderLossRatio*100).toFixed(1)}%`,    color: dColor },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px' }}>
                <div style={{ color: C.muted, fontSize: '0.65rem', marginBottom: 2 }}>{label}</div>
                <div style={{ color, fontSize: '0.9rem', fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Casualty tables */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
            {/* Attacker */}
            <div style={{ flex: '1 1 280px', borderRight: `1px solid ${C.border}` }}>
              <div style={{ padding: '6px 8px', background: attackerWins ? C.winDim : C.loseDim, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Swords size={12} color={aColor} />
                <span style={{ color: aColor, fontFamily: 'Cinzel, serif', fontSize: '0.72rem', fontWeight: 700 }}>Attacker</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 52px 52px 76px', gap: 6, padding: '4px 8px', fontSize: '0.62rem', color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                <span>Unit</span><span style={{ textAlign:'right' }}>Sent</span><span style={{ textAlign:'right' }}>Lost</span><span style={{ textAlign:'right' }}>Left</span><span style={{ textAlign:'right' }}>Loss %</span>
              </div>
              {attackerResults.map(r => <CasualtyRow key={r.unit.id} result={r} wins={attackerWins} />)}
            </div>
            {/* Defender */}
            <div style={{ flex: '1 1 280px' }}>
              <div style={{ padding: '6px 8px', background: attackerWins ? C.loseDim : C.winDim, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={12} color={dColor} />
                <span style={{ color: dColor, fontFamily: 'Cinzel, serif', fontSize: '0.72rem', fontWeight: 700 }}>Defender</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 52px 52px 76px', gap: 6, padding: '4px 8px', fontSize: '0.62rem', color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                <span>Unit</span><span style={{ textAlign:'right' }}>Sent</span><span style={{ textAlign:'right' }}>Lost</span><span style={{ textAlign:'right' }}>Left</span><span style={{ textAlign:'right' }}>Loss %</span>
              </div>
              {defenderResults.map(r => <CasualtyRow key={r.unit.id} result={r} wins={!attackerWins} />)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', color: C.muted, fontSize: '0.65rem' }}>
            <Info size={10} />
            <span>Formula: (loser / winner)^1.4 · Smithy: ×(1 + lv/5) · Village base 10 + Residence lv20 = 810 def · excludes morale &amp; artefacts</span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Battle animation ─────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes b-atk-in   { from { transform: translateX(-100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes b-def-in   { from { transform: translateX( 100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes b-clash    { 0% { transform:translate(-50%,-50%) scale(0.2); opacity:0; }
                        45%{ transform:translate(-50%,-50%) scale(2.2); opacity:1; }
                       100%{ transform:translate(-50%,-50%) scale(1.4); opacity:0; } }
@keyframes b-shake    { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }
@keyframes b-spark    { from{transform:translate(0,0) scale(1); opacity:1;} to{transform:translate(var(--tx),var(--ty)) scale(0); opacity:0;} }
@keyframes b-winner   { from{opacity:0; transform:translateY(8px) scale(0.9);} to{opacity:1; transform:translateY(0) scale(1);} }
@keyframes b-loser    { to { opacity: 0.2; transform: translateY(6px) scale(0.9); } }
@keyframes b-glow     { 0%,100%{text-shadow:0 0 4px currentColor;} 50%{text-shadow:0 0 20px currentColor, 0 0 40px currentColor;} }
@keyframes b-ground   { from{opacity:0; transform:scaleX(0);} to{opacity:0.4; transform:scaleX(1);} }
`

// Pre-computed spark directions (12 sparks, equal radial distribution)
const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2
  const dist  = 32 + (i % 3) * 10
  return {
    tx:    `${(Math.cos(angle) * dist).toFixed(1)}px`,
    ty:    `${(Math.sin(angle) * dist).toFixed(1)}px`,
    delay: `${i * 25}ms`,
    size:  i % 3 === 0 ? 5 : 3,
    color: i % 4 === 0 ? '#fff' : C.gold,
  }
})

const SOLDIER_STAGGER = [0, 60, 30, 90, 15] // ms stagger per icon

function BattleAnimation({ result, animKey }) {
  const [phase, setPhase] = useState('idle') // idle | marching | clash | done

  useEffect(() => {
    if (!result) { setPhase('idle'); return }
    setPhase('marching')
    const t1 = setTimeout(() => setPhase('clash'),   750)
    const t2 = setTimeout(() => setPhase('done'),   1350)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [animKey])

  if (!result || phase === 'idle') return null

  const { attackerWins } = result
  const aColor  = attackerWins ? C.win  : C.lose
  const dColor  = attackerWins ? C.lose : C.win

  const icons = 5

  return (
    <>
      <style>{ANIM_CSS}</style>
      <div style={{
        background:    C.surface,
        border:        `1px solid ${attackerWins ? C.win : '#60a5fa'}33`,
        borderRadius:  8,
        padding:       '18px 20px 14px',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           10,
        overflow:      'hidden',
        position:      'relative',
        boxShadow:     `0 0 24px ${attackerWins ? C.win : '#60a5fa'}18`,
      }}>

        {/* ground line */}
        <div style={{
          position:   'absolute',
          bottom:     44,
          left:       '10%',
          right:      '10%',
          height:     1,
          background: C.border,
          animation:  'b-ground 0.4s ease-out forwards',
        }} />

        {/* ── Battle scene ── */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 500, position: 'relative', height: 64, justifyContent: 'space-between' }}>

          {/* Attacker soldiers */}
          <div style={{
            display:   'flex',
            gap:       6,
            alignItems:'center',
            animation: 'b-atk-in 0.55s cubic-bezier(.22,1,.36,1) forwards',
          }}>
            {Array.from({ length: icons }).map((_, i) => (
              <div key={i} style={{
                animation: phase === 'clash' ? `b-shake 0.35s ease ${SOLDIER_STAGGER[i]}ms both`
                         : phase === 'done' && !attackerWins ? `b-loser 0.5s ease ${i * 40}ms forwards` : 'none',
              }}>
                <Swords
                  size={i === 2 ? 26 : 20}
                  color={aColor}
                  strokeWidth={2}
                  style={{ filter: phase === 'done' && attackerWins ? `drop-shadow(0 0 4px ${aColor})` : 'none', transition: 'filter 0.4s' }}
                />
              </div>
            ))}
          </div>

          {/* Center: explosion + sparks */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', zIndex: 10 }}>
            {/* sparks */}
            {phase === 'clash' && SPARKS.map((s, i) => (
              <div key={i} style={{
                position:     'absolute',
                left:         0, top: 0,
                width:        s.size,
                height:       s.size,
                borderRadius: '50%',
                background:   s.color,
                '--tx':       s.tx,
                '--ty':       s.ty,
                animation:    `b-spark 0.5s ease-out ${s.delay} both`,
                pointerEvents:'none',
              }} />
            ))}
            {/* flash emoji */}
            {(phase === 'clash') && (
              <div style={{
                position:      'absolute',
                left: 0, top: 0,
                fontSize:      '2rem',
                lineHeight:    1,
                animation:     'b-clash 0.65s ease-out forwards',
                pointerEvents: 'none',
                userSelect:    'none',
              }}>
                ⚡
              </div>
            )}
          </div>

          {/* Defender soldiers */}
          <div style={{
            display:           'flex',
            gap:               6,
            alignItems:        'center',
            flexDirection:     'row-reverse',
            animation:         'b-def-in 0.55s cubic-bezier(.22,1,.36,1) forwards',
          }}>
            {Array.from({ length: icons }).map((_, i) => (
              <div key={i} style={{
                animation: phase === 'clash' ? `b-shake 0.35s ease ${SOLDIER_STAGGER[i]}ms both`
                         : phase === 'done' && attackerWins ? `b-loser 0.5s ease ${i * 40}ms forwards` : 'none',
              }}>
                <Shield
                  size={i === 2 ? 26 : 20}
                  color={dColor}
                  strokeWidth={2}
                  style={{ filter: phase === 'done' && !attackerWins ? `drop-shadow(0 0 4px ${dColor})` : 'none', transition: 'filter 0.4s' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Winner banner */}
        {phase === 'done' && (
          <div style={{ animation: 'b-winner 0.4s cubic-bezier(.22,1,.36,1) forwards' }}>
            <span style={{
              fontFamily:   'Cinzel, serif',
              fontWeight:   900,
              fontSize:     '0.95rem',
              color:        attackerWins ? C.win : '#60a5fa',
              letterSpacing:'0.12em',
              animation:    'b-glow 1.4s ease-in-out infinite',
            }}>
              {attackerWins ? '⚔ ATTACKER WINS' : '🛡 DEFENDER WINS'}
            </span>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Empty group factory ──────────────────────────────────────────────────────
function emptyGroup(tribe = 'roman') {
  return { tribe, counts: {}, smithy: {} }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BattleCalculator() {
  const [attackerGroups, setAttackerGroups] = useState([emptyGroup('roman')])
  const [attackerHeroAtk, setAttackerHeroAtk] = useState(0)
  const [offBonusPct, setOffBonusPct] = useState(0)
  const [attackerWeapon, setAttackerWeapon] = useState({ unitId: '', bonus: 0 })

  const [defenderGroups, setDefenderGroups] = useState([emptyGroup('teuton')])
  const [wallLevel, setWallLevel] = useState(0)
  const [defenderHeroDef, setDefenderHeroDef] = useState(0)
  const [defenderHeroAtk, setDefenderHeroAtk] = useState(0)
  const [defBonusPct, setDefBonusPct] = useState(0)
  const [defenderWeapon, setDefenderWeapon] = useState({ unitId: '', bonus: 0 })
  const [residenceLevel, setResidenceLevel] = useState(0)
  const [animKey, setAnimKey] = useState(0)

  // ── Attacker mutations ─────────────────────────────────────────────────────
  const setAttackerTribe = useCallback((i, tribe) =>
    setAttackerGroups(gs => gs.map((g, idx) => idx === i ? { ...g, tribe } : g)), [])
  const setAttackerCount = useCallback((i, id, val) =>
    setAttackerGroups(gs => gs.map((g, idx) => idx === i ? { ...g, counts: { ...g.counts, [id]: val } } : g)), [])
  const setAttackerSmithy = useCallback((i, id, val) =>
    setAttackerGroups(gs => gs.map((g, idx) => idx === i ? { ...g, smithy: { ...g.smithy, [id]: val } } : g)), [])

  // ── Defender mutations ─────────────────────────────────────────────────────
  const setDefenderTribe = useCallback((i, tribe) =>
    setDefenderGroups(gs => gs.map((g, idx) => idx === i ? { ...g, tribe } : g)), [])
  const setDefenderCount = useCallback((i, id, val) =>
    setDefenderGroups(gs => gs.map((g, idx) => idx === i ? { ...g, counts: { ...g.counts, [id]: val } } : g)), [])
  const setDefenderSmithy = useCallback((i, id, val) =>
    setDefenderGroups(gs => gs.map((g, idx) => idx === i ? { ...g, smithy: { ...g.smithy, [id]: val } } : g)), [])
  const addDefenderGroup  = useCallback(() => setDefenderGroups(gs => [...gs, emptyGroup('roman')]), [])
  const removeDefenderGroup = useCallback((i) => setDefenderGroups(gs => gs.filter((_, idx) => idx !== i)), [])

  // ── Build army arrays for combat engine ────────────────────────────────────
  const attackerArmy = useMemo(() => {
    const g = attackerGroups[0]
    if (!g) return []
    return UNITS[g.tribe].map(unit => ({ unit, count: g.counts[unit.id] ?? 0, smithy: g.smithy[unit.id] ?? 0 }))
  }, [attackerGroups])

  const defenderArmyGroups = useMemo(() =>
    defenderGroups.map(g =>
      UNITS[g.tribe].map(unit => ({ unit, count: g.counts[unit.id] ?? 0, smithy: g.smithy[unit.id] ?? 0 }))
    )
  , [defenderGroups])

  const defenderTribe = defenderGroups[0]?.tribe ?? 'roman'

  // ── Panel summary values ───────────────────────────────────────────────────
  const offMult = 1 + offBonusPct / 100
  const defMult = 1 + defBonusPct / 100

  const atkPanelAtk = useMemo(() =>
    attackerArmy.reduce((s, { unit, count, smithy }) => s + unit.attack * count * smithyMult(smithy) * offMult, 0) + attackerHeroAtk
  , [attackerArmy, attackerHeroAtk, offMult])

  const atkPanelDef = useMemo(() =>
    attackerArmy.reduce((s, { unit, count, smithy }) => s + (unit.defInf * 0.5 + unit.defCav * 0.5) * count * smithyMult(smithy), 0)
  , [attackerArmy])

  const defPanelDef = useMemo(() => {
    const troop = defenderArmyGroups.flat().reduce(
      (s, { unit, count, smithy }) => s + (unit.defInf * 0.5 + unit.defCav * 0.5) * count * smithyMult(smithy) * defMult, 0
    )
    return troop + defenderHeroDef + buildingDefensePoints(residenceLevel)
  }, [defenderArmyGroups, defenderHeroDef, residenceLevel, defMult])

  const defPanelAtk = useMemo(() =>
    defenderArmyGroups.flat().reduce((s, { unit, count }) => s + unit.attack * count, 0)
  , [defenderArmyGroups])

  // ── Combat result ──────────────────────────────────────────────────────────
  const battleResult = useMemo(() => {
    const hasAny =
      attackerArmy.some(x => x.count > 0) ||
      defenderArmyGroups.flat().some(x => x.count > 0)
    if (!hasAny) return null
    return calculateBattle(attackerArmy, defenderArmyGroups, wallLevel, defenderTribe, {
      heroAttack:     attackerHeroAtk,
      heroDefense:    defenderHeroDef,
      offBonusPct,
      defBonusPct,
      residenceLevel,
      attackerWeapon: attackerWeapon.unitId ? attackerWeapon : null,
      defenderWeapon: defenderWeapon.unitId ? defenderWeapon : null,
    })
  }, [attackerArmy, defenderArmyGroups, wallLevel, defenderTribe, attackerHeroAtk, defenderHeroDef, residenceLevel])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'system-ui, sans-serif', color: C.text }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Swords size={22} color={C.gold} />
        <h1 style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '1.25rem', fontWeight: 700, margin: 0, letterSpacing: '0.08em' }}>
          Battle Calculator
        </h1>
      </div>

      {/* Panels */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          <ArmyPanel
            title="Attacker" icon={Swords} accentColor={C.lose}
            groups={attackerGroups}
            onTribeChange={setAttackerTribe}
            onCount={setAttackerCount}
            onSmithy={setAttackerSmithy}
            onAddGroup={() => {}}
            onRemoveGroup={() => {}}
            showWall={false}
            wallLevel={0} onWallChange={() => {}} defenderTribe={defenderTribe}
            residenceLevel={0} onResidenceLevel={() => {}}
            heroAtk={attackerHeroAtk} onHeroAtk={setAttackerHeroAtk}
            heroDef={0} onHeroDef={() => {}}
            bonusPct={offBonusPct} onBonusPct={setOffBonusPct}
            weapon={attackerWeapon} onWeapon={setAttackerWeapon}
            totalAttack={atkPanelAtk} totalDefense={atkPanelDef}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 4px', alignSelf: 'stretch', gap: 6 }}>
          <div style={{ width: 1, flex: 1, background: C.border }} />
          <div style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.1em' }}>VS</div>
          <button
            onClick={() => battleResult && setAnimKey(k => k + 1)}
            disabled={!battleResult}
            title={battleResult ? 'Play battle animation' : 'Add units first'}
            style={{
              background:    battleResult ? C.gold : C.surface2,
              color:         battleResult ? '#0f0c09' : C.muted,
              border:        `1px solid ${battleResult ? C.gold : C.border}`,
              borderRadius:  6,
              padding:       '5px 8px',
              cursor:        battleResult ? 'pointer' : 'default',
              fontSize:      '0.65rem',
              fontFamily:    'Cinzel, serif',
              fontWeight:    700,
              letterSpacing: '0.04em',
              transition:    'all 0.15s',
              whiteSpace:    'nowrap',
              writingMode:   'vertical-rl',
              textOrientation:'mixed',
            }}
          >
            ⚔ Sim
          </button>
          <div style={{ width: 1, flex: 1, background: C.border }} />
        </div>

        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          <ArmyPanel
            title="Defender" icon={Shield} accentColor="#60a5fa"
            groups={defenderGroups}
            onTribeChange={setDefenderTribe}
            onCount={setDefenderCount}
            onSmithy={setDefenderSmithy}
            onAddGroup={addDefenderGroup}
            onRemoveGroup={removeDefenderGroup}
            showWall={true}
            wallLevel={wallLevel} onWallChange={setWallLevel} defenderTribe={defenderTribe}
            residenceLevel={residenceLevel} onResidenceLevel={setResidenceLevel}
            heroAtk={defenderHeroAtk} onHeroAtk={setDefenderHeroAtk}
            heroDef={defenderHeroDef} onHeroDef={setDefenderHeroDef}
            bonusPct={defBonusPct} onBonusPct={setDefBonusPct}
            weapon={defenderWeapon} onWeapon={setDefenderWeapon}
            totalAttack={defPanelAtk} totalDefense={defPanelDef}
          />
        </div>
      </div>

      <BattleAnimation result={battleResult} animKey={animKey} />

      {battleResult && <ResultsSection result={battleResult} />}

      {!battleResult && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.8rem', padding: '20px 0', fontStyle: 'italic' }}>
          Enter unit counts above to see battle results instantly.
        </div>
      )}
    </div>
  )
}
