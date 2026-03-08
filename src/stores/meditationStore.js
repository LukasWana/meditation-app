import { create } from 'zustand';

/**
 * Store pro stav meditačního timeru.
 * Nahrazuje meditation-related state z useAppState.
 */
export const useMeditationStore = create((set) => ({
  // ─── State ─────────────────────────────────────────────────────────
  time: 180,              // v sekundách (selectedDuration * 60)
  selectedDuration: 3,    // v minutách
  isPlaying: false,

  // ─── Akce ─────────────────────────────────────────────────────────
  setTime: (t) => set({ time: t }),
  setDuration: (minutes) => set({
    selectedDuration: minutes,
    time: minutes * 60,
  }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  reset: () => set((state) => ({
    time: state.selectedDuration * 60,
    isPlaying: false,
  })),
}));
