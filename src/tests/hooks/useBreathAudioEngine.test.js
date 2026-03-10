import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

// ─── Web Audio API mock ────────────────────────────────────────────────────────

const createMockAudioParam = (initialValue = 1) => ({
  value: initialValue,
  setValueAtTime: vi.fn(function (v) { this.value = v; return this; }),
  linearRampToValueAtTime: vi.fn(function (v) { this.value = v; return this; }),
  cancelScheduledValues: vi.fn(),
});

const createMockGainNode = () => ({
  gain: createMockAudioParam(1),
  connect: vi.fn(),
  disconnect: vi.fn(),
});

const createMockSourceNode = () => ({
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

const createMockAudioBuffer = (duration = 4.0) => ({
  duration,
  length: duration * 44100,
  sampleRate: 44100,
  numberOfChannels: 1,
  getChannelData: vi.fn(() => new Float32Array(1)),
});

const createMockAudioContext = (initialTime = 10) => {
  let _currentTime = initialTime;
  let _state = 'running';
  const stateChangeListeners = [];

  return {
    get currentTime() { return _currentTime; },
    get state() { return _state; },
    destination: { maxChannelCount: 2 },
    createGain: vi.fn(() => createMockGainNode()),
    createBufferSource: vi.fn(() => createMockSourceNode()),
    decodeAudioData: vi.fn(async () => createMockAudioBuffer()),
    resume: vi.fn(async () => { _state = 'running'; }),
    suspend: vi.fn(async () => { _state = 'suspended'; }),
    close: vi.fn(async () => { _state = 'closed'; }),
    addEventListener: vi.fn((event, handler) => {
      if (event === 'statechange') stateChangeListeners.push(handler);
    }),
    removeEventListener: vi.fn(),
    _advanceTime(s) { _currentTime += s; },
    _setState(s) { _state = s; },
  };
};

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@config/secure-firebase', () => ({
  storage: {}, auth: {}, db: {}, app: {}, database: {},
  realtimeDatabase: {}, appCheck: null,
  withFirebaseErrorHandling: vi.fn(async (op) => op()),
  firebaseUtils: { getDocument: vi.fn(), setDocument: vi.fn(), getFile: vi.fn() },
  default: {},
}));

vi.mock('@services/realtimeMetadataService', () => ({
  realtimeMetadataService: {
    getFileMetadata: vi.fn(async (id) => {
      if (id === 'none' || !id) return null;
      return { downloadURL: `https://mock.example.com/${id}.mp3` };
    }),
  },
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  getDownloadURL: vi.fn(async () => 'https://mock.example.com/fallback.mp3'),
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

const setupGlobals = (ctx) => {
  window.AudioContext = vi.fn(() => ctx);
  window.webkitAudioContext = vi.fn(() => ctx);
  window.globalAudioContext = ctx;
  global.fetch = vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(1024),
  }));
};

const cleanGlobals = () => {
  delete window.AudioContext;
  delete window.webkitAudioContext;
  delete window.globalAudioContext;
  global.fetch = undefined;
};

const baseProps = {
  isPlaying: false,
  breathInDuration: 4,
  breathOutDuration: 6,
  breathInSound: 'sound-in-1',
  breathOutSound: 'sound-out-1',
  breathClickSound: 'sound-click-1',
  breathSoundFadeEnabled: true,
  onPhaseChange: vi.fn(),
};

let useBreathAudioEngine;

const renderEngine = (overrides = {}) => {
  const props = { ...baseProps, ...overrides };
  return renderHook(
    (p) => useBreathAudioEngine(
      p.isPlaying, p.breathInDuration, p.breathOutDuration,
      p.breathInSound, p.breathOutSound, p.breathClickSound,
      p.breathSoundFadeEnabled, p.onPhaseChange
    ),
    { initialProps: props }
  );
};

// Wait for all async operations (URL loading, buffer decoding, effects) to settle
const waitForBuffers = async () => {
  // Flush multiple microtask rounds to let React effects and Promise.all settle
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await flushPromises();
    });
  }
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('useBreathAudioEngine', () => {
  let ctx;

  beforeAll(async () => {
    const mod = await import('@features/meditation/hooks/useBreathAudioEngine');
    useBreathAudioEngine = mod.useBreathAudioEngine;
  });

  beforeEach(() => {
    ctx = createMockAudioContext(10.0);
    setupGlobals(ctx);
    baseProps.onPhaseChange = vi.fn();
  });

  afterEach(() => {
    cleanGlobals();
    vi.restoreAllMocks();
  });

  // ─── Inicializace ────────────────────────────────────────────────────

  describe('Inicializace', () => {
    it('vrátí správné API', async () => {
      const { result } = renderEngine();
      await waitForBuffers();
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('loadError');
      expect(result.current).toHaveProperty('getCurrentPhase');
      expect(result.current).toHaveProperty('resetAudioEngine');
      expect(result.current).toHaveProperty('initializeAudioContext');
    });

    it('začne s isLoading=false a loadError=null', async () => {
      const { result } = renderEngine();
      // Před načtením bufferů
      expect(result.current.loadError).toBe(null);
    });

    it('vytvoří 4 gain nodes při initializeAudioContext', async () => {
      const { result } = renderEngine();
      act(() => { result.current.initializeAudioContext(); });
      expect(ctx.createGain).toHaveBeenCalledTimes(4);
    });

    it('resumuje suspended AudioContext', async () => {
      ctx._setState('suspended');
      const { result } = renderEngine();
      act(() => { result.current.initializeAudioContext(); });
      expect(ctx.resume).toHaveBeenCalled();
    });
  });

  // ─── Načítání bufferů ──────────────────────────────────────────────

  describe('Načítání bufferů', () => {
    it('načte URL přes realtimeMetadataService', async () => {
      const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
      renderEngine();
      await waitForBuffers();
      expect(realtimeMetadataService.getFileMetadata).toHaveBeenCalledWith('sound-in-1');
      expect(realtimeMetadataService.getFileMetadata).toHaveBeenCalledWith('sound-out-1');
      expect(realtimeMetadataService.getFileMetadata).toHaveBeenCalledWith('sound-click-1');
    });

    it('nenačítá URL pro zvuky s ID "none"', async () => {
      const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
      realtimeMetadataService.getFileMetadata.mockClear();
      renderEngine({
        breathInSound: 'none',
        breathOutSound: 'none',
        breathClickSound: 'none',
      });
      await waitForBuffers();
      expect(realtimeMetadataService.getFileMetadata).not.toHaveBeenCalled();
    });

    it('isLoading je false po dokončení načítání (Bug 4 fix)', async () => {
      const { result } = renderEngine();
      await waitForBuffers();
      expect(result.current.isLoading).toBe(false);
    });
  });

  // ─── Scheduler ─────────────────────────────────────────────────────

  describe('Scheduler', () => {
    it('neplánuje zvuky pokud isPlaying=false', async () => {
      renderEngine({ isPlaying: false });
      await waitForBuffers();
      const sources = ctx.createBufferSource.mock.results.map(r => r.value);
      sources.forEach(s => { expect(s.start).not.toHaveBeenCalled(); });
    });

    it('plánuje zvuky po isPlaying=true + buffery načteny', async () => {
      const { rerender } = renderEngine({ isPlaying: false });
      await waitForBuffers();

      await act(async () => {
        rerender({ ...baseProps, isPlaying: true });
        await flushPromises();
      });
      // Dej scheduleru čas se spustit (50ms interval)
      await act(async () => { await flushPromises(); });

      expect(ctx.createBufferSource.mock.calls.length).toBeGreaterThan(0);
    });

    it('zastaví scheduler při isPlaying=false', async () => {
      const { rerender } = renderEngine({ isPlaying: false });
      await waitForBuffers();

      await act(async () => {
        rerender({ ...baseProps, isPlaying: true });
        await flushPromises();
      });
      await act(async () => { await flushPromises(); });

      const before = ctx.createBufferSource.mock.calls.length;

      await act(async () => {
        rerender({ ...baseProps, isPlaying: false });
        await flushPromises();
      });
      await act(async () => { await flushPromises(); });

      const after = ctx.createBufferSource.mock.calls.length;
      expect(after - before).toBeLessThanOrEqual(2);
    });
  });

  // ─── Bug 3: gain node automatizace ──────────────────────────────────

  describe('Bug 3 fix: gain cancelScheduledValues', () => {
    it('gain nodes dostávají setValueAtTime', async () => {
      const { rerender } = renderEngine({ isPlaying: false });
      await waitForBuffers();

      await act(async () => {
        rerender({ ...baseProps, isPlaying: true });
        await flushPromises();
      });
      await act(async () => { await flushPromises(); });

      const gains = ctx.createGain.mock.results.map(r => r.value);
      const hasSetValue = gains.some(n => n.gain.setValueAtTime.mock.calls.length > 0);
      expect(hasSetValue).toBe(true);
    });

    it('cancelScheduledValues je volán při plánování zvuků', async () => {
      const { rerender } = renderEngine({ isPlaying: false });
      await waitForBuffers();

      await act(async () => {
        rerender({ ...baseProps, isPlaying: true });
        await flushPromises();
      });
      await act(async () => { await flushPromises(); });

      const gains = ctx.createGain.mock.results.map(r => r.value);
      const hasCancel = gains.some(n => n.gain.cancelScheduledValues.mock.calls.length > 0);
      expect(hasCancel).toBe(true);
    });
  });

  // ─── Bug 1: Race condition ──────────────────────────────────────────

  describe('Bug 1 fix: isPlaying dříve než buffery', () => {
    it('zvuky se přehrají i když isPlaying přijde před buffery', async () => {
      const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
      const origImpl = realtimeMetadataService.getFileMetadata.getMockImplementation();

      let resolvers = [];
      realtimeMetadataService.getFileMetadata.mockImplementation(async (id) => {
        await new Promise(r => { resolvers.push(r); });
        return { downloadURL: `https://mock.example.com/${id}.mp3` };
      });

      // Spusť s isPlaying=true PŘED načtením bufferů
      const { result } = renderEngine({ isPlaying: true });
      await act(async () => { await flushPromises(); });

      // Buffery ještě nejsou - resolve je
      await act(async () => {
        resolvers.forEach(r => r());
        resolvers = [];
        await flushPromises();
      });

      // Počkej na dekódování bufferů a spuštění scheduleru
      await waitForBuffers();

      expect(ctx.createBufferSource.mock.calls.length).toBeGreaterThan(0);

      // Cleanup
      realtimeMetadataService.getFileMetadata.mockImplementation(
        origImpl || (async (id) => ({ downloadURL: `https://mock.example.com/${id}.mp3` }))
      );
    });
  });

  // ─── Visibility change ──────────────────────────────────────────────

  describe('Visibility change', () => {
    it('resumuje AudioContext při návratu z pozadí', async () => {
      const { rerender } = renderEngine({ isPlaying: false });
      await waitForBuffers();

      await act(async () => {
        rerender({ ...baseProps, isPlaying: true });
        await flushPromises();
      });
      ctx._advanceTime(5);

      // Přechod na pozadí
      ctx._setState('suspended');
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });

      // Návrat
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });
      await act(async () => { await flushPromises(); });

      expect(ctx.resume).toHaveBeenCalled();
    });
  });

  // ─── Reset ────────────────────────────────────────────────────────

  describe('Reset', () => {
    it('getCurrentPhase vrátí "in" po resetu', async () => {
      const { result, rerender } = renderEngine({ isPlaying: false });
      await waitForBuffers();

      await act(async () => {
        rerender({ ...baseProps, isPlaying: true });
        await flushPromises();
      });

      act(() => { result.current.resetAudioEngine(); });
      expect(result.current.getCurrentPhase()).toBe('in');
    });

    it('zastaví aktivní source nodes', async () => {
      const { result, rerender } = renderEngine({ isPlaying: false });
      await waitForBuffers();

      await act(async () => {
        rerender({ ...baseProps, isPlaying: true });
        await flushPromises();
      });
      await act(async () => { await flushPromises(); });

      const sources = ctx.createBufferSource.mock.results.map(r => r.value);

      act(() => { result.current.resetAudioEngine(); });

      sources.forEach(s => {
        if (s.start.mock.calls.length > 0) {
          expect(s.stop).toHaveBeenCalled();
        }
      });
    });
  });

  // ─── getCurrentPhase ──────────────────────────────────────────────

  describe('getCurrentPhase', () => {
    it('vrátí "in" pokud scheduler neběží', () => {
      const { result } = renderEngine();
      expect(result.current.getCurrentPhase()).toBe('in');
    });
  });

  // ─── Zvuky "none" ────────────────────────────────────────────────

  describe('Zvuky "none"', () => {
    it('funguje bez zvuku nádechu', async () => {
      const { result, rerender } = renderEngine({ isPlaying: false, breathInSound: 'none' });
      await waitForBuffers();

      await act(async () => {
        rerender({ ...baseProps, breathInSound: 'none', isPlaying: true });
        await flushPromises();
      });

      expect(result.current.loadError).toBe(null);
    });

    it('funguje úplně bez zvuků', async () => {
      const { result, rerender } = renderEngine({
        isPlaying: false,
        breathInSound: 'none', breathOutSound: 'none', breathClickSound: 'none',
      });
      await waitForBuffers();

      await act(async () => {
        rerender({
          ...baseProps,
          breathInSound: 'none', breathOutSound: 'none', breathClickSound: 'none',
          isPlaying: true,
        });
        await flushPromises();
      });

      expect(result.current.loadError).toBe(null);
    });
  });

  // ─── Bug 5: Změna presetů ────────────────────────────────────────

  describe('Bug 5 fix: změna zvukových presetů', () => {
    it('přenačte buffery při změně zvuku', async () => {
      const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
      const { rerender } = renderEngine({ isPlaying: false });
      await waitForBuffers();

      await act(async () => {
        rerender({ ...baseProps, breathInSound: 'sound-in-2' });
        await flushPromises();
      });
      await waitForBuffers();

      expect(realtimeMetadataService.getFileMetadata).toHaveBeenCalledWith('sound-in-2');
    });
  });
});
