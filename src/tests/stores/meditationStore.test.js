
import { useMeditationStore } from '@stores/meditationStore';

describe('meditationStore', () => {
  beforeEach(() => {
    const initial = useMeditationStore.getInitialState();
    useMeditationStore.setState(initial, true);
  });

  // ─── Výchozí stav ──────────────────────────────────────────────────

  describe('Výchozí stav', () => {
    it('má výchozí čas 180 sekund (3 minuty)', () => {
      const state = useMeditationStore.getState();
      expect(state.time).toBe(180);
      expect(state.selectedDuration).toBe(3); // 3 minuty
      expect(state.isPlaying).toBe(false);
    });
  });

  // ─── Akce ─────────────────────────────────────────────────────────

  describe('Akce', () => {
    it('setTime změní čas', () => {
      useMeditationStore.getState().setTime(120);
      expect(useMeditationStore.getState().time).toBe(120);
    });

    it('setDuration změní duraci (v minutách) i čas (v sekundách)', () => {
      useMeditationStore.getState().setDuration(5);
      const state = useMeditationStore.getState();
      expect(state.selectedDuration).toBe(5);
      expect(state.time).toBe(300); // 5 * 60
    });

    it('setIsPlaying změní stav přehrávání', () => {
      useMeditationStore.getState().setIsPlaying(true);
      expect(useMeditationStore.getState().isPlaying).toBe(true);
    });

    it('togglePlayPause přepne přehrávání', () => {
      useMeditationStore.getState().togglePlayPause();
      expect(useMeditationStore.getState().isPlaying).toBe(true);
      useMeditationStore.getState().togglePlayPause();
      expect(useMeditationStore.getState().isPlaying).toBe(false);
    });

    it('reset vrátí čas na selectedDuration * 60 a zastaví', () => {
      const store = useMeditationStore.getState();
      store.setDuration(5);
      store.setIsPlaying(true);
      store.setTime(42);

      useMeditationStore.getState().reset();
      const state = useMeditationStore.getState();
      expect(state.time).toBe(300); // 5 * 60
      expect(state.isPlaying).toBe(false);
    });
  });
});
