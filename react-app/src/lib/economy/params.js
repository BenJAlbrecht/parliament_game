export const PARAMS = {
  mpc:                0.75,
  a_0:                80,
  tau:                1.5,
  tax_baseline:       0.25,
  g:                  0.00496,   // (1.02)^(1/4)-1; ≈ 2% annualized
  shock_sd:           0.03,
  u_natural_baseline: 0.05,
  u_scar_rate:        0.05,
  okun:               0.5,
  pi_target:          0.00496,   // ≈ 2% annualized; expressed annually to player
  beta:               0.25,      // flat Phillips curve — post-1990 OECD range
  I_base_0:           150,
  i_neutral:          0.005,     // ≈ 2% annualized
  phi_pi:             1.5,
  phi_u:              0.25,      // price-stability priority over employment
  d:                  5,
  rho_hike:           0.8,       // tightening: CB closes 20% of gap per quarter
  rho_cut:            0.9,       // easing:     CB closes 10% of gap per quarter
  hysteresis_rate:    0.10,
};
