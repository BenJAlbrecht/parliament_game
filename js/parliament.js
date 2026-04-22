// Page 4 — Parliament Chamber entry point (see pages.txt)
import { PARTIES } from './data.js';
import { calculateSeats } from './layout.js';
import { renderSeats, renderLegend, renderTurnCounter, renderAgenda, renderBillDetail,
         renderVoteResult, renderAbstainResult,
         applyVoteAppearance, clearVoteDisplay, setCoalitionState, renderEnding } from './render.js';
import { init, initAgenda, proposeBill, getLoyalty } from './vote.js';
import { showPartySelect } from './select.js';
import { showCoalition } from './coalition.js';

function startFlow() {
  document.getElementById('screen-coalition').style.display = 'none';
  document.getElementById('screen-select').style.display   = 'block';
  document.getElementById('homepage-art').style.display    = 'block';

  showPartySelect(party => {
    showCoalition(party, startFlow, (partners, coalition) => {
      document.getElementById('screen-parliament').style.display = 'block';

      const seats      = calculateSeats(PARTIES);
      const BILL_LIMIT = 10;

      let turnCount      = 0;
      let billsProposed  = 0;
      let flagshipsPassed = 0;

      const flagships = [...(coalition.flagships?.[party.name] ?? [])];
      let agenda      = initAgenda(flagships);

      const partyHeader = document.getElementById('party-header');
      partyHeader.innerHTML =
        `<span class="party-header-name" style="color:${party.color}">${party.name}</span>` +
        `<span class="party-header-role">Leader of the ${coalition.name}</span>`;

      setCoalitionState(party, partners);
      init(seats, party, partners);
      renderSeats(seats);
      renderLegend(party, partners, Object.fromEntries(partners.map(p => [p.name, 100])));

      function finishTurn(collapsed = false) {
        const btnNext = document.getElementById('btn-next-bills');
        if (collapsed) {
          btnNext.textContent = 'Coalition Collapsed →';
          btnNext.onclick     = () => renderEnding(party, coalition, getLoyalty(), billsProposed, flagshipsPassed, true);
        } else if (turnCount >= BILL_LIMIT) {
          btnNext.textContent = 'End Session →';
          btnNext.onclick     = () => renderEnding(party, coalition, getLoyalty(), billsProposed, flagshipsPassed, false);
        } else {
          btnNext.textContent = 'Next →';
          btnNext.onclick     = nextTurn;
        }
      }

      function showAgenda() {
        renderAgenda(
          agenda,
          getLoyalty(),
          party,
          partners,
          bill => showBillDetail(bill),
          () => { renderAbstainResult(); finishTurn(false); }
        );
      }

      function showBillDetail(bill) {
        renderBillDetail(
          bill,
          getLoyalty(),
          party,
          partners,
          () => showAgenda(),
          () => {
            billsProposed++;
            if (bill.flagship) flagshipsPassed++;
            agenda = agenda.filter(b => b.title !== bill.title);
            const result = proposeBill(bill);
            applyVoteAppearance(seats, result.votes);
            renderVoteResult(bill, result);
            renderLegend(party, partners, result.newLoyalty);
            const collapsed = partners.some(p => (result.newLoyalty[p.name] ?? 100) <= 0);
            finishTurn(collapsed);
          }
        );
      }

      function nextTurn() {
        turnCount++;
        renderTurnCounter(turnCount, BILL_LIMIT);
        clearVoteDisplay(seats);
        showAgenda();
      }

      nextTurn();
    });
  });
}

startFlow();
