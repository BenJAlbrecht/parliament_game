// Page 3 — Coalition Formation (see pages.txt)
import { PARTIES, COALITIONS, ENDINGS, econLabel, socialLabel } from './data.js';

const coalitionScreen = document.getElementById('screen-coalition');

function coalitionTotalSeats(coalition) {
  return coalition.parties.reduce((sum, name) => sum + PARTIES.find(p => p.name === name).seats, 0);
}

export function showCoalition(playerParty, onBack, onConfirm) {
  document.getElementById('homepage-art').style.display = 'none';

  const options = playerParty.coalitions.map(id => COALITIONS.find(c => c.id === id));

  coalitionScreen.style.display = 'block';

  showChoice(playerParty, options, onBack, onConfirm);
}

function showChoice(playerParty, options, onBack, onConfirm) {
  document.getElementById('coalition-choice').style.display = 'block';
  document.getElementById('coalition-detail').style.display = 'none';

  const totalAll = PARTIES.reduce((sum, p) => sum + p.seats, 0);
  const majority = Math.floor(totalAll / 2) + 1;

  document.getElementById('coalition-options').innerHTML = options.map(c => {
    const seats = coalitionTotalSeats(c);
    const partners = c.parties.filter(n => n !== playerParty.name);
    const over = seats >= majority;
    return `
      <div class="coalition-option-card" data-id="${c.id}">
        <div class="coalition-option-name">${c.name}</div>
        <div class="coalition-option-partners">Coalition Partners: ${partners.join(' &middot; ')}</div>
        <div class="coalition-option-seats majority-ok">
          ${seats} seats
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('coalition-options').querySelectorAll('.coalition-option-card').forEach(card => {
    card.addEventListener('click', () => {
      const coalition = options.find(c => c.id === card.dataset.id);
      showDetail(playerParty, coalition, true, onBack, onConfirm);
    });
  });

  document.getElementById('btn-coalition-choice-back').onclick = () => {
    coalitionScreen.style.display = 'none';
    onBack();
  };
}

function showDetail(playerParty, coalition, showBack, onBack, onConfirm) {
  document.getElementById('coalition-choice').style.display = 'none';
  document.getElementById('coalition-detail').style.display = 'block';

  const backBtn = document.getElementById('btn-coalition-back');
  backBtn.style.display = 'inline-block';
  backBtn.onclick = showBack
    ? () => {
        document.getElementById('coalition-detail').style.display = 'none';
        document.getElementById('coalition-choice').style.display = 'block';
      }
    : () => {
        coalitionScreen.style.display = 'none';
        onBack();
      };

  document.getElementById('coalition-scenario-title').textContent =
    coalition.titles[playerParty.name];
  document.getElementById('coalition-scenario').textContent =
    coalition.scenarios[playerParty.name];

  const partners = coalition.parties
    .filter(n => n !== playerParty.name)
    .map(name => PARTIES.find(p => p.name === name));

  document.getElementById('coalition-partners').innerHTML = partners.map(p => `
    <div class="coalition-card" style="border-color:${p.color}; box-shadow: 4px 4px 0 ${p.color}40;">
      <div class="coalition-card-header">
        <span class="swatch" style="background:${p.color}; width:14px; height:14px;"></span>
        <span class="coalition-card-name">${p.name}</span>
      </div>
      <div class="coalition-card-tag">${p.ideology}</div>
      <div class="coalition-card-stats">
        ${p.seats} seats &nbsp;&middot;&nbsp; ${econLabel(p.economic)} &nbsp;&middot;&nbsp; ${socialLabel(p.social)}
      </div>
    </div>
  `).join('');

  const totalAll = PARTIES.reduce((sum, p) => sum + p.seats, 0);
  const seats    = coalitionTotalSeats(coalition);
  const pct      = Math.round(seats / totalAll * 100);
  document.getElementById('coalition-seats').textContent =
    `Total seats: ${seats}, out of ${totalAll} | ${pct}%`;

  document.getElementById('btn-form-coalition').onclick = () => {
    coalitionScreen.style.display = 'none';
    onConfirm(partners, coalition);
  };
}
