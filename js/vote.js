import { PARTIES, BILLS } from './data.js';

let seats        = [];
let playerParty  = null;
let partners     = [];
let loyalty      = {};   // { partnerName: 0–100 }
let agendaScore  = 0;
let billsProposed = 0;

export function init(computedSeats, party, coalitionPartners) {
  seats         = computedSeats;
  playerParty   = party;
  partners      = coalitionPartners;
  loyalty       = Object.fromEntries(coalitionPartners.map(p => [p.name, 100]));
  agendaScore   = 0;
  billsProposed = 0;
}

export function dealBills() {
  const shuffled = [...BILLS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function proposeBill(bill) {
  billsProposed++;

  // Build per-party vote counts
  const breakdown = PARTIES.map(p => {
    if (p === playerParty) {
      return { party: p, ayes: p.seats, nays: 0, role: 'player' };
    }
    if (partners.includes(p)) {
      const pct  = loyalty[p.name] / 100;
      const ayes = Math.floor(pct * p.seats);
      return { party: p, ayes, nays: p.seats - ayes, role: 'partner' };
    }
    return { party: p, ayes: 0, nays: p.seats, role: 'opposition' };
  });

  const totalAyes = breakdown.reduce((s, b) => s + b.ayes, 0);
  const totalNays = breakdown.reduce((s, b) => s + b.nays, 0);
  const total     = PARTIES.reduce((s, p) => s + p.seats, 0);
  const majority  = Math.floor(total / 2) + 1;
  const passed    = totalAyes >= majority;

  // Loyalty update (only on pass)
  const loyaltyChanges = {};
  if (passed) {
    partners.forEach(p => {
      const distance = Math.abs(bill.score - p[bill.type]);
      const delta    = Math.max(-8, Math.min(3, 3 - distance * 0.6));
      const next     = Math.max(0, Math.min(100, loyalty[p.name] + delta));
      loyaltyChanges[p.name] = { delta, prev: loyalty[p.name], next };
      loyalty[p.name] = next;
    });

    // Agenda points for player's own alignment
    const playerDist = Math.abs(bill.score - playerParty[bill.type]);
    agendaScore += Math.max(0, 3 - playerDist * 0.6);
  }

  return {
    passed,
    ayes:    totalAyes,
    nays:    totalNays,
    breakdown,
    votes:   buildVoteArray(breakdown),
    loyaltyChanges,
    newLoyalty:    { ...loyalty },
    agendaScore,
    billsProposed,
  };
}

export function getLoyalty()      { return { ...loyalty }; }
export function getAgendaScore()  { return agendaScore; }

// ── internal ────────────────────────────────────────────────────────────────

function buildVoteArray(breakdown) {
  // For each party, bucket their seat indices then randomly assign ayes
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
