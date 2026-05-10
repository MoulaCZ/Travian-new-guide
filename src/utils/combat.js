/**
 * Travian Legends combat formula implementation.
 *
 * Formula: winner_loss_ratio = (loser_strength / winner_strength) ^ 1.5
 * Wall bonus per level (multiplicative): Roman 3.64%, Teuton 2.34%, Gaul 2.86%.
 * Smithy: each level adds ~5% to unit stats (simplified linear approximation).
 */

const WALL_BONUS_PER_LEVEL = {
  roman: 0.0364,
  teuton: 0.0234,
  gaul: 0.0286,
}

/**
 * calculateBattle — compute battle outcome between two armies.
 *
 * @param {Array<{unit: object, count: number}>} attackers
 * @param {Array<Array<{unit: object, count: number}>>} defenderGroups  — one or more defender groups (reinforcements)
 * @param {number} wallLevel  0-20
 * @param {'roman'|'teuton'|'gaul'} defenderTribe
 * @param {{
 *   heroAttack?: number,       flat attack bonus from hero
 *   heroDefense?: number,      flat defense bonus from hero
 *   buildingDefense?: number,  flat defense bonus from Residence/Palace/etc.
 *   attackerUpgrade?: number,  smithy upgrade % for attacker (0–100)
 *   defenderUpgrade?: number,  smithy upgrade % for defender (0–100)
 * }} options
 */
export function calculateBattle(attackers, defenderGroups, wallLevel, defenderTribe, options = {}) {
  const {
    heroAttack = 0,
    heroDefense = 0,
    buildingDefense = 0,
    attackerUpgrade = 0,
    defenderUpgrade = 0,
  } = options

  const attackMult   = 1 + attackerUpgrade / 100
  const defenseMult  = 1 + defenderUpgrade / 100

  // Flatten all defender groups into one list
  const defenders = defenderGroups.flat()

  // --- 1. Compute total attack split by unit type ---
  let infAttack = 0
  let cavAttack = 0

  for (const { unit, count } of attackers) {
    if (count <= 0) continue
    const contribution = unit.attack * count * attackMult
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

  // --- 2. Compute raw defense strength ---
  let troopDefense = 0
  for (const { unit, count } of defenders) {
    if (count <= 0) continue
    troopDefense += (unit.defInf * infRatio + unit.defCav * cavRatio) * count * defenseMult
  }

  const totalDefense = troopDefense + heroDefense + buildingDefense

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

  // Per-group defender results
  const defenderGroupResults = defenderGroups.map(group =>
    group.map(({ unit, count }) => {
      const initial = count
      const lost = initial > 0 ? Math.min(initial, Math.round(initial * defenderLossRatio)) : 0
      return { unit, initial, lost, survived: initial - lost }
    })
  )

  // Flat list for convenience
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
