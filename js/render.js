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
    const loy      = (inGov && !isPlayer) ? loyalty[p.name] ?? 100 : null;
    const loyCls   = loy !== null
      ? (loy >= 60 ? 'loyalty-up' : loy >= 30 ? 'loyalty-neutral' : 'loyalty-down')
      : '';
    const loyCell  = loy !== null
      ? `<span class="legend-item-loyalty ${loyCls}">Coalition Loyalty: ${loy.toFixed(1)}%</span>`
      : '';
    return `
      <div class="legend-item${!inGov ? ' legend-item--opp' : ''}">
        <div class="legend-item-row1">
          <div class="legend-item-namerow">
            <span class="swatch" style="background:${p.color}"></span>
            <span>${p.name}</span>
            ${isPlayer ? '<span class="you-tag">YOU</span>' : ''}
          </div>
          <span class="legend-item-seats">Seats: ${p.seats}</span>
        </div>
        <div class="legend-item-row2">
          <span class="legend-item-ideology">${econLabel(p.economic)} &middot; ${socialLabel(p.social)}</span>
          ${loyCell}
        </div>
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

export function renderTurnCounter(turn, total) {
  document.getElementById('turn-counter').textContent = `Turn ${turn} / ${total}`;
}

// ── Agenda list ──────────────────────────────────────────────────────────────

export function renderAgenda(agenda, loyalty, player, partners, onSelect, onAbstain) {
  const total    = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority = Math.floor(total / 2) + 1;

  document.getElementById('phase-agenda').style.display      = 'block';
  document.getElementById('phase-bill-detail').style.display = 'none';
  document.getElementById('phase-result').style.display      = 'none';
  document.getElementById('vote-sidebar').style.display      = 'none';

  const agendaData = agenda.map(bill => {
    let ayes = player.seats;
    for (const p of partners) {
      const L = loyalty[p.name] / 100;
      const k = Math.abs(bill.score - p[bill.type]);
      const c = Math.max(0, 1 - k / 10);
      ayes   += Math.floor((L + (1 - L) * c) * p.seats);
    }
    return { bill, passable: ayes >= majority };
  });

  const allBlocked = agendaData.every(d => !d.passable);

  document.getElementById('agenda-list').innerHTML = agendaData.map((d, i) => {
    const { bill, passable } = d;
    const itemCls    = passable ? 'agenda-item--passable' : 'agenda-item--blocked';
    const statusCls  = passable ? 'pass' : 'block';
    const statusText = passable ? 'Passable &#10003;' : 'Blocked &#10007;';
    const mandateTag = bill.flagship ? `<span class="bill-mandate-tag">Mandate</span>` : '';
    return `
      <div class="agenda-item ${itemCls}" data-index="${i}">
        <div class="agenda-item-info">
          <div class="agenda-item-title">${bill.title}</div>
          <div class="agenda-item-meta">
            <span class="bill-card-type">${bill.type}</span>
            ${mandateTag}
          </div>
        </div>
        <span class="bill-pass-status ${statusCls}">${statusText}</span>
      </div>`;
  }).join('');

  document.getElementById('agenda-list').querySelectorAll('.agenda-item').forEach((item, i) => {
    item.addEventListener('click', () => onSelect(agendaData[i].bill));
  });

  const blockedDiv = document.getElementById('phase-agenda-blocked');
  blockedDiv.style.display = allBlocked ? 'block' : 'none';
  if (allBlocked) {
    document.getElementById('btn-abstain').onclick = onAbstain;
  }
}

// ── Bill detail ──────────────────────────────────────────────────────────────

export function renderBillDetail(bill, loyalty, player, partners, onBack, onPropose) {
  const total    = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority = Math.floor(total / 2) + 1;

  document.getElementById('phase-agenda').style.display      = 'none';
  document.getElementById('phase-bill-detail').style.display = 'block';
  document.getElementById('phase-result').style.display      = 'none';

  // Per-party vote breakdown
  const breakdown = PARTIES.map(p => {
    if (p === player) return { party: p, ayes: p.seats, nays: 0, role: 'player' };
    if (partners.includes(p)) {
      const L    = loyalty[p.name] / 100;
      const k    = Math.abs(bill.score - p[bill.type]);
      const c    = Math.max(0, 1 - k / 10);
      const ayes = Math.floor((L + (1 - L) * c) * p.seats);
      return { party: p, ayes, nays: p.seats - ayes, role: 'partner' };
    }
    return { party: p, ayes: 0, nays: p.seats, role: 'opposition' };
  });

  const totalAyes = breakdown.reduce((s, b) => s + b.ayes, 0);
  const passable  = totalAyes >= majority;

  // Show government first, then opposition
  const govRows = breakdown.filter(b => b.role !== 'opposition');
  const oppRows = breakdown.filter(b => b.role === 'opposition');

  const breakdownRows = [...govRows, ...oppRows].map(b => {
    const isPlayer = b.role === 'player';
    const rowCls   = b.role === 'opposition' ? 'breakdown-row--opp' : '';
    return `
      <div class="breakdown-row ${rowCls}">
        <span class="swatch" style="background:${b.party.color}"></span>
        <span class="breakdown-name">${b.party.name}${isPlayer ? ' <span class="you-tag">YOU</span>' : ''}</span>
        <span class="breakdown-ayes">${b.ayes} aye</span>
        <span class="breakdown-nays">${b.nays} nay</span>
      </div>`;
  }).join('');

  // Loyalty deltas for partners
  const loyaltyRows = partners.map(p => {
    const distance = Math.abs(bill.score - p[bill.type]);
    const delta    = Math.max(-20, Math.min(5, 5 - distance * 1.5));
    const sign     = delta >= 0 ? '+' : '';
    const cls      = delta > 0 ? 'loyalty-up' : delta < 0 ? 'loyalty-down' : 'loyalty-neutral';
    return `<div class="bill-loyalty-partner">
      <span class="swatch" style="background:${p.color}"></span>
      <span class="bill-loyalty-name">${p.name}</span>
      <span class="${cls}">${sign}${delta.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const mandateTag = bill.flagship ? `<span class="bill-mandate-tag">Mandate</span>` : '';
  const totalCls   = passable ? 'pass' : 'block';
  const totalText  = passable ? 'PASSES &#10003;' : 'BLOCKED &#10007;';

  const proposeSection = passable
    ? `<button id="btn-propose" class="primary bill-detail-propose">Propose Bill &#8594;</button>`
    : `<div class="bill-detail-blocked-msg">Coalition support too low — cannot bring this bill to the floor.</div>`;

  document.getElementById('bill-detail-content').innerHTML = `
    <button class="back-btn" id="btn-bill-back">&#8592; Back to Agenda</button>

    <div class="bill-detail-title">${bill.title}</div>
    <div class="bill-card-meta">
      <span class="bill-card-type">${bill.type}</span>
      ${mandateTag}
    </div>
    <div class="bill-detail-position">${bill.type === 'economic' ? econLabel(bill.score) : socialLabel(bill.score)}</div>

    <div class="bill-detail-section">
      <div class="bill-detail-section-label">Vote Breakdown</div>
      <div class="bill-breakdown">
        ${breakdownRows}
        <div class="breakdown-total">
          <span class="breakdown-total-ayes">Total ayes: ${totalAyes} / ${majority}</span>
          <span class="bill-pass-status ${totalCls}">${totalText}</span>
        </div>
      </div>
    </div>

    <div class="bill-detail-section">
      <div class="bill-detail-section-label">Coalition Loyalty Impact <span class="bill-detail-section-note">if passed</span></div>
      <div class="bill-loyalty-preview">
        ${loyaltyRows}
      </div>
    </div>

    ${proposeSection}
  `;

  document.getElementById('btn-bill-back').onclick = onBack;
  if (passable) document.getElementById('btn-propose').onclick = onPropose;
}

// ── Vote result / abstain ────────────────────────────────────────────────────

export function renderVoteResult(bill, result) {
  const total    = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority = Math.floor(total / 2) + 1;

  document.getElementById('phase-agenda').style.display      = 'none';
  document.getElementById('phase-bill-detail').style.display = 'none';
  document.getElementById('phase-result').style.display      = 'block';
  document.getElementById('vote-sidebar').style.display      = 'block';

  const verdictCls = result.passed ? 'vote-verdict-passed' : 'vote-verdict-failed';
  document.getElementById('vote-verdict').innerHTML = `
    <div class="vote-result-bill">${bill.title}</div>
    <div class="${verdictCls}">${result.passed ? 'PASSED' : 'FAILED'}</div>`;

  document.getElementById('vote-sidebar-tally').textContent =
    `Ayes: ${result.ayes}  ·  Nays: ${result.nays}  ·  Majority: ${majority}`;

  if (result.passed && Object.keys(result.loyaltyChanges).length) {
    document.getElementById('vote-sidebar-loyalty').innerHTML =
      Object.entries(result.loyaltyChanges).map(([name, c]) => {
        const sign = c.delta >= 0 ? '+' : '';
        const cls  = c.delta > 0 ? 'loyalty-up' : c.delta < 0 ? 'loyalty-down' : 'loyalty-neutral';
        return `<div class="vote-loyalty-change ${cls}">${name}: ${c.prev.toFixed(1)}% &rarr; ${c.next.toFixed(1)}% (${sign}${c.delta.toFixed(1)}%)</div>`;
      }).join('');
  } else {
    document.getElementById('vote-sidebar-loyalty').innerHTML = '';
  }
}

export function renderAbstainResult() {
  document.getElementById('phase-agenda').style.display      = 'none';
  document.getElementById('phase-bill-detail').style.display = 'none';
  document.getElementById('phase-result').style.display      = 'block';
  document.getElementById('vote-sidebar').style.display      = 'none';

  document.getElementById('vote-verdict').innerHTML = `
    <div class="vote-result-bill">Turn skipped</div>
    <div class="vote-verdict-abstained">ABSTAINED</div>
    <div class="vote-result-note">No bills could pass — coalition support too low.</div>`;
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
  document.getElementById('vote-sidebar').style.display = 'none';
}

export function renderEnding(playerParty, coalition, finalLoyalty, billsProposed, flagshipsPassed, collapsed) {
  document.getElementById('screen-parliament').style.display = 'none';
  const screen = document.getElementById('screen-ending');
  screen.style.display = 'block';

  const tier  = collapsed ? 'collapse' : flagshipsPassed >= 3 ? 'high' : flagshipsPassed >= 1 ? 'mid' : 'low';
  const text  = ENDINGS[coalition.id]?.[playerParty.name]?.[tier] ?? '';
  const title = coalition.titles[playerParty.name];

  document.getElementById('ending-coalition-title').textContent = title;
  document.getElementById('ending-text').textContent            = text;

  const partners = coalition.parties
    .filter(n => n !== playerParty.name)
    .map(n => PARTIES.find(p => p.name === n));

  const mandateCls   = flagshipsPassed >= 3 ? 'loyalty-up' : flagshipsPassed >= 1 ? 'loyalty-neutral' : 'loyalty-down';
  const collapsedRow = collapsed
    ? `<div class="ending-stat-row ending-stat-collapse">Coalition collapsed mid-session</div>`
    : '';

  document.getElementById('ending-stats').innerHTML = `
    ${collapsedRow}
    <div class="ending-stat-row">Mandate bills passed: <strong class="${mandateCls}">${flagshipsPassed} / 3</strong></div>
    <div class="ending-stat-row">Bills proposed: <strong>${billsProposed}</strong></div>
    ${partners.map(p => {
      const loy = finalLoyalty[p.name] ?? 100;
      const cls = loy >= 60 ? 'loyalty-up' : loy >= 30 ? 'loyalty-neutral' : 'loyalty-down';
      return `<div class="ending-stat-row">
        <span class="swatch" style="background:${p.color}"></span>
        ${p.name} final loyalty: <strong class="${cls}">${loy.toFixed(1)}%</strong>
      </div>`;
    }).join('')}
  `;
}
