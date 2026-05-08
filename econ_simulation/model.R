library(tidyverse)

# simulate_economy()
# Returns a data.frame with one row per year.
#
# params    — list of model parameters (see defaults below)
# G_path    — numeric vector of government spending, length == years
# tax_path  — numeric vector of tax rates,           length == years
# seed      — integer or NULL (NULL = fresh randomness each run)

simulate_economy <- function(G_path,
                             tax_path,
                             params = list(),
                             seed   = 42) {

  p <- modifyList(
    list(
      mpc          = 0.75,
      tau          = 1.5,
      tax_baseline = 0.25,
      g            = 0.02,
      u_natural    = 0.05,
      okun         = 0.5,
      pi_target    = 0.02,
      beta         = 0.5,
      shock_sd     = 0.03,
      I_base_0     = 150,
      Y_star_0     = 960,
      # Central bank (Taylor Rule with smoothing)
      i_neutral    = 0.02,
      phi_pi       = 1.5,
      phi_u        = 0.5,
      d            = 5,
      rho          = 0.8
    ),
    params
  )

  years   <- length(G_path)
  results <- data.frame(year  = 1:years,
                        Y     = NA, C  = NA, I  = NA,
                        G     = NA, T  = NA, Y_star = NA,
                        gap   = NA, u  = NA, pi = NA, i = NA)

  if (!is.null(seed)) set.seed(seed)

  # CB acts with one-year lag; initialise so that i_1 = i_neutral
  pi_prev <- p$pi_target
  u_prev  <- p$u_natural
  i_prev  <- p$i_neutral

  for (t in seq_len(years)) {
    # G_path is in real (year-1) terms; scale up by trend growth
    G        <- G_path[t] * (1 + p$g)^(t - 1)
    tax_rate <- tax_path[t]

    # Taylor Rule with smoothing: CB moves 20% toward target each year
    i_target <- p$i_neutral +
                p$phi_pi * (pi_prev - p$pi_target) +
                p$phi_u  * (p$u_natural - u_prev)
    i <- p$rho * i_prev + (1 - p$rho) * i_target

    shock  <- rnorm(1, 0, p$shock_sd)
    Y_star <- p$Y_star_0 * (1 + p$g)^(t - 1)
    I      <- p$I_base_0 * (1 + p$g)^(t - 1) *
                (1 - p$tau * (tax_rate - p$tax_baseline)) *
                (1 - p$d   * (i - p$i_neutral)) *
                (1 + shock)
    Y      <- (I + G) / (1 - p$mpc * (1 - tax_rate))
    T_rev  <- tax_rate * Y
    C      <- p$mpc * (Y - T_rev)
    gap    <- (Y - Y_star) / Y_star
    u      <- p$u_natural - p$okun * gap
    pi     <- p$pi_target + p$beta * gap

    results[t, ] <- c(t, Y, C, I, G, T_rev, Y_star, gap, u, pi, i)

    # Advance CB state for next year
    pi_prev <- pi
    u_prev  <- u
    i_prev  <- i
  }

  results
}
