import { PARAMS } from './params.js';

// createInitialState(params?, G0?, tax0?)
// Computes Y_star_0 from the quarter-1 equilibrium (no shocks, CB at neutral)
// so that the initial output gap is exactly zero.
export function createInitialState(params = {}, G0 = 270, tax0 = 0.25) {
  const p = { ...PARAMS, ...params };
  const Y_star_0 = (p.a_0 + p.I_base_0 + G0) / (1 - p.mpc * (1 - tax0));
  return {
    pi_prev:         p.pi_target,
    u_prev:          p.u_natural_baseline,
    i_prev:          p.i_neutral,
    scar_factor:     1.0,
    g_current:       p.g,
    trend_state:     1.0,
    u_natural_state: p.u_natural_baseline,
    Y_star_0,
    g_baseline:      p.g,   // fixed at run start; used only for baseline_Y_star
  };
}
