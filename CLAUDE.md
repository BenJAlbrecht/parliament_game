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

A browser-based, single-player parliament simulator. The player calls votes on bills; MPs vote mostly along party lines with occasional defections based on a per-party loyalty probability. Future goal: multiplayer support.

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

- **`js/data.js`** — All static content: `PARTIES` (name, color, seats, loyalty), `BILLS` list, and `LAYOUT` geometry constants. Edit here to add parties, change seat counts, or add bills.
- **`js/layout.js`** — Pure math. `calculateSeats(parties)` distributes seats across 8 semicircular rows proportional to arc circumference, sorts by angle, and assigns party blocks left-to-right. No DOM access.
- **`js/render.js`** — All SVG and DOM manipulation. Functions receive data as arguments; no internal game state. The SVG `<circle>` elements are created once by `renderSeats()` and mutated in place on each vote by `applyVoteAppearance()`.
- **`js/vote.js`** — Session state (`votesPassed`, `votesFailed`, `totalVotes`, `history`) and game logic. `init(seats)` must be called before any votes. `callVote()` picks a random bill, assigns party stances, rolls loyalty per MP, then delegates all rendering to `render.js`.
- **`js/parliament.js`** — Entry point only. Computes seats, calls `init`, renders the initial view, and wires button event listeners.

### Seat coloring convention

- **Aye vote:** filled circle in party color, full opacity
- **Nay vote:** unfilled circle (stroke only) in party color, 55% opacity

### Adding a new party

Edit `PARTIES` in `js/data.js`. The seat layout recalculates automatically on load — no other files need to change.
