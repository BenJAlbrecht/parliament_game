import { create } from 'zustand';
import { PARAMS } from './economy/params.js';
import { createInitialState } from './economy/state.js';
import { step } from './economy/step.js';
import { PARTIES, BILLS } from './data.js';
import { initialLoyalty, calculateBillOutcome, calculateLoyaltyDrift } from './bills.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function freshEconomy() {
  const initial = createInitialState(PARAMS);
  return { economyState: initial, economyHistory: [initial] };
}

const useGameStore = create((set) => ({
  playerParty:        null,
  selectedCoalition:  null,
  coalitionPartners:  [],
  headerFlag:         'flag-base',
  headerAccent:       null,
  headerTurn:         null,
  economyState:       null,
  economyHistory:     [],
  coalition_loyalty:  {},
  current_G_path:     270,
  current_tax_rate:   0.25,
  passed_bills:       [],

  setPlayerParty:        (v) => set({ playerParty: v }),
  setSelectedCoalition:  (v) => set({ selectedCoalition: v }),
  setCoalitionPartners:  (v) => set({ coalitionPartners: v }),
  setHeaderFlag:         (v) => set({ headerFlag: v }),
  setHeaderAccent:       (v) => set({ headerAccent: v }),
  setHeaderTurn:         (v) => set({ headerTurn: v }),

  // No-op if already initialized (safe to call from multiple mount effects).
  initEconomy: () => set((s) => {
    if (s.economyState !== null) return {};
    return freshEconomy();
  }),

  // Compute initial coalition loyalty from ideological distances. No-op if already set.
  initCoalitionLoyalty: () => set((s) => {
    if (!s.playerParty || Object.keys(s.coalition_loyalty).length > 0) return {};
    const playerPos = { economic: s.playerParty.economic, social: s.playerParty.social };
    const loyalty = { [s.playerParty.name]: 1.0 };
    for (const partner of s.coalitionPartners) {
      const partnerPos = { economic: partner.economic, social: partner.social };
      loyalty[partner.name] = initialLoyalty(playerPos, partnerPos);
    }
    return { coalition_loyalty: loyalty };
  }),

  // Resolve a bill vote: apply effects, drift loyalty, advance the quarter.
  proposeBill: (bill_id) => set((s) => {
    const bill = BILLS.find(b => b.id === bill_id);
    if (!bill) return {};

    const coalitionPartyIds = new Set([s.playerParty.name, ...s.coalitionPartners.map(p => p.name)]);
    const outcome = calculateBillOutcome({
      bill,
      parties: PARTIES,
      coalitionLoyalty: s.coalition_loyalty,
      coalitionPartyIds,
    });

    const eff = bill.effects ?? {};

    // Update persistent fiscal state if bill passes.
    let new_G_path    = s.current_G_path;
    let new_tax_rate  = s.current_tax_rate;
    if (outcome.passes) {
      new_G_path   = Math.max(0, new_G_path + (eff.G_path_delta ?? 0));
      new_tax_rate = clamp(new_tax_rate + (eff.tax_rate_delta ?? 0), 0, 1);
    }

    // Build quarter inputs (one-shot effects only apply if bill passes).
    const qG    = outcome.passes ? new_G_path + (eff.G_path_one_shot ?? 0) : new_G_path;
    const qTax  = outcome.passes ? clamp(new_tax_rate + (eff.tax_rate_one_shot ?? 0), 0, 1) : new_tax_rate;
    const qBoost = outcome.passes ? (eff.g_boost ?? 0) : 0;
    const qHeal  = outcome.passes ? (eff.heal    ?? 0) : 0;
    const qUheal = outcome.passes ? (eff.u_heal  ?? 0) : 0;

    // Loyalty drift for all coalition partners (regardless of pass/fail).
    const new_loyalty = { ...s.coalition_loyalty };
    for (const partner of s.coalitionPartners) {
      const drift = calculateLoyaltyDrift(bill, partner);
      new_loyalty[partner.name] = clamp((new_loyalty[partner.name] ?? 1) + drift, 0, 1);
    }

    // Step the economy.
    const state  = { ...s.economyState };
    const t      = s.economyHistory.length;
    const result = step(state, PARAMS, {
      t, G_path_t: qG, tax_rate: qTax,
      demand_shock: 0, supply_shock: 0, inflation_shock: 0,
      g_boost: qBoost, heal: qHeal, u_heal: qUheal,
    });

    const new_passed = outcome.passes
      ? [...s.passed_bills, { bill_id, quarter_passed: t }]
      : s.passed_bills;

    return {
      current_G_path:    new_G_path,
      current_tax_rate:  new_tax_rate,
      coalition_loyalty: new_loyalty,
      passed_bills:      new_passed,
      economyState:      state,
      economyHistory:    [...s.economyHistory, result],
    };
  }),

  // Advance one quarter with no bill: persistent fiscal state, no loyalty drift.
  skipTurn: () => set((s) => {
    const state  = { ...s.economyState };
    const t      = s.economyHistory.length;
    const result = step(state, PARAMS, {
      t, G_path_t: s.current_G_path, tax_rate: s.current_tax_rate,
      demand_shock: 0, supply_shock: 0, inflation_shock: 0,
      g_boost: 0, heal: 0, u_heal: 0,
    });
    return {
      economyState:   state,
      economyHistory: [...s.economyHistory, result],
    };
  }),

  resetEconomy: () => set(() => freshEconomy()),

  resetGame: () => set(() => ({
    playerParty:        null,
    selectedCoalition:  null,
    coalitionPartners:  [],
    headerFlag:         'flag-base',
    headerAccent:       null,
    headerTurn:         null,
    coalition_loyalty:  {},
    current_G_path:     270,
    current_tax_rate:   0.25,
    passed_bills:       [],
    ...freshEconomy(),
  })),
}));

export default useGameStore;
