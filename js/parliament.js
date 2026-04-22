// Page 4 — Parliament Chamber entry point (see pages.txt)
import { PARTIES } from './data.js';
import { calculateSeats } from './layout.js';
import { renderSeats, renderLegend, renderAgenda, renderBills, renderVoteResult,
         applyVoteAppearance, clearVoteDisplay, setCoalitionState, renderEnding } from './render.js';
import { init, dealBills, proposeBill } from './vote.js';
import { showPartySelect } from './select.js';
import { showCoalition } from './coalition.js';

function startFlow() {
  document.getElementById('screen-coalition').style.display = 'none';
  document.getElementById('screen-select').style.display   = 'block';
  document.getElementById('homepage-art').style.display    = 'block';

  showPartySelect(party => {
    showCoalition(party, startFlow, (partners, coalition) => {
      document.getElementById('screen-parliament').style.display = 'block';

      const seats = calculateSeats(PARTIES);

      setCoalitionState(party, partners);
      init(seats, party, partners);
      renderSeats(seats);
      renderLegend(party, partners, Object.fromEntries(partners.map(p => [p.name, 100])));
      renderAgenda(0, 0);

      const BILL_LIMIT = 10;

      function nextTurn() {
        clearVoteDisplay(seats);
        renderBills(dealBills(), bill => {
          const result = proposeBill(bill);
          applyVoteAppearance(seats, result.votes);
          renderVoteResult(bill, result);
          renderLegend(party, partners, result.newLoyalty);
          renderAgenda(result.agendaScore, result.billsProposed);
          if (result.billsProposed >= BILL_LIMIT) {
            document.getElementById('btn-next-bills').textContent = 'End Session →';
            document.getElementById('btn-next-bills').onclick =
              () => renderEnding(party, coalition, result.agendaScore);
          } else {
            document.getElementById('btn-next-bills').textContent = 'Next →';
            document.getElementById('btn-next-bills').onclick = nextTurn;
          }
        });
      }

      nextTurn();
    });
  });
}

startFlow();
