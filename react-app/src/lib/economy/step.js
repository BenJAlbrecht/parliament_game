import { PARAMS } from './params.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function normalSample(rand) {
  const u1 = Math.max(rand(), 1e-15);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

let _rand = mulberry32(42);

export function setSeed(seed) {
  _rand = mulberry32(seed);
}

// step(state, params, quarterInputs) → quarter result object
//
// state         — mutable object returned by createInitialState(); mutated in place
// params        — partial param overrides (merged with PARAMS defaults)
// quarterInputs — {
//   t:                quarter number (1-indexed)
//   G_path_t:         real government spending for this quarter (pre-trend; model units)
//   tax_rate:         tax rate for this quarter
//   demand_shock?:    δ_t multiplied into both a and I
//   supply_shock?:    σ_t multiplied into Y*
//   inflation_shock?: ζ_t added to π
//   g_boost?:         permanently added to g_current this quarter
//   heal?:            added to scar_factor (capped at 1.0)
//   u_heal?:          subtracted from u_natural_state (floored at u_natural_baseline)
// }
//
// Returns { Y, C, I, G, T, Y_star, baseline_Y_star, gap, u, pi, i,
//           scar_factor, g_current, u_natural_state }
export function step(state, params, quarterInputs) {
  const p = { ...PARAMS, ...params };
  const {
    t,
    G_path_t,
    tax_rate,
    demand_shock    = 0,
    supply_shock    = 0,
    inflation_shock = 0,
    g_boost         = 0,
    heal            = 0,
    u_heal          = 0,
  } = quarterInputs;

  // 1. Structural policies (permanent g boost, scar healing, labour market healing)
  state.g_current       = state.g_current + g_boost;
  state.scar_factor     = Math.min(1.0, state.scar_factor + heal);
  state.u_natural_state = Math.max(p.u_natural_baseline, state.u_natural_state - u_heal);

  // 2. Scale G to actual spending
  const G = G_path_t * state.trend_state;

  // 3. Taylor Rule with asymmetric smoothing + ZLB
  const i_target = p.i_neutral
                 + p.phi_pi * (state.pi_prev - p.pi_target)
                 + p.phi_u  * (state.u_natural_state - state.u_prev);
  const rho = i_target < state.i_prev ? p.rho_cut : p.rho_hike;
  const i   = Math.max(0, rho * state.i_prev + (1 - rho) * i_target);

  // 4. Investment shock (skip RNG call when σ=0 for exact determinism)
  const shock = p.shock_sd === 0 ? 0 : normalSample(_rand) * p.shock_sd;

  // 6. Potential output
  const Y_star          = state.Y_star_0 * state.trend_state * (1 + supply_shock) * state.scar_factor;
  const baseline_Y_star = state.Y_star_0 * Math.pow(1 + state.g_baseline, t - 1);

  // 7. Autonomous consumption
  const a = p.a_0 * state.trend_state * (1 + demand_shock);

  // 8. Investment
  const I = p.I_base_0 * state.trend_state
          * (1 - p.tau * (tax_rate - p.tax_baseline))
          * (1 - p.d   * (i         - p.i_neutral))
          * (1 + shock)
          * (1 + demand_shock);

  // 9. GDP (solved analytically from Keynesian cross)
  const Y = (a + I + G) / (1 - p.mpc * (1 - tax_rate));

  // 10. Tax revenue and consumption
  const T = tax_rate * Y;
  const C = a + p.mpc * (Y - T);

  // 11. Output gap
  const gap = (Y - Y_star) / Y_star;

  // 12. Unemployment (Okun's law uses current u_natural_state)
  const u = state.u_natural_state - p.okun * gap;

  // 13. Inflation (Phillips curve + cost-push term)
  const pi = p.pi_target + p.beta * gap + inflation_shock;

  // 14. Hysteresis scarring — one-way ratchet on Y*
  state.scar_factor = state.scar_factor * (1 + Math.min(0, gap) * p.hysteresis_rate);

  // 15. Labour market scarring — sustained negative gaps raise u_natural_state
  state.u_natural_state = state.u_natural_state + Math.max(0, -gap) * p.u_scar_rate;

  // 16. Compound trend for next quarter
  state.trend_state = state.trend_state * (1 + state.g_current);

  // Advance CB lag state
  state.pi_prev = pi;
  state.u_prev  = u;
  state.i_prev  = i;

  return {
    Y, C, I, G, T,
    Y_star, baseline_Y_star,
    gap, u, pi, i,
    scar_factor:     state.scar_factor,
    g_current:       state.g_current,
    u_natural_state: state.u_natural_state,
  };
}
