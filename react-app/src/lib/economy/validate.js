#!/usr/bin/env node
// Run from the project root:  node react-app/src/lib/economy/validate.js
// Writes 3 CSV files to econ_simulation/validation/ for comparison with validate.R

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { PARAMS } from './params.js';
import { createInitialState } from './state.js';
import { step, setSeed } from './step.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = resolve(__dirname, '../../../../econ_simulation/validation');
mkdirSync(OUT_DIR, { recursive: true });

const QUARTERS = 20;
const G_BASE   = 270;
const TAX_BASE = 0.25;
const OVERRIDES = { shock_sd: 0 };   // deterministic: investment shock always 0

const CSV_COLS = [
  'quarter', 'Y', 'C', 'I', 'G', 'Y_star', 'baseline_Y_star',
  'gap', 'u', 'pi', 'i', 'scar_factor', 'u_natural_state',
];

function toCSV(rows) {
  const lines = rows.map(r => CSV_COLS.map(c => r[c]).join(','));
  return [CSV_COLS.join(','), ...lines].join('\n') + '\n';
}

function runScenario({ demandShock = [], supplyShock = [], inflationShock = [] } = {}) {
  setSeed(42);
  const state = createInitialState(OVERRIDES, G_BASE, TAX_BASE);
  const rows  = [];
  for (let t = 1; t <= QUARTERS; t++) {
    const result = step(state, OVERRIDES, {
      t,
      G_path_t:        G_BASE,
      tax_rate:        TAX_BASE,
      demand_shock:    demandShock[t - 1]    ?? 0,
      supply_shock:    supplyShock[t - 1]    ?? 0,
      inflation_shock: inflationShock[t - 1] ?? 0,
    });
    rows.push({ quarter: t, ...result });
  }
  return rows;
}

// Scenario 1 — baseline: no shocks, constant G and tax
writeFileSync(
  resolve(OUT_DIR, 'baseline_js.csv'),
  toCSV(runScenario()),
);

// Scenario 2 — tapered demand shock
// quarters 12-17 (1-indexed) = indices 11-16 (0-indexed): -0.10
// quarter 18 = index 17: -0.06
// quarter 19 = index 18: -0.03
const demandPath = Array(QUARTERS).fill(0);
for (let i = 11; i <= 16; i++) demandPath[i] = -0.10;
demandPath[17] = -0.06;
demandPath[18] = -0.03;
writeFileSync(
  resolve(OUT_DIR, 'demand_shock_js.csv'),
  toCSV(runScenario({ demandShock: demandPath })),
);

// Scenario 3 — tapered cost-push inflation shock
// quarters 12-14 (1-indexed) = indices 11-13: 0.015
// quarter 15 = index 14: 0.010
// quarter 16 = index 15: 0.005
const inflationPath = Array(QUARTERS).fill(0);
inflationPath[11] = 0.015;
inflationPath[12] = 0.015;
inflationPath[13] = 0.015;
inflationPath[14] = 0.010;
inflationPath[15] = 0.005;
writeFileSync(
  resolve(OUT_DIR, 'cost_push_js.csv'),
  toCSV(runScenario({ inflationShock: inflationPath })),
);

console.log(`JS validation CSVs written to ${OUT_DIR}`);
