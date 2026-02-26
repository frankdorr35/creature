import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { sfx } from './audio';

declare global {
  interface Window {
    electronAPI?: {
      saveState: (data: string) => void;
      loadState: () => Promise<string | null>;
    }
  }
}

// Constants for needs and decay
export const MAX_STAT = 100;
export const MIN_STAT = 0;
const DECAY_RATES_PER_HOUR = {
  hunger: 10,
  thirst: 15,
  happiness: 5,
  energy: 8,
  warmth: 15, // Egg warmth decays faster
};

export const ACTION_COOLDOWNS_MS = {
  feed: 30000,
  giveWater: 25000,
  play: 45000,
  pet: 15000,
  teach: 60000,
};

export type Mood = 'happy' | 'sad' | 'sick' | 'neutral' | 'sleeping' | 'playing' | 'eating' | 'drinking';
export type Trick = 'sit' | 'spin' | 'wave' | 'dance';
export type ParticleEffect = { id: string; type: 'music' | 'speech' | 'glow'; x: number; y: number };

export interface InteractionEvent {
   id: string;
   type: 'feed' | 'water' | 'play' | 'pet' | 'teachSuccess' | 'teachFail' | 'hatch';
   text?: string;
}

interface TrickState {
  learned: boolean;
  progress: number; // 0 to 100
}

interface PetState {
  // Egg Phase Stats
  eggPhase: boolean;
  warmth: number;
  bond: number;
  stability: number;
  isWobbling: boolean;
  particles: ParticleEffect[];

  // Creature Stats
  hunger: number;
  thirst: number;
  happiness: number;
  energy: number;
  health: number;
  mood: Mood;
  tricks: Record<Trick, TrickState>;
  cooldowns: {
    feed: number;
    giveWater: number;
    play: number;
    pet: number;
    teach: number;
  };
  lastSavedTime: number;
  isSleeping: boolean;
  isMuted: boolean;
  interactionEvents: InteractionEvent[];
}

interface PetActions {
  // Creature Actions
  feed: () => void;
  giveWater: () => void;
  play: () => void;
  pet: () => void;
  teach: (trick: Trick) => void;
  sleep: () => void;
  wakeUp: () => void;
  toggleMute: () => void;
  consumeInteractionEvent: (id: string) => void;
  
  // Egg Actions
  warmEgg: () => void;
  talkToEgg: () => void;
  singToEgg: () => void;
  steadyEgg: () => void;
  triggerWobble: () => void;
  removeParticle: (id: string) => void;
  hatch: () => void;

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
  eggPhase: true,
  warmth: 50,
  bond: 0,
  stability: 100,
  isWobbling: false,
  particles: [],

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
  cooldowns: {
    feed: 0,
    giveWater: 0,
    play: 0,
    pet: 0,
    teach: 0,
  },
  lastSavedTime: Date.now(),
  isMuted: false,
  interactionEvents: [],
};

export const usePetStore = create<PetStore>()(
  persist(
    (set) => ({
      ...initialState,

      feed: () => {
        set((state) => {
            if (state.isSleeping || Date.now() - state.cooldowns.feed < ACTION_COOLDOWNS_MS.feed) return state;
            sfx.init(); sfx.playFeed();
            const newHunger = clamp(state.hunger + 30);
            return {
                hunger: newHunger,
                health: calculateHealth(newHunger, state.thirst, state.happiness),
                mood: 'eating',
                cooldowns: { ...state.cooldowns, feed: Date.now() },
                lastSavedTime: Date.now(),
                interactionEvents: [...state.interactionEvents, { id: Math.random().toString(), type: 'feed', text: '+30 Hunger' }]
            };
        });
        setTimeout(() => set((state) => ({ mood: determineMood(state) })), 2000);
      },

      giveWater: () => {
        set((state) => {
            if (state.isSleeping || Date.now() - state.cooldowns.giveWater < ACTION_COOLDOWNS_MS.giveWater) return state;
            sfx.init(); sfx.playWater();
            const newThirst = clamp(state.thirst + 40);
            return {
                thirst: newThirst,
                health: calculateHealth(state.hunger, newThirst, state.happiness),
                mood: 'drinking',
                cooldowns: { ...state.cooldowns, giveWater: Date.now() },
                lastSavedTime: Date.now(),
                interactionEvents: [...state.interactionEvents, { id: Math.random().toString(), type: 'water', text: '+40 Thirst' }]
            };
        });
        setTimeout(() => set((state) => ({ mood: determineMood(state) })), 2000);
      },

      play: () => {
        set((state) => {
            if (state.isSleeping || Date.now() - state.cooldowns.play < ACTION_COOLDOWNS_MS.play) return state;
            sfx.init(); sfx.playPlay();
            const newHappiness = clamp(state.happiness + 20);
            const newEnergy = clamp(state.energy - 10);
            return {
                happiness: newHappiness,
                energy: newEnergy,
                health: calculateHealth(state.hunger, state.thirst, newHappiness),
                mood: 'playing',
                cooldowns: { ...state.cooldowns, play: Date.now() },
                lastSavedTime: Date.now(),
                interactionEvents: [...state.interactionEvents, { id: Math.random().toString(), type: 'play', text: '+20 Happiness' }]
            };
        });
         setTimeout(() => set((state) => ({ mood: determineMood(state) })), 2000);
      },

      pet: () => {
        set((state) => {
            if (state.isSleeping || Date.now() - state.cooldowns.pet < ACTION_COOLDOWNS_MS.pet) return state;
            sfx.init(); sfx.playPet();
            const newHappiness = clamp(state.happiness + 10);
            return {
                happiness: newHappiness,
                health: calculateHealth(state.hunger, state.thirst, newHappiness),
                mood: 'happy',
                cooldowns: { ...state.cooldowns, pet: Date.now() },
                lastSavedTime: Date.now(),
                interactionEvents: [...state.interactionEvents, { id: Math.random().toString(), type: 'pet', text: '♥' }]
            };
        });
        setTimeout(() => set((state) => ({ mood: determineMood(state) })), 2000);
      },

      teach: (trick) => {
          set((state) => {
              if (state.isSleeping || state.energy < 20 || state.happiness < 40 || Date.now() - state.cooldowns.teach < ACTION_COOLDOWNS_MS.teach) return state;

              const trickData = state.tricks[trick];
              if (trickData.learned) return state;

              // Learning is easier if happier
              const learningBonus = state.happiness > 80 ? 15 : 5;
              const newProgress = Math.min(100, trickData.progress + learningBonus);
              const learned = newProgress >= 100;
              
              sfx.init();
              if (learned) sfx.playTeachSuccess();
              else sfx.playTeachFail();

              const newEnergy = clamp(state.energy - 15);

              return {
                  energy: newEnergy,
                  tricks: {
                      ...state.tricks,
                      [trick]: {
                          ...trickData,
                          learned,
                          progress: newProgress
                      }
                  },
                  cooldowns: { ...state.cooldowns, teach: Date.now() },
                  mood: learned ? 'happy' : 'playing',
                  lastSavedTime: Date.now(),
                  interactionEvents: [...state.interactionEvents, { 
                      id: Math.random().toString(), 
                      type: learned ? 'teachSuccess' : 'teachFail', 
                      text: learned ? `Learned ${trick.charAt(0).toUpperCase() + trick.slice(1)}!` : `+${learningBonus}% ${trick.charAt(0).toUpperCase() + trick.slice(1)}`
                  }]
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
      toggleMute: () => {
          set((state) => {
              const newMuted = !state.isMuted;
              sfx.setMuted(newMuted);
              return { isMuted: newMuted, lastSavedTime: Date.now() }
          });
      },
      consumeInteractionEvent: (id) => {
          set((state) => ({
             interactionEvents: state.interactionEvents.filter(e => e.id !== id)
          }));
      },

      // --- EGG ACTIONS ---
      warmEgg: () => {
          set((state) => {
              if (!state.eggPhase) return state;
              sfx.init(); sfx.playEggWarmth();
              const newWarmth = clamp(state.warmth + 15);
              return { warmth: newWarmth, lastSavedTime: Date.now() };
          });
      },

      talkToEgg: () => {
         set((state) => {
             if (!state.eggPhase) return state;
             const bondIncrease = state.stability < 50 ? 2 : 5; // Reduced growth if unstable
             const newBond = Math.min(100, state.bond + bondIncrease);
             const newParticle: ParticleEffect = { id: Math.random().toString(), type: 'speech', x: Math.random() * 40 - 20, y: Math.random() * -20 - 40 };
             return { bond: newBond, particles: [...state.particles, newParticle], lastSavedTime: Date.now() };
         });
      },

      singToEgg: () => {
         set((state) => {
             if (!state.eggPhase || state.warmth < 60) return state;
             const bondIncrease = state.stability < 50 ? 5 : 10;
             const newBond = Math.min(100, state.bond + bondIncrease);
             const newParticle: ParticleEffect = { id: Math.random().toString(), type: 'music', x: Math.random() * 60 - 30, y: Math.random() * -30 - 50 };
             return { bond: newBond, particles: [...state.particles, newParticle], lastSavedTime: Date.now() };
         });
      },

      steadyEgg: () => {
          set((state) => {
              if (!state.eggPhase || !state.isWobbling) return state;
              sfx.init(); sfx.playEggWobble();
              return { isWobbling: false, stability: 100, lastSavedTime: Date.now() };
          });
      },

      triggerWobble: () => {
          set((state) => {
              if (!state.eggPhase) return state;
              return { isWobbling: true, lastSavedTime: Date.now() };
          });
      },

      removeParticle: (id) => {
          set((state) => ({ particles: state.particles.filter(p => p.id !== id) }));
      },

      hatch: () => {
          sfx.init(); sfx.playHatching();
          set(() => ({ eggPhase: false, bond: 100, hunger: MAX_STAT, thirst: MAX_STAT, happiness: MAX_STAT, energy: MAX_STAT, mood: 'happy', lastSavedTime: Date.now() }));
      },

      updateStatsOverTime: () => {
         // This is intended to be called by a requestAnimationFrame loop or setInterval
         set((state) => {
             const now = Date.now();
             const TICKS_PER_HOUR = 720; // 5 second ticks

             let newState = { ...state, lastSavedTime: now };

             if (state.eggPhase) {
                 const newWarmth = clamp(state.warmth - (DECAY_RATES_PER_HOUR.warmth / TICKS_PER_HOUR));
                 newState.warmth = newWarmth;
                 if (state.isWobbling) {
                     newState.stability = clamp(state.stability - 3);
                 }
             } else {
                 const newHunger = clamp(state.hunger - (DECAY_RATES_PER_HOUR.hunger / TICKS_PER_HOUR));
                 const newThirst = clamp(state.thirst - (DECAY_RATES_PER_HOUR.thirst / TICKS_PER_HOUR));
                 const newHappiness = clamp(state.happiness - (DECAY_RATES_PER_HOUR.happiness / TICKS_PER_HOUR));
                 
                 let newEnergy = state.energy;
                 if (state.isSleeping) {
                     newEnergy = clamp(state.energy + (20 / TICKS_PER_HOUR));
                 } else {
                     newEnergy = clamp(state.energy - (DECAY_RATES_PER_HOUR.energy / TICKS_PER_HOUR));
                 }

                 const newHealth = calculateHealth(newHunger, newThirst, newHappiness);

                 newState = {
                     ...newState,
                     hunger: newHunger,
                     thirst: newThirst,
                     happiness: newHappiness,
                     energy: newEnergy,
                     health: newHealth
                 };
             }

             const newMood = determineMood(newState);
             if (newMood === 'sad' && state.mood !== 'sad') {
                 sfx.init(); sfx.playSad();
             } else if (newMood === 'sad' && Math.random() < 0.05) { // 5% chance per tick to whimper if sad
                 sfx.init(); sfx.playSad();
             }

             return {
                 ...newState,
                 mood: newMood
             };
         });
      },

      calculateOfflineDecay: () => {
         set((state) => {
            const now = Date.now();
            const elapsedHours = (now - state.lastSavedTime) / (1000 * 60 * 60);

            if (elapsedHours < 0.01) return state; // Minimal time passed

            if (state.eggPhase) {
                // EGG DECAY LOGIC
                let newWarmth = clamp(state.warmth - (DECAY_RATES_PER_HOUR.warmth * elapsedHours));
                
                // If it was wobbling while offline for a long time, tank stability
                let newStability = state.stability;
                if (state.isWobbling && elapsedHours > 0.1) {
                    newStability = clamp(state.stability - 50);
                }

                return {
                    ...state,
                    warmth: newWarmth,
                    stability: newStability,
                    lastSavedTime: now
                };
            }

            // CREATURE DECAY LOGIC
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
      name: 'creature-storage',
      storage: createJSONStorage(() => {
         const electronStorage: StateStorage = {
             getItem: async (name: string): Promise<string | null> => {
                 if (window.electronAPI) {
                     return await window.electronAPI.loadState();
                 }
                 return localStorage.getItem(name);
             },
             setItem: (name: string, value: string): void => {
                 if (window.electronAPI) {
                     window.electronAPI.saveState(value);
                 } else {
                     localStorage.setItem(name, value);
                 }
             },
             removeItem: (name: string): void => {
                 if (window.electronAPI) {
                     window.electronAPI.saveState('');
                 } else {
                     localStorage.removeItem(name);
                 }
             },
         };
         return electronStorage;
      }),
    },
  ),
);
