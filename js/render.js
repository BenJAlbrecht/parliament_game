import { PARTIES, ENDINGS, econLabel, socialLabel } from './data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg    = document.getElementById('chamber-svg');

let _govIndices = new Set();

export function setCoalitionState(playerParty, partners) {
  const govNames = new Set([playerParty.name, ...partners.map(p => p.name)]);
  _govIndices = new Set(PARTIES.map((p, i) => govNames.has(p.name) ? i : -1).filter(i => i >= 0));
}

function restoreCoalitionAppearance(seats) {
  svg.querySelectorAll('circle').forEach((c, i) => {
    const party = PARTIES[seats[i].partyIndex];
    const inGov = _govIndices.has(seats[i].partyIndex);
    c.setAttribute('fill', party.color);
    c.setAttribute('stroke', 'none');
    c.setAttribute('opacity', inGov ? '1' : '0.3');
    c.querySelector('title').textContent = party.name;
  });
}

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
  restoreCoalitionAppearance(seats);
}

export function renderLegend(playerParty, partners, loyalty) {
  const govNames = new Set([playerParty.name, ...partners.map(p => p.name)]);
  const gov = PARTIES.filter(p =>  govNames.has(p.name));
  const opp = PARTIES.filter(p => !govNames.has(p.name));

  const total    = PARTIES.reduce((s, p) => s + p.seats, 0);
  const govSeats = gov.reduce((s, p) => s + p.seats, 0);
  const oppSeats = opp.reduce((s, p) => s + p.seats, 0);
  const pct      = n => Math.round(n / total * 100);

  const makeCard = (p, inGov) => {
    const isPlayer = p === playerParty;
    const loyaltyLine = (inGov && !isPlayer)
      ? `<div class="legend-loyalty">Coalition Loyalty: ${(loyalty[p.name] ?? 100).toFixed(1)}%</div>`
      : '';
    return `
      <div class="legend-item${isPlayer ? ' legend-item--player' : ''}">
        <div class="legend-name">
          <span class="swatch" style="background:${p.color}"></span>${p.name}${isPlayer ? ' <span class="you-tag">YOU</span>' : ''}
        </div>
        <div class="legend-stats">${p.seats} seats</div>
        ${loyaltyLine}
      </div>
    `;
  };

  document.getElementById('legend').innerHTML = `
    <div class="legend-group-label">
      <span>Government</span>
      <span class="legend-group-stats">${govSeats} / ${total} seats &nbsp;&middot;&nbsp; ${pct(govSeats)}%</span>
    </div>
    <div class="legend-group">${gov.map(p => makeCard(p, true)).join('')}</div>
    <div class="legend-group-label">
      <span>Opposition</span>
      <span class="legend-group-stats">${oppSeats} / ${total} seats &nbsp;&middot;&nbsp; ${pct(oppSeats)}%</span>
    </div>
    <div class="legend-group legend-group--opp">${opp.map(p => makeCard(p, false)).join('')}</div>
  `;
}

export function renderAgenda(score, count) {
  document.getElementById('agenda-score').textContent  = score.toFixed(1);
  document.getElementById('agenda-bills').textContent  =
    `${count} bill${count !== 1 ? 's' : ''} proposed`;
}

export function renderBills(bills, onSelect) {
  document.getElementById('bill-proposal').style.display = 'block';
  document.getElementById('vote-result').style.display   = 'none';

  document.getElementById('bill-cards').innerHTML = bills.map((b, i) => `
    <div class="bill-card" data-index="${i}">
      <div class="bill-card-type">${b.type}</div>
      <div class="bill-card-title">${b.title}</div>
      <div class="bill-card-position">${b.type === 'economic' ? econLabel(b.score) : socialLabel(b.score)}</div>
    </div>
  `).join('');

  document.getElementById('bill-cards').querySelectorAll('.bill-card').forEach((card, i) => {
    card.addEventListener('click', () => onSelect(bills[i]));
  });
}

export function renderVoteResult(bill, result) {
  document.getElementById('bill-proposal').style.display = 'none';
  document.getElementById('vote-result').style.display   = 'block';

  const verdictCls = result.passed ? 'vote-verdict-passed' : 'vote-verdict-failed';
  document.getElementById('vote-result-header').innerHTML = `
    <div class="vote-result-bill">${bill.title}</div>
    <div class="${verdictCls}">${result.passed ? 'PASSED' : 'FAILED'}</div>
  `;

  document.getElementById('vote-result-tally').textContent =
    `Ayes: ${result.ayes}  ·  Nays: ${result.nays}  ·  Majority: ${Math.floor(PARTIES.reduce((s,p)=>s+p.seats,0)/2)+1}`;

  if (result.passed && Object.keys(result.loyaltyChanges).length) {
    document.getElementById('vote-result-loyalty').innerHTML =
      Object.entries(result.loyaltyChanges).map(([name, c]) => {
        const sign = c.delta >= 0 ? '+' : '';
        const cls  = c.delta > 0 ? 'loyalty-up' : c.delta < 0 ? 'loyalty-down' : 'loyalty-neutral';
        return `<div class="vote-loyalty-change ${cls}">${name}: ${c.prev.toFixed(1)}% &rarr; ${c.next.toFixed(1)}% &nbsp;(${sign}${c.delta.toFixed(1)}%)</div>`;
      }).join('');
  } else {
    document.getElementById('vote-result-loyalty').innerHTML = '';
  }
}

export function applyVoteAppearance(seats, votes) {
  const circles = svg.querySelectorAll('circle');
  seats.forEach((s, i) => {
    const party = PARTIES[s.partyIndex];
    const c     = circles[i];
    if (votes[i] === 'aye') {
      c.setAttribute('fill',    party.color);
      c.setAttribute('stroke',  'none');
      c.setAttribute('opacity', '1');
    } else {
      c.setAttribute('fill',         'none');
      c.setAttribute('stroke',       party.color);
      c.setAttribute('stroke-width', '1.5');
      c.setAttribute('opacity',      '0.55');
    }
    c.querySelector('title').textContent = `${party.name} — ${votes[i].toUpperCase()}`;
  });
}

export function clearVoteDisplay(seats) {
  restoreCoalitionAppearance(seats);
}

export function renderEnding(playerParty, coalition, agendaScore) {
  document.getElementById('screen-parliament').style.display = 'none';
  const screen = document.getElementById('screen-ending');
  screen.style.display = 'block';

  const tier   = agendaScore >= 18 ? 'high' : agendaScore >= 7 ? 'mid' : 'low';
  const labels = { high: 'Strong Session', mid: 'Mixed Session', low: 'Failed Session' };
  const text   = ENDINGS[coalition.id]?.[playerParty.name]?.[tier] ?? '';
  const title  = coalition.titles[playerParty.name];

  document.getElementById('ending-coalition-title').textContent = title;
  document.getElementById('ending-score-value').textContent     = agendaScore.toFixed(1);
  document.getElementById('ending-tier').textContent            = labels[tier];
  document.getElementById('ending-tier').className              =
    'ending-tier ' + (tier === 'high' ? 'loyalty-up' : tier === 'mid' ? 'loyalty-neutral' : 'loyalty-down');
  document.getElementById('ending-text').textContent            = text;
}
