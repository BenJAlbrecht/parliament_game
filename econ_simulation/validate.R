# Run from the project root:  Rscript econ_simulation/validate.R
# Writes 3 CSV files to econ_simulation/validation/ for comparison with validate.js

source("model.R")
dir.create("econ_simulation/validation", showWarnings = FALSE, recursive = TRUE)

QUARTERS <- 20L
G_BASE   <- 270
TAX_BASE <- 0.25

zero_shock <- list(shock_sd = 0)   # deterministic: investment shock always 0

OUT_COLS <- c("quarter", "Y", "C", "I", "G", "Y_star", "baseline_Y_star",
              "gap", "u", "pi", "i", "scar_factor", "u_natural_state")

# Scenario 1 — baseline: no shocks, constant G and tax
res <- simulate_economy(
  G_path   = rep(G_BASE,   QUARTERS),
  tax_path = rep(TAX_BASE, QUARTERS),
  params   = zero_shock,
  seed     = 42
)
write.csv(res[, OUT_COLS], "econ_simulation/validation/baseline_r.csv",
          row.names = FALSE)

# Scenario 2 — tapered demand shock
# quarters 12-17: -0.10, q18: -0.06, q19: -0.03
d_shock        <- rep(0, QUARTERS)
d_shock[12:17] <- -0.10
d_shock[18]    <- -0.06
d_shock[19]    <- -0.03
res <- simulate_economy(
  G_path            = rep(G_BASE,   QUARTERS),
  tax_path          = rep(TAX_BASE, QUARTERS),
  params            = zero_shock,
  seed              = 42,
  demand_shock_path = d_shock
)
write.csv(res[, OUT_COLS], "econ_simulation/validation/demand_shock_r.csv",
          row.names = FALSE)

# Scenario 3 — tapered cost-push inflation shock
# quarters 12-14: 0.015, q15: 0.010, q16: 0.005
pi_shock        <- rep(0, QUARTERS)
pi_shock[12:14] <- 0.015
pi_shock[15]    <- 0.010
pi_shock[16]    <- 0.005
res <- simulate_economy(
  G_path               = rep(G_BASE,   QUARTERS),
  tax_path             = rep(TAX_BASE, QUARTERS),
  params               = zero_shock,
  seed                 = 42,
  inflation_shock_path = pi_shock
)
write.csv(res[, OUT_COLS], "econ_simulation/validation/cost_push_r.csv",
          row.names = FALSE)

cat("R validation CSVs written to econ_simulation/validation/\n")
