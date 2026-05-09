setwd("C:/Users/balbrecht/Documents/parliament_game/econ_simulation")

source("model.R")
source("plots.R")

# ── Your choices ──────────────────────────────────────────────────────────────

years    <- 100
G_path <- c(rep(270, 100))
tax_path <- c(rep(0.25, 100))
#G_path   <- c(rep(270, 2), rep(285, 8))    # real spending: +15 above baseline (≈5.6%) from year 3
#tax_path <- c(rep(0.25, 6), rep(0.20, 4))  # 5pp tax cut from year 7

# Override any model parameters here (leave empty to use defaults)
params <- list(
  # mpc       = 0.75,
  # shock_sd  = 0.03,
  # i_neutral = 0.02,   # CB neutral rate
  # phi_pi    = 1.5,    # CB inflation response
  # phi_u     = 0.5,    # CB unemployment response
  # d         = 5,      # investment sensitivity to rate gap
  # rho       = 0.8     # CB rate smoothing (0 = no smoothing, 1 = frozen)
)

seed <- 42  # set to NULL for fresh randomness each run

# ── Run ───────────────────────────────────────────────────────────────────────

results <- simulate_economy(G_path, tax_path, params, seed)

print(results)

# ── Plot ──────────────────────────────────────────────────────────────────────

print(plot_levels(results))
print(plot_rates(results))

write_csv(results, 'sim_dat.csv')
