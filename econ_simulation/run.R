setwd("C:/Users/benjo/Documents/parliament_game/econ_simulation")

source("model.R")
source("plots.R")

# ── Your choices ──────────────────────────────────────────────────────────────

years    <- 60
G_path   <- c(rep(270, 30), c(600, 30))
tax_path <- rep(0.25, years)

# Shock paths — all zero for a clean baseline.
# See ECONOMY.txt §Shocks for what each represents and example values.
demand_shock_path    <- rep(0, years)   # multiplier on (a, I): -0.15 = 15% spending collapse
supply_shock_path    <- rep(0, years)   # multiplier on Y*:     -0.10 = 10% capacity compression
inflation_shock_path <- rep(0, years)   # pp addition to π:    +0.03 = 3pp cost-push

# Example: two-year demand shock in years 4-5 (financial crisis / consumer panic).
# Produces a deflationary recession visible in the rates plot: u spikes, pi drops, CB cuts.
# Uncomment to run:
# demand_shock_path[4:5] <- -0.15

# Structural policy paths — all zero for a clean baseline.
# See ECONOMY.txt §Structural policies for what each represents and example values.
g_boost_path <- rep(0, years)   # pp added permanently to trend g: +0.001 = education/R&D reform
heal_path    <- rep(0, years)   # scar_factor recovery per year:   +0.010 = industrial renewal

# Example: sustained R&D + education push starting year 5 (+0.002 total g_boost).
# Compounds visibly over 30 years: g rises from 2.0% to 2.2%, lifting Y* ~6% above baseline.
# Uncomment to run:
# g_boost_path[5] <- 0.001   # Research and Innovation Fund
# g_boost_path[5] <- g_boost_path[5] + 0.001   # Public Education Investment (same year)

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

results <- simulate_economy(G_path, tax_path, params, seed,
                            demand_shock_path, supply_shock_path, inflation_shock_path,
                            g_boost_path, heal_path)

print(results)

# ── Plot ──────────────────────────────────────────────────────────────────────

print(plot_levels(results))
print(plot_rates(results))
print(plot_scar(results))
print(plot_structural(results))

write_csv(results, 'sim_dat.csv')
