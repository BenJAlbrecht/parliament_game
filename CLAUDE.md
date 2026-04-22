# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

Because the JS uses ES modules (`import`/`export`), the game must be served over HTTP — opening `index.html` directly as a `file://` URL will not work. Use any local server:

```bash
# Python (if installed)
python -m http.server 8000

# Node (if installed)
npx serve .
```

Then open `http://localhost:8000` in a browser. There is no build step, no compilation, and no package manager.

## Project Goal

A browser-based, single-player parliament simulator. The player leads a coalition and passes bills over a 10-turn session. Future goals: multi-session play, additional action types (negotiations, events), multiplayer support.

## Architecture

The game is pure HTML/CSS/JS — no frameworks, no bundler. The original `java/Parliament.java` was a code generator that produced the HTML file; it has been retired and is kept only as a reference.

### Module dependency order

```
data.js  ←  layout.js
data.js  ←  render.js
data.js + render.js  ←  vote.js
data.js  ←  compact.js
all of the above  ←  parliament.js  (entry point)
```

### What each JS module owns

- **`js/data.js`** — All static content: `PARTIES` (with `goals` per party), `COALITIONS` (with `flagships` per party and `scenarios`/`partnerBlurbs`/`titles`), `BILLS`, `ENDINGS` (high/mid/low/collapse tiers), `LAYOUT` geometry, and `econLabel`/`socialLabel`/`leanLabel`/`leanCls`/`logoSrc` helpers.
- **`js/layout.js`** — Pure math. `calculateSeats(parties)` distributes seats across 8 semicircular rows. No DOM access.
- **`js/render.js`** — All SVG and DOM manipulation. Key exports: `renderAgenda`, `renderBillDetail`, `renderVoteResult`, `renderLegend`, `renderProgramme`, `renderEnding`. No internal game state.
- **`js/vote.js`** — Session state and game logic. `init(seats, party, partners)` must be called first. `initAgenda(flagships)` builds the 10-bill session pool. `proposeBill(bill)` runs the vote and updates loyalty + tracks session stats. Exports `getSessionStats()` returning `{ billsPassed, leftBillsPassed, domainsPassedCount }`.
- **`js/compact.js`** — Programme for Government screen. `showCompact(party, partners, onBack, onConfirm)` renders goal-selection cards (one per partner, 3 goals each). `onConfirm` receives `{ [partnerName]: goalObj }`.
- **`js/parliament.js`** — Entry point. Manages session flow, tracks `flagshipsPassed` and `turnsAbstained`, builds end-of-turn stats, and passes `committedGoals` through to `renderProgramme` and `renderEnding`.

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

Add entries to `COALITIONS[id].flagships[partyName]` in `js/data.js`. Each flagship is `{ title, type, score }`. Three per party/coalition combo is the current standard.

### Adding or editing party goals

Edit the `goals` array in each party object in `js/data.js`. Each goal is `{ id, title, desc, check(policyState, stats) }`. `STARTING_POLICY` is accessible by closure (defined above `PARTIES` in the same module). Three goals per party is the current standard.

## Balance Analysis

`test/analyze.py` is a headless balance analyser. Run from the project root:

```bash
python test/analyze.py
```

Writes CSVs to `test/output/`. The data mirrors `js/data.js` — if parties, bills, or formulas change there, update `analyze.py` to match.
