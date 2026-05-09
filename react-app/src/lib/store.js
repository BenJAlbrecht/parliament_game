import { create } from 'zustand';

const useGameStore = create((set) => ({
  playerParty:       null,
  selectedCoalition: null,
  coalitionPartners: [],
  headerFlag:        'flag-base',
  headerAccent:      null,
  headerTurn:        null,

  setPlayerParty:        (v) => set({ playerParty: v }),
  setSelectedCoalition:  (v) => set({ selectedCoalition: v }),
  setCoalitionPartners:  (v) => set({ coalitionPartners: v }),
  setHeaderFlag:         (v) => set({ headerFlag: v }),
  setHeaderAccent:       (v) => set({ headerAccent: v }),
  setHeaderTurn:         (v) => set({ headerTurn: v }),

  resetGame: () => set({
    playerParty:       null,
    selectedCoalition: null,
    coalitionPartners: [],
    headerFlag:        'flag-base',
    headerAccent:      null,
    headerTurn:        null,
  }),
}));

export default useGameStore;
