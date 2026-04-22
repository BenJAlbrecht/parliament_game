import { PARTIES, ENDINGS, POLICY_SCALES, econLabel, socialLabel, leanLabel, leanCls } from './data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg    = document.getElementById('chamber-svg');

let _govIndices = new Set();

export function setCoalitionState(playerParty, partners) {
  const govNames = new Set([playerParty.name, ...partners.map(p => p.name)]);
  _govIndices = new Set(PARTIES.map((p, i) => govNames.has(p.name) ? i : -1).filter(i => i >= 0));
}

export function renderCompass(playerParty, partners) {
  const compassSvg = document.getElementById('compass-svg');
  compassSvg.innerHTML = '';

  const W = 280, pad = 38, plotSize = W - 2 * pad;
  const mapX = e => pad + ((e + 10) / 20) * plotSize;
  const mapY = s => pad + ((s + 10) / 20) * plotSize;
  const cx = mapX(0), cy = mapY(0);

  const mk = (tag, attrs = {}, text) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text !== undefined) el.textContent = text;
    return el;
  };

  // Plot area background
  compassSvg.appendChild(mk('rect', { x: pad, y: pad, width: plotSize, height: plotSize, fill: '#162032' }));

  // Plot border
  compassSvg.appendChild(mk('rect', { x: pad, y: pad, width: plotSize, height: plotSize, fill: 'none', stroke: '#1e293b', 'stroke-width': '1' }));

  // Center crosshairs
  compassSvg.appendChild(mk('line', { x1: pad, y1: cy, x2: pad + plotSize, y2: cy, stroke: '#1e293b', 'stroke-width': '1' }));
  compassSvg.appendChild(mk('line', { x1: cx, y1: pad, x2: cx, y2: pad + plotSize, stroke: '#1e293b', 'stroke-width': '1' }));

  // Axis labels (outside the plot, in padding)
  const lbl = (x, y, anchor, txt) =>
    mk('text', { x, y, fill: '#64748b', 'font-size': '8', 'font-family': 'Inconsolata, monospace', 'text-anchor': anchor }, txt);

  compassSvg.appendChild(lbl(cx, pad - 6, 'middle', 'PROGRESSIVE'));
  compassSvg.appendChild(lbl(cx, pad + plotSize + 14, 'middle', 'TRADITIONAL'));
  compassSvg.appendChild(lbl(pad - 4, cy + 4, 'end', 'LEFT'));
  compassSvg.appendChild(lbl(pad + plotSize + 4, cy + 4, 'start', 'RIGHT'));

  // Party dots
  PARTIES.forEach(p => {
    const x        = mapX(p.economic);
    const y        = mapY(p.social);
    const isPlayer = p === playerParty;

    const dot = mk('circle', { cx: x, cy: y, r: isPlayer ? '7' : '5', fill: p.color, opacity: '1' });
    dot.appendChild(mk('title', {}, p.name));
    compassSvg.appendChild(dot);

    // Short label: initials, or first 2 chars for single-word names
    const words = p.name.split(/\s+/);
    const abbr  = words.length > 1 ? words.map(w => w[0]).join('') : p.name.slice(0, 2).toUpperCase();
    const onLeft = x <= cx;
    compassSvg.appendChild(mk('text', {
      x: x + (onLeft ? 9 : -9), y: y + 4,
      fill: p.color,
      'font-size': '8', 'font-family': 'Inconsolata, monospace',
      'text-anchor': onLeft ? 'start' : 'end',
    }, abbr));
  });
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

export function renderAgenda(agenda, loyalty, player, partners, onSelect, onAbstain, onBack) {
  const total    = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority = Math.floor(total / 2) + 1;

  document.getElementById('phase-policy').style.display      = 'none';
  document.getElementById('phase-agenda').style.display      = 'block';
  document.getElementById('phase-bill-detail').style.display = 'none';
  document.getElementById('phase-result').style.display      = 'none';
  document.getElementById('vote-sidebar').style.display      = 'none';

  document.getElementById('btn-agenda-back').onclick = onBack;

  const DOMAIN_ORDER = Object.keys(POLICY_SCALES);

  const agendaData = agenda.map((bill, i) => {
    let ayes = player.seats;
    for (const p of partners) {
      const L = loyalty[p.name] / 100;
      const k = Math.abs(bill.score - p[bill.type]);
      const c = Math.max(0, 1 - k / 10);
      ayes   += Math.floor((L + (1 - L) * c) * p.seats);
    }
    return { bill, passable: ayes >= majority, idx: i };
  });

  const allBlocked = agendaData.every(d => !d.passable);

  // Group by dimension, preserving POLICY_SCALES order
  const groupMap = new Map();
  agendaData.forEach(d => {
    const dim = d.bill.dimension ?? 'other';
    if (!groupMap.has(dim)) groupMap.set(dim, []);
    groupMap.get(dim).push(d);
  });
  const groups = [...groupMap.entries()].sort(([a], [b]) => {
    return (DOMAIN_ORDER.indexOf(a) + 1 || 99) - (DOMAIN_ORDER.indexOf(b) + 1 || 99);
  });

  document.getElementById('agenda-list').innerHTML = groups.map(([dim, items]) => {
    const groupLabel = POLICY_SCALES[dim]?.label ?? 'Other';
    const billsHTML  = items.map(d => {
      const { bill, passable } = d;
      const statusCls  = passable ? 'pass' : 'block';
      const statusWord = passable ? 'Passable &#10003;' : 'Blocked &#10007;';
      const mandateTag = bill.flagship ? `<span class="bill-mandate-tag">Mandate</span>` : '';
      return `
        <div class="agenda-item ${passable ? 'agenda-item--passable' : 'agenda-item--blocked'}" data-agenda-idx="${d.idx}">
          <div class="agenda-item-body">
            <div class="agenda-item-title">${bill.title}</div>
            <div class="agenda-item-meta">
              <span class="bill-lean-tag ${leanCls(bill.score)}">${leanLabel(bill.score)}</span>
              ${mandateTag}
            </div>
          </div>
          <span class="bill-pass-status ${statusCls}">${statusWord}</span>
        </div>`;
    }).join('');
    return `
      <div class="agenda-group">
        <div class="agenda-group-label">${groupLabel}</div>
        ${billsHTML}
      </div>`;
  }).join('');

  document.getElementById('agenda-list').querySelectorAll('.agenda-item').forEach(item => {
    item.addEventListener('click', () => {
      const d = agendaData[+item.dataset.agendaIdx];
      onSelect(d.bill);
    });
  });

  const blockedDiv = document.getElementById('phase-agenda-blocked');
  blockedDiv.style.display = allBlocked ? 'block' : 'none';
  if (allBlocked) {
    document.getElementById('btn-abstain').onclick = onAbstain;
  }
}

// ── Bill detail ──────────────────────────────────────────────────────────────

export function renderBillDetail(bill, loyalty, player, partners, policyState, onBack, onPropose) {
  const total    = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority = Math.floor(total / 2) + 1;

  document.getElementById('phase-policy').style.display      = 'none';
  document.getElementById('phase-agenda').style.display      = 'none';
  document.getElementById('phase-bill-detail').style.display = 'block';
  document.getElementById('phase-result').style.display      = 'none';

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
  const totalNays = total - totalAyes;
  const passable  = totalAyes >= majority;

  const govRows = breakdown.filter(b => b.role !== 'opposition');
  const oppRows = breakdown.filter(b => b.role === 'opposition');

  const breakdownRows = [...govRows, ...oppRows].map(b => {
    const isPlayer = b.role === 'player';
    const isOpp    = b.role === 'opposition';
    const ayePct   = (b.ayes / b.party.seats) * 100;
    const youTag   = isPlayer ? ` <span class="you-tag">YOU</span>` : '';
    return `
      <div class="bill-bd-row${isOpp ? ' bill-bd-row--opp' : ''}">
        <span class="bill-bd-dot" style="background:${b.party.color};"></span>
        <span class="bill-bd-name">${b.party.name}${youTag}</span>
        <div class="bill-bd-bar"><div class="bill-bd-bar-fill" style="width:${ayePct}%; background:${b.party.color};"></div></div>
        <span class="bill-bd-counts"><span style="color:${b.party.color}">${b.ayes}</span><span class="bill-bd-sep"> / </span>${b.nays}</span>
      </div>`;
  }).join('');

  const loyaltyRows = partners.map(p => {
    const distance   = Math.abs(bill.score - p[bill.type]);
    const delta      = Math.max(-20, Math.min(5, 5 - distance * 1.5));
    const sign       = delta >= 0 ? '+' : '';
    const cls        = delta > 0 ? 'loyalty-up' : delta < 0 ? 'loyalty-down' : 'loyalty-neutral';
    const currentLoy = loyalty[p.name] ?? 100;
    return `
      <div class="bill-loy-row">
        <span class="bill-loy-dot" style="background:${p.color};"></span>
        <span class="bill-loy-name">${p.name}</span>
        <div class="bill-loy-meter"><div class="bill-loy-fill" style="width:${currentLoy}%; background:${p.color}40;"></div></div>
        <span class="bill-loy-pct">${currentLoy.toFixed(0)}%</span>
        <span class="bill-loy-delta ${cls}">${sign}${delta.toFixed(1)}</span>
      </div>`;
  }).join('');

  const mandateTag  = bill.flagship ? `<span class="bill-mandate-tag">Mandate</span>` : '';
  const posLabel    = bill.type === 'economic' ? econLabel(bill.score) : socialLabel(bill.score);
  const verdictCls  = passable ? 'pass' : 'block';
  const verdictText = passable ? 'PASSES &#10003;' : 'BLOCKED &#10007;';
  const accentColor = passable ? '#4ade80' : '#f87171';

  const policySection = bill.dimension && bill.delta ? (() => {
    const scale      = POLICY_SCALES[bill.dimension];
    const curVal     = policyState[bill.dimension] ?? 1;
    const newVal     = Math.max(1, Math.min(5, curVal + bill.delta));
    const signCls    = bill.delta > 0 ? 'policy-step--up' : 'policy-step--down';
    const [lp, rp]   = scale.poles;
    const deltaSign  = bill.delta > 0 ? '+' : '';
    const deltaColor = bill.delta > 0 ? 'loyalty-up' : 'loyalty-down';
    return `
      <div class="bill-section">
        <div class="bill-section-header">
          <span class="bill-section-label">Policy Effect</span>
          <span class="bill-section-note">if passed &nbsp;<span class="${deltaColor}">${deltaSign}${bill.delta}</span></span>
        </div>
        <div class="bill-policy-dim-name">${scale.label}</div>
        <div class="policy-spectrum policy-spectrum--compact">
          <span class="policy-pole policy-pole--left">${lp}</span>
          <div class="policy-track">${policyTrack(newVal, curVal, signCls)}</div>
          <span class="policy-pole policy-pole--right">${rp}</span>
        </div>
        <div class="bill-policy-transition">
          <span class="bill-policy-from">${scale.steps[curVal - 1]}</span>
          <span class="bill-policy-arrow ${deltaColor}">&#8594;</span>
          <span class="bill-policy-to ${deltaColor}">${scale.steps[newVal - 1]}</span>
        </div>
      </div>`;
  })() : '';

  const proposeSection = passable
    ? `<button id="btn-propose" class="primary bill-propose-btn">Propose Bill &#8594;</button>`
    : `<div class="bill-blocked-msg">Coalition support too low — cannot bring this bill to the floor.</div>`;

  document.getElementById('bill-detail-content').innerHTML = `
    <button class="back-btn" id="btn-bill-back">&#8592; Back to Agenda</button>

    <div class="bill-header-card" style="border-top-color:${accentColor};">
      <div class="bill-header-body">
        <div class="bill-header-title">${bill.title}</div>
        <div class="bill-header-meta">
          <span class="bill-card-type">${bill.type}</span>
          ${mandateTag}
          <span class="bill-position-tag">${posLabel}</span>
        </div>
      </div>
      <div class="bill-verdict bill-verdict--${verdictCls}">${verdictText}</div>
    </div>

    <div class="bill-section">
      <div class="bill-section-header">
        <span class="bill-section-label">Vote Breakdown</span>
        <span class="bill-section-note">${totalAyes} aye &nbsp;&middot;&nbsp; ${totalNays} nay &nbsp;&middot;&nbsp; need ${majority}</span>
      </div>
      ${breakdownRows}
    </div>

    <div class="bill-section">
      <div class="bill-section-header">
        <span class="bill-section-label">Coalition Loyalty</span>
        <span class="bill-section-note">if passed</span>
      </div>
      ${loyaltyRows}
    </div>

    ${policySection}

    ${proposeSection}
  `;

  document.getElementById('btn-bill-back').onclick = onBack;
  if (passable) document.getElementById('btn-propose').onclick = onPropose;
}

// ── Vote result / abstain ────────────────────────────────────────────────────

export function renderVoteResult(bill, result) {
  const total    = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority = Math.floor(total / 2) + 1;

  document.getElementById('phase-policy').style.display      = 'none';
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
  document.getElementById('phase-policy').style.display      = 'none';
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

function policyTrack(activeVal, dimVal = null, activeCls = 'policy-step--active') {
  return Array.from({ length: 5 }, (_, i) => {
    const step = i + 1;
    let cls = 'policy-step';
    if (step === activeVal)  cls += ` ${activeCls}`;
    else if (step === dimVal) cls += ' policy-step--dim';
    return `<div class="${cls}"></div>`;
  }).join('');
}

export function renderPolicyState(policyState, onOpenAgenda) {
  document.getElementById('phase-policy').style.display      = 'block';
  document.getElementById('phase-agenda').style.display      = 'none';
  document.getElementById('phase-bill-detail').style.display = 'none';
  document.getElementById('phase-result').style.display      = 'none';
  document.getElementById('vote-sidebar').style.display      = 'none';

  const scales = Object.entries(POLICY_SCALES);
  document.getElementById('policy-dim-list').innerHTML =
    scales.map(([key, scale], idx) => {
      const val  = policyState[key] ?? 1;
      const desc = scale.steps[val - 1] ?? '';
      const [leftPole, rightPole] = scale.poles;
      return `
        <div class="policy-dimension">
          <div class="policy-dim-name">${scale.label}</div>
          <div class="policy-spectrum">
            <span class="policy-pole policy-pole--left">${leftPole}</span>
            <div class="policy-track">${policyTrack(val)}</div>
            <span class="policy-pole policy-pole--right">${rightPole}</span>
          </div>
          <div class="policy-dim-desc">${desc}</div>
        </div>`;
    }).join('');

  document.getElementById('btn-open-agenda').onclick = onOpenAgenda;
}

export function renderProgramme(committedGoals, policyState, stats) {
  const el = document.getElementById('programme-goals');
  if (!committedGoals || Object.keys(committedGoals).length === 0) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.innerHTML = `
    <div class="panel-section-label" style="margin-top:1.5rem;">Programme for Government</div>
    <div class="programme-goal-list">
      ${Object.entries(committedGoals).map(([partnerName, goal]) => {
        const partner = PARTIES.find(p => p.name === partnerName);
        const met     = goal.check(policyState, stats);
        return `
          <div class="programme-goal-item ${met ? 'programme-goal--met' : 'programme-goal--unmet'}">
            <span class="programme-goal-icon">${met ? '✓' : '·'}</span>
            <div class="programme-goal-body">
              <div class="programme-goal-partner" style="color:${partner?.color ?? '#94a3b8'}">${partnerName}</div>
              <div class="programme-goal-title">${goal.title}</div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

export function renderEnding(playerParty, coalition, finalLoyalty, billsProposed, flagshipsPassed, collapsed, committedGoals, stats) {
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

  const goalRows = (committedGoals && stats)
    ? Object.entries(committedGoals).map(([partnerName, goal]) => {
        const partner = PARTIES.find(p => p.name === partnerName);
        const met     = goal.check(stats.policyState ?? {}, stats);
        const cls     = met ? 'loyalty-up' : 'loyalty-down';
        const icon    = met ? '✓' : '✗';
        return `<div class="ending-stat-row">
          <span class="swatch" style="background:${partner?.color ?? '#94a3b8'}"></span>
          <span style="color:${partner?.color ?? '#94a3b8'}">${partnerName}</span>
          — ${goal.title}: <strong class="${cls}">${icon} ${met ? 'Met' : 'Missed'}</strong>
        </div>`;
      }).join('')
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
    ${goalRows ? `<div class="ending-stat-divider"></div><div class="ending-stat-section-label">Programme for Government</div>${goalRows}` : ''}
  `;
}
