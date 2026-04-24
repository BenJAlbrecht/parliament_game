import { writable } from 'svelte/store';

export const playerParty       = writable(null);
export const selectedCoalition = writable(null);
export const coalitionPartners = writable([]);
export const committedGoals    = writable({});
export const playerMandate     = writable(null);
export const headerFlag        = writable('flag-base');
export const headerAccent      = writable(null);
export const headerTurn        = writable(null);    // { current, max } during session
export const sessionEconHistory = writable([]);     // annual economic snapshots during session

export const endingData = writable({
  finalLoyalty:  {},
  billsProposed: 0,
  collapsed:     false,
  stats:         null,
});

export function resetGame() {
  playerParty.set(null);
  selectedCoalition.set(null);
  coalitionPartners.set([]);
  committedGoals.set({});
  playerMandate.set(null);
  headerFlag.set('flag-base');
  headerAccent.set(null);
  headerTurn.set(null);
  sessionEconHistory.set([]);
  endingData.set({ finalLoyalty: {}, billsProposed: 0, collapsed: false, stats: null });
}
