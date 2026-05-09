library(tidyverse)

set.seed(42)  # remove for fresh randomness each run

# ── Parameters ────────────────────────────────────
mpc          <- 0.75   # share of disposable income spent
tau          <- 1.5    # investment shrinks per pp of tax above baseline
tax_baseline <- 0.25
g            <- 0.02   # trend growth (tech + capital + labor)
u_natural    <- 0.05   # natural unemployment rate
okun         <- 0.5    # Okun coefficient: output gap → unemployment
pi_target    <- 0.02   # target / expected inflation
beta         <- 0.5    # Phillips slope: output gap → inflation
shock_sd     <- 0.03   # std dev of yearly investment shock
I_base_0     <- 150    # year 1 baseline investment
Y_star_0     <- 960    # year 1 potential output

# ── Player choices over time ──────────────────────
years    <- 10
G_path   <- c(rep(270, 2), rep(285, 8))     # +15 spending bill, year 3 onward
tax_path <- c(rep(0.25, 6), rep(0.20, 4))   # 5pp tax cut, year 7 onward

# ── Simulate ──────────────────────────────────────
results <- data.frame(year = 1:years, Y = NA, C = NA, I = NA, G = NA,
                      T = NA, Y_star = NA, gap = NA, u = NA, pi = NA)

for (t in 1:years) {
  G        <- G_path[t]
  tax_rate <- tax_path[t]
  
  shock    <- rnorm(1, 0, shock_sd)                    # animal spirits
  Y_star   <- Y_star_0 * (1 + g)^(t - 1)               # potential grows on trend
  I        <- I_base_0 * (1 + g)^(t - 1) *             # investment grows on trend,
    (1 - tau * (tax_rate - tax_baseline)) *  #   shrinks at high taxes,
    (1 + shock)                              #   plus this year's shock
  Y        <- (I + G) / (1 - mpc * (1 - tax_rate))     # Keynesian cross
  T        <- tax_rate * Y
  C        <- mpc * (Y - T)
  
  gap      <- (Y - Y_star) / Y_star                    # + hot, − slack
  u        <- u_natural - okun * gap                   # Okun's law
  pi       <- pi_target + beta * gap                   # Phillips curve
  
  results[t, ] <- c(t, Y, C, I, G, T, Y_star, gap, u, pi)
}

# ── Plot 1: monetary levels ──
results %>%
  select(year, Y, C, I, G, T, Y_star) %>%
  pivot_longer(-year, names_to = "variable", values_to = "value") %>%
  ggplot(aes(x = year, y = value, color = variable)) +
  geom_line(linewidth = 1.2) +
  scale_color_brewer(palette = "Set1") +
  theme_minimal(base_size = 13) +
  labs(x = "Year", y = NULL, color = NULL, title = "Levels")

# ── Plot 2: rates ──
results %>%
  select(year, gap, u, pi) %>%
  pivot_longer(-year, names_to = "variable", values_to = "value") %>%
  ggplot(aes(x = year, y = value, color = variable)) +
  geom_line(linewidth = 1.2) +
  scale_y_continuous(labels = scales::percent) +
  scale_color_brewer(palette = "Dark2") +
  theme_minimal(base_size = 13) +
  labs(x = "Year", y = NULL, color = NULL, title = "Rates")

