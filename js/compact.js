import { logoSrc } from './data.js';

export function showCompact(party, partners, onBack, onConfirm) {
  document.getElementById('screen-coalition').style.display = 'none';
  document.getElementById('screen-compact').style.display   = 'block';

  const selected = {};

  function updateBtn() {
    const allDone = partners.every(p => p.name in selected);
    document.getElementById('btn-confirm-programme').disabled = !allDone;
  }

  document.getElementById('btn-compact-back').onclick = () => {
    document.getElementById('screen-compact').style.display = 'none';
    onBack();
  };

  const container = document.getElementById('compact-partners');
  container.innerHTML = partners.map((p, pi) => `
    <div class="compact-partner-section">
      <div class="compact-partner-header">
        <img class="compact-partner-logo" src="${logoSrc(p.name)}" alt="">
        <div>
          <div class="compact-partner-name" style="color:${p.color}">${p.name}</div>
          <div class="compact-partner-prompt">Commit to one session goal</div>
        </div>
      </div>
      <div class="compact-goal-grid">
        ${p.goals.map((g, gi) => `
          <div class="compact-goal-card" data-pi="${pi}" data-gi="${gi}">
            <div class="compact-goal-title">${g.title}</div>
            <div class="compact-goal-desc">${g.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.onclick = e => {
    const card = e.target.closest('.compact-goal-card');
    if (!card) return;
    const pi      = parseInt(card.dataset.pi);
    const gi      = parseInt(card.dataset.gi);
    const partner = partners[pi];
    container.querySelectorAll(`.compact-goal-card[data-pi="${pi}"]`)
             .forEach(c => c.classList.remove('compact-goal-card--selected'));
    card.classList.add('compact-goal-card--selected');
    selected[partner.name] = partner.goals[gi];
    updateBtn();
  };

  document.getElementById('btn-confirm-programme').disabled = true;
  document.getElementById('btn-confirm-programme').onclick = () => {
    document.getElementById('screen-compact').style.display = 'none';
    onConfirm({ ...selected });
  };

  updateBtn();
}
