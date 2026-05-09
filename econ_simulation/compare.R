# Run from the project root:  Rscript econ_simulation/compare.R
# Reads JS and R CSV pairs, inner-joins on quarter, and reports max absolute
# difference per scenario.  Exits with code 1 if any scenario fails.

scenarios <- c("baseline", "demand_shock", "cost_push")
num_cols  <- c("Y", "C", "I", "G", "Y_star", "baseline_Y_star",
               "gap", "u", "pi", "i", "scar_factor", "u_natural_state")

all_pass <- TRUE

for (scen in scenarios) {
  js_file <- paste0("validation/", scen, "_js.csv")
  r_file  <- paste0("validation/", scen, "_r.csv")

  js_dat <- read.csv(js_file, stringsAsFactors = FALSE)
  r_dat  <- read.csv(r_file,  stringsAsFactors = FALSE)

  merged <- merge(js_dat, r_dat, by = "quarter", suffixes = c("_js", "_r"))

  diffs <- sapply(num_cols, function(col) {
    max(abs(merged[[paste0(col, "_js")]] - merged[[paste0(col, "_r")]]))
  })

  max_diff <- max(diffs)
  status   <- if (max_diff < 1e-8) "PASS" else "FAIL"
  if (status == "FAIL") all_pass <- FALSE

  cat(sprintf("%-20s  max_abs_diff = %.2e  %s\n", scen, max_diff, status))
}

if (all_pass) {
  cat("\nAll scenarios PASS — JS and R outputs are numerically identical.\n")
} else {
  cat("\nFAIL — JS and R outputs diverge.\n")
  quit(status = 1)
}
