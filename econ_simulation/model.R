library(tidyverse)

# simulate_economy()
# Returns a data.frame with one row per quarter.
#
# params               — list of model parameters (see defaults below)
# G_path               — numeric vector of government spending, length == quarters
# tax_path             — numeric vector of tax rates,           length == quarters
# seed                 — integer or NULL (NULL = fresh randomness each run)
# demand_shock_path    — multiplier on both a and I each year      (default: all zeros)
# supply_shock_path    — multiplier on Y* each year                 (default: all zeros)
# inflation_shock_path — pp addition to π each year                 (default: all zeros)
# g_boost_path         — pp permanently added to trend g each year  (default: all zeros)
# heal_path            — scar_factor recovery added each year, capped at 1.0 (default: all zeros)
# u_heal_path          — u_natural_state pulled toward u_natural_baseline each quarter (default: all zeros)
#
# Output columns include scar_factor (end-of-year cumulative scarring, starts at 1.0),
# g_current (running trend growth rate after all accumulated boosts),
# and u_natural_state (evolving natural unemployment rate, starts at u_natural_baseline).

simulate_economy <- function(G_path,
                             tax_path,
                             params               = list(),
                             seed                 = 42,
                             demand_shock_path    = NULL,
                             supply_shock_path    = NULL,
                             inflation_shock_path = NULL,
                             g_boost_path         = NULL,
                             heal_path            = NULL,
                             u_heal_path          = NULL) {

  p <- modifyList(
    list(
      mpc                = 0.75,
      tau                = 1.5,
      tax_baseline       = 0.25,
      g                  = 0.00496, # baseline trend growth rate per quarter ((1.02)^(1/4)-1; ≈ 2% annualized)
      u_natural_baseline = 0.05,    # floor; u_natural_state starts here and can only rise with scarring
      u_scar_rate        = 0.05,    # fraction of negative gap added to u_natural_state each quarter
      okun               = 0.5,
      pi_target       = 0.00496, # per quarter (≈ 2% annualized; CB mandate expressed annually to player)
      beta            = 0.25,  # flat Phillips curve — OECD post-1990 empirical range
      shock_sd        = 0.03,
      a_0             = 80,      # autonomous consumption in quarter 1
      I_base_0        = 150,
      Y_star_0        = NULL,    # auto-computed from quarter-1 equilibrium if NULL
      # Central bank (Taylor Rule with asymmetric smoothing)
      i_neutral       = 0.005,   # per quarter (≈ 2% annualized)
      phi_pi          = 1.5,
      phi_u           = 0.25,    # reduced from 0.5 — price stability prioritized over employment
      d               = 5,
      rho_hike        = 0.8,     # tightening: CB closes 20% of gap per quarter (quicker)
      rho_cut         = 0.9,     # easing:     CB closes 10% of gap per quarter (slower)
      hysteresis_rate = 0.10     # fraction of negative gap that permanently scars Y*
    ),
    params
  )

  quarters <- length(G_path)

  if (is.null(demand_shock_path))    demand_shock_path    <- rep(0, quarters)
  if (is.null(supply_shock_path))    supply_shock_path    <- rep(0, quarters)
  if (is.null(inflation_shock_path)) inflation_shock_path <- rep(0, quarters)
  if (is.null(g_boost_path))         g_boost_path         <- rep(0, quarters)
  if (is.null(heal_path))            heal_path            <- rep(0, quarters)
  if (is.null(u_heal_path))          u_heal_path          <- rep(0, quarters)

  # Set Y_star_0 equal to quarter-1 equilibrium Y so the initial output gap = 0.
  # At t=1 with no shocks and CB at neutral: Y = (a_0 + I_base_0 + G_path[1]) / multiplier.
  if (is.null(p$Y_star_0)) {
    p$Y_star_0 <- (p$a_0 + p$I_base_0 + G_path[1]) /
                  (1 - p$mpc * (1 - tax_path[1]))
  }

  g_baseline <- p$g   # fixed at run start; used to compute pure-trend baseline

  results <- data.frame(quarter          = 1:quarters,
                        Y                = NA, C  = NA, I  = NA,
                        G                = NA, T  = NA, Y_star = NA,
                        baseline_Y_star  = NA,           # pure trend: no scarring, no supply shocks, no g_boost
                        gap              = NA, u  = NA, pi = NA, i = NA,
                        scar_factor      = NA, g_current = NA,
                        u_natural_state  = NA)           # evolving natural unemployment (starts at u_natural_baseline)

  if (!is.null(seed)) set.seed(seed)

  # CB acts with one-quarter lag; initialise so that i_1 = i_neutral
  pi_prev         <- p$pi_target
  u_prev          <- p$u_natural_baseline
  i_prev          <- p$i_neutral
  scar_factor     <- 1.0
  g_current       <- p$g    # running trend growth rate; accumulates from g_boost_path
  trend_state     <- 1.0    # cumulative trend factor; replaces (1+g)^(t-1) for time-varying g
  u_natural_state <- p$u_natural_baseline  # drifts up with labor market scarring

  for (t in seq_len(quarters)) {

    # ── 1. Structural policies ────────────────────────────────────────────────
    # g_boost is permanent: g_current carries forward each year.
    # heal raises scar_factor immediately (capped at 1.0, no overshoot).
    # u_heal pulls u_natural_state back toward baseline (floor = u_natural_baseline).
    g_current       <- g_current + g_boost_path[t]
    scar_factor     <- min(1.0, scar_factor + heal_path[t])
    u_natural_state <- max(p$u_natural_baseline, u_natural_state - u_heal_path[t])

    # ── 2. Demand-side and potential output ───────────────────────────────────
    G        <- G_path[t] * trend_state
    tax_rate <- tax_path[t]

    # Taylor Rule with asymmetric smoothing: faster tightening than easing.
    i_target <- p$i_neutral +
                p$phi_pi * (pi_prev - p$pi_target) +
                p$phi_u  * (u_natural_state - u_prev)
    rho <- if (i_target < i_prev) p$rho_cut else p$rho_hike
    i   <- max(0, rho * i_prev + (1 - rho) * i_target)

    shock    <- rnorm(1, 0, p$shock_sd)
    d_shock  <- demand_shock_path[t]
    s_shock  <- supply_shock_path[t]
    pi_shock <- inflation_shock_path[t]

    Y_star          <- p$Y_star_0 * trend_state * (1 + s_shock) * scar_factor
    baseline_Y_star <- p$Y_star_0 * (1 + g_baseline)^(t - 1)
    a      <- p$a_0      * trend_state * (1 + d_shock)
    I      <- p$I_base_0 * trend_state *
                (1 - p$tau * (tax_rate - p$tax_baseline)) *
                (1 - p$d   * (i - p$i_neutral)) *
                (1 + shock) *
                (1 + d_shock)
    Y      <- (a + I + G) / (1 - p$mpc * (1 - tax_rate))
    T_rev  <- tax_rate * Y
    C      <- a + p$mpc * (Y - T_rev)
    gap    <- (Y - Y_star) / Y_star
    u      <- u_natural_state - p$okun * gap
    pi     <- p$pi_target + p$beta * gap + pi_shock

    # ── 3. End-of-turn state updates ─────────────────────────────────────────
    # Hysteresis: negative gaps permanently erode Y*; one-way ratchet (no recovery)
    scar_factor <- scar_factor * (1 + min(0, gap) * p$hysteresis_rate)
    # Labor market scarring: sustained negative gaps raise u_natural_state permanently.
    u_natural_state <- u_natural_state + max(0, -gap) * p$u_scar_rate
    # Compound trend for next year using this year's (possibly boosted) g_current.
    # g_boost in year t takes effect from year t+1 onward.
    trend_state <- trend_state * (1 + g_current)

    results[t, ] <- c(t, Y, C, I, G, T_rev, Y_star, baseline_Y_star, gap, u, pi, i, scar_factor, g_current, u_natural_state)

    # Advance CB state for next year
    pi_prev <- pi
    u_prev  <- u
    i_prev  <- i
  }

  results
}
