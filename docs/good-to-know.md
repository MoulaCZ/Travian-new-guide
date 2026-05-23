# Good to Know

> Things that aren't obvious, questions that come up constantly, and mistakes that are easy to avoid once you know about them. No single topic here is big enough for its own page — but all of them matter.

---

## Game Mechanics

**Q: Does raiding count as an attack for chiefing purposes?**
No. Raiding and attacking are different actions. Chiefs/Senators/Chieftains must be sent as a **normal attack**, not a raid. A raid with a chief does nothing to loyalty.

**Q: Can I conquer a capital village?**
No. Capital villages cannot be conquered. You can only chief non-capital villages and Natar villages.

**Q: What happens to my troops if my village gets chiefed?**
All troops in the village — including reinforcements from allies — are expelled. Queued units disappear. Oases detach. Research and smithy upgrades reset.

**Q: If I demolish my Residence, can my village be chiefed?**
Yes. A village without a Residence, Palace, or Command Center has no loyalty protection and can be conquered. Never demolish your administration building unless you intend to replace it immediately.

**Q: Can two players chief the same village at the same time?**
Yes — and whoever reduces loyalty to 0% first takes the village. If two administrator waves land at the same second, the one sent earlier wins.

**Q: Does the 25% ad speed boost apply to field upgrades too?**
Yes. It applies to all construction — buildings and resource fields alike (except Residence and Palace).

---

## Hero

**Q: My hero died — what now?**
Use a **Water Bucket** to revive instantly. Without one, you can revive them via the hero portrait menu by paying resources. Revival costs decrease by 20% for each day you wait, up to 80%.

**Q: When should I switch hero points from Strength to Resource Production?**
Use the **Book of Wisdom** to respec when your hero's walking time to oases hits 2h+ (oases are no longer worth farming). Put almost all points into Resource Production from that point on.

**Q: Does hero XP level matter?**
Yes — every level-up **fully heals your hero**. Use this: if your hero is low on health, collect a quest that triggers a level-up instead of using an Ointment.

**Q: Can my hero die on an adventure?**
Yes. Check the difficulty rating before sending. Early adventures are safe; harder ones can kill a low-HP hero. Watch health carefully.

**Q: Does the Gladiator Helmet actually do anything useful?**
Yes — it generates CP passively while the hero sits home. Switch to it during peacetime when the hero isn't raiding or adventuring.

**Q: How do Herbal Medicines (Ointments) actually work — aren't they just a health potion?**
They're much more than that. Their real power is **healing between battle rounds**.

Travian battles don't resolve in one instant — they run in **rounds**. Each round, both sides deal damage: attackers lose troops, the hero loses a percentage of HP. Without medicines, that damage stacks up across rounds until the hero dies. With medicines equipped, the hero is **restored to full HP after every round** — turning a slow death into a survival.

![Herbal medicines battle mechanics](images/herbal-medicines.svg)

> 🟥 **One exception:** if a single round deals damage equal to or greater than the hero's full HP, the hero dies instantly regardless of medicines. Ointments protect against accumulated attrition — not a one-shot kill.

To make use of this, **equip ointments before sending the hero** (Hero → Inventory → drag into the equipment slot). Ointments sitting in inventory do nothing during a fight.

---

## Culture Points & Parties

**Q: What's the difference between Small and Large Celebration?**
- **Small Celebration** — grants CP equal to this village's daily output, capped at 500 CP
- **Large Celebration** — grants CP equal to all your villages' combined daily output, capped at 2,000 CP

Once you have 3+ villages, Large is almost always better. Run Large exclusively from that point.

**Q: Can I queue multiple celebrations?**
Only one celebration can run at a time per village. You can queue one in advance while another is running.

**Q: My CP production says 100/day but I'm not getting a new village slot anytime soon — why?**
Culture Points accumulate over time. A new village slot unlocks when your total CP reaches the next threshold — it's not based on daily production rate alone. Check your current total vs. the requirement in the Residence/Palace.

**Q: Does upgrading the Town Hall while a party is running change anything?**
No effect on the running party. The next party you queue will benefit from the new Town Hall level.

---

## Buildings & Fields

**Q: Why can't I build resource fields above level 10?**
Non-capital villages are capped at level 10. Only the capital can go higher. Choose your capital wisely — it's usually your main anvil - 15c cropper.

**Q: Can I have both a Residence and a Palace?**
No. A village can only have one administration building. The Palace makes that village your capital; the Residence does not.

**Q: What's the point of the Workshop?**
It allows you to train catapults and rams. For a pure DEF account, a Workshop level 1 is often built just to fill a building slot — you won't actively use it.

**Q: Should I demolish buildings to make room for others?**
Good idea for crannies you built in first village.

**Q: Romans can build fields and buildings simultaneously — is that true?**
Yes. Romans have a unique ability to queue one building upgrade and one resource field upgrade at the same time with a single Master Builder slot. Very efficient early game.

---

## Combat & Defence

**Q: What is "sniping"?**
Sniping means landing a reinforcement wave between two enemy attack waves — specifically between the clearing wave and the chief wave — to defend at the exact right moment. It takes practice.

**Q: My ally is under attack — should I send all my troops?**
**Not automatically** — random reinforcements can miss the window or waste crop. Wait for **Discord / def channel** orders: coordinators name **which village** to reinforce, **what time** troops must **land**, and often **which unit types** they need. Time your send from the **Rally Point** so you hit that arrival second. See **Alliance defence calls** at the end of the [Defence Style](defence-style.md) page for the full pattern.

**Q: Is the Hospital worth building?**
Yes, always. Wounded troops (those that survive but are injured) return to your village instead of dying. At scale, this saves thousands of troops per battle.

**Q: Should I build Great Barracks or Great Stables for faster training?**
No. For the same resource cost, run 3 normal Barracks across 3 villages. You triple your output and spread the risk. Great Barracks/Stables are a trap for DEF players.

**Q: What is troop evasion and when should I use it?**
Troop Evasion (Gold Club feature) lets you send all your troops away from a capital village just before an attack lands — they simply aren't home when it hits. Use it when you see a large incoming attack you can't defend.

**Q: Why does Rally Point level matter for reading incoming attacks?**

Two jobs:

- **As attacker** — Rally Point level unlocks catapult targeting (RP 1 random only, RP 3 Warehouse/Granary, RP 5 + resource fields, RP 10 almost any building, RP 20 = two targets per wave with ≥ 20 catapults). Full table in the [official catapults guide](https://support.travian.com/en/support/solutions/articles/7000065985-catapults).
- **As defender** — Rally Point level works as a **fake filter**. With a low Rally Point, an incoming "X units arriving in hh:mm:ss" tells you nothing about size — could be **5 farmers or 5,000 hammers** and you have to assume worst case and ping the alliance every time.

  With a higher Rally Point, waves smaller than that level show only question marks instead of the unit type / count. Example: **Rally Point 10**, incoming wave of **5 units** — you see "?" for unit type and immediately know the wave is **smaller than 10 units → it's a fake**, no need to wake the alliance or scramble defence. With Rally Point 1 the same wave looks identical to a real hammer and you can't tell them apart.

  That's why a defensive account keeps Rally Point high in every village — it filters trivial fakes automatically and saves you from over-reacting.

**Q: An attack is incoming and I have way more resources than my Cranny holds — how do I hide them?**

If the incoming is just a **raid** (no catapults, no chiefs in the report-time / no big siege stack), the attacker only takes loot — your buildings and village are safe, but every resource above your Cranny limit is gone. You usually have a few hours to burn off the excess. Four standard tricks, in roughly the order people try them:

1. **Queue buildings.** Open every village that needs upgrades and start as many builds as you can — wood/clay/iron drains into the construction site immediately. Field upgrades and warehouses/granaries swallow huge amounts.
2. **Queue troops.** Stack the Barracks / Stable / Workshop with as many units as the queue allows. **Important:** units already in your village will still be home when the attack lands and may die — send your existing army out (visit an oasis, send to a friend, or send to a near coordinate) a few seconds before impact so they're "on the road" when the raid hits, then call them straight back. Newly queued troops have not finished training yet, so they cannot be lost in the fight either way.
3. **Ship to the alliance bonus** (if your alliance runs alliance bonuses fed by contributions). Donating to the bonus instantly removes resources from your village and helps the team — pure win.
4. **The marketplace trick.** Marketplace → Offer resources → put up an **intentionally bad trade**: offer the resource you cannot burn (typically wood or clay) at **maximum amount**, ask for a different resource in return, at a **very favourable ratio** — e.g. 2 : 1 for you. Nobody will take it because the deal is terrible, but the resources are now **locked in the marketplace** and not in the warehouse, so the raider cannot loot them. **After the attack lands, cancel the offer** and the resources come back into your warehouse untouched.

> ⚠️ All four tricks assume it's a **raid** (loot only). If the incoming wave includes catapults or chiefs you have a different problem — call defence, follow alliance instructions, and use Troop Evasion on the capital if you have Gold Club. Hiding resources is irrelevant if the village itself is the target.

---

## Before or After — timing edge cases

A handful of things in Travian only check their condition **at the moment a battle / action lands**, not at the moment you set them up. Knowing which is which saves you from over-preparing — or from skipping a step because "it's too late".

**Chiefing — Large Celebration counts at landing time, not when you send the chief.**
A Large Celebration in your village reduces enemy loyalty by an extra 5% per chief (and an enemy Large Celebration cancels yours). Per the official [Celebrations and Town Hall guide](https://support.travian.com/en/support/solutions/articles/7000070669-celebrations-and-town-hall): *"These loyalty effects apply to all battles that take place during the celebration, regardless of when troops were sent."* → Start the celebration **after** sending your chiefs as long as it is **running when the waves hit**. Same for the defender: if you only realise chiefs are inbound after they were sent, start a Large Celebration before they land — still works.

**Chiefing — Culture Points are checked at landing time.**
You do **not** need enough CP to chief when you press send. Per the official [Culture Points guide](https://support.travian.com/en/support/solutions/articles/7000065115-culture-points-cp-): *"When conquering a village, you also need enough Culture Points at the time of the battle to lower enemy loyalty successfully."* → If your chief travels 2 h and you'll have the CP in 1 h 55 min, send the chief now. (Note: **settlers** are different — CP is checked both when sent **and** on arrival.)

**Smithy upgrades apply to units already on the road.**
Smithy weapon level is read at the moment of battle, not at the moment of dispatch. → If the upgrade finishes a second before the attack lands, your army fights with the new bonus — even though it left the village at the old level.

**Residence / Palace in build queue does NOT protect a village from chiefing.**
Only a **standing** Residence or Palace blocks loyalty reduction. Per [Travian's preventing-conquering guide](https://support.travian.com/en/support/solutions/articles/7000060247-preventing-conquering), the admin building "must be destroyed first". → A Residence sitting in the construction queue does nothing — until the timer hits 0 and the building physically exists, the village can be chiefed. The same goes for re-building after a catapult wave: queue ≠ protection.

**Tournament Square built while your troops are travelling does NOT speed them up.**
Units already on the way have a locked arrival time. Tournament Square (and Hero speed items) only affect **new** marches. → No point catapulting your TS up mid-defence-call hoping the defence already in flight arrives faster.

**Cages can be equipped on a hero that is already moving.**
Most hero items can't be changed while travelling: *"Exception: usable items."* → If you sent your hero to an oasis and only now see elephants spawned there, drop **cages** into the inventory — they still take effect on arrival.

How cages work (per the [Hero Consumable Items guide](https://support.travian.com/en/support/solutions/articles/7000063372-hero-consumable-items)): *"Cages are consumed left to right, one per animal type at a time."* → Cages rotate through the animal types one by one. Example: an oasis with **10 mice / 4 tigers / 2 elephants**, you bring **6 cages** → you catch **2 mice, 2 tigers, 2 elephants** (cage 1 → mouse, cage 2 → tiger, cage 3 → elephant, cage 4 → mouse, cage 5 → tiger, cage 6 → elephant). Plan accordingly when the oasis you want to clear has a few rats and one big monster — you only need 2 cages, not 12.

---

## Economy & Trade

**Q: How do Trade Routes work?**
**Gold Club** unlocks automated **Trade Routes** in the **Marketplace**. In the **source** village you configure: **destination village**, **which resources**, **amount per shipment**, and **interval** (e.g. every hour, every 6h, every 10h). Merchants then loop on their own — no daily clicking.

Typical pattern: **feeders → anvil** for wood/clay/iron/crop. You can also move crop **between any two of your villages** if one has surplus hourly balance and another is negative (troops eating grain faster than fields feed).

**Q: What is crop lock / getting croplocked?**
**Crop lock** means your account hits a state where **crop consumption outruns income** so badly that you **cannot start new builds or troop queues** until you fix the balance (exact UI wording varies by version, but the idea is the same: you are “locked” behind missing crop).

**Common causes**

- **Self-inflicted:** too many troops + parties + low fields for the crop you actually produce.
- **Hostile:** offensive players **catapult your croplands** on purpose to destroy output and stall your account — a classic way to ruin someone’s round. That is more “off meta” than everyday feeder play, but def players should know it exists.

**Recovery levers:** ship crop from other villages, hero inventory, marketplace buys, **temporary troop cuts** (send extras home or to alliance storage if offered), rebuild fields, and get **trade routes** feeding the starving village before queues idle for days.

**Q: My Marketplace merchants are too small — what helps?**
- Upgrade the **Trade Office** — each level increases merchant carry capacity
- You should **build** your feeder villages closer to the anvil when choosing new tiles

**Q: When should I use the NPC Merchant?**
As F2P, try to avoid it — it costs 3 Gold per use. Plan resource needs in advance and use the regular Marketplace instead. If you're stuck mid-build and absolutely need a specific resource, it's a last resort.

---

## Common Mistakes

- **Letting the hero die** — always monitor HP. Level-ups fully heal. Use Ointments. Keep a Bucket.
- **Building fields above level 10 in first village (soon to be a non-capital)** — wasted investment, once you change capital, all fields downgrade to level 10.
- **Running Small Celebrations when you have 4+ villages** — Large gives cca 4× the CP for similar cost.
- **Selling Tablets of Law early** — their price spikes hard when chiefing season begins.
- **Building Great Barracks/Stables** — three normal buildings across three villages is always better.
- **Sending chief as a raid** — does nothing. Must be a normal attack.
- **Demolishing your Residence** — leaves your village unprotected until rebuilt. Plan before doing this.

---

## Useful External Tools

These tools are not part of Travian itself but are widely used by experienced players:

**[GetterTools](https://www.gettertools.com/en/)**
Share a **troop overview with alliance leaders** — coordinators use it to see defence totals across the alliance without asking every player individually. Also supports radius search and travel-time filters for your own scouting.

**[TravcoTools](https://travcotools.com/en/)**
Find **inactive players** near your villages — inactivity days, population range, alliance whitelist/blacklist, and farmlist status for farm-list work.
