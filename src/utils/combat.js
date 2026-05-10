/**
 * Travian Legends combat formula implementation.
 *
 * References the classic server formula used in Travian Legends (T4.x).
 * Wall bonus per level (multiplicative): Roman 3.64%, Teuton 2.34%, Gaul 2.86%.
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
 * @param {Array<{unit: object, count: number}>} defenders
 * @param {number} wallLevel  0-20
 * @param {'roman'|'teuton'|'gaul'} defenderTribe
 *
 * @returns {{
 *   attackerWins: boolean,
 *   totalAttack: number,
 *   totalDefense: number,
 *   effectiveDefense: number,
 *   wallMult: number,
 *   infRatio: number,
 *   cavRatio: number,
 *   attackerLossRatio: number,
 *   defenderLossRatio: number,
 *   attackerResults: Array<{unit, initial, lost, survived}>,
 *   defenderResults: Array<{unit, initial, lost, survived}>,
 * }}
 */
export function calculateBattle(attackers, defenders, wallLevel, defenderTribe) {
  // --- 1. Compute total attack split by unit type ---
  let infAttack = 0
  let cavAttack = 0

  for (const { unit, count } of attackers) {
    if (count <= 0) continue
    const contribution = unit.attack * count
    if (unit.type === 'cavalry') {
      cavAttack += contribution
    } else {
      // infantry, siege, chief all count as "infantry" for ratio purposes
      infAttack += contribution
    }
  }

  const totalAttack = infAttack + cavAttack

  let infRatio = 0.5
  let cavRatio = 0.5
  if (totalAttack > 0) {
    infRatio = infAttack / totalAttack
    cavRatio = cavAttack / totalAttack
  }

  // --- 2. Compute raw defense strength ---
  let totalDefense = 0
  for (const { unit, count } of defenders) {
    if (count <= 0) continue
    totalDefense += (unit.defInf * infRatio + unit.defCav * cavRatio) * count
  }

  // --- 3. Apply wall bonus ---
  const bonusPerLevel = WALL_BONUS_PER_LEVEL[defenderTribe] ?? WALL_BONUS_PER_LEVEL.roman
  const wallMult = 1 + bonusPerLevel * (wallLevel ?? 0)
  const effectiveDefense = totalDefense * wallMult

  // --- 4. Determine winner & loss ratios ---
  const attackerWins = totalAttack >= effectiveDefense

  let attackerLossRatio
  let defenderLossRatio

  if (attackerWins) {
    // Attacker wins: defender is fully destroyed, attacker loses sqrt fraction
    attackerLossRatio = effectiveDefense > 0 ? Math.sqrt(effectiveDefense / totalAttack) : 0
    defenderLossRatio = 1.0
  } else {
    // Defender wins: attacker is fully destroyed, defender loses sqrt fraction
    attackerLossRatio = 1.0
    defenderLossRatio = totalAttack > 0 ? Math.sqrt(totalAttack / effectiveDefense) : 0
  }

  // --- 5. Build per-unit results ---
  const attackerResults = attackers.map(({ unit, count }) => {
    const initial = count
    const lost = initial > 0 ? Math.round(initial * attackerLossRatio) : 0
    return { unit, initial, lost, survived: initial - lost }
  })

  const defenderResults = defenders.map(({ unit, count }) => {
    const initial = count
    const lost = initial > 0 ? Math.round(initial * defenderLossRatio) : 0
    return { unit, initial, lost, survived: initial - lost }
  })

  return {
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
  }
}
