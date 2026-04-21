import { PARTIES } from './data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('chamber-svg');

export function renderSeats(seats) {
  svg.querySelectorAll('circle').forEach(c => c.remove());
  seats.forEach((s, i) => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', s.x);
    circle.setAttribute('cy', s.y);
    circle.setAttribute('r', 5);
    circle.setAttribute('fill', PARTIES[s.partyIndex].color);
    circle.setAttribute('data-seat', i);
    const tooltip = document.createElementNS(SVG_NS, 'title');
    tooltip.textContent = PARTIES[s.partyIndex].name;
    circle.appendChild(tooltip);
    svg.appendChild(circle);
  });
}

export function renderLegend(playerParty) {
  document.getElementById('legend').innerHTML = PARTIES.map(p => `
    <div class="legend-item${p === playerParty ? ' legend-item--player' : ''}">
      <div class="legend-name">
        <span class="swatch" style="background:${p.color}"></span>${p.name}${p === playerParty ? ' <span class="you-tag">YOU</span>' : ''}
      </div>
      <div class="legend-stats">${p.seats} seats &middot; ${Math.round(p.loyalty * 100)}% loyalty</div>
    </div>
  `).join('');
}

export function renderResult(passed, ayes, nays, partyTally) {
  const cls = passed ? 'result-passed' : 'result-failed';
  const breakdown = PARTIES.map((p, i) =>
    `<span style="color:${p.color}">&#9679;</span> ${p.name}: ${partyTally[i].aye} aye / ${partyTally[i].nay} nay`
  ).join(' &nbsp;&middot;&nbsp; ');

  const resultEl = document.getElementById('result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div class="result-title ${cls}">Motion ${passed ? 'PASSED' : 'FAILED'}</div>
    <div class="result-tally">Ayes: <strong>${ayes}</strong> &middot; Nays: <strong>${nays}</strong></div>
    <div class="result-tally" style="margin-top:6px;">${breakdown}</div>
  `;
}

export function renderHistory(history, votesPassed, votesFailed, totalVotes) {
  const el = document.getElementById('history');
  if (history.length === 0) { el.innerHTML = ''; return; }
  const summary = `<div style="margin-bottom:6px;"><strong>Session:</strong> ${votesPassed} passed, ${votesFailed} failed (${totalVotes} total)</div>`;
  const items = history.map(v => {
    const icon = v.passed
      ? '<span style="color:#00ff00">&#10003;</span>'
      : '<span style="color:#ff0000">&#10007;</span>';
    return `<div class="history-item">${icon} ${v.bill} &mdash; ${v.ayes}&ndash;${v.nays}</div>`;
  }).join('');
  el.innerHTML = summary + items;
}

export function applyVoteAppearance(seats, votes) {
  const circles = svg.querySelectorAll('circle');
  seats.forEach((s, i) => {
    const party = PARTIES[s.partyIndex];
    const vote = votes[i];
    const c = circles[i];
    if (vote === 'aye') {
      c.setAttribute('fill', party.color);
      c.setAttribute('stroke', 'none');
      c.setAttribute('opacity', '1');
    } else {
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', party.color);
      c.setAttribute('stroke-width', '1.5');
      c.setAttribute('opacity', '0.55');
    }
    c.querySelector('title').textContent = `${party.name} — ${vote.toUpperCase()}`;
  });
}

export function clearVoteDisplay(seats) {
  svg.querySelectorAll('circle').forEach((c, i) => {
    const party = PARTIES[seats[i].partyIndex];
    c.setAttribute('fill', party.color);
    c.setAttribute('stroke', 'none');
    c.setAttribute('opacity', '1');
    c.querySelector('title').textContent = party.name;
  });
  document.getElementById('result').style.display = 'none';
  document.getElementById('bill').style.display = 'none';
}
