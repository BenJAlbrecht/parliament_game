import { create } from 'zustand';
import { PARAMS } from './economy/params.js';
import { createInitialState } from './economy/state.js';
import { step } from './economy/step.js';

function freshEconomy() {
  const initial = createInitialState(PARAMS);
  return { economyState: initial, economyHistory: [initial] };
}

const useGameStore = create((set) => ({
  playerParty:       null,
  selectedCoalition: null,
  coalitionPartners: [],
  headerFlag:        'flag-base',
  headerAccent:      null,
  headerTurn:        null,
  economyState:      null,
  economyHistory:    [],

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

  // Advance the simulation by one quarter.
  // quarterInputs uses the caller-facing field names from ECONOMY.txt:
  //   G_path (real spending, pre-trend; engine handles trend scaling)
  //   tax_rate, demand_shock, supply_shock, inflation_shock, g_boost, heal, u_heal
  advanceQuarter: (quarterInputs = {}) => set((s) => {
    const {
      G_path          = 270,
      tax_rate        = 0.25,
      demand_shock    = 0,
      supply_shock    = 0,
      inflation_shock = 0,
      g_boost         = 0,
      heal            = 0,
      u_heal          = 0,
    } = quarterInputs;
    // Shallow-clone so Zustand sees a new object reference.
    const state  = { ...s.economyState };
    const t      = s.economyHistory.length;   // 1-indexed quarter number
    const result = step(state, PARAMS, {
      t, G_path_t: G_path, tax_rate,
      demand_shock, supply_shock, inflation_shock, g_boost, heal, u_heal,
    });
    return {
      economyState:   state,
      economyHistory: [...s.economyHistory, result],
    };
  }),

  resetEconomy: () => set(() => freshEconomy()),

  resetGame: () => set(() => ({
    playerParty:       null,
    selectedCoalition: null,
    coalitionPartners: [],
    headerFlag:        'flag-base',
    headerAccent:      null,
    headerTurn:        null,
    ...freshEconomy(),
  })),
}));

export default useGameStore;
