/**
 * Travian Legends — unit column order for "Own units" overview paste (language-neutral).
 * Speeds (fields/h) match in-game movement; combat stats live in units.js.
 */

import { UNITS } from './units.js'

/** @typedef {'roman'|'teuton'|'gaul'} TravelTribe */

/** Column order in village → Units → Own units table (11 combat + hero). */
export const TRIBE_UNIT_COLUMNS = {
  roman: [
    'legionnaire',
    'praetorian',
    'imperian',
    'equites_legati',
    'equites_imperatoris',
    'equites_caesaris',
    'battering_ram',
    'fire_catapult',
    'senator',
    'settler',
    'hero',
  ],
  teuton: [
    'clubswinger',
    'spearman',
    'axeman',
    'scout',
    'paladin',
    'teutonic_knight',
    'ram',
    'catapult',
    'chief',
    'settler',
    'hero',
  ],
  gaul: [
    'phalanx',
    'swordsman',
    'pathfinder',
    'theutates_thunder',
    'druidrider',
    'haeduan',
    'gaul_ram',
    'trebuchet',
    'chieftain',
    'settler',
    'hero',
  ],
}

/** Default units counted as "defense" for the 200-unit threshold and travel preset. */
export const DEFAULT_DEF_UNIT_PRESET = {
  roman: {
    legionnaire: false,
    praetorian: true,
    imperian: false,
    equites_legati: false,
    equites_imperatoris: true,
    equites_caesaris: true,
    battering_ram: false,
    fire_catapult: false,
    senator: false,
    settler: false,
    hero: false,
  },
  teuton: {
    clubswinger: false,
    spearman: true,
    axeman: false,
    scout: false,
    paladin: true,
    teutonic_knight: false,
    ram: false,
    catapult: false,
    chief: false,
    settler: false,
    hero: false,
  },
  gaul: {
    phalanx: true,
    swordsman: false,
    pathfinder: false,
    theutates_thunder: false,
    druidrider: true,
    haeduan: true,
    gaul_ram: false,
    trebuchet: false,
    chieftain: false,
    settler: false,
    hero: false,
  },
}

const SPEED_BY_ID = {}
for (const tribe of Object.keys(UNITS)) {
  if (tribe === 'nature') continue
  for (const u of UNITS[tribe]) {
    SPEED_BY_ID[u.id] = u.speed
  }
}
// Teuton scout — in paste column order but omitted from battle UNITS list
SPEED_BY_ID.scout = 9

/** @param {string} unitId */
export function getUnitSpeed(unitId) {
  if (unitId === 'hero') return null
  return SPEED_BY_ID[unitId] ?? null
}

/** @param {string} unitId */
export function getUnitLabel(tribe, unitId, locale = 'en') {
  if (locale === 'fr') {
    const fr = FRENCH_UNIT_LABELS[unitId]
    if (fr) return fr
  }
  const u = UNITS[tribe]?.find((x) => x.id === unitId)
  if (u) return u.name
  if (unitId === 'scout') return locale === 'fr' ? 'Éclaireur' : 'Scout'
  if (unitId === 'settler') return locale === 'fr' ? 'Colon' : 'Settler'
  if (unitId === 'hero') return locale === 'fr' ? 'Héros' : 'Hero'
  return unitId
}

/** French in-game names keyed by unit id (all tribes). */
const FRENCH_UNIT_LABELS = {
  legionnaire: 'Légionnaire',
  praetorian: 'Praetorien',
  imperian: 'Imperian',
  equites_legati: 'Equites Legati',
  equites_imperatoris: 'Equites Imperatoris',
  equites_caesaris: 'Equites Caesaris',
  battering_ram: 'Bélier',
  fire_catapult: 'Catapulte',
  senator: 'Sénateur',
  clubswinger: 'Frondeur',
  spearman: 'Lancier',
  axeman: 'Hache',
  scout: 'Éclaireur',
  paladin: 'Paladin',
  teutonic_knight: 'Chevalier teutonique',
  ram: 'Bélier',
  catapult: 'Catapulte',
  chief: 'Chef',
  phalanx: 'Phalange',
  swordsman: 'Epéiste',
  pathfinder: 'Éclaireur',
  theutates_thunder: 'Thunder de Theutates',
  druidrider: 'Cavalier druide',
  haeduan: 'Haeduan',
  gaul_ram: 'Bélier',
  trebuchet: 'Trébuchet',
  chieftain: 'Chef',
  settler: 'Colon',
}

export const MIN_DEF_UNITS_THRESHOLD = 200

export const HERO_STANDARD_OPTIONS = [
  { id: 0, label: 'None', pct: 0 },
  { id: 1, label: 'Standard +15%', pct: 15 },
  { id: 2, label: 'Standard +20%', pct: 20 },
  { id: 3, label: 'Standard +25%', pct: 25 },
]

/** Tournament square: +20% movement speed per level when distance > 20 fields. */
export const TOURNAMENT_SQUARE_BONUS_PER_LEVEL = 0.2
export const TOURNAMENT_SQUARE_MIN_DISTANCE = 20
