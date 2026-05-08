import { LAYOUT } from './data.js';

export function calculateSeats(parties) {
  const { centerX, centerY, radiusInner, radiusOuter, rows } = LAYOUT;
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);

  const rowRadii = Array.from({ length: rows }, (_, i) =>
    radiusInner + (radiusOuter - radiusInner) * (i / (rows - 1))
  );

  const circumferenceSum = rowRadii.reduce((sum, r) => sum + r * Math.PI, 0);
  const seatsPerRow = rowRadii.map(r =>
    Math.round((r * Math.PI / circumferenceSum) * totalSeats)
  );
  const allocated = seatsPerRow.reduce((a, b) => a + b, 0);
  seatsPerRow[rows - 1] += totalSeats - allocated;

  const positions = [];
  for (let row = 0; row < rows; row++) {
    const n = seatsPerRow[row];
    const r = rowRadii[row];
    for (let j = 0; j < n; j++) {
      const t = n === 1 ? 0.5 : j / (n - 1);
      const angle = Math.PI + t * Math.PI;
      positions.push({
        angle,
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      });
    }
  }
  positions.sort((a, b) => a.angle - b.angle);

  const partyIndices = parties.flatMap((p, i) => Array(p.seats).fill(i));

  return positions.slice(0, partyIndices.length).map((pos, i) => ({
    partyIndex: partyIndices[i],
    x: Math.round(pos.x * 10) / 10,
    y: Math.round(pos.y * 10) / 10,
  }));
}
