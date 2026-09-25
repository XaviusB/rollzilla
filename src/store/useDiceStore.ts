import { create } from 'zustand';
import { DIE_TYPES, type DieType } from '../dice/dieGeometry';

export { DIE_TYPES };
export type { DieType };

export interface ActiveDie {
  id: string;
  type: DieType;
}

export const MAX_DICE_PER_TYPE = 10;

interface DiceStore {
  counts: Record<DieType, number>;
  activeDice: ActiveDie[];
  results: Record<string, number>;
  rollToken: number;
  setCount: (type: DieType, count: number) => void;
  roll: () => void;
  reportResult: (id: string, value: number) => void;
  clear: () => void;
}

const initialCounts: Record<DieType, number> = {
  d4: 0,
  d6: 2,
  d8: 0,
  d10: 0,
  d12: 0,
  d20: 0,
};

export const useDiceStore = create<DiceStore>((set, get) => ({
  counts: initialCounts,
  activeDice: [],
  results: {},
  rollToken: 0,

  setCount: (type, count) =>
    set((state) => ({
      counts: { ...state.counts, [type]: Math.max(0, Math.min(MAX_DICE_PER_TYPE, Math.round(count) || 0)) },
    })),

  roll: () => {
    const { counts, rollToken } = get();
    const token = rollToken + 1;
    const dice: ActiveDie[] = [];
    for (const type of DIE_TYPES) {
      for (let i = 0; i < counts[type]; i++) {
        dice.push({ id: `${type}-${i}-${token}`, type });
      }
    }
    set({ activeDice: dice, results: {}, rollToken: token });
  },

  reportResult: (id, value) =>
    set((state) => ({ results: { ...state.results, [id]: value } })),

  clear: () => set({ activeDice: [], results: {} }),
}));
