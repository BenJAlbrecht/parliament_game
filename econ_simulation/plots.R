library(tidyverse)

# ── Shared dark theme ─────────────────────────────────────────────────────────
theme_econ <- function(base_size = 13) {
  theme_minimal(base_size = base_size) %+replace%
  theme(
    plot.background   = element_rect(fill = "#0d0c18", color = NA),
    panel.background  = element_rect(fill = "#14121e", color = NA),
    panel.grid.major  = element_line(color = "#1e1c2e", linewidth = 0.4),
    panel.grid.minor  = element_blank(),
    axis.text         = element_text(color = "#64748b", family = "mono"),
    axis.title        = element_blank(),
    plot.title        = element_text(color = "#e2e8f0", family = "mono",
                                     face = "bold", size = rel(1.05),
                                     margin = margin(b = 4)),
    plot.subtitle     = element_text(color = "#475569", family = "mono",
                                     size = rel(0.78),
                                     margin = margin(b = 10)),
    legend.position   = "none",
    plot.margin       = margin(16, 20, 12, 16)
  )
}

# ── Color palettes ────────────────────────────────────────────────────────────
LEVELS_COLORS <- c(
  Y      = "#38bdf8",   # sky blue   — GDP
  C      = "#f472b6",   # pink       — consumption
  I      = "#a78bfa",   # violet     — investment
  G      = "#34d399",   # emerald    — gov. spending
  T      = "#fb923c",   # orange     — tax revenue
  Y_star = "#334155"    # slate grey — potential (dashed)
)

RATES_COLORS <- c(
  u  = "#f87171",   # red    — unemployment
  pi = "#fbbf24",   # amber  — inflation
  i  = "#60a5fa"    # blue   — interest rate
)

SCAR_COLOR   <- "#f97316"   # orange — scar factor
STRUCT_COLOR <- "#4ade80"   # green  — trend growth rate

# ── plot_levels ───────────────────────────────────────────────────────────────
# Monetary aggregates: Y, C, I, G, T, Y* (dashed)

plot_levels <- function(results) {
  df <- results %>%
    select(year, Y, C, I, G, T, Y_star) %>%
    pivot_longer(-year, names_to = "variable", values_to = "value") %>%
    mutate(variable = factor(variable, levels = names(LEVELS_COLORS)))

  ggplot(df, aes(x = year, y = value, color = variable)) +
    geom_line(data = filter(df, variable != "Y_star"), linewidth = 1.2) +
    geom_line(data = filter(df, variable == "Y_star"),
              linewidth = 0.9, linetype = "dashed") +
    geom_text(
      data = df %>% group_by(variable) %>% slice_max(year, n = 1),
      aes(label = variable), hjust = -0.2, size = 3.2, family = "mono"
    ) +
    scale_color_manual(values = LEVELS_COLORS) +
    scale_x_continuous(breaks = scales::breaks_pretty(),
                       expand = expansion(mult = c(0.02, 0.12))) +
    scale_y_continuous(labels = scales::comma) +
    theme_econ() +
    labs(title    = "MONETARY LEVELS",
         subtitle = "Y · C · I · G · T · Y* (potential, dashed)")
}

# ── plot_rates ────────────────────────────────────────────────────────────────
# Rates: unemployment, inflation, central bank interest rate

plot_rates <- function(results) {
  df <- results %>%
    select(year, u, pi, i) %>%
    pivot_longer(-year, names_to = "variable", values_to = "value") %>%
    mutate(variable = factor(variable, levels = names(RATES_COLORS)))

  ggplot(df, aes(x = year, y = value, color = variable)) +
    geom_hline(yintercept = 0.05, color = "#2d2b42", linewidth = 0.5,
               linetype = "dashed") +
    geom_hline(yintercept = 0.02, color = "#2d2b42", linewidth = 0.5,
               linetype = "dashed") +
    geom_line(linewidth = 1.2) +
    geom_text(
      data = df %>% group_by(variable) %>% slice_max(year, n = 1),
      aes(label = variable), hjust = -0.2, size = 3.2, family = "mono"
    ) +
    scale_color_manual(values = RATES_COLORS) +
    scale_x_continuous(breaks = scales::breaks_pretty(),
                       expand = expansion(mult = c(0.02, 0.12))) +
    scale_y_continuous(labels = scales::percent_format(accuracy = 0.1)) +
    theme_econ() +
    labs(title    = "RATES",
         subtitle = "unemployment · inflation · interest rate")
}

# ── plot_scar ─────────────────────────────────────────────────────────────────
# Cumulative hysteresis scar factor (1.0 = no damage; lower = permanent Y* loss)

plot_scar <- function(results) {
  ggplot(results, aes(x = year, y = scar_factor)) +
    geom_hline(yintercept = 1, color = "#2d2b42", linewidth = 0.5,
               linetype = "dashed") +
    geom_line(color = SCAR_COLOR, linewidth = 1.2) +
    geom_text(
      data = results %>% slice_max(year, n = 1),
      aes(label = "scar"), hjust = -0.2, size = 3.2, family = "mono",
      color = SCAR_COLOR
    ) +
    scale_x_continuous(breaks = scales::breaks_pretty(),
                       expand = expansion(mult = c(0.02, 0.12))) +
    scale_y_continuous(labels = scales::percent_format(accuracy = 0.1)) +
    theme_econ() +
    labs(title    = "HYSTERESIS SCAR FACTOR",
         subtitle = "cumulative permanent damage to potential output (1.0 = no scarring)")
}

# ── plot_structural ───────────────────────────────────────────────────────────
# Running trend growth rate (g_current) — baseline plus accumulated structural boosts

plot_structural <- function(results) {
  g_baseline <- results$g_current[1]   # year-1 value before any boosts compound

  ggplot(results, aes(x = year, y = g_current)) +
    geom_hline(yintercept = g_baseline, color = "#2d2b42", linewidth = 0.5,
               linetype = "dashed") +
    geom_line(color = STRUCT_COLOR, linewidth = 1.2) +
    geom_text(
      data = results %>% slice_max(year, n = 1),
      aes(label = "g"), hjust = -0.2, size = 3.2, family = "mono",
      color = STRUCT_COLOR
    ) +
    scale_x_continuous(breaks = scales::breaks_pretty(),
                       expand = expansion(mult = c(0.02, 0.12))) +
    scale_y_continuous(labels = scales::percent_format(accuracy = 0.1)) +
    theme_econ() +
    labs(title    = "TREND GROWTH RATE",
         subtitle = "g_current — baseline plus accumulated structural reforms (dashed = baseline)")
}
