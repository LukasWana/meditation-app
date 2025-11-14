import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fastMetadataService } from '@services/fastMetadataService';

// Mock dependencies
vi.mock('@services/firebase', () => ({
  storage: {}
}));

vi.mock('@services/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@services/realtimeMetadataService', () => ({
  realtimeMetadataService: {
    getAllMetadata: vi.fn(() => Promise.resolve({}))
  }
}));

vi.mock('@services/staticMetadataService', () => ({
  staticMetadataService: {
    getMetadata: vi.fn(() => Promise.resolve(null))
  }
}));

vi.mock('@utils/hudbaParser', () => ({
  parseAudioFileName: vi.fn((fileName) => ({
    albumName: 'Test Album',
    trackName: 'Test Track'
  }))
}));

describe('fastMetadataService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with empty metadata', () => {
    expect(fastMetadataService.metadata).toBeInstanceOf(Map);
    expect(fastMetadataService.metadata.size).toBe(0);
  });

  it('should load from cache if available', () => {
    const testData = {
      data: {
        'test.mp3': { fileName: 'test.mp3', duration: 120 }
      },
      timestamp: Date.now()
    };
    localStorage.setItem('fast-metadata-cache-v2', JSON.stringify(testData));

    const result = fastMetadataService.loadFromCache();

    expect(result).toBe(true);
    expect(fastMetadataService.metadata.size).toBe(1);
  });

  it('should not load expired cache', () => {
    const testData = {
      data: {
        'test.mp3': { fileName: 'test.mp3', duration: 120 }
      },
      timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 dní staré
    };
    localStorage.setItem('fast-metadata-cache-v2', JSON.stringify(testData));

    const result = fastMetadataService.loadFromCache();

    expect(result).toBe(false);
    expect(localStorage.getItem('fast-metadata-cache-v2')).toBeNull();
  });

  it('should save to cache', () => {
    fastMetadataService.metadata.set('test.mp3', { fileName: 'test.mp3', duration: 120 });

    fastMetadataService.saveToCache();

    const cached = localStorage.getItem('fast-metadata-cache-v2');
    expect(cached).toBeTruthy();
    const parsed = JSON.parse(cached);
    expect(parsed.data).toHaveProperty('test.mp3');
  });

  it('should normalize storage paths', () => {
    const normalized = fastMetadataService.normalizeStoragePath('meditace/test.mp3');
    expect(normalized).toBe('meditacie/test.mp3');
  });
});

