/** @typedef {'en' | 'fr'} CropFarmLocale */

export const CROP_FARM_LOCALES = /** @type {const} */ (['en', 'fr'])

/** @param {string} locale */
export function normalizeCropFarmLocale(locale) {
  return locale === 'fr' ? 'fr' : 'en'
}

/** @param {number} n @param {CropFarmLocale} locale */
export function formatCropNum(n, locale = 'en') {
  if (!Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')
}

/** @param {number} n @param {CropFarmLocale} locale */
export function formatCropSignedNum(n, locale = 'en') {
  if (!Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${formatCropNum(n, locale)}`
}

const en = {
  resources: {
    lumber: 'Lumber',
    clay: 'Clay',
    iron: 'Iron',
    crop: 'Crop',
  },
  title: 'Crop Farm Simulator',
  intro:
    'Paste your Farm List page. The tool sums loot from each slot\'s last raid per list, then estimates haul per click, per active hour, and per day from your raid interval and playing window. Enable Advance mode to check crop feeding balance and troop efficiency per target.',
  howTo: 'How to use',
  howToSteps: [
    'In Travian, open Rally Point → Farm List tab.',
    'For each farm list, click the arrow on the right to expand it.',
    'Open View page source (Ctrl+U).',
    'Ctrl+A → Ctrl+C, paste here.',
  ],
  howToImgAlt: 'Travian Farm List — expand every list',
  pasteLabel: 'Paste copied HTML',
  pastePlaceholder:
    'Ctrl+V here — full page source from View page source (Ctrl+U) after expanding every farm list.',
  raidSchedule: 'Raid schedule',
  advanceMode: 'Advance mode',
  advanceModeHint: '(feeding balance + troop efficiency)',
  intervalMinutes: 'Interval (minutes)',
  activeFrom: 'Active from (hour)',
  activeUntil: 'Active until (hour)',
  scheduleHint: (hours, raids, perHour) =>
    `${hours}h window → ~${raids} raid clicks/day (${perHour} per active hour)`,
  advanceFeeding: 'Advance — crop feeding',
  cropBalanceLabel: 'Net crop/h from village stock bar (production − upkeep)',
  cropBalanceHint: 'Use − for deficit (red number in Travian). Auto-filled from paste when available.',
  cropBalancePlaceholder: 'e.g. 5299',
  tradeRoutesLabel: 'Trade routes crop/h (from other villages)',
  tradeRoutesHint:
    'Sum of automated merchant deliveries to this village, expressed as crop/h (runs 24/7).',
  tradeRoutesPlaceholder: 'e.g. 15000',
  sendingVillage: 'Sending village',
  farmListsInclude: 'Farm lists to include (defaults to lists from selected village)',
  unknownVillage: 'Unknown village',
  slotsWithLoot: (withLoot, total) => `${withLoot}/${total} slots with loot`,
  collapsedInPaste: 'collapsed in paste',
  notSelected: 'not selected',
  perRaid: '/ raid',
  perClickLastRaids: 'Per click (last raids)',
  perClick: 'Per click',
  perActiveHour: 'Per active hour',
  perDay: 'Per day',
  targets: 'Targets',
  target: 'Target',
  dist: 'Dist',
  troops: 'Troops',
  lootMax: 'Loot / max',
  util: 'Util',
  increaseTroops: '↑ increase troops',
  reduceTroops: '↓ reduce troops',
  natars: 'Natars',
  totalsAll: 'Totals (all lists)',
  totalsSelected: 'Totals (selected lists)',
  copySummary: 'Copy summary',
  copied: 'Copied',
  farmLists: 'Farm lists',
  troopRecs: 'Troop efficiency recommendations',
  troopsCarry: (troopLabel, util, bootyMax) =>
    `Troops: ${troopLabel} · ${util} of ${bootyMax} carry`,
  feedingEnterBalance:
    'Enter net crop/h above (from your village stock bar) to see whether farming covers troop upkeep.',
  feedingOk: 'Farming covers your crop burn during active raiding.',
  feedingBad: 'Farming does not fully cover your crop burn.',
  villageBalance: 'Village balance',
  tradeRoutes: 'Trade routes',
  base: 'base',
  raids: 'Raids',
  cropPerHour: 'crop/h',
  cropPerDay: 'crop/day',
  list: 'list',
  lists: 'lists',
  slots: 'slots',
  netActiveHours: (start, end) => `Net during active hours (${start}:00–${end}:00)`,
  netFullDay: 'Net over full day (base × 24 + raids)',
  surplusActive: (amount, hours) =>
    `Surplus while clicking — you can support about ${amount} crop/h of extra troop upkeep during your ${hours}h window.`,
  needActive: (amount) => `Need ${amount} more crop/h while raiding`,
  moreTargetsActive: (count, crop) =>
    ` — roughly ${count} more target${count !== 1 ? 's' : ''} at ~${crop} crop/click each`,
  surplusDay: (amount) =>
    `Full-day surplus — village production, trade routes, and farming nets ${amount} crop/day (raids only run in your active window; production runs 24h).`,
  surplusDayNoRoutes: (amount) =>
    `Full-day surplus — village production and farming nets ${amount} crop/day (raids only run in your active window; production runs 24h).`,
  needDay: (amount) => `Need ${amount} more crop/day`,
  moreTargetsDay: (count, crop, clicks) =>
    ` — add ~${count} target${count !== 1 ? 's' : ''} (~${crop} crop/click, ${clicks} clicks/day)`,
  feedingCoverageLabel: 'Feeding coverage',
  feedingCoverageSurplus: 'Surplus',
  feedingCoverageTooltipTitle: 'How feeding coverage is calculated',
  feedingCoverageTooltipIntro:
    'Share of your daily crop burn (after trade routes) covered by raid income over 24h.',
  feedingCoverageStep1: '1. Base crop/h = village balance + trade routes',
  feedingCoverageStep2: '2. Daily burn = |base| × 24',
  feedingCoverageStep3: '3. Raid crop/day = crop per click × clicks per day',
  feedingCoverageStep4: '4. Coverage % = raid crop/day ÷ daily burn × 100',
  feedingCoverageNoDeficit: 'No crop deficit — coverage applies when base crop/h is negative.',
  switchToEn: 'Switch to English',
  switchToFr: 'Switch to French',
  parserNotes: {
    notFarmList:
      'Paste does not look like a Farm List page (Rally Point → Farm List tab).',
    noViewData:
      'Could not find viewData JSON in the paste. Open Farm List (tt=99), expand all lists, View page source (Ctrl+U), then Ctrl+A and paste.',
    invalidViewData: 'viewData JSON is truncated or invalid — try copying the page again.',
    listCollapsed: (name) =>
      `"${name}" is collapsed — expand it on Travian and re-paste to include per-village loot.`,
    slotsMissingLoot: (name, count) =>
      `"${name}": ${count} slot(s) have no last-raid loot in the paste.`,
    noLists: 'No farm lists found in viewData.',
  },
  recIncrease: (pct, stolen, max) =>
    `Raid capped at ${pct}% capacity (${stolen}/${max}) — increase troops.`,
  recDecrease: (pct, stolen, max) =>
    `Only ${pct}% of carry used (${stolen}/${max}) — consider fewer troops.`,
  natarWarning:
    'Natars can build walls/residence — lowering troops may cause losses.',
  copy: {
    title: (start, end, interval, scope) =>
      `Farm loot simulator — ${start}:00–${end}:00, every ${interval} min (${scope})`,
    raidsPerDay: (day, hour) => `Raids per day: ${day} (${hour}/h active)`,
    perClick: 'Per click (sum of last raids):',
    perActiveHour: 'Per active hour:',
    perDay: 'Per day:',
    feeding: (village) => `Feeding balance: village ${village} crop/h`,
    tradeRoutes: (n) => `  Trade routes: +${n} crop/h`,
    base: (n) => `  Base (village + routes): ${n} crop/h`,
    netActive: (n) => `  Net active hour: ${n} crop/h`,
    netDay: (n) => `  Net full day: ${n} crop/day`,
    slotRecs: 'Slot recommendations:',
    byList: 'By farm list (crop / total per click):',
    scopeAll: 'all lists',
    scopeSelected: (n) => `${n} selected list(s)`,
  },
}

const fr = {
  resources: {
    lumber: 'Bois',
    clay: 'Argile',
    iron: 'Fer',
    crop: 'Céréales',
  },
  title: 'Simulateur de pillage — céréales',
  intro:
    'Collez la page Listes de pillage. L\'outil additionne le butin du dernier pillage de chaque emplacement par liste, puis estime le gain par clic, par heure active et par jour selon votre intervalle de pillage et votre plage horaire. Activez le mode Avancé pour vérifier l\'équilibre céréales / entretien des troupes et l\'efficacité par cible.',
  howTo: 'Mode d\'emploi',
  howToSteps: [
    'Dans Travian : Place de rassemblement → onglet Pillages.',
    'Pour chaque liste, cliquez sur la flèche à droite pour l\'ouvrir.',
    'Ouvrez Code source de la page (Ctrl+U).',
    'Ctrl+A → Ctrl+C, puis collez ici.',
  ],
  howToImgAlt: 'Listes de pillage Travian — ouvrir chaque liste',
  pasteLabel: 'Coller le HTML copié',
  pastePlaceholder:
    'Ctrl+V ici — code source complet (Ctrl+U) après avoir ouvert toutes les listes de pillage.',
  raidSchedule: 'Planning de pillage',
  advanceMode: 'Mode avancé',
  advanceModeHint: '(équilibre céréales + efficacité des troupes)',
  intervalMinutes: 'Intervalle (minutes)',
  activeFrom: 'Actif à partir de (heure)',
  activeUntil: 'Actif jusqu\'à (heure)',
  scheduleHint: (hours, raids, perHour) =>
    `Fenêtre ${hours} h → ~${raids} clics de pillage/jour (${perHour}/h actif)`,
  advanceFeeding: 'Avancé — alimentation en céréales',
  cropBalanceLabel: 'Céréales nettes/h (barre du village : production − entretien)',
  cropBalanceHint:
    'Utilisez − pour un déficit (nombre rouge dans Travian). Rempli auto depuis le collage si disponible.',
  cropBalancePlaceholder: 'ex. 5299',
  tradeRoutesLabel: 'Routes commerciales céréales/h (autres villages)',
  tradeRoutesHint:
    'Somme des livraisons automatiques de marchands vers ce village, en céréales/h (24 h/24).',
  tradeRoutesPlaceholder: 'ex. 15000',
  sendingVillage: 'Village d\'envoi',
  farmListsInclude:
    'Listes à inclure (par défaut : listes du village sélectionné)',
  unknownVillage: 'Village inconnu',
  slotsWithLoot: (withLoot, total) => `${withLoot}/${total} emplacements avec butin`,
  collapsedInPaste: 'réduit dans le collage',
  notSelected: 'non sélectionné',
  perRaid: '/ pillage',
  perClickLastRaids: 'Par clic (derniers pillages)',
  perClick: 'Par clic',
  perActiveHour: 'Par heure active',
  perDay: 'Par jour',
  targets: 'Cibles',
  target: 'Cible',
  dist: 'Dist.',
  troops: 'Troupes',
  lootMax: 'Butin / max',
  util: 'Util.',
  increaseTroops: '↑ augmenter troupes',
  reduceTroops: '↓ réduire troupes',
  natars: 'Natars',
  totalsAll: 'Totaux (toutes les listes)',
  totalsSelected: 'Totaux (listes sélectionnées)',
  copySummary: 'Copier le résumé',
  copied: 'Copié',
  farmLists: 'Listes de pillage',
  troopRecs: 'Recommandations d\'efficacité des troupes',
  troopsCarry: (troopLabel, util, bootyMax) =>
    `Troupes : ${troopLabel} · ${util} de ${bootyMax} de capacité`,
  feedingEnterBalance:
    'Saisissez les céréales nettes/h ci-dessus (barre du village) pour voir si le pillage couvre l\'entretien des troupes.',
  feedingOk: 'Le pillage couvre votre consommation de céréales pendant les heures actives.',
  feedingBad: 'Le pillage ne couvre pas entièrement votre consommation de céréales.',
  villageBalance: 'Solde village',
  tradeRoutes: 'Routes commerciales',
  base: 'base',
  raids: 'Pillages',
  cropPerHour: 'céréales/h',
  cropPerDay: 'céréales/jour',
  list: 'liste',
  lists: 'listes',
  slots: 'emplacements',
  netActiveHours: (start, end) => `Net pendant les heures actives (${start}h–${end}h)`,
  netFullDay: 'Net sur 24 h (base × 24 + pillages)',
  surplusActive: (amount, hours) =>
    `Excédent pendant les clics — vous pouvez financer environ ${amount} céréales/h d'entretien supplémentaire pendant votre fenêtre de ${hours} h.`,
  needActive: (amount) => `Il manque ${amount} céréales/h pendant le pillage`,
  moreTargetsActive: (count, crop) =>
    ` — environ ${count} cible${count !== 1 ? 's' : ''} de plus à ~${crop} céréales/clic chacune`,
  surplusDay: (amount) =>
    `Excédent sur 24 h — production du village, routes commerciales et pillages : ${amount} céréales/jour (pillages uniquement dans la fenêtre active ; production 24 h/24).`,
  surplusDayNoRoutes: (amount) =>
    `Excédent sur 24 h — production du village et pillages : ${amount} céréales/jour (pillages uniquement dans la fenêtre active ; production 24 h/24).`,
  needDay: (amount) => `Il manque ${amount} céréales/jour`,
  moreTargetsDay: (count, crop, clicks) =>
    ` — ajoutez ~${count} cible${count !== 1 ? 's' : ''} (~${crop} céréales/clic, ${clicks} clics/jour)`,
  feedingCoverageLabel: 'Couverture céréales',
  feedingCoverageSurplus: 'Excédent',
  feedingCoverageTooltipTitle: 'Calcul de la couverture',
  feedingCoverageTooltipIntro:
    'Part du besoin journalier en céréales (après routes commerciales) couverte par les pillages sur 24 h.',
  feedingCoverageStep1: '1. Base céréales/h = solde village + routes commerciales',
  feedingCoverageStep2: '2. Besoin journalier = |base| × 24',
  feedingCoverageStep3: '3. Pillages/jour = céréales par clic × clics par jour',
  feedingCoverageStep4: '4. Couverture % = pillages/jour ÷ besoin journalier × 100',
  feedingCoverageNoDeficit:
    'Pas de déficit — la couverture s\'applique quand la base céréales/h est négative.',
  switchToEn: 'Passer en anglais',
  switchToFr: 'Passer en français',
  parserNotes: {
    notFarmList:
      'Le collage ne ressemble pas à une page Listes de pillage (Place de rassemblement → Pillages).',
    noViewData:
      'JSON viewData introuvable. Ouvrez Pillages (tt=99), dépliez toutes les listes, Code source (Ctrl+U), Ctrl+A et collez.',
    invalidViewData:
      'JSON viewData tronqué ou invalide — recopiez la page.',
    listCollapsed: (name) =>
      `"${name}" est réduite — ouvrez-la dans Travian et recollez pour inclure le butin par village.`,
    slotsMissingLoot: (name, count) =>
      `"${name}" : ${count} emplacement(s) sans butin du dernier pillage dans le collage.`,
    noLists: 'Aucune liste de pillage trouvée dans viewData.',
  },
  recIncrease: (pct, stolen, max) =>
    `Pillage plafonné à ${pct} % de capacité (${stolen}/${max}) — augmentez les troupes.`,
  recDecrease: (pct, stolen, max) =>
    `Seulement ${pct} % de capacité utilisée (${stolen}/${max}) — réduisez les troupes.`,
  natarWarning:
    'Les Natars peuvent construire mur/résidence — réduire les troupes peut causer des pertes.',
  copy: {
    title: (start, end, interval, scope) =>
      `Simulateur pillage — ${start}h–${end}h, toutes les ${interval} min (${scope})`,
    raidsPerDay: (day, hour) => `Pillages/jour : ${day} (${hour}/h actif)`,
    perClick: 'Par clic (somme des derniers pillages) :',
    perActiveHour: 'Par heure active :',
    perDay: 'Par jour :',
    feeding: (village) => `Équilibre céréales : village ${village} céréales/h`,
    tradeRoutes: (n) => `  Routes commerciales : +${n} céréales/h`,
    base: (n) => `  Base (village + routes) : ${n} céréales/h`,
    netActive: (n) => `  Net heure active : ${n} céréales/h`,
    netDay: (n) => `  Net 24 h : ${n} céréales/jour`,
    slotRecs: 'Recommandations par emplacement :',
    byList: 'Par liste (céréales / total par clic) :',
    scopeAll: 'toutes les listes',
    scopeSelected: (n) => `${n} liste(s) sélectionnée(s)`,
  },
}

/** @type {Record<CropFarmLocale, typeof en>} */
export const cropFarmStrings = { en, fr }

/** @param {CropFarmLocale} locale */
export function getCropFarmStrings(locale) {
  return cropFarmStrings[normalizeCropFarmLocale(locale)]
}
