# Jak změny nahrát na GitHub (po úpravách dokumentace)

Tento soubor popisuje **krok za krokem**, jak změny v `docs/` a `README.md` přidat do gitu a pushnout (např. na fork `myfork` nebo přímo `origin`).

## 1. Přejdi do klonu repozitáře

```powershell
cd "c:\Users\Stepa\Desktop\Práce\Groupon\Travian-new-guide-work"
```

## 2. Zkontroluj větev

Měl bys být na větvi, ze které děláš PR (např. `main` nebo feature větev):

```powershell
git status
git branch
```

Pokud potřebuješ novou větev:

```powershell
git checkout main
git pull
git checkout -b docs/content-auction-def-crop
```

## 3. Přidej změněné soubory (staging)

Po této úpravě se typicky mění:

```powershell
git add README.md `
  docs/first-village.md `
  docs/gold-and-premium.md `
  docs/defence-style.md `
  docs/good-to-know.md `
  docs/farming.md `
  docs/PUSH_INSTRUCTIONS.md
```

*(Na jednom řádku bez backticků můžeš napsat všechny cesty za sebe za `git add`.)*

Zkontroluj, co půjde do commitu:

```powershell
git status
```

## 4. Commit

```powershell
git commit -m "docs: auction max-bid logic, refer-a-friend table, trade routes; def calls, crop lock, TL;DR"
```

## 5. Push

**Na fork** (příklad — nahraď URL svým forkem):

```powershell
git push -u myfork HEAD
```

nebo konkrétní větev:

```powershell
git push -u myfork docs/content-auction-def-crop
```

**Přímo na origin** (jen pokud máš práva):

```powershell
git push -u origin HEAD
```

## 6. Aplikace / Keboola

- Pokud nasazuješ **zdroják** z gitu a build běží v CI: po mergi stačí push větve / `main`.
- Pokud do repa **commituješ i `dist/`**, po změnách v textech často stačí jen MD — build dělej lokálně jen když měníš React:

```powershell
npm install
npm run build
git add dist/
git commit -m "chore: rebuild dist"
git push
```

## Shrnutí obsahu této vlny

| Soubor | Změna (stručně) |
|--------|------------------|
| `README.md` | Římové vs stránka Defence Style — odkaz a vysvětlení |
| `docs/first-village.md` | TL;DR před build tabulkou |
| `docs/gold-and-premium.md` | Refer a friend tabulka + příklad; aukce max-bid logika; Trade Routes návod |
| `docs/defence-style.md` | Sekce Alliance defence calls (Discord) |
| `docs/good-to-know.md` | Rozšířené Trade Routes; crop lock; oprava „send all troops“ + odkaz |
| `docs/farming.md` | Krátká poznámka k third-party nástrojům |

---

*Soubor můžeš po prvním pushi smazat nebo nechat jako interní návod — není nutný pro běh aplikace.*
