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
function TribeSelector({ selected, onChange, availableTribes }) {
  const entries = availableTribes
    ? availableTribes.map((t) => [t, TRIBE_LABELS[t]]).filter(([, l]) => !!l)
    : Object.entries(TRIBE_LABELS)
  return (
    <div className="flex gap-1 flex-wrap">
      {entries.map(([tribe, label]) => (
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
function ArmyGroup({ group, groupIdx, groupLabel, onTribeChange, onCount, onSmithy, onRemove, availableTribes }) {
  const units = UNITS[group.tribe]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <TribeSelector selected={group.tribe} onChange={(t) => onTribeChange(groupIdx, t)} availableTribes={availableTribes} />
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
        gap:           10,
        flex:          1,
        minWidth:      0,
        // Both panels share the same fixed height so the page length never
        // grows when defenders pile on reinforcements — instead the inner
        // scroll area takes over.
        height:        720,
      }}
    >
      {/* Header (always visible at top) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Icon size={18} color={accentColor} strokeWidth={2} />
        <span style={{ fontFamily: 'Cinzel, serif', color: accentColor, fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em' }}>
          {title}
        </span>
      </div>

      {/* ── Scrollable middle: unit groups, defensive structures, hero ──
          minHeight: 0 is the classic flex-scroll trick: without it, a
          flex:1 child won't shrink below its content's natural height,
          so the scrollbar never appears (the panel just grows instead).
          With it, the child is properly constrained to the leftover space
          inside the fixed-height card and `overflowY: auto` engages. */}
      <div
        style={{
          flex:          1,
          minHeight:     0,
          overflowY:     'auto',
          overflowX:     'hidden',
          display:       'flex',
          flexDirection: 'column',
          gap:           12,
          paddingRight:  6,           // breathing room next to scrollbar
          // Custom thin scrollbar styling (WebKit + Firefox)
          scrollbarWidth: 'thin',
          scrollbarColor: `${C.border} transparent`,
        }}
      >
        {/* Unit groups — animals (Nature) only on the defender side */}
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
            availableTribes={
              showWall
                ? ['roman', 'teuton', 'gaul', 'nature']
                : ['roman', 'teuton', 'gaul']
            }
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

        {/* Defensive structures (defender only) — placed UNDER the unit
            groups so the attacker and defender unit lists start at the same
            vertical level inside their panels. */}
        {showWall && (
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Wall */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            {/* Residence / Palace — sits under the wall, also a defensive structure */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6, borderTop: `1px dashed ${C.border}` }}>
              <Crown size={14} color={C.muted} />
              <span style={{ color: C.text, fontSize: '0.78rem', fontFamily: 'Cinzel, serif', flex: 1, whiteSpace: 'nowrap' }}>
                Residence / Palace
              </span>
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
            {residenceLevel > 0 && (
              <span style={{ color: C.muted, fontSize: '0.62rem', paddingLeft: 22 }}>
                Lv {residenceLevel} → +{buildingDefensePoints(residenceLevel)} flat def · max lv20 = 810
              </span>
            )}
          </div>
        )}

        {/* Extras (hero + modifiers) — last entry inside the scroll area */}
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
          </div>
        )}
        </div>
      </div>{/* end scrollable middle */}

      {/* Strength summary (always visible at bottom of panel) */}
      <div style={{ display: 'flex', gap: 10, padding: '6px 10px', background: C.surface2, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: '0.75rem', flexShrink: 0 }}>
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
@keyframes dot-in-left  { from{opacity:0;scale:0.35} to{opacity:1;scale:1} }
@keyframes dot-in-right { from{opacity:0;scale:0.35} to{opacity:1;scale:1} }
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
@keyframes arena-shake  { 0%,100%{transform:translate(0,0)}
                         20%{transform:translate(-2px,1px)}
                         40%{transform:translate(2px,-1px)}
                         60%{transform:translate(-1px,1px)}
                         80%{transform:translate(1px,-1px)} }
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

// Each side gets up to `dotsTarget` dots regardless of army size.
// Returns the dot array plus how many real units each dot represents,
// so the caller can size dots proportionally to the units-per-dot value.
// Build dots for one side using a "fair share" allocation:
//
//   • Each unit type with at least 1 unit is guaranteed at least 1 dot,
//     so no unit type ever disappears from the arena.
//   • Remaining dots (up to `maxDots` total) are distributed in proportion
//     to sqrt(count). Sqrt compresses the scale so a 10 000-vs-100 mix
//     ends up roughly 10:1 in dot count rather than 100:1, which matches
//     intuition for "more units, more bubbles".
//   • A single unit type can never claim more than `maxPerType` dots, so
//     a dominant army doesn't completely wipe out the smaller stacks.
//   • Each dot carries its OWN `unitsPerDot` so the rendering layer can
//     size it individually (large stacks → big bubble, lone units → small).
//
// Death delays are row-staggered using the (eventual) grid column count
// so dying dots fall away in waves matching the marching/clash timing.
function buildSideArenaDots(results, maxDots, cols, tribe) {
  const active = results.filter(r => r.initial > 0 && r.unit.type !== 'chief')
  if (!active.length) return { dots: [] }

  // If there are more unit types than slots, keep the strongest stacks
  // (by raw count) and give each one a single dot.
  let units = active
  if (active.length >= maxDots) {
    units = [...active].sort((a, b) => b.initial - a.initial).slice(0, maxDots)
    const dots = units.map((r, i) => makeDot(r, tribe, 0, r.initial))
    applyDeathStagger(dots, units, maxDots, cols)
    return { dots }
  }

  // Cap on dots per type — never let one type fill more than ~⅔ of the bar.
  const maxPerType = Math.max(1, Math.floor(maxDots * 0.62))
  const N = units.length

  // Step 1: 1 base dot for every type, then distribute (maxDots - N) extra
  // dots weighted by sqrt(count) using the largest-remainder method.
  const weights   = units.map(r => Math.sqrt(r.initial))
  const wSum      = weights.reduce((s, w) => s + w, 0)
  const extra     = Math.max(0, maxDots - N)
  const rawShares = weights.map(w => extra * (w / wSum))
  const baseDots  = rawShares.map(s => Math.floor(s))
  let assigned    = baseDots.reduce((s, x) => s + x, 0)
  const order     = rawShares
    .map((s, i) => ({ i, frac: s - Math.floor(s) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < order.length && assigned < extra; k++) {
    baseDots[order[k].i]++
    assigned++
  }
  let dotCounts = baseDots.map((b) => b + 1)  // base + 1 guaranteed

  // Step 2: enforce per-type cap (donate overflow to the next-largest types).
  let overflow = 0
  dotCounts = dotCounts.map((c) => {
    if (c > maxPerType) { overflow += c - maxPerType; return maxPerType }
    return c
  })
  while (overflow > 0) {
    // Give one more dot to the type with the smallest current count that
    // still has headroom. Keeps the distribution wider rather than piling
    // everything onto the next-biggest type.
    let pickIdx = -1
    for (let i = 0; i < dotCounts.length; i++) {
      if (dotCounts[i] < maxPerType) {
        if (pickIdx === -1 || dotCounts[i] < dotCounts[pickIdx]) pickIdx = i
      }
    }
    if (pickIdx === -1) break  // every type at cap — leftover discarded
    dotCounts[pickIdx]++
    overflow--
  }

  // Step 3: build dots with their own units-per-dot.
  const dots = []
  units.forEach((r, idx) => {
    const n   = Math.max(1, dotCounts[idx])
    const upd = Math.max(1, Math.ceil(r.initial / n))
    const survive = r.initial > 0 ? Math.round((r.survived / r.initial) * n) : 0
    for (let i = 0; i < n; i++) {
      dots.push(makeDot(r, tribe, i, upd, i < survive))
    }
  })

  applyDeathStagger(dots, units, dots.length, cols)
  return { dots }
}

function makeDot(r, tribe, idx, unitsPerDot, willSurvive = false) {
  // Per-result tribe override (set in BattleArena when defenders are mixed
  // across multiple groups with different tribes — e.g. a roman main army
  // with a nature-animals reinforcement). Falls back to the side-wide tribe.
  const lookupTribe = r.tribe ?? tribe
  return {
    id:           `${r.unit.id}-${idx}-${lookupTribe}`,
    unitType:     r.unit.type,
    unitName:     r.unit.name,
    iconUrl:      getUnitIconUrl(lookupTribe, r.unit),
    unitsPerDot,
    willSurvive,
    deathDelay:   0,
    isHero:       false,
  }
}

// Distribute the dying dots across `rounds` clash phases so each round of
// the brawl visibly removes a wave instead of all losses vanishing in one
// frame. Within a round, back-row dots die slightly later than front-row
// ones (small intra-round delay) for a nicer cascading look.
function applyDeathStagger(dots, _units, _total, cols, rounds = 4) {
  const c = Math.max(1, cols)
  const dyingIndices = []
  dots.forEach((d, i) => { if (!d.willSurvive) dyingIndices.push(i) })

  dyingIndices.forEach((i, k) => {
    const d = dots[i]
    // Spread evenly: dyingIndices[0..n-1] → rounds 1..rounds, round-robin.
    d.deathRound = (k % rounds) + 1
    // Small extra delay within the round based on the dot's row so the
    // back row falls a beat after the front.
    const row = Math.floor(i / c)
    d.deathDelay = row * 90
  })
}

// Logarithmic per-dot size with a wide range so extreme imbalances are
// instantly readable: a stack of 100 000 units towers over a lone scout.
//   1     →  16 px  (single unit)
//   10    →  30 px
//   100   →  44 px  (regular squad)
//   1 000 →  58 px
//   10 k  →  72 px  (huge stack)
//   100 k →  82 px  (cap)
function dotSizeFor(unitsPerDot, isHero) {
  if (isHero) return 56
  const log = Math.log10(Math.max(1, unitsPerDot))
  return Math.round(Math.max(16, Math.min(82, 16 + log * 14)))
}

// A real-looking stone wall: thicker, with crenellations, a gate arch and a flag.
// Its visible footprint scales with `wallLevel`. Designed as a block element so
// it can sit inside a flex container alongside the residence keep.
function ArenaWall({ wallLevel }) {
  if (wallLevel <= 0) return null
  const wallWidth   = Math.round(28 + wallLevel * 1.6)
  const merlonCount = Math.max(4, Math.min(10, Math.floor(wallLevel / 2) + 3))
  const showFlag    = wallLevel >= 8

  return (
    <div
      title={`Wall · level ${wallLevel}`}
      style={{
        position: 'relative',
        width: wallWidth, alignSelf: 'stretch',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Optional banner above the wall */}
      {showFlag && (
        <div style={{
          position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 4,
        }}>
          <div style={{ width: 2, height: 14, background: '#6b5b47' }} />
          <div style={{
            width: 14, height: 8, background: C.gold,
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 60%, 0 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }} />
        </div>
      )}

      {/* Crenellated parapet */}
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 16, gap: 1 }}>
        {Array.from({ length: merlonCount }).map((_, i) => (
          <div key={i} style={{
            flex: 1,
            height: i % 2 === 0 ? 16 : 7,
            background: 'linear-gradient(180deg,#6b5b47 0%,#3d2b1a 100%)',
            borderTop: i % 2 === 0 ? '1px solid #8B7355' : 'none',
            borderLeft: '1px solid #00000060',
            borderRight: '1px solid #00000060',
          }} />
        ))}
      </div>

      {/* Wall body */}
      <div style={{
        flex: 1, position: 'relative',
        background: 'linear-gradient(180deg,#6b5b47 0%,#5a3d28 30%,#3d2b1a 100%)',
        borderLeft: '2px solid #8B7355',
        borderRight: '2px solid #2a1c10',
        boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.55), inset 0 0 12px rgba(0,0,0,0.35), -2px 0 6px rgba(0,0,0,0.35)',
      }}>
        {/* Stone block pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent 0, transparent 12px, rgba(0,0,0,0.30) 12px, rgba(0,0,0,0.30) 13px), repeating-linear-gradient(90deg, transparent 0, transparent 11px, rgba(255,255,255,0.05) 11px, rgba(255,255,255,0.05) 12px)',
        }} />

        {/* Gate arch (half-moon "opening" at the bottom) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '50%', transform: 'translateX(-50%)',
          width: Math.min(wallWidth - 8, 26),
          height: Math.min(wallWidth, 30),
          background: '#0f0c09',
          borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
          border: '2px solid #8B7355',
          borderBottom: 'none',
          boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.7)',
        }} />

        {/* Lv label */}
        <span style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%) rotate(-90deg)',
          color: '#f0e6d0', fontSize: '0.66rem',
          fontFamily: 'Cinzel, serif', fontWeight: 700,
          whiteSpace: 'nowrap', textShadow: '0 1px 2px #000, 0 0 4px #000',
          letterSpacing: '0.1em',
        }}>
          Wall Lv {wallLevel}
        </span>
      </div>
    </div>
  )
}

// Stylized keep / residence sitting behind the wall. Block element for flex layout.
const RESIDENCE_W = 64
function ArenaResidence({ residenceLevel }) {
  if (residenceLevel <= 0) return null

  return (
    <div
      title={`Residence / Palace · level ${residenceLevel}`}
      style={{
        position: 'relative',
        width: RESIDENCE_W, alignSelf: 'flex-end',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        marginBottom: 6, flexShrink: 0,
      }}
    >
      <svg width={54} height={48} viewBox="0 0 54 48" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.7))' }}>
        {/* Side towers */}
        <rect x="2"  y="14" width="10" height="32" fill="#3d2b1a" stroke="#6b5b47" strokeWidth="1.2"/>
        <rect x="42" y="14" width="10" height="32" fill="#3d2b1a" stroke="#6b5b47" strokeWidth="1.2"/>
        {/* Tower battlements */}
        <rect x="2"  y="11" width="3" height="3" fill="#6b5b47"/>
        <rect x="7"  y="11" width="3" height="3" fill="#6b5b47"/>
        <rect x="42" y="11" width="3" height="3" fill="#6b5b47"/>
        <rect x="47" y="11" width="3" height="3" fill="#6b5b47"/>

        {/* Main keep */}
        <rect x="12" y="20" width="30" height="26" fill="#5a3d28" stroke="#6b5b47" strokeWidth="1.2"/>
        {/* Pitched roof */}
        <polygon points="10,22 27,8 44,22" fill="#3d2b1a" stroke="#6b5b47" strokeWidth="1.2"/>
        {/* Door (gate) */}
        <rect x="22" y="32" width="10" height="14" fill="#1a1008" stroke="#6b5b47" strokeWidth="0.6"/>
        <line x1="27" y1="32" x2="27" y2="46" stroke="#6b5b47" strokeWidth="0.4"/>
        {/* Tower windows */}
        <rect x="4"  y="22" width="6" height="5" fill="#1a1008"/>
        <rect x="44" y="22" width="6" height="5" fill="#1a1008"/>
        <rect x="4"  y="32" width="6" height="5" fill="#1a1008"/>
        <rect x="44" y="32" width="6" height="5" fill="#1a1008"/>
        {/* Keep window */}
        <rect x="24" y="22" width="6" height="6" fill="#1a1008"/>
        {/* Roof flag */}
        <line x1="27" y1="8" x2="27" y2="2" stroke="#6b5b47" strokeWidth="1"/>
        <polygon points="27,2 33,4 27,6" fill={C.gold}/>
      </svg>
      <span style={{
        color: '#d4c4a8', fontSize: '0.6rem',
        fontFamily: 'Cinzel, serif', fontWeight: 700,
        background: '#1a1008', padding: '1px 6px',
        border: '1px solid #6b5b47', borderRadius: 3,
        textShadow: '0 1px 2px #000',
        letterSpacing: '0.05em',
      }}>
        Lv {residenceLevel}
      </span>
    </div>
  )
}

function ArenaDot({ dot, side, enterDelay, phase, size }) {
  const isAtk = side === 'atk'
  const bdr   = dot.isHero ? C.gold : (isAtk ? '#ef4444' : '#60a5fa')
  const bg    = dot.isHero ? '#2a1a00' : (isAtk ? '#3f0909' : '#091830')

  // Decode multi-round clash phases ("clash1".."clash4") into a numeric round.
  // 0 = pre-clash (idle / entering / marching), 99 = done.
  const clashIdx =
      phase === 'done'    ? 99
    : phase?.startsWith?.('clash') ? (parseInt(phase.slice(5), 10) || 0)
    : 0

  // A losing dot is "dying right now" during its own round, "already dead"
  // in any later round (and at done), and "still alive" before its round.
  const dying    = !dot.willSurvive && clashIdx === dot.deathRound
  const stayDead = !dot.willSurvive && clashIdx >  dot.deathRound

  let anim
  if (phase === 'entering') {
    anim = `dot-in-${isAtk ? 'left' : 'right'} 0.55s cubic-bezier(.22,1,.36,1) ${enterDelay}ms both`
  } else if (dying) {
    anim = `dot-dying 0.85s ease-out ${dot.deathDelay}ms both`
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
        // `stayDead` keeps the dot invisible after its death round so it
        // doesn't pop back in for later rounds — the dying animation runs
        // only once during its own round.
        opacity:        stayDead ? 0 : undefined,
        animation:      anim,
        flexShrink:     0,
        boxShadow:      dot.isHero
          ? `0 0 14px ${C.gold}aa, inset 0 0 10px ${C.gold}44`
          : `0 0 8px ${bdr}55, inset 0 0 6px ${bdr}22`,
        filter:         survivedGlow ? `drop-shadow(0 0 ${dot.isHero ? 10 : 6}px ${bdr})` : 'none',
        transition:     'filter 0.6s, opacity 0.3s',
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

// Side-grid dimensions: up to 4 columns × 4 rows = 16 dots per side. The
// per-dot size scales with `unitsPerDot`, so a side with 16 different unit
// types still fits, and a single dominant stack just gets bigger bubbles.
const COLS_PER_SIDE = 4
const ROWS_PER_SIDE = 4
const DOTS_PER_SIDE = COLS_PER_SIDE * ROWS_PER_SIDE  // 16

// ── Battle layout, in % of the floor's width and height ──
// Everything is positioned absolutely against the floor so the marching
// motion is just an animated `left:` value (rock-solid across screen sizes).
//
// Conceptually a 0–100 scale across the floor:
//   ATK idle (rim) ──charge──→  ⚔ overlap ⚔  ←──sortie── DEF idle (rim)
//   0 ……… 11                40 — 55                      55 ……… 66 │ 67-97 wall+residence
//
// Attackers start hugging the very left rim, defenders just left of the
// wall. They charge into each other and the front lines slightly cross at
// the clash zone (atk front at 55%, def front at 45%) so it really feels
// like a brawl rather than two lines parking next to each other.
const ATK_COLS_IDLE   = [11,  8,  4,  1]   // % from floor left, col 0 = front
const ATK_COLS_MARCH  = [55, 50, 45, 40]
// Defenders cluster RIGHT against the wall. Back row at 67% sits exactly at
// the wall start, so the rear half of the bubble hides behind the wall —
// reads as "defenders stationed behind their fortifications".
const DEF_COLS_IDLE   = [61, 63, 65, 67]   // col 0 = front, closest to atk
const DEF_COLS_MARCH  = [45, 50, 53, 56]
// Hero positions (top-of-side, above the dot rows). Hero idle hugs the rim
// just like its army; on the clash they meet face-to-face, ATK hero just
// past centre and DEF hero just before it (mirroring the front-column overlap).
const ATK_HERO_IDLE   = 2
const ATK_HERO_MARCH  = 53
const DEF_HERO_IDLE   = 64
const DEF_HERO_MARCH  = 47

// One absolutely-positioned dot. `leftPct` animates between idle/march via a
// CSS `left` transition with a row-staggered delay so each row charges as a
// wave. The visible bubble is wrapped in an inner div so the entrance / death
// keyframe animations (which use `transform`) don't fight with the wrapper's
// own centring transform.
//
// During the 'entering' reset phase we DISABLE the transition so the dots
// snap straight back to their idle (rim) position — without this, a second
// click would have the dots smoothly slide from the previous clash spot
// back toward the rim, never actually reaching it before the next "marching"
// phase tells them to charge again. End result: on every replay the dots
// genuinely re-form at the edges before charging.
function PosDot({ dot, leftPct, topPct, size, side, phase, enterDelay, waveDelay }) {
  const resetting = phase === 'entering'
  return (
    <div style={{
      position: 'absolute',
      left: `${leftPct}%`,
      top:  `${topPct}%`,
      // Centre the bubble on the (left,top) anchor point.
      transform: 'translate(-50%, -50%)',
      transition: resetting
        ? 'none'
        : `left 0.85s cubic-bezier(.45,.05,.55,.95) ${waveDelay}ms`,
      willChange: 'left',
      zIndex: dot.isHero ? 3 : 2,
    }}>
      <ArenaDot
        dot={dot} side={side} phase={phase}
        size={size} enterDelay={enterDelay}
      />
    </div>
  )
}

// Render one side as an array of absolutely-positioned dots (no flex/grid
// involved in motion). Each row of the 4×4 grid uses its own `top:` and a
// staggered `transition-delay` so the rows charge in waves.
function SidePanel({ side, hero, dots, phase, marching }) {
  const isAtk = side === 'atk'

  // Vertical layout — hero above the 4 dot rows. Spread the rows wider so
  // big bubbles (up to 82 px) don't overlap between rows.
  const HERO_TOP = 14                 // % of floor height
  const ROW_TOPS = [32, 49, 66, 83]   // 4 row centres in % of floor height

  const colsIdle  = isAtk ? ATK_COLS_IDLE  : DEF_COLS_IDLE
  const colsMarch = isAtk ? ATK_COLS_MARCH : DEF_COLS_MARCH
  const heroIdle  = isAtk ? ATK_HERO_IDLE  : DEF_HERO_IDLE
  const heroMarch = isAtk ? ATK_HERO_MARCH : DEF_HERO_MARCH

  return (
    <>
      {hero && (
        <PosDot
          dot={hero} side={side} phase={phase}
          leftPct={marching ? heroMarch : heroIdle}
          topPct={HERO_TOP}
          size={dotSizeFor(0, true)}
          enterDelay={0} waveDelay={0}
        />
      )}
      {dots.map((dot, i) => {
        const colIdx = i % COLS_PER_SIDE
        const rowIdx = Math.floor(i / COLS_PER_SIDE)
        return (
          <PosDot
            key={dot.id}
            dot={dot} side={side} phase={phase}
            leftPct={marching ? colsMarch[colIdx] : colsIdle[colIdx]}
            topPct={ROW_TOPS[rowIdx]}
            size={dotSizeFor(dot.unitsPerDot ?? 1, false)}
            enterDelay={i * 22}
            waveDelay={rowIdx * 220}
          />
        )
      })}
    </>
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
  defenderGroupTribes = [],
  wallLevel = 0,
  residenceLevel = 0,
}) {
  const [phase, setPhase]         = useState('idle')
  const [showFlash, setShowFlash] = useState(false)

  const {
    atkDots, defDots,
    atkHero, defHero,
    atkAvgUpd, defAvgUpd,
  } = useMemo(() => {
    if (!result) return {
      atkDots: [], defDots: [],
      atkHero: null, defHero: null,
      atkAvgUpd: 1, defAvgUpd: 1,
    }

    // Hero survival
    const atkHeroHpLost   = Math.round(result.attackerLossRatio * heroAtkHp)
    const heroAtkSurvives = Math.max(0, heroAtkHp - atkHeroHpLost) > 0
    const defHeroHpLost   = Math.round(result.defenderLossRatio * heroDefHp)
    const heroDefSurvives = Math.max(0, heroDefHp - defHeroHpLost) > 0

    // Tag each defender result with the tribe of its source group so
    // mixed-tribe defenders (main + reinforcement) all resolve their unit
    // sprites correctly, not just the first group's tribe.
    const defResultsWithTribe = (result.defenderGroupResults ?? [result.defenderResults])
      .flatMap((groupRes, gi) => {
        const t = defenderGroupTribes[gi] ?? defenderTribe
        return groupRes.map(r => ({ ...r, tribe: t }))
      })

    const { dots: builtAtkDots } =
      buildSideArenaDots(result.attackerResults, DOTS_PER_SIDE, COLS_PER_SIDE, attackerTribe)
    const { dots: builtDefDots } =
      buildSideArenaDots(defResultsWithTribe, DOTS_PER_SIDE, COLS_PER_SIDE, defenderTribe)

    const builtAtkHero = heroAtk > 0 ? {
      id: 'hero-atk', unitType: 'hero', unitName: 'Hero',
      iconUrl: getHeroIconUrl(attackerTribe),
      unitsPerDot: 1,
      willSurvive: heroAtkSurvives, deathDelay: 0, isHero: true,
    } : null
    const builtDefHero = heroDef > 0 ? {
      id: 'hero-def', unitType: 'hero', unitName: 'Hero',
      iconUrl: getHeroIconUrl(defenderTribe),
      unitsPerDot: 1,
      willSurvive: heroDefSurvives, deathDelay: 0, isHero: true,
    } : null

    // Average units-per-dot for the footer scale legend.
    const avg = (arr) => {
      if (!arr.length) return 1
      const s = arr.reduce((sum, d) => sum + (d.unitsPerDot || 1), 0)
      return Math.max(1, Math.round(s / arr.length))
    }

    return {
      atkDots:    builtAtkDots,
      defDots:    builtDefDots,
      atkHero:    builtAtkHero,
      defHero:    builtDefHero,
      atkAvgUpd:  avg(builtAtkDots),
      defAvgUpd:  avg(builtDefDots),
    }
  }, [result, heroAtk, heroDef, heroAtkHp, heroDefHp, attackerTribe, defenderTribe, defenderGroupTribes])

  // Multi-round clash phase machine. The fight unfolds across CLASH_ROUNDS
  // visible exchanges, each round removing one wave of dying dots, so the
  // viewer can watch the slaughter unfold rather than have everything
  // resolve in a single flash.
  //
  //   entering  → marching  → clash1  → clash2  → ... → clashN  → done
  //   ~700 ms     ~1100 ms    ~1500 ms each                       ~ ∞
  //
  // Total run-time ≈ 700 + 1100 + 1500 × N + done glow ≈ 9-10 s for N=4.
  const CLASH_ROUNDS = 4
  const T_ENTER = 700
  const T_MARCH = 1100
  const T_ROUND = 1500
  useEffect(() => {
    if (!result) { setPhase('idle'); return }
    setPhase('entering')
    setShowFlash(false)
    const timers = []
    timers.push(setTimeout(() => setPhase('marching'), T_ENTER))
    let acc = T_ENTER + T_MARCH
    for (let r = 1; r <= CLASH_ROUNDS; r++) {
      const phaseName = `clash${r}`
      const startAt = acc
      timers.push(setTimeout(() => {
        setPhase(phaseName)
        setShowFlash(true)
      }, startAt))
      // flash only briefly, ~500 ms into each round
      timers.push(setTimeout(() => setShowFlash(false), startAt + 500))
      acc += T_ROUND
    }
    timers.push(setTimeout(() => setPhase('done'), acc))
    return () => { timers.forEach(clearTimeout) }
  }, [animKey])

  if (phase === 'idle' || !result) return null

  const { attackerWins } = result
  const winColor   = attackerWins ? C.win : '#60a5fa'

  const fmtScale = (n) => n > 1 ? `1 ● ≈ ${n.toLocaleString()}` : '1 ● = 1'
  const scaleNote = `⚔ ${fmtScale(atkAvgUpd)}  ·  🛡 ${fmtScale(defAvgUpd)}`

  const isClashing = typeof phase === 'string' && phase.startsWith('clash')
  const clashIdx   = isClashing ? (parseInt(phase.slice(5), 10) || 0) : 0

  const statusText = phase === 'entering' ? '— Forces Assembling —'
                   : phase === 'marching'  ? '— Charge! —'
                   : isClashing            ? `— Round ${clashIdx} of ${CLASH_ROUNDS} —`
                   : null

  const marching = phase === 'marching' || isClashing || phase === 'done'
  // Shake the floor on every clash impact (briefly, while the flash is on).
  const shaking = isClashing && showFlash

  return (
    <>
      <style>{ARENA_CSS}</style>
      <div style={{
        borderRadius: 10, overflow: 'hidden',
        border: '2px solid #6b4f2a',
        boxShadow: '0 4px 32px #00000070, inset 0 0 24px rgba(0,0,0,0.45)',
      }}>

        {/* ── Crowd tiers (5 rows, denser, perspective via opacity) ── */}
        <div style={{
          height: 76,
          background: 'linear-gradient(180deg,#0a0604 0%,#1a1008 60%,#241a10 100%)',
          overflow: 'hidden', position: 'relative',
        }}>
          {[0, 1, 2, 3, 4].map(row => (
            <div key={row} style={{
              display: 'flex', gap: 1, padding: '1px 0',
              opacity: 0.35 + (row * 0.15),
            }}>
              {Array.from({ length: 110 }).map((_, j) => (
                <div key={j} style={{
                  width: 4 + Math.floor(row / 2),
                  height: 6 + Math.floor(row / 2),
                  background: ((j + row) % 7 === 0) ? '#ef4444'
                    : ((j + row) % 11 === 0) ? '#3b82f6'
                    : ((j + row) % 5 === 0)  ? '#f0a820'
                    : ((j + row) % 3 === 0)  ? '#c4a882'
                    : '#a08060',
                  borderRadius: '2px 2px 0 0',
                }} />
              ))}
            </div>
          ))}
          {/* Hanging banners */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', pointerEvents: 'none' }}>
            {['#ef4444', C.gold, '#60a5fa', C.gold, '#ef4444', C.gold, '#60a5fa'].map((color, i) => (
              <div key={i} style={{
                width: 14, height: 22, background: color,
                clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)',
                opacity: 0.85, boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }} />
            ))}
          </div>
        </div>

        {/* ── Deeper arched gallery row (coliseum portico) ── */}
        <div style={{
          height: 36,
          background: 'linear-gradient(180deg,#6b4f2a 0%,#5a3d28 50%,#3d2b1a 100%)',
          display: 'flex',
          borderTop: '2px solid #8B7355',
          borderBottom: '3px solid #2a1c10',
          overflow: 'hidden', position: 'relative',
          boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.55)',
        }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} style={{
              flex: 1, borderRight: '1px solid #8B735540',
              borderLeft: '1px solid #2a1c1080',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: '70%', height: '88%',
                background: 'radial-gradient(ellipse at top,#0a0604 0%,#1a1008 60%,#241a10 100%)',
                borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
                boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.7)',
              }} />
            </div>
          ))}
        </div>

        {/* ── Arena floor (absolute layout for full positional control) ── */}
        <div style={{
          background:
            'radial-gradient(ellipse at 50% 60%, #d4aa70 0%, #c4984e 35%, #8b6330 75%, #5c3a1e 100%)',
          padding:        '20px 16px 24px',
          position:       'relative',
          minHeight:      400,
          overflow:       'hidden',
          animation:      shaking ? 'arena-shake 0.32s ease-in-out 0s 2' : 'none',
          borderTop:      '2px solid #4a2f17',
        }}>
          {/* sand grain overlay */}
          <div style={{ position:'absolute',inset:0,background:'repeating-linear-gradient(45deg,transparent,transparent 7px,rgba(0,0,0,0.05) 7px,rgba(0,0,0,0.05) 8px), repeating-linear-gradient(-45deg,transparent,transparent 13px,rgba(0,0,0,0.04) 13px,rgba(0,0,0,0.04) 14px)',pointerEvents:'none' }} />

          {/* Vignette to add coliseum depth */}
          <div style={{
            position:'absolute', inset:0, pointerEvents:'none',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.55), inset 0 -20px 40px rgba(0,0,0,0.3)',
          }} />

          {/* Stone columns flanking the arena (decorative) */}
          {[0, 1].map(side => (
            <div key={side} style={{
              position: 'absolute', top: 0, bottom: 0,
              [side === 0 ? 'left' : 'right']: 0,
              width: 14,
              background: 'linear-gradient(90deg,#3d2b1a,#5a3d28,#3d2b1a)',
              borderRight: side === 0 ? '1px solid #2a1c10' : 'none',
              borderLeft:  side === 1 ? '1px solid #2a1c10' : 'none',
              boxShadow: 'inset 0 0 6px rgba(0,0,0,0.5)',
              zIndex: 5, pointerEvents: 'none',
            }} />
          ))}

          {/* Wall + residence wrapper, anchored at ~67% of width.
              Wall sits on the left of the wrapper, residence to its right,
              so visually the fortification is centred around the 70-80% mark. */}
          {(wallLevel > 0 || residenceLevel > 0) && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: '67%', right: '3%',
              display: 'flex', alignItems: 'stretch',
              gap: 8, zIndex: 3, pointerEvents: 'none',
            }}>
              <ArenaWall wallLevel={wallLevel} />
              <ArenaResidence residenceLevel={residenceLevel} />
            </div>
          )}

          {/* ── Attacker side — absolutely positioned, charges right via CSS `left` ── */}
          <SidePanel
            side="atk"
            hero={atkHero}
            dots={atkDots}
            phase={phase}
            marching={marching}
          />

          {/* Center — VS + clash flash */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            zIndex: 2, width: 56,
          }}>
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

          {/* ── Defender side — absolutely positioned, sorties left via CSS `left` ── */}
          <SidePanel
            side="def"
            hero={defHero}
            dots={defDots}
            phase={phase}
            marching={marching}
          />
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

        {/* Slim divider between the two armies (no Visualize button here, so
            it never floats out of reach when the defender panel grows tall
            with reinforcements — the button now sits just above the arena). */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 4px', alignSelf: 'stretch', gap: 6 }}>
          <div style={{ width: 1, flex: 1, background: C.border }} />
          <div style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.1em' }}>VS</div>
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

      {/* Big Visualize Fight CTA — sits between the army inputs and the
          arena so it stays in view however tall the defender panel grows
          (reinforcements, multiple tribes, …). */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        padding: '4px 0 6px',
      }}>
        <button
          type="button"
          onClick={() => battleResult && setAnimKey(k => k + 1)}
          disabled={!battleResult}
          title={battleResult ? 'Replay battle animation' : 'Add units first'}
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            10,
            background:     battleResult ? C.gold : C.surface2,
            color:          battleResult ? '#0f0c09' : C.muted,
            border:         `2px solid ${battleResult ? C.goldDim : C.border}`,
            borderRadius:   10,
            padding:        '10px 28px',
            cursor:         battleResult ? 'pointer' : 'not-allowed',
            fontSize:       '0.95rem',
            fontFamily:     'Cinzel, serif',
            fontWeight:     800,
            letterSpacing:  '0.08em',
            transition:     'all 0.15s',
            boxShadow:      battleResult ? '0 4px 18px rgba(240,168,32,0.28)' : 'none',
          }}
        >
          <Play size={20} strokeWidth={2.4} fill={battleResult ? '#0f0c09' : 'none'} aria-hidden />
          <span>VISUALIZE FIGHT</span>
        </button>
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
        defenderGroupTribes={defenderGroups.map(g => g.tribe)}
        wallLevel={wallLevel}
        residenceLevel={residenceLevel}
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
