import readmeMd        from '../../README.md?raw'
import firstVillageMd  from '../../docs/first-village.md?raw'
import secondVillageMd from '../../docs/second-village.md?raw'
import feederVillageMd from '../../docs/feeder-village.md?raw'
import defenceStyleMd  from '../../docs/defence-style.md?raw'
import chiefMd         from '../../docs/chief.md?raw'
import goldPremiumMd   from '../../docs/gold-and-premium.md?raw'
import goodToKnowMd    from '../../docs/good-to-know.md?raw'

export const pages = [
  { id: 'readme',          title: 'Overview',              icon: 'BookOpen', content: readmeMd        },
  { id: 'first-village',   title: 'First Village',         icon: 'MapPin',   content: firstVillageMd  },
  { id: 'second-village',  title: 'Second Village — Anvil',icon: 'Shield',   content: secondVillageMd },
  { id: 'feeder-village',  title: 'Feeder Village',        icon: 'Wheat',    content: feederVillageMd },
  { id: 'defence-style',   title: 'Defence Style',         icon: 'Swords',   content: defenceStyleMd  },
  { id: 'chief',           title: 'Chiefing',              icon: 'Flag',     content: chiefMd         },
  { id: 'gold-and-premium',title: 'Gold & Premium',        icon: 'Coins',    content: goldPremiumMd   },
  { id: 'good-to-know',    title: 'Good to Know',          icon: 'Lightbulb',content: goodToKnowMd    },
]
