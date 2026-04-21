import { LAYOUT } from './data.js';

export function calculateSeats(parties) {
  const { centerX, centerY, radiusInner, radiusOuter, rows } = LAYOUT;
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);

  // Evenly-spaced row radii from inner to outer arc
  const rowRadii = Array.from({ length: rows }, (_, i) =>
    radiusInner + (radiusOuter - radiusInner) * (i / (rows - 1))
  );

  // Distribute seats across rows proportional to each row's circumference
  const circumferenceSum = rowRadii.reduce((sum, r) => sum + r * Math.PI, 0);
  const seatsPerRow = rowRadii.map(r =>
    Math.round((r * Math.PI / circumferenceSum) * totalSeats)
  );
  // Correct rounding drift on the outermost row
  const allocated = seatsPerRow.reduce((a, b) => a + b, 0);
  seatsPerRow[rows - 1] += totalSeats - allocated;

  // Compute (angle, x, y) for every seat across all rows
  const positions = [];
  for (let row = 0; row < rows; row++) {
    const n = seatsPerRow[row];
    const r = rowRadii[row];
    for (let j = 0; j < n; j++) {
      const t = n === 1 ? 0.5 : j / (n - 1);
      const angle = Math.PI + t * Math.PI; // sweeps left→right across semicircle
      positions.push({
        angle,
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      });
    }
  }
  positions.sort((a, b) => a.angle - b.angle);

  // Assign parties as contiguous left-to-right blocks
  const partyIndices = parties.flatMap((p, i) => Array(p.seats).fill(i));

  return positions.slice(0, partyIndices.length).map((pos, i) => ({
    partyIndex: partyIndices[i],
    x: Math.round(pos.x * 10) / 10,
    y: Math.round(pos.y * 10) / 10,
  }));
}
