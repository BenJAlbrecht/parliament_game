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
all of the above  ←  parliament.js  (entry point)
```

### What each JS module owns

- **`js/data.js`** — All static content: `PARTIES`, `COALITIONS` (with `flagships` per party and `scenarios`/`partnerBlurbs`/`titles`), `BILLS`, `ENDINGS` (high/mid/low/collapse tiers), `LAYOUT` geometry, and `econLabel`/`socialLabel` helpers.
- **`js/layout.js`** — Pure math. `calculateSeats(parties)` distributes seats across 8 semicircular rows. No DOM access.
- **`js/render.js`** — All SVG and DOM manipulation. Key exports: `renderAgenda` (compact bill list), `renderBillDetail` (full breakdown + propose), `renderVoteResult`, `renderLegend`, `renderEnding`. No internal game state.
- **`js/vote.js`** — Session state and game logic. `init(seats, party, partners)` must be called first. `initAgenda(flagships)` builds the 10-bill session pool (flagships first, then random regulars). `proposeBill(bill)` runs the vote and updates loyalty.
- **`js/parliament.js`** — Entry point. Manages the session agenda pool, turn counter, flagship tracking, and coalition collapse detection. Orchestrates the agenda → bill detail → vote result flow.

### Game flow (per turn)

1. `renderAgenda` — compact list of remaining session bills; click any to see detail
2. `renderBillDetail` — full per-party vote breakdown + loyalty impact; Propose or Back
3. `proposeBill` → `renderVoteResult` — PASSED/FAILED verdict, loyalty changes in sidebar
4. Next → increments turn, returns to agenda list

### Win condition

- **3/3 mandate bills passed** → high ending
- **1–2/3 mandate bills passed** → mid ending
- **0/3 mandate bills passed** → low ending
- **Any partner loyalty hits 0%** → coalition collapse ending (immediate)

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

## Balance Analysis

`test/analyze.py` is a headless balance analyser. Run from the project root:

```bash
python test/analyze.py
```

Writes CSVs to `test/output/`. The data mirrors `js/data.js` — if parties, bills, or formulas change there, update `analyze.py` to match.
