import { describe, it, expect, beforeEach, vi } from 'vitest';
import offlineCacheService from '@services/offlineCacheService';

// Mock dependencies
vi.mock('@services/logger', () => ({
  default: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    cache: vi.fn()
  }
}));

// Mock Cache API
const mockCache = {
  keys: vi.fn(() => Promise.resolve([])),
  match: vi.fn(() => Promise.resolve(null)),
  put: vi.fn(() => Promise.resolve()),
  delete: vi.fn(() => Promise.resolve(true))
};

global.caches = {
  open: vi.fn(() => Promise.resolve(mockCache)),
  keys: vi.fn(() => Promise.resolve([])),
  delete: vi.fn(() => Promise.resolve(true))
};

describe('offlineCacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    offlineCacheService.isInitialized = false;
    offlineCacheService.cache = null;
  });

  it('should initialize cache service', async () => {
    const result = await offlineCacheService.initialize();

    expect(result).toBe(true);
    expect(offlineCacheService.isInitialized).toBe(true);
    expect(global.caches.open).toHaveBeenCalledWith('meditation-audio-cache');
  });

  it('should return false if Cache API is not supported', async () => {
    const originalCaches = global.caches;
    delete global.caches;

    const result = await offlineCacheService.initialize();

    expect(result).toBe(false);
    expect(offlineCacheService.isInitialized).toBe(false);

    global.caches = originalCaches;
  });

  it('should check if file is cached', async () => {
    await offlineCacheService.initialize();
    mockCache.keys.mockResolvedValueOnce([
      { url: 'http://localhost:3000/audio/test.mp3' }
    ]);

    const result = await offlineCacheService.isFileCached('test.mp3');

    expect(result).toBe(true);
  });

  it('should return false if file is not cached', async () => {
    await offlineCacheService.initialize();
    mockCache.keys.mockResolvedValueOnce([]);

    const result = await offlineCacheService.isFileCached('nonexistent.mp3');

    expect(result).toBe(false);
  });

  it('should get cached file', async () => {
    await offlineCacheService.initialize();
    const mockResponse = new Response('test data');
    mockCache.keys.mockResolvedValueOnce([
      { url: 'http://localhost:3000/audio/test.mp3' }
    ]);
    mockCache.match.mockResolvedValueOnce(mockResponse);

    const result = await offlineCacheService.getCachedFile('test.mp3');

    expect(result).toBe(mockResponse);
  });

  it('should return null if file is not in cache', async () => {
    await offlineCacheService.initialize();
    mockCache.keys.mockResolvedValueOnce([]);

    const result = await offlineCacheService.getCachedFile('nonexistent.mp3');

    expect(result).toBeNull();
  });
});

