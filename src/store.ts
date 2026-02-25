import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Constants for needs and decay
export const MAX_STAT = 100;
export const MIN_STAT = 0;
const DECAY_RATES_PER_HOUR = {
  hunger: 10,
  thirst: 15,
  happiness: 5,
  energy: 8,
};

export type Mood = 'happy' | 'sad' | 'sick' | 'neutral' | 'sleeping' | 'playing' | 'eating' | 'drinking';
export type Trick = 'sit' | 'spin' | 'wave' | 'dance';

interface TrickState {
  learned: boolean;
  progress: number; // 0 to 100
}

interface PetState {
  hunger: number;
  thirst: number;
  happiness: number;
  energy: number;
  health: number;
  mood: Mood;
  tricks: Record<Trick, TrickState>;
  lastSavedTime: number;
  isSleeping: boolean;
}

interface PetActions {
  feed: () => void;
  giveWater: () => void;
  play: () => void;
  pet: () => void;
  teach: (trick: Trick) => void;
  sleep: () => void;
  wakeUp: () => void;
  updateStatsOverTime: () => void;
  calculateOfflineDecay: () => void;
}

type PetStore = PetState & PetActions;

function clamp(value: number): number {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, value));
}

function calculateHealth(hunger: number, thirst: number, happiness: number): number {
    // Basic health formula based on core stats
    let healthPenalty = 0;
    if (hunger < 20) healthPenalty += (20 - hunger);
    if (thirst < 20) healthPenalty += (20 - thirst);
    if (happiness < 20) healthPenalty += (20 - happiness) * 0.5;

    return clamp(MAX_STAT - healthPenalty);
}

function determineMood(state: PetState): Mood {
    if (state.isSleeping) return 'sleeping';
    if (state.health < 40) return 'sick';
    if (state.happiness < 40 || state.hunger < 30 || state.thirst < 30) return 'sad';
    if (state.happiness > 70 && state.health > 70) return 'happy';
    return 'neutral';
}

const initialState: PetState = {
  hunger: MAX_STAT,
  thirst: MAX_STAT,
  happiness: MAX_STAT,
  energy: MAX_STAT,
  health: MAX_STAT,
  mood: 'happy',
  isSleeping: false,
  tricks: {
    sit: { learned: false, progress: 0 },
    spin: { learned: false, progress: 0 },
    wave: { learned: false, progress: 0 },
    dance: { learned: false, progress: 0 },
  },
  lastSavedTime: Date.now(),
};

export const usePetStore = create<PetStore>()(
  persist(
    (set) => ({
      ...initialState,

      feed: () => {
        set((state) => {
            if (state.isSleeping) return state;
            const newHunger = clamp(state.hunger + 30);
            return {
                hunger: newHunger,
                health: calculateHealth(newHunger, state.thirst, state.happiness),
                mood: 'eating',
                lastSavedTime: Date.now()
            };
        });
        setTimeout(() => set((state) => ({ mood: determineMood(state) })), 2000);
      },

      giveWater: () => {
        set((state) => {
            if (state.isSleeping) return state;
            const newThirst = clamp(state.thirst + 40);
            return {
                thirst: newThirst,
                health: calculateHealth(state.hunger, newThirst, state.happiness),
                mood: 'drinking',
                lastSavedTime: Date.now()
            };
        });
        setTimeout(() => set((state) => ({ mood: determineMood(state) })), 2000);
      },

      play: () => {
        set((state) => {
            if (state.isSleeping) return state;
            const newHappiness = clamp(state.happiness + 20);
            const newEnergy = clamp(state.energy - 10);
            return {
                happiness: newHappiness,
                energy: newEnergy,
                health: calculateHealth(state.hunger, state.thirst, newHappiness),
                mood: 'playing',
                lastSavedTime: Date.now()
            };
        });
         setTimeout(() => set((state) => ({ mood: determineMood(state) })), 2000);
      },

      pet: () => {
        set((state) => {
            if (state.isSleeping) return state;
            const newHappiness = clamp(state.happiness + 10);
            return {
                happiness: newHappiness,
                health: calculateHealth(state.hunger, state.thirst, newHappiness),
                mood: 'happy',
                lastSavedTime: Date.now()
            };
        });
        setTimeout(() => set((state) => ({ mood: determineMood(state) })), 2000);
      },

      teach: (trick) => {
          set((state) => {
              if (state.isSleeping || state.energy < 20 || state.happiness < 40) return state;

              const trickData = state.tricks[trick];
              if (trickData.learned) return state;

              // Learning is easier if happier
              const learningBonus = state.happiness > 80 ? 15 : 5;
              const newProgress = Math.min(100, trickData.progress + learningBonus);
              
              const newEnergy = clamp(state.energy - 15);

              return {
                  energy: newEnergy,
                  tricks: {
                      ...state.tricks,
                      [trick]: {
                          ...trickData,
                          learned: newProgress >= 100,
                          progress: newProgress
                      }
                  },
                  mood: newProgress >= 100 ? 'happy' : 'playing',
                  lastSavedTime: Date.now()
              }
          })
          setTimeout(() => set((state) => ({ mood: determineMood(state) })), 2000);
      },

      sleep: () => {
          set({ isSleeping: true, mood: 'sleeping', lastSavedTime: Date.now() });
      },

      wakeUp: () => {
          set((state) => ({ isSleeping: false, mood: determineMood({...state, isSleeping: false}), lastSavedTime: Date.now() }));
      },

      updateStatsOverTime: () => {
         // This is intended to be called by a requestAnimationFrame loop or setInterval
         set(() => {
             const now = Date.now();
             // Just update lastSavedTime frequently when running, actual decay can be handled in offline calc
             // or smaller increments here. For simplicity, we'll rely on offline decay math applied frequently.
             
             // Simple tick decay
             return { lastSavedTime: now };
         });
      },

      calculateOfflineDecay: () => {
         set((state) => {
            const now = Date.now();
            const elapsedHours = (now - state.lastSavedTime) / (1000 * 60 * 60);

            if (elapsedHours < 0.01) return state; // Minimal time passed

            let newHunger = state.hunger;
            let newThirst = state.thirst;
            let newHappiness = state.happiness;
            let newEnergy = state.energy;

            // Apply decay
            newHunger = clamp(state.hunger - (DECAY_RATES_PER_HOUR.hunger * elapsedHours));
            newThirst = clamp(state.thirst - (DECAY_RATES_PER_HOUR.thirst * elapsedHours));
            
            // Energy depletes unless sleeping
            if (state.isSleeping) {
                 newEnergy = clamp(state.energy + (20 * elapsedHours)); // Recover energy
                 // If fully recovered, wake up? We'll leave it sleeping until explicit wake or daytime.
            } else {
                 newEnergy = clamp(state.energy - (DECAY_RATES_PER_HOUR.energy * elapsedHours));
            }

            // Happiness decays if ignored
            newHappiness = clamp(state.happiness - (DECAY_RATES_PER_HOUR.happiness * elapsedHours));

            const newHealth = calculateHealth(newHunger, newThirst, newHappiness);
            
            // Check if it died (optional, for now just sits at 0 stats and 0 health)
            
            const interimState = {
                ...state,
                hunger: newHunger,
                thirst: newThirst,
                happiness: newHappiness,
                energy: newEnergy,
                health: newHealth,
                lastSavedTime: now
            };

            return {
                ...interimState,
                mood: determineMood(interimState)
            };
         });
      }
    }),
    {
      name: 'creature-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    },
  ),
);
