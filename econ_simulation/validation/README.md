# Validation

Confirms that the JavaScript economy engine (`react-app/src/lib/economy/`) produces
outputs numerically identical to the R reference implementation (`econ_simulation/model.R`)
when both run with σ = 0 (no random investment shocks).

## Workflow

**Step 1 — generate JS outputs** (from project root):
```
node react-app/src/lib/economy/validate.js
```
Writes `baseline_js.csv`, `demand_shock_js.csv`, `cost_push_js.csv`.

**Step 2 — generate R outputs** (from `econ_simulation/`):
```
cd econ_simulation
Rscript validate.R
```
Writes `baseline_r.csv`, `demand_shock_r.csv`, `cost_push_r.csv`.

**Step 3 — compare** (from `econ_simulation/`):
```
Rscript compare.R
```
Prints max absolute difference per scenario and overall PASS/FAIL.
Exits with code 1 if any scenario fails.

## Scenarios

| File prefix   | Description                                                          |
|---------------|----------------------------------------------------------------------|
| baseline      | 20 quarters, G=270, tax=0.25, no shocks                              |
| demand_shock  | Tapered demand shock: q12–17 = −0.10, q18 = −0.06, q19 = −0.03     |
| cost_push     | Tapered inflation shock: q12–14 = 0.015, q15 = 0.010, q16 = 0.005  |

All scenarios use `shock_sd = 0` so the investment shock ε_t is always zero,
making outputs fully deterministic on both sides.

## Pass criterion

`max(|JS − R|) < 1e-8` across all numeric columns and all 20 quarters.
