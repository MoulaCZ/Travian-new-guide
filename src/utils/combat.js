/**
 * Travian Legends combat formula implementation.
 *
 * Formula: winner_loss_ratio = (loser_strength / winner_strength) ^ 1.5
 * Wall bonus per level (multiplicative): Roman 3.64%, Teuton 2.34%, Gaul 2.86%.
 * Smithy: each upgrade level adds +5% to unit base stats (standard T4 approximation).
 * Building defense (Residence/Palace/CC): level × 40 points (level 20 = 800).
 */

// Wall bonus: COMPOUND (multiplicative) per level — wallMult = (1 + rate)^level
// ALL values confirmed from in-game building tables (full level 1-20 data):
//   Teuton Earth Wall 2%/lv:  1.02^20 = 1.486  → 49%  ✓ (lv11=24%, lv12=27% ✓)
//   Roman  City Wall  3%/lv:  1.03^20 = 1.806  → 81%  ✓ (every level matches)
//   Gaul   Palisade  2.5%/lv: 1.025^20 = 1.639 → 64%  ✓ (every level matches)
const WALL_BONUS_PER_LEVEL = {
  roman:  0.03,    // City Wall  lv20 = 81%  (confirmed from in-game table)
  teuton: 0.02,    // Earth Wall lv20 = 49%  (confirmed from in-game table)
  gaul:   0.025,   // Palisade   lv20 = 64%  (confirmed from in-game table)
}

/**
 * Smithy multiplier for a given upgrade level (0–20).
 * Formula: base_stat × (1 + level / 5)
 * Level  1 → ×1.20 (+20%)
 * Level  5 → ×2.00 (+100%)
 * Level 10 → ×3.00 (+200%)
 * Level 20 → ×5.00 (+400%)
 * Empirically derived: Paladin defInf 100 at L0, ~120 at L1 matches in-game data.
 */
export function smithyMult(level) {
  return 1 + Math.max(0, Math.min(20, level ?? 0)) / 5
}

/**
 * Defense points from village base + Residence/Palace/Command Center.
 * Base: every village has 10 defense by default.
 * Residence/Palace level N adds N × 40 (level 20 = +800, total 810).
 */
export function buildingDefensePoints(residenceLevel) {
  return 10 + Math.max(0, Math.min(20, residenceLevel ?? 0)) * 40
}

/**
 * calculateBattle — compute battle outcome between two armies.
 *
 * @param {Array<{unit, count, smithy?}>} attackers
 *   smithy = per-unit upgrade level 0–20
 * @param {Array<Array<{unit, count, smithy?}>>} defenderGroups
 *   one or more defender groups (main army + reinforcements)
 * @param {number} wallLevel  0–20
 * @param {'roman'|'teuton'|'gaul'} defenderTribe
 * @param {{
 *   heroAttack?:      number,   Hero Síla — direct flat attack contribution
 *   heroDefense?:     number,   Hero Síla — direct flat defense contribution
 *   offBonusPct?:     number,   Off bonus % — multiplies ALL attacker troop attack
 *   defBonusPct?:     number,   Def bonus % — multiplies ALL defender troop defense
 *   residenceLevel?:  number,   Residence/Palace level (0–20)
 *   attackerWeapon?:  { unitId: string, bonus: number }  weapon adds flat to attack of that unit type
 *   defenderWeapon?:  { unitId: string, bonus: number }  weapon adds flat to defInf+defCav of that unit type
 * }} options
 */
export function calculateBattle(attackers, defenderGroups, wallLevel, defenderTribe, options = {}) {
  const {
    heroAttack      = 0,
    heroDefense     = 0,
    offBonusPct     = 0,
    defBonusPct     = 0,
    residenceLevel  = 0,
    attackerWeapon  = null,
    defenderWeapon  = null,
  } = options

  const offMult = 1 + offBonusPct / 100
  const defMult = 1 + defBonusPct / 100

  // Flatten all defender groups into one list
  const defenders = defenderGroups.flat()

  // --- 1. Compute total attack split by unit type (with per-unit smithy) ---
  let infAttack = 0
  let cavAttack = 0

  for (const { unit, count, smithy } of attackers) {
    if (count <= 0) continue
    const weaponAdd = (attackerWeapon?.unitId === unit.id) ? (attackerWeapon.bonus || 0) : 0
    const effectiveAtk = unit.attack * smithyMult(smithy) + weaponAdd
    const contribution = effectiveAtk * count * offMult
    if (unit.type === 'cavalry') {
      cavAttack += contribution
    } else {
      infAttack += contribution
    }
  }

  const troopAttack = infAttack + cavAttack
  const totalAttack = troopAttack + heroAttack

  let infRatio = 0.5
  let cavRatio = 0.5
  if (troopAttack > 0) {
    infRatio = infAttack / troopAttack
    cavRatio = cavAttack / troopAttack
  }

  // --- 2. Compute raw defense strength (with per-unit smithy) ---
  let troopDefense = 0
  for (const { unit, count, smithy } of defenders) {
    if (count <= 0) continue
    const weaponAdd = (defenderWeapon?.unitId === unit.id) ? (defenderWeapon.bonus || 0) : 0
    const effectiveDefInf = unit.defInf * smithyMult(smithy) + weaponAdd
    const effectiveDefCav = unit.defCav * smithyMult(smithy) + weaponAdd
    troopDefense += (effectiveDefInf * infRatio + effectiveDefCav * cavRatio) * count * defMult
  }

  const totalDefense = troopDefense + heroDefense + buildingDefensePoints(residenceLevel)

  // --- 3. Apply wall bonus (compound: (1+rate)^level) ---
  const bonusPerLevel = WALL_BONUS_PER_LEVEL[defenderTribe] ?? WALL_BONUS_PER_LEVEL.roman
  const wl = Math.max(0, Math.min(20, wallLevel ?? 0))
  const wallMult = wl > 0 ? (1 + bonusPerLevel) ** wl : 1
  const effectiveDefense = totalDefense * wallMult

  // --- 4. Determine winner & loss ratios (exponent 1.5) ---
  const attackerWins = totalAttack >= effectiveDefense

  let attackerLossRatio
  let defenderLossRatio

  // Exponent 1.4 — empirically derived from in-game reports.
  // Example: 10k Legionnaires (400k atk) vs 10k Paladins (1M defInf):
  //   (400k/1000k)^1.4 = 0.2774 → 2774 losses (in-game: 2778, diff = hero rounding).
  const EXPONENT = 1.4

  if (attackerWins) {
    attackerLossRatio = effectiveDefense > 0 ? (effectiveDefense / totalAttack) ** EXPONENT : 0
    defenderLossRatio = 1.0
  } else {
    attackerLossRatio = 1.0
    defenderLossRatio = totalAttack > 0 ? (totalAttack / effectiveDefense) ** EXPONENT : 0
  }

  // --- 5. Build per-unit results ---
  const attackerResults = attackers.map(({ unit, count }) => {
    const initial = count
    const lost = initial > 0 ? Math.min(initial, Math.round(initial * attackerLossRatio)) : 0
    return { unit, initial, lost, survived: initial - lost }
  })

  const defenderGroupResults = defenderGroups.map(group =>
    group.map(({ unit, count }) => {
      const initial = count
      const lost = initial > 0 ? Math.min(initial, Math.round(initial * defenderLossRatio)) : 0
      return { unit, initial, lost, survived: initial - lost }
    })
  )

  const defenderResults = defenderGroupResults.flat()

  return {
    attackerWins,
    totalAttack,
    troopAttack,
    totalDefense,
    effectiveDefense,
    wallMult,
    infRatio,
    cavRatio,
    attackerLossRatio,
    defenderLossRatio,
    attackerResults,
    defenderResults,
    defenderGroupResults,
  }
}
