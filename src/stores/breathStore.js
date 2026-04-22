import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store pro stav dýchání — rytmus, zvuky, timer, příprava.
 * Nahrazuje breathing-related state z useAppState.
 *
 * Persist middleware ukládá poslední nastavení do localStorage,
 * aby se při dalším spuštění aplikace obnovilo poslední použité nastavení.
 */
export const useBreathStore = create(
  persist(
    (set, _get) => ({
  // ─── Breath Cycle ──────────────────────────────────────────────────
  breathInDuration: 6,   // sekund
  breathOutDuration: 8,  // sekund
  breathPhase: 'in',     // 'in' | 'out'

  // ─── Sounds ────────────────────────────────────────────────────────
  breathInSound: 'none',
  breathOutSound: 'none',
  breathClickSound: 'none',
  breathFinalSound: 'none',
  breathCountdownSound: 'none',
  breathSoundFadeEnabled: true,

  // ─── Timer ─────────────────────────────────────────────────────────
  breathDuration: 3,      // minuty
  breathTime: 180,        // sekund (breathDuration * 60)
  isBreathing: false,

  // ─── Preparation ──────────────────────────────────────────────────
  preparationTime: 10,    // sekund
  preparationCountdown: 0,
  isPreparing: false,

  // ─── Akce: Rytmus ──────────────────────────────────────────────────
  setBreathRhythm: (inDur, outDur) => set({
    breathInDuration: inDur,
    breathOutDuration: outDur,
  }),
  setBreathPhase: (phase) => set({ breathPhase: phase }),

  // ─── Akce: Zvuky ──────────────────────────────────────────────────
  setBreathSound: (key, value) => set({ [key]: value }),
  setBreathSoundFadeEnabled: (enabled) => set({ breathSoundFadeEnabled: enabled }),

  // ─── Akce: Timer ──────────────────────────────────────────────────
  setBreathDuration: (minutes) => set({
    breathDuration: minutes,
    breathTime: minutes * 60,
  }),
  setBreathTime: (seconds) => set({ breathTime: seconds }),
  setIsBreathing: (v) => set({ isBreathing: v }),

  // ─── Akce: Preparation ──────────────────────────────────────────
  setPreparationTime: (seconds) => set({ preparationTime: seconds }),
  setIsPreparing: (v) => set({ isPreparing: v }),
  setPreparationCountdown: (v) => set({ preparationCountdown: v }),

  // ─── Akce: Reset ──────────────────────────────────────────────────
  resetBreathing: () => set((state) => ({
    isBreathing: false,
    breathTime: state.breathDuration * 60,
    breathPhase: 'in',
    isPreparing: false,
    preparationCountdown: 0,
  })),
}),
    {
      name: 'meditation-app-breath-state', // localStorage key

      // Uložit jen konfigurační hodnoty, ne běžný stav
      partialize: (state) => ({
        breathInDuration: state.breathInDuration,
        breathOutDuration: state.breathOutDuration,
        breathDuration: state.breathDuration,
        preparationTime: state.preparationTime,
        breathInSound: state.breathInSound,
        breathOutSound: state.breathOutSound,
        breathClickSound: state.breathClickSound,
        breathFinalSound: state.breathFinalSound,
        breathCountdownSound: state.breathCountdownSound,
        breathSoundFadeEnabled: state.breathSoundFadeEnabled,
      }),

      // Při načtení ze storage resetovat běžný stav
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset běžného stavu po načtení z localStorage
          state.isBreathing = false;
          state.breathTime = state.breathDuration * 60;
          state.breathPhase = 'in';
          state.isPreparing = false;
          state.preparationCountdown = 0;
        }
      },
    }
  )
);
