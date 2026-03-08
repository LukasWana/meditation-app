import { create } from 'zustand';

/**
 * Store pro uživatelské preference.
 * Nahrazuje user preference state z useAppState.
 */
export const useUserPrefsStore = create((set) => ({
  // ─── State ─────────────────────────────────────────────────────────
  gender: (() => {
    try {
      return localStorage.getItem('meditation-app-gender') || 'none';
    } catch {
      return 'none';
    }
  })(),
  voicePreference: (() => {
    try {
      return localStorage.getItem('meditation-app-voice') || 'auto';
    } catch {
      return 'auto';
    }
  })(),

  // ─── Akce ─────────────────────────────────────────────────────────
  setGender: (g) => {
    try {
      localStorage.setItem('meditation-app-gender', g);
    } catch (e) {
      console.warn('Failed to save gender to localStorage:', e);
    }
    set({ gender: g });
  },
  setVoicePreference: (v) => {
    try {
      localStorage.setItem('meditation-app-voice', v);
    } catch (e) {
      console.warn('Failed to save voice preference to localStorage:', e);
    }
    set({ voicePreference: v });
  },
}));
