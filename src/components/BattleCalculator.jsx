import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Shield, Swords, Flame, Skull, Crown,
  ChevronUp, ChevronDown, Info, Plus, Trash2, Zap, Play,
} from 'lucide-react'
import { UNITS, WALL_NAMES, TRIBE_LABELS, getUnitIconUrl, getHeroIconUrl } from '../data/units'
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
function UnitTypeIcon({ type, size = 16 }) {
  const p = { size, strokeWidth: 2 }
  if (type === 'cavalry') return <span title="Cavalry" style={{ color: C.goldDim }}><Swords {...p} /></span>
  if (type === 'siege')   return <span title="Siege"   style={{ color: '#a78bfa' }}><Flame {...p} /></span>
  if (type === 'chief')   return <span title="Chief"   style={{ color: C.gold }}><Crown {...p} /></span>
  return <span title="Infantry" style={{ color: '#60a5fa' }}><Shield {...p} /></span>
}

// ─── Unit card — horizontal row layout ───────────────────────────────────────
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
        padding:      '5px 8px',
        display:      'flex',
        flexDirection: 'row',
        alignItems:   'center',
        gap:          8,
        transition:   'border-color 0.15s, background 0.15s',
        minWidth:     0,
      }}
    >
      {/* Left: icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 150, flexShrink: 0 }}>
        <UnitTypeIcon type={unit.type} size={16} />
        <span
          style={{
            color:        active ? C.gold : C.text,
            fontSize:     '0.88rem',
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

      {/* Middle: stats */}
      <div style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: C.muted, lineHeight: 1, flex: 1, alignItems: 'center' }}>
        <span title="Attack">
          ⚔{' '}
          {showSmithyEffect
            ? <span style={{ color: C.gold }}>{Math.round(unit.attack * effectiveMult)}</span>
            : unit.attack}
        </span>
        <span title="Def vs Infantry">
          🛡{' '}
          {showSmithyEffect
            ? <span style={{ color: C.gold }}>{Math.round(unit.defInf * effectiveMult)}</span>
            : unit.defInf}
        </span>
        <span title="Def vs Cavalry">
          🐴{' '}
          {showSmithyEffect
            ? <span style={{ color: C.gold }}>{Math.round(unit.defCav * effectiveMult)}</span>
            : unit.defCav}
        </span>
      </div>

      {/* Right: count input + smithy */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
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
            width:        90,
            background:   '#0f0c09',
            border:       `1px solid ${active ? C.goldDim : C.border}`,
            borderRadius: 3,
            color:        active ? C.gold : C.text,
            fontSize:     '0.9rem',
            padding:      '3px 5px',
            textAlign:    'right',
            outline:      'none',
            fontFamily:   'inherit',
          }}
        />

        {/* Smithy */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ color: C.muted, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            Upg
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
              width:        48,
              background:   '#0f0c09',
              border:       `1px solid ${smithy > 0 ? C.goldDim : C.border}`,
              borderRadius: 3,
              color:        smithy > 0 ? C.gold : C.muted,
              fontSize:     '0.82rem',
              padding:      '2px 3px',
              textAlign:    'right',
              outline:      'none',
              fontFamily:   'inherit',
            }}
          />
          <span style={{ color: C.muted, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
            /20
            {showSmithyEffect && (
              <span style={{ color: C.gold, marginLeft: 3 }}>+{smithy * 5}%</span>
            )}
          </span>
        </div>
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

// ─── Army group (tribe + unit list) ───────────────────────────────────────────
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
  // hero HP
  heroHp, onHeroHp,
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
              label="Hero Strength"
              value={showWall ? heroDef : heroAtk}
              onChange={showWall ? onHeroDef : onHeroAtk}
              hint="Hero's total Strength stat (hero points + equipment). Added directly to combat as flat attack (attacker) or defense (defender)."
            />
            {/* Hero HP */}
            <FlatInput
              label="Hero HP %"
              value={heroHp}
              onChange={onHeroHp}
              hint="Current hero HP before battle (0-100). We estimate HP lost = lossRatio × HP."
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
        <UnitTypeIcon type={unit.type} size={10} />
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
function ResultsSection({ result, heroAtk = 0, heroDef = 0, heroAtkHp = 100, heroDefHp = 100 }) {
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

  // Hero HP calculations
  const atkHeroHpLost  = Math.round(attackerLossRatio * heroAtkHp)
  const atkHeroHpAfter = Math.max(0, heroAtkHp - atkHeroHpLost)
  const atkHeroSurvives = atkHeroHpAfter > 0

  const defHeroHpLost  = Math.round(defenderLossRatio * heroDefHp)
  const defHeroHpAfter = Math.max(0, heroDefHp - defHeroHpLost)
  const defHeroSurvives = defHeroHpAfter > 0

  const showHeroPanel = heroAtk > 0 || heroDef > 0

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
              ...(heroAtk > 0 ? [{ label: 'Hero ATK (flat)',  value: heroAtk.toLocaleString(), color: C.gold }] : []),
              ...(heroDef > 0 ? [{ label: 'Hero DEF (flat)',  value: heroDef.toLocaleString(), color: '#60a5fa' }] : []),
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px' }}>
                <div style={{ color: C.muted, fontSize: '0.65rem', marginBottom: 2 }}>{label}</div>
                <div style={{ color, fontSize: '0.9rem', fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Hero summary panel */}
          {showHeroPanel && (
            <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {heroAtk > 0 && (
                <div style={{
                  background: '#1a1200',
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 6,
                  padding: '7px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.8rem',
                }}>
                  <Crown size={14} color={C.gold} />
                  <span style={{ color: C.text, flex: 1 }}>
                    <span style={{ color: C.gold, fontFamily: 'Cinzel, serif', fontWeight: 700 }}>Hero (Attacker)</span>
                    {': '}
                    {heroAtk.toLocaleString()} strength · HP {heroAtkHp}% → {atkHeroHpAfter}%
                  </span>
                  <span style={{
                    background: atkHeroSurvives ? C.winDim : C.loseDim,
                    color: atkHeroSurvives ? C.win : C.lose,
                    border: `1px solid ${atkHeroSurvives ? C.win : C.lose}`,
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: '0.65rem',
                    fontFamily: 'Cinzel, serif',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}>
                    {atkHeroSurvives ? '⚔ SURVIVED' : '☠ FALLEN'}
                  </span>
                </div>
              )}
              {heroDef > 0 && (
                <div style={{
                  background: '#001020',
                  border: `1px solid #3b5a8a`,
                  borderRadius: 6,
                  padding: '7px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.8rem',
                }}>
                  <Crown size={14} color="#60a5fa" />
                  <span style={{ color: C.text, flex: 1 }}>
                    <span style={{ color: '#60a5fa', fontFamily: 'Cinzel, serif', fontWeight: 700 }}>Hero (Defender)</span>
                    {': '}
                    {heroDef.toLocaleString()} strength · HP {heroDefHp}% → {defHeroHpAfter}%
                  </span>
                  <span style={{
                    background: defHeroSurvives ? C.winDim : C.loseDim,
                    color: defHeroSurvives ? C.win : C.lose,
                    border: `1px solid ${defHeroSurvives ? C.win : C.lose}`,
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: '0.65rem',
                    fontFamily: 'Cinzel, serif',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}>
                    {defHeroSurvives ? '🛡 SURVIVED' : '☠ FALLEN'}
                  </span>
                </div>
              )}
            </div>
          )}

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

// ─── Battle arena animation ───────────────────────────────────────────────────
const ARENA_CSS = `
@keyframes dot-in-left  { from{transform:translateX(-160px);opacity:0;scale:0.4} to{transform:translateX(0);opacity:1;scale:1} }
@keyframes dot-in-right { from{transform:translateX( 160px);opacity:0;scale:0.4} to{transform:translateX(0);opacity:1;scale:1} }
@keyframes dot-dying    { 0%{transform:translateY(0) scale(1) rotate(0deg);opacity:1}
                         30%{transform:translateY(-16px) scale(1.25) rotate(-20deg);opacity:0.85}
                        100%{transform:translateY(32px) scale(0) rotate(35deg);opacity:0} }
@keyframes arena-clash  { 0%{transform:translate(-50%,-50%) scale(0.2);opacity:0}
                         40%{transform:translate(-50%,-50%) scale(1.8);opacity:1}
                        100%{transform:translate(-50%,-50%) scale(4);opacity:0} }
@keyframes arena-spark  { from{transform:translate(0,0) scale(1);opacity:1}
                           to{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0} }
@keyframes arena-winner { from{opacity:0;transform:translateY(8px) scale(0.88)}
                            to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes arena-glow   { 0%,100%{text-shadow:0 0 6px currentColor}
                              50%{text-shadow:0 0 22px currentColor, 0 0 44px currentColor} }
@keyframes crowd-flicker{ 0%,100%{opacity:0.55} 50%{opacity:0.8} }
`

const ARENA_SPARKS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2
  const d = 24 + (i % 4) * 10
  return {
    tx:    `${(Math.cos(a) * d).toFixed(0)}px`,
    ty:    `${(Math.sin(a) * d).toFixed(0)}px`,
    delay: `${i * 18}ms`,
    size:  i % 3 === 0 ? 6 : i % 3 === 1 ? 4 : 3,
    color: i % 5 === 0 ? '#ffffff' : i % 3 === 0 ? C.gold : '#fbbf24',
  }
})

function ArenaUnitIcon({ type }) {
  const p = { size: 15, strokeWidth: 2.5 }
  if (type === 'cavalry') return <Zap  {...p} />
  if (type === 'siege')   return <Flame {...p} />
  if (type === 'chief')   return <Crown {...p} />
  return <Swords {...p} />
}

function buildArenaDots(results, scale, maxDots, tribe) {
  // Exclude chief units from arena dots
  const active = results.filter(r => r.initial > 0 && r.unit.type !== 'chief')
  if (!active.length) return []
  const dots = []
  for (const r of active) {
    const n       = Math.max(1, Math.round(r.initial / scale))
    const survive = r.initial > 0 ? Math.round((r.survived / r.initial) * n) : 0
    const iconUrl = getUnitIconUrl(tribe, r.unit)
    for (let i = 0; i < n; i++) {
      dots.push({
        id:          `${r.unit.id}-${i}`,
        unitType:    r.unit.type,
        unitName:    r.unit.name,
        iconUrl,
        willSurvive: i < survive,
        deathDelay:  0,
        isHero:      false,
      })
    }
  }
  const clipped = dots.slice(0, maxDots)
  const dying = clipped.filter(d => !d.willSurvive)
  dying.forEach((d, i) => {
    d.deathDelay = dying.length > 1 ? Math.round((i / (dying.length - 1)) * 2200) : 0
  })
  return clipped
}

function ArenaDot({ dot, side, enterDelay, phase }) {
  const isAtk = side === 'atk'
  const bdr   = dot.isHero ? C.gold : (isAtk ? '#ef4444' : '#60a5fa')
  const bg    = dot.isHero ? '#2a1a00' : (isAtk ? '#3f0909' : '#091830')
  const size  = dot.isHero ? 48 : 42

  let anim
  if (phase === 'entering') {
    anim = `dot-in-${isAtk ? 'left' : 'right'} 0.55s cubic-bezier(.22,1,.36,1) ${enterDelay}ms both`
  } else if (!dot.willSurvive) {
    anim = `dot-dying 0.7s ease-out ${dot.deathDelay}ms both`
  } else {
    anim = 'none'
  }

  const survivedGlow = phase === 'done' && dot.willSurvive
  // Mirror attacker sprites so units face their opponent
  const spriteTransform = isAtk ? 'scaleX(-1)' : 'none'

  return (
    <div
      title={dot.isHero ? `${dot.unitName} (Hero)` : dot.unitName}
      style={{
        width:          size,
        height:         size,
        borderRadius:   '50%',
        background:     bg,
        border:         `2px solid ${bdr}`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          bdr,
        animation:      anim,
        flexShrink:     0,
        boxShadow:      dot.isHero
          ? `0 0 14px ${C.gold}aa, inset 0 0 10px ${C.gold}44`
          : `0 0 8px ${bdr}55, inset 0 0 6px ${bdr}22`,
        filter:         survivedGlow ? `drop-shadow(0 0 ${dot.isHero ? 10 : 6}px ${bdr})` : 'none',
        transition:     'filter 0.6s',
        overflow:       'hidden',
        position:       'relative',
      }}
    >
      {dot.iconUrl ? (
        <img
          src={dot.iconUrl}
          alt={dot.unitName}
          draggable={false}
          style={{
            width:          '78%',
            height:         '78%',
            objectFit:      'contain',
            imageRendering: 'pixelated',
            transform:      spriteTransform,
            pointerEvents:  'none',
            userSelect:     'none',
            filter:         !dot.willSurvive && phase === 'fighting'
              ? 'grayscale(0.4)'
              : 'none',
          }}
        />
      ) : dot.isHero ? (
        <Crown size={18} strokeWidth={2} />
      ) : (
        <ArenaUnitIcon type={dot.unitType} />
      )}
    </div>
  )
}

function BattleArena({
  result,
  animKey,
  heroAtk = 0,
  heroDef = 0,
  heroAtkHp = 100,
  heroDefHp = 100,
  attackerTribe,
  defenderTribe,
}) {
  const [phase, setPhase]         = useState('idle')
  const [showFlash, setShowFlash] = useState(false)

  const MAX_DOTS = 10
  const { atkDots, defDots, scaleVal } = useMemo(() => {
    if (!result) return { atkDots: [], defDots: [], scaleVal: 1 }
    const totalAtk = result.attackerResults.reduce((s, r) => s + r.initial, 0)
    const totalDef = result.defenderResults.reduce((s, r) => s + r.initial, 0)
    const sv       = Math.max(1, Math.ceil(Math.max(totalAtk, totalDef) / MAX_DOTS))

    // Hero survival
    const atkHeroHpLost   = Math.round(result.attackerLossRatio * heroAtkHp)
    const heroAtkSurvives = Math.max(0, heroAtkHp - atkHeroHpLost) > 0
    const defHeroHpLost   = Math.round(result.defenderLossRatio * heroDefHp)
    const heroDefSurvives = Math.max(0, heroDefHp - defHeroHpLost) > 0

    let builtAtkDots = buildArenaDots(result.attackerResults, sv, MAX_DOTS, attackerTribe)
    let builtDefDots = buildArenaDots(result.defenderResults, sv, MAX_DOTS, defenderTribe)

    // Prepend hero dots if hero strength > 0
    if (heroAtk > 0) {
      const heroDot = {
        id: 'hero-atk',
        unitType: 'hero',
        unitName: 'Hero',
        iconUrl: getHeroIconUrl(attackerTribe),
        willSurvive: heroAtkSurvives,
        deathDelay: 1000,
        isHero: true,
      }
      builtAtkDots = [heroDot, ...builtAtkDots.slice(0, MAX_DOTS - 1)]
    }
    if (heroDef > 0) {
      const heroDot = {
        id: 'hero-def',
        unitType: 'hero',
        unitName: 'Hero',
        iconUrl: getHeroIconUrl(defenderTribe),
        willSurvive: heroDefSurvives,
        deathDelay: 1000,
        isHero: true,
      }
      builtDefDots = [heroDot, ...builtDefDots.slice(0, MAX_DOTS - 1)]
    }

    return {
      atkDots:  builtAtkDots,
      defDots:  builtDefDots,
      scaleVal: sv,
    }
  }, [result, heroAtk, heroDef, heroAtkHp, heroDefHp, attackerTribe, defenderTribe])

  useEffect(() => {
    if (!result) { setPhase('idle'); return }
    setPhase('entering')
    setShowFlash(false)
    const t1 = setTimeout(() => { setPhase('fighting'); setShowFlash(true) }, 1000)
    const t2 = setTimeout(() => setShowFlash(false), 1650)
    const t3 = setTimeout(() => setPhase('done'), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [animKey])

  if (phase === 'idle' || !result) return null

  const { attackerWins } = result
  const winColor   = attackerWins ? C.win : '#60a5fa'
  const scaleNote  = scaleVal > 1 ? `1 ● ≈ ${scaleVal.toLocaleString()} units` : '1 ● = 1 unit'
  const statusText = phase === 'entering' ? '— Forces Assembling —'
                   : phase === 'fighting'  ? '— Battle in Progress —'
                   : null

  return (
    <>
      <style>{ARENA_CSS}</style>
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #6b4f2a', boxShadow: '0 4px 32px #00000070' }}>

        {/* ── Crowd tiers ── */}
        <div style={{ height: 58, background: '#1a1008', overflow: 'hidden' }}>
          {[0, 1, 2].map(row => (
            <div key={row} style={{ display: 'flex', gap: 1, padding: '1px 0', opacity: 1 - row * 0.2 }}>
              {Array.from({ length: 80 }).map((_, j) => (
                <div key={j} style={{
                  width: 5,
                  height: 7,
                  background: j % 7 === 0 ? '#ef4444' : j % 11 === 0 ? '#3b82f6' : j % 5 === 0 ? '#f0a820' : j % 3 === 0 ? '#c4a882' : '#a08060',
                  borderRadius: '2px 2px 0 0',
                }} />
              ))}
            </div>
          ))}
        </div>

        {/* ── Stone arch row ── */}
        <div style={{ height: 28, background: '#5a3d28', display: 'flex', borderBottom: '2px solid #8B7355', overflow: 'hidden' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ flex: 1, borderRight: '1px solid #8B735530', position: 'relative' }}>
              <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: '65%', height: '90%', background: '#3d2b1a', borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
              }} />
            </div>
          ))}
        </div>

        {/* ── Arena floor ── */}
        <div style={{
          background:     'linear-gradient(180deg,#5c3a1e 0%,#8b6330 18%,#c4984e 55%,#d4aa70 100%)',
          padding:        '18px 14px 22px',
          position:       'relative',
          minHeight:      150,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            8,
        }}>
          {/* sand grain overlay */}
          <div style={{ position:'absolute',inset:0,background:'repeating-linear-gradient(45deg,transparent,transparent 7px,rgba(0,0,0,0.035) 7px,rgba(0,0,0,0.035) 8px)',pointerEvents:'none' }} />

          {/* Attacker side */}
          <div style={{ display:'flex',flexWrap:'wrap',gap:6,justifyContent:'flex-end',flex:1,position:'relative',zIndex:1 }}>
            {atkDots.map((dot, i) => (
              <ArenaDot key={dot.id} dot={dot} side="atk" enterDelay={i * 32} phase={phase} />
            ))}
          </div>

          {/* Center — VS + clash */}
          <div style={{ position:'relative',display:'flex',flexDirection:'column',alignItems:'center',zIndex:2,flexShrink:0,width:56 }}>
            <span style={{ fontFamily:'Cinzel,serif',color:'#f0e6d0cc',fontSize:'0.8rem',fontWeight:900,letterSpacing:'0.1em',textShadow:'0 1px 4px #000' }}>VS</span>
            {showFlash && (
              <>
                <div style={{ position:'absolute',top:'50%',left:'50%',fontSize:'2.2rem',lineHeight:1,animation:'arena-clash 0.75s ease-out forwards',pointerEvents:'none',zIndex:6 }}>
                  ⚡
                </div>
                {ARENA_SPARKS.map((s, i) => (
                  <div key={i} style={{
                    position:'absolute',top:'50%',left:'50%',
                    width:s.size,height:s.size,borderRadius:'50%',
                    background:s.color,
                    '--tx':s.tx,'--ty':s.ty,
                    animation:`arena-spark 0.6s ease-out ${s.delay} both`,
                    pointerEvents:'none',
                  }} />
                ))}
              </>
            )}
          </div>

          {/* Defender side */}
          <div style={{ display:'flex',flexWrap:'wrap',gap:6,justifyContent:'flex-start',flex:1,position:'relative',zIndex:1 }}>
            {defDots.map((dot, i) => (
              <ArenaDot key={dot.id} dot={dot} side="def" enterDelay={i * 32} phase={phase} />
            ))}
          </div>
        </div>

        {/* ── Stone base — winner / status ── */}
        <div style={{
          background:     '#211408',
          borderTop:      '2px solid #6b4f2a',
          padding:        '10px 16px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            12,
          flexWrap:       'wrap',
          minHeight:      42,
        }}>
          {phase === 'done' ? (
            <span style={{
              fontFamily:    'Cinzel,serif',
              fontWeight:    900,
              fontSize:      '1rem',
              color:         winColor,
              letterSpacing: '0.12em',
              animation:     'arena-winner 0.45s cubic-bezier(.22,1,.36,1) forwards, arena-glow 1.6s ease-in-out 0.5s infinite',
            }}>
              {attackerWins ? '⚔ ATTACKER WINS' : '🛡 DEFENDER WINS'}
            </span>
          ) : (
            <span style={{ color:C.muted,fontFamily:'Cinzel,serif',fontSize:'0.72rem',letterSpacing:'0.1em',opacity:0.75 }}>
              {statusText}
            </span>
          )}
          <span style={{ color:'#5a4020',fontSize:'0.65rem',whiteSpace:'nowrap' }}>
            {scaleNote} · <Swords size={10} style={{display:'inline',verticalAlign:'middle'}} /> inf <Zap size={10} style={{display:'inline',verticalAlign:'middle'}} /> cav <Flame size={10} style={{display:'inline',verticalAlign:'middle'}} /> siege <Crown size={10} style={{display:'inline',verticalAlign:'middle'}} /> chief
          </span>
        </div>
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
  const [attackerHeroHp, setAttackerHeroHp] = useState(100)
  const [offBonusPct, setOffBonusPct] = useState(0)
  const [attackerWeapon, setAttackerWeapon] = useState({ unitId: '', bonus: 0 })

  const [defenderGroups, setDefenderGroups] = useState([emptyGroup('teuton')])
  const [wallLevel, setWallLevel] = useState(0)
  const [defenderHeroDef, setDefenderHeroDef] = useState(0)
  const [defenderHeroAtk, setDefenderHeroAtk] = useState(0)
  const [defenderHeroHp, setDefenderHeroHp] = useState(100)
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

  const attackerTribe = attackerGroups[0]?.tribe ?? 'roman'
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
  }, [attackerArmy, defenderArmyGroups, wallLevel, defenderTribe, attackerHeroAtk, defenderHeroDef, residenceLevel, offBonusPct, defBonusPct, attackerWeapon, defenderWeapon])

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
            heroHp={attackerHeroHp} onHeroHp={setAttackerHeroHp}
            bonusPct={offBonusPct} onBonusPct={setOffBonusPct}
            weapon={attackerWeapon} onWeapon={setAttackerWeapon}
            totalAttack={atkPanelAtk} totalDefense={atkPanelDef}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 4px', alignSelf: 'stretch', gap: 6 }}>
          <div style={{ width: 1, flex: 1, background: C.border }} />
          <div style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.1em' }}>VS</div>
          <button
            type="button"
            onClick={() => battleResult && setAnimKey(k => k + 1)}
            disabled={!battleResult}
            title={battleResult ? 'Replay battle animation' : 'Add units first'}
            style={{
              display:       'inline-flex',
              flexDirection: 'column',
              alignItems:    'center',
              justifyContent:'center',
              gap:           6,
              background:    battleResult ? C.gold : C.surface2,
              color:         battleResult ? '#0f0c09' : C.muted,
              border:        `2px solid ${battleResult ? C.goldDim : C.border}`,
              borderRadius:  10,
              padding:       '12px 14px',
              minWidth:      120,
              cursor:        battleResult ? 'pointer' : 'not-allowed',
              fontSize:      '0.72rem',
              fontFamily:    'Cinzel, serif',
              fontWeight:    800,
              letterSpacing: '0.06em',
              lineHeight:    1.15,
              textAlign:     'center',
              transition:    'all 0.15s',
              boxShadow:     battleResult ? '0 4px 14px rgba(240,168,32,0.25)' : 'none',
            }}
          >
            <Play size={24} strokeWidth={2.4} fill={battleResult ? '#0f0c09' : 'none'} aria-hidden />
            <span>VISUALIZE FIGHT</span>
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
            heroHp={defenderHeroHp} onHeroHp={setDefenderHeroHp}
            bonusPct={defBonusPct} onBonusPct={setDefBonusPct}
            weapon={defenderWeapon} onWeapon={setDefenderWeapon}
            totalAttack={defPanelAtk} totalDefense={defPanelDef}
          />
        </div>
      </div>

      <BattleArena
        result={battleResult}
        animKey={animKey}
        heroAtk={attackerHeroAtk}
        heroDef={defenderHeroDef}
        heroAtkHp={attackerHeroHp}
        heroDefHp={defenderHeroHp}
        attackerTribe={attackerTribe}
        defenderTribe={defenderTribe}
      />

      {battleResult && (
        <ResultsSection
          result={battleResult}
          heroAtk={attackerHeroAtk}
          heroDef={defenderHeroDef}
          heroAtkHp={attackerHeroHp}
          heroDefHp={defenderHeroHp}
        />
      )}

      {!battleResult && (
        <div style={{ textAlign: 'center', color: C.muted, fontSize: '0.8rem', padding: '20px 0', fontStyle: 'italic' }}>
          Enter unit counts above to see battle results instantly.
        </div>
      )}
    </div>
  )
}
