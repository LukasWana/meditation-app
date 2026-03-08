
import { useAudioPlayerStore } from '@stores/audioPlayerStore';

describe('audioPlayerStore', () => {
  beforeEach(() => {
    const initial = useAudioPlayerStore.getInitialState();
    useAudioPlayerStore.setState(initial, true);
  });

  // ─── Výchozí stav ──────────────────────────────────────────────────

  describe('Výchozí stav', () => {
    it('má výchozí neaktivní stav', () => {
      const state = useAudioPlayerStore.getState();
      expect(state.isPlayerActive).toBe(false);
      expect(state.activeAudio).toBe(null);
      expect(state.selectedAlbum).toBe(null);
    });
  });

  // ─── Akce ─────────────────────────────────────────────────────────

  describe('Akce', () => {
    it('setPlayerActive nastaví stav přehrávače', () => {
      useAudioPlayerStore.getState().setPlayerActive(true);
      expect(useAudioPlayerStore.getState().isPlayerActive).toBe(true);
    });

    it('setActiveAudio nastaví aktivní audio', () => {
      const audio = { id: 'track-1', name: 'Test Track' };
      useAudioPlayerStore.getState().setActiveAudio(audio);
      expect(useAudioPlayerStore.getState().activeAudio).toEqual(audio);
    });

    it('setSelectedAlbum nastaví album', () => {
      const album = { id: 'album-1', name: 'Test Album' };
      useAudioPlayerStore.getState().setSelectedAlbum(album);
      expect(useAudioPlayerStore.getState().selectedAlbum).toEqual(album);
    });

    it('closeAudio zavře přehrávač a vymaže audio, ale ponechá album', () => {
      useAudioPlayerStore.getState().setPlayerActive(true);
      useAudioPlayerStore.getState().setActiveAudio({ id: 'x' });
      useAudioPlayerStore.getState().setSelectedAlbum({ id: 'y' });

      useAudioPlayerStore.getState().closeAudio();

      const state = useAudioPlayerStore.getState();
      expect(state.isPlayerActive).toBe(false);
      expect(state.activeAudio).toBe(null);
      expect(state.selectedAlbum).toEqual({ id: 'y' }); // Album zůstává
    });

    it('closeAlbum vymaže album', () => {
      useAudioPlayerStore.getState().setSelectedAlbum({ id: 'album-1' });
      useAudioPlayerStore.getState().closeAlbum();
      expect(useAudioPlayerStore.getState().selectedAlbum).toBe(null);
    });
  });
});
