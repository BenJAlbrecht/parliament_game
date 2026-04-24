import { writable } from 'svelte/store';

export const playerParty       = writable(null);
export const selectedCoalition = writable(null);
export const coalitionPartners = writable([]);
export const committedGoals    = writable({});
export const playerMandate     = writable(null);
export const headerFlag        = writable('flag-base');
export const headerAccent      = writable(null);   // party color string or null
export const headerCrumb       = writable([]);      // ['Select', 'Coalition', ...]

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
  headerCrumb.set([]);
  endingData.set({ finalLoyalty: {}, billsProposed: 0, collapsed: false, stats: null });
}
