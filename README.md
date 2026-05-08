# Parliament Game

A browser-based, single-player parliament simulator. Lead a coalition, pass bills over a
three-year session, and manage the economy, partner loyalty, and your mandate.

---

## Running the game

```bash
cd react-app
npm install
npm run dev
```

Open **http://localhost:5174**

Other commands:

```bash
npm run build    # production build → react-app/dist/
npm run preview  # serve the production build on port 4174
```

---

## Project structure

```
react-app/
  public/
    images/
      party_flags/   ← flag-base.svg, flag-cd.svg, flag-NF.svg, …
      party_logos/   ← logo-cd.svg, logo-nf.svg, …
  src/
    lib/
      data.js        ← all static game content (parties, bills, coalitions, endings)
      layout.js      ← parliament arc seat geometry
      vote.js        ← vote calculation and game logic (singleton)
      store.js       ← Zustand global state
    pages/
      SelectPage.jsx
      CoalitionPage.jsx
      ProgrammePage.jsx
      ParliamentPage.jsx
      EndingPage.jsx
    Layout.jsx       ← masthead wrapper, renders on every route
    App.jsx          ← React Router route definitions
    main.jsx         ← entry point
    app.css          ← all styling
test/
  analyze.py         ← headless balance analyser (writes CSVs to test/output/)
info/                ← design notes and lore documents
```

---

## Dependencies

```
react, react-dom          — UI framework
react-router-dom          — client-side routing
zustand                   — global state management
vite, @vitejs/plugin-react — build tooling
```
