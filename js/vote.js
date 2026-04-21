import { PARTIES, BILLS } from './data.js';
import { renderResult, renderHistory, applyVoteAppearance, clearVoteDisplay } from './render.js';

let seats = [];
let playerParty = null;
let votesPassed = 0;
let votesFailed = 0;
let totalVotes = 0;
let history = [];

export function init(computedSeats, party) {
  seats = computedSeats;
  playerParty = party;
}

export function callVote() {
  const bill = BILLS[Math.floor(Math.random() * BILLS.length)];
  document.getElementById('bill').style.display = 'block';
  document.getElementById('bill-title').textContent = bill;

  // Each party randomly picks a stance for this bill
  const partyStance = PARTIES.map(() => Math.random() < 0.5 ? 'aye' : 'nay');
  const partyTally = PARTIES.map(() => ({ aye: 0, nay: 0 }));
  let ayes = 0, nays = 0;

  // Roll loyalty for each MP and record their vote
  const votes = seats.map(s => {
    const party = PARTIES[s.partyIndex];
    const stance = partyStance[s.partyIndex];
    const vote = Math.random() < party.loyalty ? stance : (stance === 'aye' ? 'nay' : 'aye');
    if (vote === 'aye') { ayes++; partyTally[s.partyIndex].aye++; }
    else                { nays++; partyTally[s.partyIndex].nay++; }
    return vote;
  });

  applyVoteAppearance(seats, votes);

  totalVotes++;
  const passed = ayes > nays;
  if (passed) votesPassed++; else votesFailed++;

  renderResult(passed, ayes, nays, partyTally);

  history.unshift({ bill, ayes, nays, passed });
  if (history.length > 8) history.pop();
  renderHistory(history, votesPassed, votesFailed, totalVotes);
}

export function clearVotes() {
  clearVoteDisplay(seats);
}

export function resetSession() {
  clearVotes();
  votesPassed = 0;
  votesFailed = 0;
  totalVotes = 0;
  history = [];
  renderHistory(history, votesPassed, votesFailed, totalVotes);
}
