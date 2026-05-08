import { create } from 'zustand';

const useGameStore = create((set) => ({
  playerParty:        null,
  selectedCoalition:  null,
  coalitionPartners:  [],
  committedGoals:     {},
  playerMandate:      null,
  headerFlag:         'flag-base',
  headerAccent:       null,
  headerTurn:         null,
  sessionEconHistory: [],
  endingData: {
    finalLoyalty:  {},
    billsProposed: 0,
    collapsed:     false,
    stats:         null,
  },

  setPlayerParty:        (v) => set({ playerParty: v }),
  setSelectedCoalition:  (v) => set({ selectedCoalition: v }),
  setCoalitionPartners:  (v) => set({ coalitionPartners: v }),
  setCommittedGoals:     (v) => set({ committedGoals: v }),
  setPlayerMandate:      (v) => set({ playerMandate: v }),
  setHeaderFlag:         (v) => set({ headerFlag: v }),
  setHeaderAccent:       (v) => set({ headerAccent: v }),
  setHeaderTurn:         (v) => set({ headerTurn: v }),
  setSessionEconHistory: (v) => set({ sessionEconHistory: v }),
  setEndingData:         (v) => set({ endingData: v }),

  resetGame: () => set({
    playerParty:        null,
    selectedCoalition:  null,
    coalitionPartners:  [],
    committedGoals:     {},
    playerMandate:      null,
    headerFlag:         'flag-base',
    headerAccent:       null,
    headerTurn:         null,
    sessionEconHistory: [],
    endingData: { finalLoyalty: {}, billsProposed: 0, collapsed: false, stats: null },
  }),
}));

export default useGameStore;
