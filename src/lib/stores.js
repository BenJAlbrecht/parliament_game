import { writable } from 'svelte/store';

export const playerParty       = writable(null);
export const selectedCoalition = writable(null);
export const coalitionPartners = writable([]);
export const committedGoals    = writable({});
export const headerFlag        = writable('flag-base');

export const endingData = writable({
  finalLoyalty:   {},
  billsProposed:  0,
  flagshipsPassed: 0,
  collapsed:      false,
  stats:          null,
});

export function resetGame() {
  playerParty.set(null);
  selectedCoalition.set(null);
  coalitionPartners.set([]);
  committedGoals.set({});
  headerFlag.set('flag-base');
  endingData.set({ finalLoyalty: {}, billsProposed: 0, flagshipsPassed: 0, collapsed: false, stats: null });
}
