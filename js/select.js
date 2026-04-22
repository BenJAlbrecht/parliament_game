// Pages 1 & 2 — Party Grid and Party Detail (see pages.txt)
import { PARTIES, COALITIONS, econLabel, socialLabel, logoSrc } from './data.js';

const FLAG_MAP = {
  "People's Alliance": 'flag-pa',
  'Socialist Party':   'flag-sp',
  'Renewal':           'flag-r',
  'Christian Democrats': 'flag-cd',
  'National Front':    'flag-NF',
};

function setPartyFlags(party) {
  const file = party ? FLAG_MAP[party.name] : 'flag-base';
  const src  = `images/party_flags/${file}.svg`;
  document.querySelectorAll('.header-flag').forEach(img => { img.src = src; });
}

const screenSelect = document.getElementById('screen-select');
const partyGrid    = document.getElementById('party-grid');
const partyDetail  = document.getElementById('party-detail');

export function showPartySelect(onConfirm) {
  renderGrid(onConfirm);
}

function renderGrid(onConfirm) {
  partyGrid.style.display = 'grid';
  partyDetail.style.display = 'none';

  partyGrid.innerHTML = PARTIES.map((p, i) => `
    <div class="party-card" data-index="${i}" style="border-left-color:${p.color};">
      <div class="party-card-header">
        <span class="party-card-name" style="color:${p.color};">${p.name}</span>
        <img class="party-card-logo" src="${logoSrc(p.name)}" alt="">
      </div>
      <div class="party-card-tag">${p.ideology}</div>
      <div class="party-card-summary">${p.bio.summary}</div>
      <div class="party-card-footer">
        <span class="party-card-seats-badge" style="border-color:${p.color}; color:${p.color};">${p.seats} seats</span>
      </div>
    </div>
  `).join('');

  partyGrid.querySelectorAll('.party-card').forEach(card => {
    card.addEventListener('click', () => {
      const party = PARTIES[+card.dataset.index];
      showDetail(party, onConfirm);
    });
  });
}

function posBar(value, color) {
  const pct = ((value + 10) / 20) * 100;
  return `
    <div class="detail-pos-track">
      <div class="detail-pos-fill" style="left:${pct}%; background:${color};"></div>
    </div>
  `;
}

function showDetail(party, onConfirm) {
  partyGrid.style.display = 'none';
  partyDetail.style.display = 'block';

  const totalSeats = PARTIES.reduce((s, p) => s + p.seats, 0);
  const seatPct    = Math.round(party.seats / totalSeats * 100);

  const coalitionPartners = COALITIONS
    .filter(c => c.parties.includes(party.name))
    .map(c => {
      const partners = c.parties
        .filter(n => n !== party.name)
        .map(n => PARTIES.find(p => p.name === n));
      return { coalition: c, partners };
    });

  const partnersHTML = coalitionPartners.map(({ coalition, partners }) => `
    <div class="detail-coalition-row">
      <span class="detail-coalition-name">${coalition.name}</span>
      ${partners.map(p => `<span class="detail-partner-swatch" style="background:${p.color};" title="${p.name}"></span>`).join('')}
      ${partners.map(p => `<span class="detail-partner-name">${p.name}</span>`).join('<span class="detail-partner-sep">&middot;</span>')}
    </div>
  `).join('');

  document.getElementById('detail-card-body').innerHTML = `
    <div class="detail-layout">
      <div class="detail-col-stats">
        <div class="detail-top-row">
          <img class="detail-logo" src="${logoSrc(party.name)}" alt="">
          <div>
            <div class="detail-party-heading" style="color:${party.color};">${party.name}</div>
            <div class="detail-ideology-tag">${party.ideology}</div>
          </div>
        </div>

        <div class="detail-stat-block">
          <div class="detail-stat-label">Seats</div>
          <div class="detail-seat-row">
            <div class="detail-seat-track">
              <div class="detail-seat-fill" style="width:${seatPct}%; background:${party.color};"></div>
            </div>
            <span class="detail-seat-count" style="color:${party.color};">${party.seats} <span class="detail-seat-pct">(${seatPct}%)</span></span>
          </div>
        </div>

        <div class="detail-stat-block">
          <div class="detail-stat-label">Economic</div>
          <div class="detail-pos-label">${econLabel(party.economic)}</div>
          ${posBar(party.economic, party.color)}
        </div>

        <div class="detail-stat-block">
          <div class="detail-stat-label">Social</div>
          <div class="detail-pos-label">${socialLabel(party.social)}</div>
          ${posBar(party.social, party.color)}
        </div>

        <div class="detail-stat-block">
          <div class="detail-stat-label">Coalitions</div>
          ${partnersHTML || '<div class="detail-no-coalition">None available</div>'}
        </div>

        <button id="btn-confirm" class="primary confirm-btn" style="margin-top:1.25rem; border-color:${party.color}; color:${party.color};">Lead this party &#8594;</button>
      </div>

      <div class="detail-col-narrative">
        <p class="detail-summary-text">${party.bio.summary}</p>
        <p class="detail-history-text">${party.bio.history}</p>
      </div>
    </div>
  `;

  document.getElementById('btn-back').onclick = () => {
    partyDetail.style.display = 'none';
    partyGrid.style.display = 'grid';
  };

  document.getElementById('btn-confirm').onclick = () => {
    screenSelect.style.display = 'none';
    setPartyFlags(party);
    onConfirm(party);
  };
}
