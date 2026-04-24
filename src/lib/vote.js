import { PARTIES, BILLS, STARTING_POLICY } from './data.js';

let seats            = [];
let playerParty      = null;
let partners         = [];
let loyalty          = {};
let policyState      = {};
let billsPassed      = 0;
let leftBillsPassed  = 0;
let domainsPassedSet = new Set();

export function init(computedSeats, party, coalitionPartners) {
  seats            = computedSeats;
  playerParty      = party;
  partners         = coalitionPartners;
  loyalty          = Object.fromEntries(coalitionPartners.map(p => [p.name, 100]));
  policyState      = { ...STARTING_POLICY };
  billsPassed      = 0;
  leftBillsPassed  = 0;
  domainsPassedSet = new Set();
}

export function initAgenda(party, partners, currentPolicyState) {
  const eligible = BILLS.filter(bill => {
    const cur = currentPolicyState[bill.dimension] ?? 3;
    if (bill.delta > 0 && cur >= 5) return false;
    if (bill.delta < 0 && cur <= 1) return false;
    return true;
  });
  return [...eligible].sort(() => Math.random() - 0.5).slice(0, 10);
}

export function proposeBill(bill) {
  const breakdown = PARTIES.map(p => {
    if (p === playerParty) {
      return { party: p, ayes: p.seats, nays: 0, role: 'player' };
    }
    if (partners.includes(p)) {
      const L    = loyalty[p.name] / 100;
      const k    = Math.abs(bill.score - p[bill.type]);
      const c    = Math.max(0, 1 - k / 10);
      const vuf  = L + (1 - L) * c;
      const ayes = Math.floor(vuf * p.seats);
      return { party: p, ayes, nays: p.seats - ayes, role: 'partner' };
    }
    return { party: p, ayes: 0, nays: p.seats, role: 'opposition' };
  });

  const totalAyes = breakdown.reduce((s, b) => s + b.ayes, 0);
  const totalNays = breakdown.reduce((s, b) => s + b.nays, 0);
  const total     = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority  = Math.floor(total / 2) + 1;
  const passed    = totalAyes >= majority;

  if (passed) {
    billsPassed++;
    if (bill.score <= -2) leftBillsPassed++;
    if (bill.dimension)   domainsPassedSet.add(bill.dimension);
  }

  const loyaltyChanges = {};
  if (passed) {
    partners.forEach(p => {
      const distance = Math.abs(bill.score - p[bill.type]);
      const delta    = Math.max(-20, Math.min(5, 5 - distance * 1.5));
      const next     = Math.max(0, Math.min(100, loyalty[p.name] + delta));
      loyaltyChanges[p.name] = { delta, prev: loyalty[p.name], next };
      loyalty[p.name] = next;
    });
    if (bill.dimension && bill.delta) {
      policyState[bill.dimension] = Math.max(1, Math.min(5, policyState[bill.dimension] + bill.delta));
    }
  }

  return {
    passed,
    ayes:    totalAyes,
    nays:    totalNays,
    breakdown,
    votes:   buildVoteArray(breakdown),
    loyaltyChanges,
    newLoyalty: { ...loyalty },
  };
}

export function getLoyalty()      { return { ...loyalty }; }
export function getPolicyState()  { return { ...policyState }; }
export function getSessionStats() {
  return { billsPassed, leftBillsPassed, domainsPassedCount: domainsPassedSet.size };
}

function buildVoteArray(breakdown) {
  const ayesLeft = {};
  breakdown.forEach(b => { ayesLeft[b.party.name] = b.ayes; });

  const byParty = {};
  seats.forEach((s, i) => {
    const name = PARTIES[s.partyIndex].name;
    (byParty[name] ??= []).push(i);
  });

  const votes = new Array(seats.length);
  Object.entries(byParty).forEach(([name, indices]) => {
    const shuffled = [...indices].sort(() => Math.random() - 0.5);
    const ayeCount = ayesLeft[name] ?? 0;
    shuffled.forEach((idx, j) => { votes[idx] = j < ayeCount ? 'aye' : 'nay'; });
  });

  return votes;
}
