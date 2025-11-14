import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAudioPlayer } from '@features/audio/hooks/useAudioPlayer';

// Mock dependencies
vi.mock('@services/cacheServiceRefactored', () => ({
  default: {
    getCachedAudioUrl: vi.fn(() => Promise.resolve(null)),
    cacheAudioUrl: vi.fn(() => Promise.resolve())
  }
}));

vi.mock('@services/logger', () => ({
  default: {
    audio: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@services/globalMetadataPreloader', () => ({
  default: {
    preloadMetadata: vi.fn(() => Promise.resolve())
  }
}));

vi.mock('@services/offlineCacheService', () => ({
  default: {
    getCachedFile: vi.fn(() => Promise.resolve(null))
  }
}));

vi.mock('@features/audio/hooks/useAutoplay', () => ({
  useAutoplay: vi.fn()
}));

// Mock Audio API
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 0,
  volume: 1,
  paused: true
}));

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  resume: vi.fn(() => Promise.resolve()),
  suspend: vi.fn(() => Promise.resolve()),
  state: 'running'
}));

global.webkitAudioContext = global.AudioContext;

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.globalAudioContext = null;
    window.audioActivated = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAudioPlayer('test-audio.mp3'));

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('should return audioRef', () => {
    const { result } = renderHook(() => useAudioPlayer('test-audio.mp3'));

    expect(result.current.audioRef).toBeDefined();
    expect(result.current.audioRef.current).toBeInstanceOf(HTMLAudioElement || Object);
  });

  it('should provide togglePlayPause function', () => {
    const { result } = renderHook(() => useAudioPlayer('test-audio.mp3'));

    expect(typeof result.current.togglePlayPause).toBe('function');
  });

  it('should provide skipBackward and skipForward functions', () => {
    const { result } = renderHook(() => useAudioPlayer('test-audio.mp3'));

    expect(typeof result.current.skipBackward).toBe('function');
    expect(typeof result.current.skipForward).toBe('function');
  });

  it('should provide handleSeek function', () => {
    const { result } = renderHook(() => useAudioPlayer('test-audio.mp3'));

    expect(typeof result.current.handleSeek).toBe('function');
  });

  it('should provide formatTime function', () => {
    const { result } = renderHook(() => useAudioPlayer('test-audio.mp3'));

    expect(typeof result.current.formatTime).toBe('function');
    expect(result.current.formatTime(125)).toBe('2:05');
    expect(result.current.formatTime(65)).toBe('1:05');
  });

  it('should provide fadeOutAndClose function', () => {
    const { result } = renderHook(() => useAudioPlayer('test-audio.mp3'));

    expect(typeof result.current.fadeOutAndClose).toBe('function');
  });

  it('should handle audioUrl changes', () => {
    const { result, rerender } = renderHook(
      ({ url }) => useAudioPlayer(url),
      { initialProps: { url: 'test1.mp3' } }
    );

    expect(result.current.isLoading).toBe(true);

    rerender({ url: 'test2.mp3' });

    expect(result.current.isLoading).toBe(true);
  });
});

