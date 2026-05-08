# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

```bash
cd react-app
npm install
npm run dev
```

Open **http://localhost:5174**

```bash
npm run build    # production build → react-app/dist/
npm run preview  # serve the production build on port 4174
```

## Project Goal

A browser-based, single-player parliament simulator. The player leads a coalition and passes bills over a 10-turn session. Future goals: multi-session play, additional action types (negotiations, events), multiplayer support.

## Architecture

Vite + React + React Router + Zustand. All game code lives in `react-app/`.

### React module overview

- **`src/lib/data.js`** — All static content: `PARTIES` (with `goals` and `mandates` per party), `COALITIONS` (with `scenarios`/`partnerBlurbs`/`titles`), `BILLS` (21 policy bills + 6 fiscal bills), `ENDINGS` (high/mid/low/collapse tiers), `LAYOUT` geometry, `DOMAIN_SCALES`, `DOMAIN_ORDER`, `STARTING_DOMAINS`, `ECON_PARAMS`, `STARTING_ECONOMY`, and `econLabel`/`socialLabel`/`leanLabel`/`leanCls`/`logoSrc` helpers.
- **`src/lib/layout.js`** — Pure math. `calculateSeats(parties)` distributes seats across 8 semicircular rows. No DOM access.
- **`src/lib/vote.js`** — Session state and game logic (singleton). `init(seats, party, partners)` must be called first. `initAgenda()` builds the 10-bill session pool (filters domain bills that can't move further). `proposeBill(bill)` runs the vote, updates loyalty, applies domain state changes, and returns `{ passed, ayes, nays, breakdown, votes, loyaltyChanges, newLoyalty, econEffect }`. Exports `getDomainState()` and `getSessionStats()`.
- **`src/lib/store.js`** — Zustand global state. Fields: `playerParty`, `selectedCoalition`, `coalitionPartners`, `committedGoals`, `playerMandate`, `headerFlag`, `headerAccent`, `headerTurn`, `endingData`. Each has a `setFieldName(v)` setter plus `resetGame()`.
- **`src/Layout.jsx`** — Masthead wrapper, renders on every route via `<Outlet />`.
- **`src/App.jsx`** — React Router route definitions. Root redirects to `/select`.

### Game flow (full session)

1. Party selection → Coalition selection → **Programme for Government** (commit 1 goal per partner)
2. Per turn: Policy home (with live programme status) → Legislative Agenda → Bill detail → Vote result
3. End of session: Ending screen with mandate results, loyalty, and Programme for Government report

### Goal check functions

Each `PARTIES[i].goals[j]` has `{ id, title, desc, check(policyState, stats) }`. The `stats` object passed at check time contains: `billsPassed`, `leftBillsPassed`, `domainsPassedCount`, `flagshipsPassed`, `turnsAbstained`, `allPartnersLoyalAbove50`, `policyState`.

### Win condition

- **3/3 mandate bills passed** → high ending
- **1–2/3 mandate bills passed** → mid ending
- **0/3 mandate bills passed** → low ending
- **Any partner loyalty hits 0%** → coalition collapse ending (immediate)
- Programme goals are evaluated at session end and shown in the ending stats (Met / Missed)

### Vote Support Formula (VUF)

Partner vote share: `L + (1 - L) * c` where `L = loyalty/100`, `k = |bill.score - partner[bill.type]|`, `c = max(0, 1 - k/10)`.

Loyalty delta (fires only on passed bills): `max(-20, min(5, 5 - distance * 1.5))`.

### Seat coloring convention

- **Aye vote:** filled circle in party color, full opacity
- **Nay vote:** unfilled circle (stroke only) in party color, 55% opacity

### Adding a new party

Edit `PARTIES` in `js/data.js`. The seat layout recalculates automatically on load — no other files need to change. Also add the party to relevant `COALITIONS` entries and `ENDINGS`.

### Adding flagship bills

Add entries to `COALITIONS[id].flagships[partyName]` in `src/lib/data.js`. Each flagship is `{ title, type, score }`. Three per party/coalition combo is the current standard.

### Adding or editing party goals

Edit the `goals` array in each party object in `src/lib/data.js`. Each goal is `{ id, title, desc, check(policyState, stats) }`. Three goals per party is the current standard.

### Bill schema

```js
{
  title:       string,
  domain:      'fiscal' | 'border' | 'social' | 'foreign' | 'civic',
  type:        'economic' | 'social',   // which party axis the vote formula uses
  score:       number,                  // -10 to +10, party ideological compatibility
  domainDelta: +1 | -1,                 // absent for fiscal bills
  econEffect:  { deltaG } | { deltaTax }, // fiscal bills only
}
```

`DOMAIN_ORDER = ['fiscal', 'border', 'social', 'foreign', 'civic']` controls accordion sort order.

## Economy

### Current implementation (v1 — in game)

`computeEcon(prev, billEffect, t)` lives in `ParliamentPage.jsx`. Called at the end of every turn (propose or abstain). Returns updated `econState`.

```
I = I_base · (1 + g)^(t−1) · (1 − τ · (tax_rate − tax_baseline))
Y = (I + G) / (1 − mpc · (1 − tax_rate))
T = tax_rate · Y
C = mpc · (Y − T)
growth = Y_t / Y_{t−1} − 1
```

`econState` fields: `{ I_base, G, tax_rate, I, Y, T, C, growth }`. Displayed in the right sidebar (GDP, growth, G, tax rate). Fiscal bills modify G or tax_rate on pass.

**v1 is deterministic** — no shock term, no unemployment, no inflation, no potential output.

### Planned upgrade (v2 — specified, not yet implemented)

Full spec lives in `econ_simulation/ECONOMY.txt`. R simulation prototype in `econ_simulation/` (see below).

v2 adds on top of v1:

| Addition | Formula |
|---|---|
| Investment shock | `ε_t ~ N(0, σ²)` multiplied into I |
| Potential output | `Y*_t = Y*_0 · (1 + g)^(t−1)` |
| Output gap | `gap = (Y − Y*) / Y*` |
| Unemployment | `u = u_natural − okun · gap` (Okun's law) |
| Inflation | `π = π_target + β · gap` (Phillips curve) |

New parameters needed: `shock_sd = 0.03`, `u_natural = 0.05`, `okun = 0.5`, `pi_target = 0.02`, `beta = 0.5`, `Y_star_0 = 960`.

**Key design intent of v2:** if the player does nothing, G stays constant while Y* grows at trend `g`. Investment grows but G doesn't, so Y grows slower than Y*, the output gap drifts negative, unemployment rises, and inflation falls. This creates persistent legislative pressure.

### R simulation (`econ_simulation/`)

Three-file structure:
- **`model.R`** — `simulate_economy(G_path, tax_path, params, seed)` function implementing the full v2 model including shock, Y*, gap, u, π.
- **`plots.R`** — `plot_levels(results)` (Y/C/I/G/T/Y\*) and `plot_rates(results)` (gap/u/π).
- **`run.R`** — User entry point. Set working directory, player paths, and param overrides; sources the above and prints results + plots.

The R model is the **reference implementation** for v2. When implementing v2 in the game, match its formulas exactly.

## Balance Analysis

`test/analyze.py` is a headless balance analyser. Run from the project root:

```bash
python test/analyze.py
```

Writes CSVs to `test/output/`. The data mirrors `src/lib/data.js` — if parties, bills, or formulas change there, update `analyze.py` to match.
