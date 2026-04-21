import { PARTIES } from './data.js';
import { calculateSeats } from './layout.js';
import { renderSeats, renderLegend } from './render.js';
import { init, callVote, clearVotes, resetSession } from './vote.js';
import { showPartySelect } from './select.js';

showPartySelect(party => {
  const screenParliament = document.getElementById('screen-parliament');
  screenParliament.style.display = 'block';

  document.getElementById('playing-as').textContent =
    `Leading: ${party.name} · ${party.bio.tag}`;

  const seats = calculateSeats(PARTIES);
  init(seats, party);
  renderSeats(seats);
  renderLegend(party);

  document.getElementById('btn-vote').addEventListener('click', callVote);
  document.getElementById('btn-clear').addEventListener('click', clearVotes);
  document.getElementById('btn-reset').addEventListener('click', resetSession);
});
