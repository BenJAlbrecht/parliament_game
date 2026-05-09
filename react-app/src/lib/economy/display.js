export const POPULATION      = 80_000_000;
export const BASE_GDP_CAPITA = 20_000;          // EUR at quarter 1
export const BASE_Y_MODEL    = 500 / 0.4375;    // ≈ 1142.857 model units

const PER_CAPITA_SCALE = BASE_GDP_CAPITA / BASE_Y_MODEL;

// GDP, Y_star, or baseline_Y_star → EUR per capita (rounded to nearest 100)
export function toGdpPerCapita(Y) {
  return Math.round(Y * PER_CAPITA_SCALE / 100) * 100;
}

// Component (C, I, G) as % of quarterly GDP, 1 decimal place
export function toComponentShare(component, Y) {
  return +((component / Y) * 100).toFixed(1);
}

// Per-quarter rate → annualized %, 1 decimal place
export function toAnnualRate(ratePerQuarter) {
  return +(((1 + ratePerQuarter) ** 4 - 1) * 100).toFixed(1);
}

// 1-indexed quarter → { year, quarter, label }  (starts 1985 Q1)
export function quarterToCalendar(t) {
  const year    = 1985 + Math.floor((t - 1) / 4);
  const quarter = ((t - 1) % 4) + 1;
  return { year, quarter, label: `${year} Q${quarter}` };
}
