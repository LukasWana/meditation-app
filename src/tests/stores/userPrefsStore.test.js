
import { useUserPrefsStore } from '@stores/userPrefsStore';

describe('userPrefsStore', () => {
  beforeEach(() => {
    const initial = useUserPrefsStore.getInitialState();
    useUserPrefsStore.setState(initial, true);
  });

  // ─── Výchozí stav ──────────────────────────────────────────────────

  describe('Výchozí stav', () => {
    it('má výchozí preference', () => {
      const state = useUserPrefsStore.getState();
      expect(state.gender).toBe('none');
      expect(state.voicePreference).toBe('auto');
    });
  });

  // ─── Akce ─────────────────────────────────────────────────────────

  describe('Akce', () => {
    it('setGender změní pohlaví', () => {
      useUserPrefsStore.getState().setGender('female');
      expect(useUserPrefsStore.getState().gender).toBe('female');
    });

    it('setGender změní na male', () => {
      useUserPrefsStore.getState().setGender('male');
      expect(useUserPrefsStore.getState().gender).toBe('male');
    });

    it('setVoicePreference změní preferenci hlasu', () => {
      useUserPrefsStore.getState().setVoicePreference('female');
      expect(useUserPrefsStore.getState().voicePreference).toBe('female');
    });

    it('setVoicePreference změní na auto', () => {
      useUserPrefsStore.getState().setVoicePreference('auto');
      expect(useUserPrefsStore.getState().voicePreference).toBe('auto');
    });
  });
});
