// Headless balance analysis for parliament_game.
// Run from project root: node test/analyze.mjs
// Writes 6 CSVs to test/output/

import { PARTIES, COALITIONS, BILLS }                               from '../js/data.js';
import { calculateSeats }                                           from '../js/layout.js';
import { init, dealBills, proposeBill, getLoyalty, getAgendaScore } from '../js/vote.js';
import { writeFileSync, mkdirSync }                                 from 'fs';
import { fileURLToPath }                                            from 'url';
import { dirname, join }                                            from 'path';

// ── configuration ─────────────────────────────────────────────────────────────

const __dirname   = dirname(fileURLToPath(import.meta.url));
const OUT         = join(__dirname, 'output');
const BILL_LIMIT  = 10;
const N_SIMS      = 10_000;
const TOTAL_SEATS = PARTIES.reduce((s, p) => s + p.seats, 0);
const MAJORITY    = Math.floor(TOTAL_SEATS / 2) + 1;
const SEATS       = calculateSeats(PARTIES);

mkdirSync(OUT, { recursive: true });

console.log(`Parliament Game Balance Analyser`);
console.log(`  Total seats: ${TOTAL_SEATS}  |  Majority: ${MAJORITY}  |  Simulations: ${N_SIMS.toLocaleString()}\n`);

// ── pure helpers ──────────────────────────────────────────────────────────────

function agendaPts(bill, party) {
  return Math.max(0, 3 - Math.abs(bill.score - party[bill.type]) * 0.6);
}

function loyaltyDelta(bill, partner) {
  const d = Math.abs(bill.score - partner[bill.type]);
  return Math.max(-8, Math.min(3, 3 - d * 0.6));
}

function tier(score) {
  return score >= 18 ? 'high' : score >= 7 ? 'mid' : 'low';
}

// Predict whether a bill would pass given current loyalty levels.
function wouldPass(bill, loyalty, player, partners) {
  let ayes = player.seats;
  for (const p of partners) ayes += Math.floor(loyalty[p.name] / 100 * p.seats);
  return ayes >= MAJORITY;
}

// ── simulation strategies ─────────────────────────────────────────────────────

function chooseBill(strategy, hand, player, partners, loyalty) {
  if (strategy === 'random') {
    return hand[Math.floor(Math.random() * hand.length)];
  }
  if (strategy === 'greedy') {
    // maximise own agenda points this turn, ignore coalition health
    return hand.reduce((best, b) =>
      agendaPts(b, player) > agendaPts(best, player) ? b : best);
  }
  // loyal: among bills that pass, maximise sum of partner loyalty deltas;
  // fall back to least-damaging bill when none would pass
  const passing = hand.filter(b => wouldPass(b, loyalty, player, partners));
  const pool    = passing.length ? passing : hand;
  return pool.reduce((best, b) => {
    const sumB = partners.reduce((s, p) => s + loyaltyDelta(b, p), 0);
    const sumA = partners.reduce((s, p) => s + loyaltyDelta(best, p), 0);
    return sumB > sumA ? b : best;
  });
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function esc(v) {
  const s = String(v ?? '');
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function write(name, rows) {
  const path = join(OUT, name);
  writeFileSync(path, rows.map(r => r.map(esc).join(',')).join('\n') + '\n', 'utf8');
  console.log(`  ✓  ${name}  (${rows.length - 1} data rows)`);
}

// ── all (party, coalition, partners) combos ───────────────────────────────────

const COMBOS = PARTIES.flatMap(party =>
  party.coalitions.map(id => {
    const coal     = COALITIONS.find(c => c.id === id);
    const partners = coal.parties
      .filter(n => n !== party.name)
      .map(n => PARTIES.find(p => p.name === n));
    return { party, coal, partners };
  })
);

// ── 1. matrix.csv — bill × party compatibility ────────────────────────────────
//
// For every bill: how many agenda points does each party earn if it passes,
// and how much does each party's loyalty shift as a partner?

console.log('1. Compatibility matrix');
write('matrix.csv', [
  [
    'Bill', 'Score', 'Type',
    ...PARTIES.map(p => `${p.name}_agenda_pts`),
    ...PARTIES.map(p => `${p.name}_loyalty_delta`),
  ],
  ...BILLS.map(bill => [
    bill.title, bill.score, bill.type,
    ...PARTIES.map(p => agendaPts(bill, p).toFixed(2)),
    ...PARTIES.map(p => loyaltyDelta(bill, p).toFixed(2)),
  ]),
]);

// ── 2. coalition_context.csv — bill × combo view ─────────────────────────────
//
// For each (party, coalition, bill): would it pass at full loyalty, how much
// agenda does it earn the player, and how does it affect each partner's loyalty?

console.log('2. Coalition context');
{
  const rows = [[
    'Party', 'Coalition', 'Bill', 'Score', 'Type',
    'Player_agenda_pts', 'Passes_at_full_loyalty',
    'Partner_loyalty_sum', 'Partner_loyalty_min', 'Partner_details',
  ]];
  for (const { party, coal, partners } of COMBOS) {
    const full = Object.fromEntries(partners.map(p => [p.name, 100]));
    for (const bill of BILLS) {
      const deltas  = partners.map(p => loyaltyDelta(bill, p));
      const sum     = deltas.reduce((a, b) => a + b, 0);
      const min     = deltas.length ? Math.min(...deltas) : 'N/A';
      const details = partners.map((p, i) => `${p.name}:${deltas[i].toFixed(1)}`).join(' | ');
      rows.push([
        party.name, coal.id, bill.title, bill.score, bill.type,
        agendaPts(bill, party).toFixed(2),
        wouldPass(bill, full, party, partners) ? 'yes' : 'no',
        sum.toFixed(2),
        typeof min === 'number' ? min.toFixed(2) : min,
        details,
      ]);
    }
  }
  write('coalition_context.csv', rows);
}

// ── 3. fragility.csv — loyalty floors per partner ────────────────────────────
//
// P_loyalty_floor_pct: the minimum loyalty % that partner must hold
// (assuming all other partners are at 100%) to keep a voting majority.

console.log('3. Fragility analysis');
{
  const rows = [[
    'Party', 'Coalition', 'Total_seats', 'Majority', 'Margin_at_100pct',
    'P1_name', 'P1_seats', 'P1_loyalty_floor_pct',
    'P2_name', 'P2_seats', 'P2_loyalty_floor_pct',
  ]];
  for (const { party, coal, partners } of COMBOS) {
    const total  = party.seats + partners.reduce((s, p) => s + p.seats, 0);
    const margin = total - MAJORITY;
    const floors = partners.map((p, i) => {
      const otherAyes = partners.filter((_, j) => j !== i).reduce((s, q) => s + q.seats, 0);
      const needed    = MAJORITY - party.seats - otherAyes;
      return needed <= 0 ? 0 : Math.max(0, Math.min(100, Math.ceil(needed / p.seats * 100)));
    });
    rows.push([
      party.name, coal.id, total, MAJORITY, margin,
      partners[0]?.name  ?? '', partners[0]?.seats ?? '', floors[0] ?? '',
      partners[1]?.name  ?? '', partners[1]?.seats ?? '', floors[1] ?? '',
    ]);
  }
  write('fragility.csv', rows);
}

// ── 4. reachability.csv — theoretical score bounds ───────────────────────────
//
// Theoretical max assumes the player's single best bill is available and passes
// every turn (deck reshuffles each turn so repetition is possible in practice).

console.log('4. Reachability bounds');
{
  const rows = [[
    'Party', 'Coalition',
    'Best_bill', 'Best_bill_agenda_pts', 'Theoretical_max_score', 'Theoretical_max_tier',
    'Bills_passing_at_full_loyalty', 'Bills_with_any_agenda', 'Bills_harming_every_partner',
  ]];
  for (const { party, coal, partners } of COMBOS) {
    const full    = Object.fromEntries(partners.map(p => [p.name, 100]));
    const best    = BILLS.reduce((b, x) => agendaPts(x, party) > agendaPts(b, party) ? x : b);
    const bestPts = agendaPts(best, party);
    const maxScore = +(bestPts * BILL_LIMIT).toFixed(2);
    rows.push([
      party.name, coal.id,
      best.title, bestPts.toFixed(2), maxScore, tier(maxScore),
      BILLS.filter(b => wouldPass(b, full, party, partners)).length,
      BILLS.filter(b => agendaPts(b, party) > 0).length,
      BILLS.filter(b => partners.length > 0 && partners.every(p => loyaltyDelta(b, p) < 0)).length,
    ]);
  }
  write('reachability.csv', rows);
}

// ── 5 & 6. simulation_summary.csv + simulation_trajectory.csv ────────────────
//
// Runs N_SIMS full sessions per (party, coalition, strategy).
// Three strategies: random / greedy (maximise own agenda) / loyal (protect partners).
// Summary: aggregate stats per combo+strategy.
// Trajectory: mean loyalty and score at each of the 10 turns.

console.log('5. Simulation\n');

{
  const strategies     = ['random', 'greedy', 'loyal'];
  const summaryRows    = [[
    'Party', 'Coalition', 'Strategy', 'N',
    'Mean_agenda', 'Std_agenda', 'Min_agenda', 'Max_agenda',
    'Pct_high', 'Pct_mid', 'Pct_low',
    'Mean_bills_passed',
    'P1_name', 'P1_mean_final_loyalty',
    'P2_name', 'P2_mean_final_loyalty',
  ]];
  const trajectoryRows = [[
    'Party', 'Coalition', 'Strategy', 'Turn',
    'Mean_cumulative_agenda', 'Mean_cumulative_passes',
    'P1_name', 'P1_mean_loyalty',
    'P2_name', 'P2_mean_loyalty',
  ]];

  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std  = arr => {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
  };

  for (const { party, coal, partners } of COMBOS) {
    for (const strategy of strategies) {
      process.stdout.write(`  ${party.name.padEnd(22)} ${coal.id.padEnd(6)} ${strategy.padEnd(7)} `);

      const finalScores    = [];
      const billsPassed    = [];
      const finalLoyalties = partners.map(() => []);
      const turnAgenda     = Array.from({ length: BILL_LIMIT }, () => []);
      const turnPassed     = Array.from({ length: BILL_LIMIT }, () => []);
      const turnLoyalties  = partners.map(() =>
        Array.from({ length: BILL_LIMIT }, () => []));

      for (let sim = 0; sim < N_SIMS; sim++) {
        init(SEATS, party, partners);
        let cumulPassed = 0;

        for (let t = 0; t < BILL_LIMIT; t++) {
          const hand   = dealBills();
          const loy    = getLoyalty();
          const bill   = chooseBill(strategy, hand, party, partners, loy);
          const result = proposeBill(bill);
          if (result.passed) cumulPassed++;

          turnAgenda[t].push(result.agendaScore);
          turnPassed[t].push(cumulPassed);
          partners.forEach((p, i) => turnLoyalties[i][t].push(result.newLoyalty[p.name]));
        }

        finalScores.push(getAgendaScore());
        billsPassed.push(cumulPassed);
        const finalLoy = getLoyalty();
        partners.forEach((p, i) => finalLoyalties[i].push(finalLoy[p.name]));
      }

      const pct    = t => +(finalScores.filter(s => tier(s) === t).length / N_SIMS * 100).toFixed(1);
      const mScore = mean(finalScores);

      summaryRows.push([
        party.name, coal.id, strategy, N_SIMS,
        mScore.toFixed(2), std(finalScores).toFixed(2),
        Math.min(...finalScores).toFixed(2), Math.max(...finalScores).toFixed(2),
        pct('high'), pct('mid'), pct('low'),
        mean(billsPassed).toFixed(2),
        partners[0]?.name ?? '', partners[0] ? mean(finalLoyalties[0]).toFixed(1) : '',
        partners[1]?.name ?? '', partners[1] ? mean(finalLoyalties[1]).toFixed(1) : '',
      ]);

      for (let t = 0; t < BILL_LIMIT; t++) {
        trajectoryRows.push([
          party.name, coal.id, strategy, t + 1,
          mean(turnAgenda[t]).toFixed(2),
          mean(turnPassed[t]).toFixed(2),
          partners[0]?.name ?? '', partners[0] ? mean(turnLoyalties[0][t]).toFixed(1) : '',
          partners[1]?.name ?? '', partners[1] ? mean(turnLoyalties[1][t]).toFixed(1) : '',
        ]);
      }

      console.log(`mean ${mScore.toFixed(1).padStart(5)}  high:${pct('high').toString().padStart(5)}%  mid:${pct('mid').toString().padStart(5)}%  low:${pct('low').toString().padStart(5)}%`);
    }
    console.log();
  }

  write('simulation_summary.csv', summaryRows);
  write('simulation_trajectory.csv', trajectoryRows);
}

console.log('\nDone. Open test/output/ to inspect results.');
