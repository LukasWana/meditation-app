
import { useBreathStore } from '@stores/breathStore';

describe('breathStore', () => {
  beforeEach(() => {
    // Reset store mezi testy
    const initial = useBreathStore.getInitialState();
    useBreathStore.setState(initial, true);
  });

  // ─── Výchozí stav ──────────────────────────────────────────────────

  describe('Výchozí stav', () => {
    it('má správné výchozí hodnoty dýchání', () => {
      const state = useBreathStore.getState();
      expect(state.breathInDuration).toBe(6);
      expect(state.breathOutDuration).toBe(8);
      expect(state.breathPhase).toBe('in');
    });

    it('má zvuky nastavené na "none"', () => {
      const state = useBreathStore.getState();
      expect(state.breathInSound).toBe('none');
      expect(state.breathOutSound).toBe('none');
      expect(state.breathClickSound).toBe('none');
      expect(state.breathFinalSound).toBe('none');
      expect(state.breathCountdownSound).toBe('none');
    });

    it('má fade zapnutý', () => {
      expect(useBreathStore.getState().breathSoundFadeEnabled).toBe(true);
    });

    it('má výchozí timer hodnoty', () => {
      const state = useBreathStore.getState();
      expect(state.breathDuration).toBe(3);    // 3 minuty
      expect(state.breathTime).toBe(180);       // 180 sekund
      expect(state.isBreathing).toBe(false);
    });

    it('má výchozí preparation hodnoty', () => {
      const state = useBreathStore.getState();
      expect(state.preparationTime).toBe(10);
      expect(state.preparationCountdown).toBe(0);
      expect(state.isPreparing).toBe(false);
    });
  });

  // ─── Akce: Rytmus ──────────────────────────────────────────────────

  describe('Akce: Rytmus', () => {
    it('setBreathRhythm změní nádech a výdech', () => {
      useBreathStore.getState().setBreathRhythm(5, 7);
      const state = useBreathStore.getState();
      expect(state.breathInDuration).toBe(5);
      expect(state.breathOutDuration).toBe(7);
    });

    it('setBreathPhase změní fázi', () => {
      useBreathStore.getState().setBreathPhase('out');
      expect(useBreathStore.getState().breathPhase).toBe('out');
    });
  });

  // ─── Akce: Zvuky ──────────────────────────────────────────────────

  describe('Akce: Zvuky', () => {
    it('setBreathSound změní nádechový zvuk', () => {
      useBreathStore.getState().setBreathSound('breathInSound', 'bell-1');
      expect(useBreathStore.getState().breathInSound).toBe('bell-1');
    });

    it('setBreathSound změní výdechový zvuk', () => {
      useBreathStore.getState().setBreathSound('breathOutSound', 'wind-1');
      expect(useBreathStore.getState().breathOutSound).toBe('wind-1');
    });

    it('setBreathSound změní klikový zvuk', () => {
      useBreathStore.getState().setBreathSound('breathClickSound', 'click-1');
      expect(useBreathStore.getState().breathClickSound).toBe('click-1');
    });

    it('setBreathSound změní finální zvuk', () => {
      useBreathStore.getState().setBreathSound('breathFinalSound', 'gong-1');
      expect(useBreathStore.getState().breathFinalSound).toBe('gong-1');
    });

    it('setBreathSound změní countdown zvuk', () => {
      useBreathStore.getState().setBreathSound('breathCountdownSound', 'tick-1');
      expect(useBreathStore.getState().breathCountdownSound).toBe('tick-1');
    });

    it('setBreathSoundFadeEnabled přepne fade', () => {
      useBreathStore.getState().setBreathSoundFadeEnabled(false);
      expect(useBreathStore.getState().breathSoundFadeEnabled).toBe(false);
      useBreathStore.getState().setBreathSoundFadeEnabled(true);
      expect(useBreathStore.getState().breathSoundFadeEnabled).toBe(true);
    });
  });

  // ─── Akce: Timer ──────────────────────────────────────────────────

  describe('Akce: Timer', () => {
    it('setBreathDuration změní duraci i čas (v sekundách)', () => {
      useBreathStore.getState().setBreathDuration(5);
      const state = useBreathStore.getState();
      expect(state.breathDuration).toBe(5);
      expect(state.breathTime).toBe(300); // 5 * 60
    });

    it('setBreathTime změní pouze čas', () => {
      useBreathStore.getState().setBreathTime(42);
      expect(useBreathStore.getState().breathTime).toBe(42);
    });

    it('setIsBreathing přepne stav dýchání', () => {
      useBreathStore.getState().setIsBreathing(true);
      expect(useBreathStore.getState().isBreathing).toBe(true);
      useBreathStore.getState().setIsBreathing(false);
      expect(useBreathStore.getState().isBreathing).toBe(false);
    });
  });

  // ─── Akce: Preparation ──────────────────────────────────────────

  describe('Akce: Preparation', () => {
    it('setPreparationTime změní čas přípravy', () => {
      useBreathStore.getState().setPreparationTime(15);
      expect(useBreathStore.getState().preparationTime).toBe(15);
    });

    it('setIsPreparing přepne stav přípravy', () => {
      useBreathStore.getState().setIsPreparing(true);
      expect(useBreathStore.getState().isPreparing).toBe(true);
    });

    it('setPreparationCountdown změní odpočet', () => {
      useBreathStore.getState().setPreparationCountdown(5);
      expect(useBreathStore.getState().preparationCountdown).toBe(5);
    });
  });

  // ─── Akce: Reset ──────────────────────────────────────────────────

  describe('Akce: Reset', () => {
    it('resetBreathing vrátí timer a zastaví dýchání', () => {
      const store = useBreathStore.getState();
      store.setIsBreathing(true);
      store.setBreathTime(42);
      store.setBreathPhase('out');
      store.setIsPreparing(true);
      store.setPreparationCountdown(5);

      useBreathStore.getState().resetBreathing();

      const state = useBreathStore.getState();
      expect(state.isBreathing).toBe(false);
      expect(state.breathTime).toBe(state.breathDuration * 60);
      expect(state.breathPhase).toBe('in');
      expect(state.isPreparing).toBe(false);
      expect(state.preparationCountdown).toBe(0);
    });
  });
});
