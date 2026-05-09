# Design Notes

## Deferred: Programme for Government / Party Goals & Mandates (v1)

### What existed

After coalition formation, the player entered a "Programme for Government" screen
where they:

1. **Chose a party mandate** — one of 2–3 objectives for their own party, classified
   as Legislative or Non-legislative (e.g. "Seize the Means", "Steady Hand").
2. **Committed to one goal per coalition partner** — each partner party offered 3
   goals the player could pledge to pursue (e.g. "Secure the Border", "Civic Reform").

These commitments were stored in Zustand (`committedGoals`, `playerMandate`) and
evaluated at session end on the Ending screen, where each goal was shown as
✓ Met or ✗ Missed. The mandate result also determined the ending tier:
mandate achieved → high, partially achieved → mid, failed → low.

Each party in `data.js` carried two fields:
- `goals`: array of `{ id, title, desc, check(policyState, stats) }` — what the
  player could pledge to that partner.
- `mandates`: array of `{ id, title, desc, legislative, check(policyState, stats) }`
  — the player's own session objective when leading that party.

`check()` functions read `policyState` (domain slider values) and session `stats`
(billsPassed, leftBillsPassed, domainsPassedCount, turnsAbstained,
allPartnersLoyalAbove50).

### Why deferred

The v2 mechanic spine is: **bills → economy → public opinion → elections**.
The programme/mandate layer predates the economy model and creates a separate
success condition that competes with the economic outcome loop.

Specific tensions:
- Goals were defined against domain sliders (civic, border, social, foreign),
  which may or may not survive the v2 redesign.
- Mandates gave the player a fixed objective at session start, but the economic
  loop may want the player to respond dynamically to shocks rather than pursue
  a pre-committed agenda.
- The ProgrammePage added a navigation step between coalition formation and
  parliament that complicated the flow for little immediate payoff.

### How it might return

The programme/mandate layer is a strong design concept and should return as a
constraint layer on top of the economic loop, not a replacement for it:

- **Bills → programme**: The programme could restrict or prioritize available
  bills each turn (e.g., committed goals must appear in the agenda; unfulfilled
  goals impose a loyalty penalty if skipped for N turns).
- **AI behaviour**: Coalition partner AI could use committed goals to decide
  whether to support borderline bills, making the programme a strategic tool
  rather than a checklist.
- **Economic tie-in**: Mandate success could be measured in economic outcomes
  (GDP per capita, unemployment) rather than domain sliders, aligning the
  programme layer with the v2 economy model.

The data shape (`goals`/`mandates` on each party, `check()` functions) is
well-designed and worth preserving or adapting when this layer returns.

---

## Deferred: v1 Bill System & Legislative Agenda (v1)

### What existed

Bills were discrete named legislative acts in `BILLS` (data.js): 21 policy
bills across 4 domains (border, social, foreign, civic) plus 6 fiscal bills.
Each bill had a `title`, `domain`, `type` (economic/social), `score` (-10 to
+10), `domainDelta` (+1/-1 for policy bills), and `econEffect` (deltaG or
deltaTax for fiscal bills).

The player accessed bills via a **Legislative Agenda** screen (a phase in
ParliamentPage). Bills were grouped by domain in a collapsible accordion.
Clicking a bill opened a **Bill Detail** view showing: vote breakdown per party,
loyalty impact if passed, policy effect (domain slider movement or econ delta).

Voting used `vote.js` (a singleton): `proposeBill(bill)` computed each
partner's aye share using the VUF formula (`L + (1-L)*c` where `c` is
ideological compatibility), applied loyalty deltas on pass, moved the
domain slider, and returned `{ passed, ayes, nays, breakdown, votes,
loyaltyChanges, newLoyalty, econEffect }`.

**Policy state sliders** (4 axes: border, social, foreign, civic; 1–5 scale)
tracked cumulative domain movement from passed bills and were displayed on the
Policy Home screen. Starting values were in `STARTING_DOMAINS`. Labels and
descriptions came from `DOMAIN_SCALES`. `DOMAIN_ORDER` controlled accordion
sort.

**v1 economy** (`computeEcon` in ParliamentPage, params from `ECON_PARAMS`,
initial state from `STARTING_ECONOMY`): a simple Keynesian cross updated each
turn. Fiscal bills modified `G` or `tax_rate`. GDP/growth/G/tax-rate were
shown in the right sidebar.

### Why deferred

The v1 bill system predates the calibrated R economy model and the new design
intent. Specific tensions:
- Domain sliders were an independent policy-state layer that didn't connect to
  the economy model; bills moved sliders but economic consequences were not
  modelled beyond the simple Keynesian cross.
- The VUF formula and loyalty mechanic are sound in principle but need to be
  re-keyed to the new bill structure (bills that modify G_path, tax_rate,
  g_boost_path, or u_heal_path).
- The v1 econ model (static Keynesian cross) is superseded by the calibrated
  R model (investment shocks, potential output, Phillips curve, Taylor Rule,
  ZLB, hysteresis).

### How it might return

The voting mechanic — parties evaluating proposals against their ideological
preferences — is a strong design concept and should return. The new bill
structure will be:
- Bills modify economy-model parameters: `G_path[t]`, `tax_path[t]`,
  `g_boost_path[t]` (structural growth), or `u_heal_path[t]` (labour market).
- Ideological scoring and partner VUF support calculations carry over
  conceptually; the `score`/`type` fields will be reoriented around the
  economic-model parameters the bill modifies.
- Domain sliders may return as a separate political-capital or approval layer,
  not as the primary game-state representation.
- `vote.js` will be rebuilt from scratch against the new bill structure.

---

## Deferred: End-of-Session Vote of Confidence (v1)

### What existed

After the 16-turn session (4 years × 4 quarters), the player was shown a
**Vote of Confidence** screen. Each government party's aye contribution was
computed proportionally to their current loyalty (player party always 100%).
The total aye count was compared to the chamber majority. The result
(CONFIDENCE MAINTAINED / CONFIDENCE LOST) was cosmetic — it didn't change
the navigation; both paths led to the ending screen.

The ending screen (`EndingPage.jsx`) showed:
- A verdict stamp (Successful Term / Mixed Results / Failed Term /
  Coalition Collapsed) based on `billsPassed` tiers (≥8 / ≥5 / else).
- Coalition-specific narrative text from `ENDINGS[coalitionId][partyName][tier]`
  in `data.js`.
- Final partner loyalty figures.
- A "Play Again" button that reset the store and returned to `/select`.

`ENDINGS` held ~2,000 words of per-coalition, per-party, per-tier narrative
text for all three coalition types (left, grand, right) across high/mid/low/
collapse tiers.

### Why deferred

The v1 confidence vote was cosmetic — a visual termination ritual with no
mechanical consequence. The narrative endings were decoupled from economic
outcomes (they referenced bills and domain sliders, not GDP or unemployment).

The v2 termination mechanic will be **elections**: after each parliamentary
term, seat counts are redistributed based on voter sentiment (approval ratings
driven by the economy model). This is a fundamentally different mechanic:
- Non-binary: a bad term shrinks the coalition's majority rather than ending
  the game.
- Economically grounded: voter sentiment tracks GDP growth, unemployment, and
  inflation relative to expectations.
- Multi-session: elections open the possibility of multi-term play.

### How it might return

- The confidence vote may return as a within-term trigger (a partner can call
  a confidence vote if loyalty falls below a threshold) rather than a session
  end ritual.
- Narrative endings will return, rewritten to reference economic outcomes
  (GDP per capita, unemployment trajectory, inflation) rather than domain
  sliders and bill counts.
- The `ENDINGS` data shape (coalition → party → tier → text) is a good
  skeleton and worth adapting when narrative endings return.
