import { PARTIES, BILLS, STARTING_DOMAINS } from './data.js';

let seats            = [];
let playerParty      = null;
let partners         = [];
let loyalty          = {};
let domainState      = {};
let billsPassed      = 0;
let leftBillsPassed  = 0;
let domainsPassedSet = new Set();

export function init(computedSeats, party, coalitionPartners) {
  seats            = computedSeats;
  playerParty      = party;
  partners         = coalitionPartners;
  loyalty          = Object.fromEntries(coalitionPartners.map(p => [p.name, 100]));
  domainState      = { ...STARTING_DOMAINS };
  billsPassed      = 0;
  leftBillsPassed  = 0;
  domainsPassedSet = new Set();
}

// Picks 10 bills from the full pool, filtering out domain bills that can't move further.
export function initAgenda() {
  const eligible = BILLS.filter(bill => {
    if (!bill.domainDelta) return true;           // fiscal bills always eligible
    const cur = domainState[bill.domain] ?? 3;
    if (bill.domainDelta > 0 && cur >= 5) return false;
    if (bill.domainDelta < 0 && cur <= 1) return false;
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
      const ayes = Math.floor((L + (1 - L) * c) * p.seats);
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
    if (bill.domain)      domainsPassedSet.add(bill.domain);
  }

  // Civic freedom (1=captured, 5=reformed) dampens negative loyalty changes.
  // civic 1 → no dampen (factor 1.0); civic 5 → 30% dampen (factor 0.7).
  const civicFactor = 1 - (domainState.civic - 1) * 0.075;

  const loyaltyChanges = {};
  if (passed) {
    partners.forEach(p => {
      const distance = Math.abs(bill.score - p[bill.type]);
      const raw      = Math.max(-20, Math.min(5, 5 - distance * 1.5));
      const delta    = raw < 0 ? raw * civicFactor : raw;
      const next     = Math.max(0, Math.min(100, loyalty[p.name] + delta));
      loyaltyChanges[p.name] = { delta, prev: loyalty[p.name], next };
      loyalty[p.name] = next;
    });

    if (bill.domainDelta && bill.domain) {
      domainState[bill.domain] = Math.max(1, Math.min(5,
        (domainState[bill.domain] ?? 3) + bill.domainDelta
      ));
    }
  }

  return {
    passed,
    ayes:       totalAyes,
    nays:       totalNays,
    breakdown,
    votes:      buildVoteArray(breakdown),
    loyaltyChanges,
    newLoyalty: { ...loyalty },
    econEffect: passed ? (bill.econEffect ?? null) : null,
  };
}

export function getDomainState()  { return { ...domainState }; }
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
