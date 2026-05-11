import { POPULATION, BASE_GDP_CAPITA, BASE_Y_MODEL } from './economy/display.js';

const MAX_DISTANCE               = Math.sqrt(800);
const K_LOYALTY_INIT             = 0.6;
const COALITION_LOYALTY_WEIGHT   = 0.6;
const COALITION_ALIGNMENT_WEIGHT = 0.4;
const OPPOSITION_ALIGNMENT_WEIGHT = 0.6;
const OPPOSITION_DISCOUNT        = 0.1;
const LOYALTY_DRIFT_RATE         = 0.03;
export const MAJORITY_THRESHOLD  = 234;

// How many €billion/yr one G_path model unit equals (annualized).
const G_PATH_ANNUAL_BN = 4 * (BASE_GDP_CAPITA / BASE_Y_MODEL) * POPULATION / 1e9;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function calculateDistance(posA, posB) {
  return Math.sqrt(
    (posA.economic - posB.economic) ** 2 + (posA.social - posB.social) ** 2,
  );
}

export function normalizedDistance(posA, posB) {
  return calculateDistance(posA, posB) / MAX_DISTANCE;
}

export function alignment(billPosition, partyPosition) {
  return 1 - normalizedDistance(billPosition, partyPosition);
}

export function initialLoyalty(playerPosition, partnerPosition) {
  return 1 - K_LOYALTY_INIT * normalizedDistance(playerPosition, partnerPosition);
}

export function calculatePartyVote({ party, bill, loyalty, isInCoalition }) {
  const align = alignment(bill.position, { economic: party.economic, social: party.social });
  const raw = isInCoalition
    ? COALITION_LOYALTY_WEIGHT * loyalty + COALITION_ALIGNMENT_WEIGHT * align
    : OPPOSITION_ALIGNMENT_WEIGHT * align - OPPOSITION_DISCOUNT;
  return clamp(raw, 0, 1);
}

export function calculateBillOutcome({ bill, parties, coalitionLoyalty, coalitionPartyIds }) {
  const per_party = parties.map(party => {
    const isInCoalition = coalitionPartyIds.has(party.name);
    const loyalty = isInCoalition ? (coalitionLoyalty[party.name] ?? 1.0) : 0;
    const pct_yes = calculatePartyVote({ party, bill, loyalty, isInCoalition });
    const votes_yes = Math.round(party.seats * pct_yes);
    const votes_no  = party.seats - votes_yes;
    return { party_id: party.name, pct_yes, votes_yes, votes_no };
  });

  const total_yes = per_party.reduce((s, r) => s + r.votes_yes, 0);
  const total_no  = per_party.reduce((s, r) => s + r.votes_no,  0);
  return { per_party, total_yes, total_no, passes: total_yes > MAJORITY_THRESHOLD };
}

export function calculateLoyaltyDrift(bill, party) {
  const align = alignment(bill.position, { economic: party.economic, social: party.social });
  return LOYALTY_DRIFT_RATE * (align - 0.5) * 2;
}

export function formatEffects(effects) {
  const {
    G_path_delta    = 0,
    tax_rate_delta  = 0,
    G_path_one_shot = 0,
    g_boost         = 0,
    u_heal          = 0,
    heal            = 0,
  } = effects ?? {};

  const lines = [];

  if (G_path_delta) {
    const bn  = Math.abs(Math.round(G_path_delta * G_PATH_ANNUAL_BN));
    const sgn = G_path_delta > 0 ? '+' : '-';
    lines.push(`${sgn}€${bn}B/yr spending (persistent)`);
  }
  if (G_path_one_shot) {
    const bn  = Math.abs(Math.round(G_path_one_shot * G_PATH_ANNUAL_BN));
    const sgn = G_path_one_shot > 0 ? '+' : '-';
    lines.push(`${sgn}€${bn}B one-off stimulus`);
  }
  if (tax_rate_delta) {
    const pp  = Math.abs(tax_rate_delta * 100).toFixed(1);
    const sgn = tax_rate_delta > 0 ? '+' : '-';
    lines.push(`${sgn}${pp}pp tax rate (persistent)`);
  }
  if (g_boost) {
    lines.push(`+${(g_boost * 100).toFixed(2)}pp potential growth`);
  }
  if (u_heal) {
    lines.push(`-${(u_heal * 100).toFixed(1)}pp structural unemployment`);
  }
  if (heal) {
    lines.push(`heal ${heal} scarring`);
  }

  return lines;
}
