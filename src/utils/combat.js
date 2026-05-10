/**
 * Travian Legends combat formula implementation.
 *
 * Formula: winner_loss_ratio = (loser_strength / winner_strength) ^ 1.5
 * Wall bonus per level (multiplicative): Roman 3.64%, Teuton 2.34%, Gaul 2.86%.
 * Smithy: each upgrade level adds +5% to unit base stats (standard T4 approximation).
 * Building defense (Residence/Palace/CC): level × 40 points (level 20 = 800).
 */

const WALL_BONUS_PER_LEVEL = {
  roman:  0.0364,
  teuton: 0.0234,
  gaul:   0.0286,
}

/** Smithy multiplier for a given upgrade level (0–20). */
export function smithyMult(level) {
  return 1 + Math.max(0, Math.min(20, level ?? 0)) * 0.05
}

/** Defense points from Residence/Palace/Command Center. */
export function buildingDefensePoints(level) {
  return Math.max(0, Math.min(20, level ?? 0)) * 40
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
 *   heroAttack?:      number,   flat attack bonus from hero
 *   heroDefense?:     number,   flat defense bonus from hero
 *   residenceLevel?:  number,   Residence/Palace level (0–20)
 * }} options
 */
export function calculateBattle(attackers, defenderGroups, wallLevel, defenderTribe, options = {}) {
  const {
    heroAttack     = 0,
    heroDefense    = 0,
    residenceLevel = 0,
  } = options

  // Flatten all defender groups into one list
  const defenders = defenderGroups.flat()

  // --- 1. Compute total attack split by unit type (with per-unit smithy) ---
  let infAttack = 0
  let cavAttack = 0

  for (const { unit, count, smithy } of attackers) {
    if (count <= 0) continue
    const mult = smithyMult(smithy)
    const contribution = unit.attack * count * mult
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
    const mult = smithyMult(smithy)
    troopDefense += (unit.defInf * infRatio + unit.defCav * cavRatio) * count * mult
  }

  const totalDefense = troopDefense + heroDefense + buildingDefensePoints(residenceLevel)

  // --- 3. Apply wall bonus ---
  const bonusPerLevel = WALL_BONUS_PER_LEVEL[defenderTribe] ?? WALL_BONUS_PER_LEVEL.roman
  const wallMult = 1 + bonusPerLevel * (wallLevel ?? 0)
  const effectiveDefense = totalDefense * wallMult

  // --- 4. Determine winner & loss ratios (exponent 1.5) ---
  const attackerWins = totalAttack >= effectiveDefense

  let attackerLossRatio
  let defenderLossRatio

  if (attackerWins) {
    attackerLossRatio = effectiveDefense > 0 ? (effectiveDefense / totalAttack) ** 1.5 : 0
    defenderLossRatio = 1.0
  } else {
    attackerLossRatio = 1.0
    defenderLossRatio = totalAttack > 0 ? (totalAttack / effectiveDefense) ** 1.5 : 0
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
