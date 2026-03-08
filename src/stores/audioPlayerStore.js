import { create } from 'zustand';

/**
 * Store pro stav audio přehrávače.
 * Nahrazuje audio player state z useAppState.
 */
export const useAudioPlayerStore = create((set) => ({
  // ─── State ─────────────────────────────────────────────────────────
  isPlayerActive: false,
  activeAudio: null,
  selectedAlbum: null,

  // ─── Akce ─────────────────────────────────────────────────────────
  // Tyto akce odpovídají handlerům v App.jsx / useAppState
  setPlayerActive: (isActive) => set({ isPlayerActive: isActive }),
  setActiveAudio: (audio) => set({ activeAudio: audio, isPlayerActive: true }),
  setSelectedAlbum: (album) => set({ selectedAlbum: album }),

  handlePlayerStateChange: (isActive) => set({ isPlayerActive: isActive }),
  handleCloseAudio: () => set({ isPlayerActive: false, activeAudio: null }),
  handleAlbumClose: () => set({ selectedAlbum: null }),
  handleAlbumSelect: (album) => set({ selectedAlbum: album }),

  // Pomocné akce
  closeAudio: () => set({ isPlayerActive: false, activeAudio: null }),
  closeAlbum: () => set({ selectedAlbum: null }),
}));
