// Travian Legends unit stats — all three classic tribes
// Stats: attack / defInf (defense vs infantry) / defCav (defense vs cavalry)
// crop: upkeep per hour | carry: resource carry capacity | speed: fields/hour
//
// `iconId` (optional) overrides the icon filename when the unit ID does not match
// the PNG in src/assets/units/<tribe>/<iconId>.png (e.g. battering_ram → ram.png)

const _iconModules = import.meta.glob('../assets/units/**/*.png', { eager: true })

const _iconUrls = {}
for (const [path, mod] of Object.entries(_iconModules)) {
  const url = (mod && (mod.default ?? mod)) || null
  const m = path.match(/\/units\/([^/]+)\/([^/]+)\.png$/)
  if (m && url) _iconUrls[`${m[1]}/${m[2]}`] = url
}

export function getUnitIconUrl(tribe, unit) {
  if (!tribe || !unit) return null
  const id = unit.iconId ?? unit.id
  return _iconUrls[`${tribe}/${id}`] ?? null
}

export function getHeroIconUrl(tribe) {
  if (!tribe) return null
  return _iconUrls[`${tribe}/hero`] ?? null
}

export const UNITS = {
  roman: [
    {
      id: 'legionnaire',
      name: 'Legionnaire',
      type: 'infantry',
      attack: 40,
      defInf: 35,
      defCav: 50,
      crop: 1,
      carry: 50,
      speed: 6,
    },
    {
      id: 'praetorian',
      name: 'Praetorian',
      type: 'infantry',
      attack: 30,
      defInf: 65,
      defCav: 35,
      crop: 1,
      carry: 20,
      speed: 5,
    },
    {
      id: 'imperian',
      name: 'Imperian',
      type: 'infantry',
      attack: 70,
      defInf: 30,
      defCav: 25,
      crop: 1,
      carry: 50,
      speed: 7,
    },
    {
      id: 'equites_legati',
      name: 'Equites Legati',
      type: 'cavalry',
      attack: 0,
      defInf: 20,
      defCav: 10,
      crop: 2,
      carry: 0,
      speed: 16,
    },
    {
      id: 'equites_imperatoris',
      name: 'Equites Imperatoris',
      type: 'cavalry',
      attack: 120,
      defInf: 65,
      defCav: 50,
      crop: 3,
      carry: 100,
      speed: 14,
    },
    {
      id: 'equites_caesaris',
      name: 'Equites Caesaris',
      type: 'cavalry',
      attack: 180,
      defInf: 80,
      defCav: 105,
      crop: 4,
      carry: 70,
      speed: 10,
    },
    {
      id: 'battering_ram',
      iconId: 'ram',
      name: 'Battering Ram',
      type: 'siege',
      attack: 60,
      defInf: 30,
      defCav: 75,
      crop: 3,
      carry: 0,
      speed: 4,
    },
    {
      id: 'fire_catapult',
      name: 'Fire Catapult',
      type: 'siege',
      attack: 75,
      defInf: 60,
      defCav: 10,
      crop: 6,
      carry: 0,
      speed: 3,
    },
    {
      id: 'senator',
      name: 'Senator',
      type: 'chief',
      attack: 50,
      defInf: 40,
      defCav: 30,
      crop: 5,
      carry: 0,
      speed: 4,
    },
  ],

  teuton: [
    {
      id: 'clubswinger',
      name: 'Clubswinger',
      type: 'infantry',
      attack: 40,
      defInf: 20,
      defCav: 5,
      crop: 1,
      carry: 60,
      speed: 7,
    },
    {
      id: 'spearman',
      name: 'Spearman',
      type: 'infantry',
      attack: 10,
      defInf: 35,
      defCav: 60,
      crop: 1,
      carry: 40,
      speed: 7,
    },
    {
      id: 'axeman',
      name: 'Axeman',
      type: 'infantry',
      attack: 55,
      defInf: 30,
      defCav: 25,
      crop: 1,
      carry: 50,
      speed: 6,
    },
    {
      id: 'paladin',
      name: 'Paladin',
      type: 'cavalry',
      attack: 55,
      defInf: 100,
      defCav: 40,
      crop: 2,
      carry: 110,
      speed: 10,
    },
    {
      id: 'teutonic_knight',
      name: 'Teutonic Knight',
      type: 'cavalry',
      attack: 150,
      defInf: 50,
      defCav: 75,
      crop: 3,
      carry: 80,
      speed: 9,
    },
    {
      id: 'ram',
      name: 'Ram',
      type: 'siege',
      attack: 65,
      defInf: 30,
      defCav: 80,
      crop: 3,
      carry: 0,
      speed: 4,
    },
    {
      id: 'catapult',
      name: 'Catapult',
      type: 'siege',
      attack: 50,
      defInf: 60,
      defCav: 10,
      crop: 6,
      carry: 0,
      speed: 3,
    },
    {
      id: 'chief',
      name: 'Chief',
      type: 'chief',
      attack: 40,
      defInf: 60,
      defCav: 40,
      crop: 4,
      carry: 0,
      speed: 5,
    },
  ],

  // Wild oasis animals (Nature). Used as a defender reinforcement when raiding
  // an unoccupied oasis. Stats per Travian Legends standard server.
  nature: [
    { id: 'rat',       name: 'Rat',       type: 'infantry', attack:  10, defInf:  25, defCav:  20, crop: 1, carry: 0, speed: 20 },
    { id: 'spider',    name: 'Spider',    type: 'infantry', attack:  20, defInf:  35, defCav:  40, crop: 1, carry: 0, speed: 20 },
    { id: 'snake',     name: 'Snake',     type: 'infantry', attack:  60, defInf:  40, defCav:  60, crop: 1, carry: 0, speed: 20 },
    { id: 'bat',       name: 'Bat',       type: 'cavalry',  attack:  80, defInf:  66, defCav:  50, crop: 1, carry: 0, speed: 20 },
    { id: 'boar',      name: 'Wild Boar', type: 'infantry', attack:  50, defInf:  70, defCav:  33, crop: 1, carry: 0, speed: 20 },
    { id: 'wolf',      name: 'Wolf',      type: 'cavalry',  attack: 100, defInf:  80, defCav:  70, crop: 2, carry: 0, speed: 20 },
    { id: 'bear',      name: 'Bear',      type: 'cavalry',  attack: 250, defInf: 140, defCav: 200, crop: 3, carry: 0, speed: 20 },
    { id: 'crocodile', name: 'Crocodile', type: 'infantry', attack: 450, defInf: 380, defCav: 240, crop: 3, carry: 0, speed: 20 },
    { id: 'tiger',     name: 'Tiger',     type: 'cavalry',  attack: 200, defInf: 170, defCav: 250, crop: 3, carry: 0, speed: 20 },
    { id: 'elephant',  name: 'Elephant',  type: 'cavalry',  attack: 600, defInf: 440, defCav: 520, crop: 5, carry: 0, speed: 20 },
  ],

  gaul: [
    {
      id: 'phalanx',
      name: 'Phalanx',
      type: 'infantry',
      attack: 15,
      defInf: 40,
      defCav: 50,
      crop: 1,
      carry: 35,
      speed: 7,
    },
    {
      id: 'swordsman',
      name: 'Swordsman',
      type: 'infantry',
      attack: 65,
      defInf: 35,
      defCav: 20,
      crop: 1,
      carry: 45,
      speed: 6,
    },
    {
      id: 'pathfinder',
      name: 'Pathfinder',
      type: 'cavalry',
      attack: 0,
      defInf: 10,
      defCav: 5,
      crop: 2,
      carry: 0,
      speed: 17,
    },
    {
      id: 'theutates_thunder',
      name: 'Theutates Thunder',
      type: 'cavalry',
      attack: 90,
      defInf: 25,
      defCav: 40,
      crop: 2,
      carry: 75,
      speed: 19,
    },
    {
      id: 'druidrider',
      name: 'Druidrider',
      type: 'cavalry',
      attack: 45,
      defInf: 115,
      defCav: 55,
      crop: 2,
      carry: 35,
      speed: 16,
    },
    {
      id: 'haeduan',
      name: 'Haeduan',
      type: 'cavalry',
      attack: 140,
      defInf: 60,
      defCav: 165,
      crop: 3,
      carry: 65,
      speed: 13,
    },
    {
      id: 'gaul_ram',
      iconId: 'ram',
      name: 'Ram',
      type: 'siege',
      attack: 50,
      defInf: 30,
      defCav: 80,
      crop: 3,
      carry: 0,
      speed: 4,
    },
    {
      id: 'trebuchet',
      name: 'Trebuchet',
      type: 'siege',
      attack: 70,
      defInf: 45,
      defCav: 10,
      crop: 6,
      carry: 0,
      speed: 3,
    },
    {
      id: 'chieftain',
      name: 'Chieftain',
      type: 'chief',
      attack: 40,
      defInf: 50,
      defCav: 50,
      crop: 4,
      carry: 0,
      speed: 5,
    },
  ],
}

export const WALL_NAMES = {
  roman: 'City Wall',
  teuton: 'Earth Wall',
  gaul: 'Palisade',
  nature: 'Oasis',
}

export const TRIBE_LABELS = {
  roman: 'Romans',
  teuton: 'Teutons',
  gaul: 'Gauls',
  nature: 'Animals (Oasis)',
}
