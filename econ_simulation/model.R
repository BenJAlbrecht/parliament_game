library(tidyverse)

# simulate_economy()
# Returns a data.frame with one row per year.
#
# params               — list of model parameters (see defaults below)
# G_path               — numeric vector of government spending, length == years
# tax_path             — numeric vector of tax rates,           length == years
# seed                 — integer or NULL (NULL = fresh randomness each run)
# demand_shock_path    — multiplier on both a and I each year      (default: all zeros)
# supply_shock_path    — multiplier on Y* each year                 (default: all zeros)
# inflation_shock_path — pp addition to π each year                 (default: all zeros)
# g_boost_path         — pp permanently added to trend g each year  (default: all zeros)
# heal_path            — scar_factor recovery added each year, capped at 1.0 (default: all zeros)
#
# Output columns include scar_factor (end-of-year cumulative scarring, starts at 1.0)
# and g_current (running trend growth rate after all accumulated boosts).

simulate_economy <- function(G_path,
                             tax_path,
                             params               = list(),
                             seed                 = 42,
                             demand_shock_path    = NULL,
                             supply_shock_path    = NULL,
                             inflation_shock_path = NULL,
                             g_boost_path         = NULL,
                             heal_path            = NULL) {

  p <- modifyList(
    list(
      mpc             = 0.75,
      tau             = 1.5,
      tax_baseline    = 0.25,
      g               = 0.02,    # baseline trend growth rate
      u_natural       = 0.05,
      okun            = 0.5,
      pi_target       = 0.02,
      beta            = 0.5,
      shock_sd        = 0.03,
      a_0             = 80,      # autonomous consumption in year 1
      I_base_0        = 150,
      Y_star_0        = NULL,    # auto-computed from year-1 equilibrium if NULL
      # Central bank (Taylor Rule with smoothing)
      i_neutral       = 0.02,
      phi_pi          = 1.5,
      phi_u           = 0.5,
      d               = 5,
      rho             = 0.8,
      hysteresis_rate = 0.10     # fraction of negative gap that permanently scars Y*
    ),
    params
  )

  years <- length(G_path)

  if (is.null(demand_shock_path))    demand_shock_path    <- rep(0, years)
  if (is.null(supply_shock_path))    supply_shock_path    <- rep(0, years)
  if (is.null(inflation_shock_path)) inflation_shock_path <- rep(0, years)
  if (is.null(g_boost_path))         g_boost_path         <- rep(0, years)
  if (is.null(heal_path))            heal_path            <- rep(0, years)

  # Set Y_star_0 equal to year-1 equilibrium Y so the initial output gap = 0.
  # At t=1 with no shocks and CB at neutral: Y = (a_0 + I_base_0 + G_path[1]) / multiplier.
  if (is.null(p$Y_star_0)) {
    p$Y_star_0 <- (p$a_0 + p$I_base_0 + G_path[1]) /
                  (1 - p$mpc * (1 - tax_path[1]))
  }

  results <- data.frame(year        = 1:years,
                        Y           = NA, C  = NA, I  = NA,
                        G           = NA, T  = NA, Y_star = NA,
                        gap         = NA, u  = NA, pi = NA, i = NA,
                        scar_factor = NA, g_current = NA)

  if (!is.null(seed)) set.seed(seed)

  # CB acts with one-year lag; initialise so that i_1 = i_neutral
  pi_prev     <- p$pi_target
  u_prev      <- p$u_natural
  i_prev      <- p$i_neutral
  scar_factor <- 1.0
  g_current   <- p$g    # running trend growth rate; accumulates from g_boost_path
  trend_state <- 1.0    # cumulative trend factor; replaces (1+g)^(t-1) for time-varying g

  for (t in seq_len(years)) {

    # ── 1. Structural policies ────────────────────────────────────────────────
    # g_boost is permanent: g_current carries forward each year.
    # heal raises scar_factor immediately (capped at 1.0, no overshoot).
    g_current   <- g_current + g_boost_path[t]
    scar_factor <- min(1.0, scar_factor + heal_path[t])

    # ── 2. Demand-side and potential output ───────────────────────────────────
    G        <- G_path[t] * trend_state
    tax_rate <- tax_path[t]

    # Taylor Rule with smoothing: CB moves 20% toward target each year
    i_target <- p$i_neutral +
                p$phi_pi * (pi_prev - p$pi_target) +
                p$phi_u  * (p$u_natural - u_prev)
    i <- p$rho * i_prev + (1 - p$rho) * i_target

    shock    <- rnorm(1, 0, p$shock_sd)
    d_shock  <- demand_shock_path[t]
    s_shock  <- supply_shock_path[t]
    pi_shock <- inflation_shock_path[t]

    Y_star <- p$Y_star_0 * trend_state * (1 + s_shock) * scar_factor
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
    u      <- p$u_natural - p$okun * gap
    pi     <- p$pi_target + p$beta * gap + pi_shock

    # ── 3. End-of-turn state updates ─────────────────────────────────────────
    # Hysteresis: negative gaps permanently erode Y*; one-way ratchet (no recovery)
    scar_factor <- scar_factor * (1 + min(0, gap) * p$hysteresis_rate)
    # Compound trend for next year using this year's (possibly boosted) g_current.
    # g_boost in year t takes effect from year t+1 onward.
    trend_state <- trend_state * (1 + g_current)

    results[t, ] <- c(t, Y, C, I, G, T_rev, Y_star, gap, u, pi, i, scar_factor, g_current)

    # Advance CB state for next year
    pi_prev <- pi
    u_prev  <- u
    i_prev  <- i
  }

  results
}
