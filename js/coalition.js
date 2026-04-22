// Page 3 — Coalition Formation (see pages.txt)
import { PARTIES, COALITIONS, ENDINGS, econLabel, socialLabel, logoSrc } from './data.js';

const coalitionScreen = document.getElementById('screen-coalition');

function coalitionTotalSeats(coalition) {
  return coalition.parties.reduce((sum, name) => sum + PARTIES.find(p => p.name === name).seats, 0);
}

export function showCoalition(playerParty, onBack, onConfirm) {
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
    const seats       = coalitionTotalSeats(c);
    const partnerObjs = c.parties
      .filter(n => n !== playerParty.name)
      .map(n => PARTIES.find(p => p.name === n));
    const over = seats >= majority;
    const pct  = Math.round(seats / totalAll * 100);

    const logosHTML = partnerObjs.map(p => `
      <div class="coalition-option-party-col">
        <img class="coalition-option-logo" src="${logoSrc(p.name)}" alt="">
        <span class="coalition-option-party-label" style="color:${p.color};">${p.name}</span>
      </div>
    `).join('');

    return `
      <div class="coalition-option-card" data-id="${c.id}">
        <div class="coalition-option-name">${c.name}</div>
        <div class="coalition-option-logos">${logosHTML}</div>
        <div class="coalition-option-seat-track">
          <div class="coalition-option-seat-fill" style="width:${pct}%;"></div>
        </div>
        <div class="coalition-option-footer">
          <span class="${over ? 'majority-ok' : 'majority-fail'}">${seats} seats &middot; ${pct}%</span>
          <span class="${over ? 'majority-ok' : 'majority-fail'}">${over ? 'Majority &#10003;' : 'No majority &#10007;'}</span>
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

  const titleEl = document.getElementById('coalition-scenario-title');
  titleEl.textContent = coalition.titles[playerParty.name];
  titleEl.style.color = playerParty.color;

  document.getElementById('coalition-scenario').textContent =
    coalition.scenarios[playerParty.name];

  const partners = coalition.parties
    .filter(n => n !== playerParty.name)
    .map(name => PARTIES.find(p => p.name === name));

  document.getElementById('coalition-partners').innerHTML = partners.map(p => `
    <div class="coalition-card" style="border-color:${p.color}; box-shadow: 4px 4px 0 ${p.color}40;">
      <div class="coalition-card-header">
        <img class="coalition-card-logo" src="${logoSrc(p.name)}" alt="">
        <span class="coalition-card-name">${p.name}</span>
      </div>
      <div class="coalition-card-tag">${p.ideology}</div>
      <div class="coalition-card-stats">
        ${p.seats} seats &nbsp;&middot;&nbsp; ${econLabel(p.economic)} &nbsp;&middot;&nbsp; ${socialLabel(p.social)}
      </div>
    </div>
  `).join('');

  const totalAll   = PARTIES.reduce((sum, p) => sum + p.seats, 0);
  const majority   = Math.floor(totalAll / 2) + 1;
  const seats      = coalitionTotalSeats(coalition);
  const pct        = Math.round(seats / totalAll * 100);
  const over       = seats >= majority;
  document.getElementById('coalition-seats').innerHTML =
    `<span class="${over ? 'majority-ok' : 'majority-fail'}">${seats} seats</span>` +
    `<span class="coalition-seats-meta"> of ${totalAll} &nbsp;&middot;&nbsp; ${pct}% &nbsp;&middot;&nbsp; ` +
    `${over ? 'majority' : 'no majority'}</span>`;

  const formBtn = document.getElementById('btn-form-coalition');
  formBtn.style.borderColor = playerParty.color;
  formBtn.style.color       = playerParty.color;

  formBtn.onclick = () => {
    coalitionScreen.style.display = 'none';
    onConfirm(partners, coalition);
  };
}
