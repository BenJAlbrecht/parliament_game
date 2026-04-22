// Pages 1 & 2 — Party Grid and Party Detail (see pages.txt)
import { PARTIES } from './data.js';

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
    <div class="party-card" data-index="${i}" style="border-color:${p.color}; box-shadow: 4px 4px 0 ${p.color}40;">
      <div class="party-card-header">
        <span class="swatch" style="background:${p.color}; width:14px; height:14px;"></span>
        <span class="party-card-name">${p.name}</span>
      </div>
      <div class="party-card-tag">${p.ideology}</div>
      <div class="party-card-summary">${p.bio.summary}</div>
      <div class="party-card-seats">${p.seats} seats</div>
    </div>
  `).join('');

  partyGrid.querySelectorAll('.party-card').forEach(card => {
    card.addEventListener('click', () => {
      const party = PARTIES[+card.dataset.index];
      showDetail(party, onConfirm);
    });
  });
}

function showDetail(party, onConfirm) {
  partyGrid.style.display = 'none';
  partyDetail.style.display = 'block';
  document.getElementById('homepage-art').style.display = 'none';

  document.getElementById('detail-swatch').style.background = party.color;
  document.getElementById('detail-name').textContent = party.name;
  document.getElementById('detail-tag').textContent = party.ideology;
  document.getElementById('detail-summary').textContent = party.bio.summary;
  document.getElementById('detail-history').textContent = party.bio.history;
  document.getElementById('detail-seats').textContent = `${party.seats} seats`;

  document.getElementById('btn-back').onclick = () => {
    partyDetail.style.display = 'none';
    partyGrid.style.display = 'grid';
    document.getElementById('homepage-art').style.display = 'block';
  };

  document.getElementById('btn-confirm').onclick = () => {
    screenSelect.style.display = 'none';
    document.getElementById('homepage-art').style.display = 'none';
    setPartyFlags(party);
    onConfirm(party);
  };
}
