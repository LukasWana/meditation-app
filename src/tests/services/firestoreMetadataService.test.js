import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firestoreMetadataService } from '@services/firestoreMetadataService';

// Mock Firebase
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'audio-metadata' })),
  doc: vi.fn(() => ({ id: 'test-doc' })),
  getDoc: vi.fn((...args) => mockGetDoc(...args)),
  getDocs: vi.fn((...args) => mockGetDocs(...args)),
  setDoc: vi.fn((...args) => mockSetDoc(...args)),
  query: vi.fn((collection, orderBy) => ({ collection, orderBy })),
  orderBy: vi.fn(() => ({ field: 'fileName' }))
}));

vi.mock('@services/firebase', () => ({
  db: {}
}));

describe('firestoreMetadataService', () => {
  beforeEach(() => {
    localStorage.clear();
    firestoreMetadataService.cache.clear();
    vi.clearAllMocks();
  });

  it('should load from local cache if available', () => {
    const testData = {
      data: {
        'test.mp3': { fileName: 'test.mp3', duration: 120 }
      },
      timestamp: Date.now()
    };
    localStorage.setItem('audio-metadata-cache', JSON.stringify(testData));

    const result = firestoreMetadataService.loadFromLocalCache();

    expect(result).toBe(true);
    expect(firestoreMetadataService.cache.size).toBe(1);
  });

  it('should not load expired cache', () => {
    const testData = {
      data: {
        'test.mp3': { fileName: 'test.mp3', duration: 120 }
      },
      timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hodin staré
    };
    localStorage.setItem('audio-metadata-cache', JSON.stringify(testData));

    const result = firestoreMetadataService.loadFromLocalCache();

    expect(result).toBe(false);
    expect(localStorage.getItem('audio-metadata-cache')).toBeNull();
  });

  it('should save to local cache', () => {
    firestoreMetadataService.cache.set('test.mp3', { fileName: 'test.mp3', duration: 120 });

    firestoreMetadataService.saveToLocalCache();

    const cached = localStorage.getItem('audio-metadata-cache');
    expect(cached).toBeTruthy();
    const parsed = JSON.parse(cached);
    expect(parsed.data).toHaveProperty('test.mp3');
  });

  it('should load all metadata from Firestore', async () => {
    const mockSnapshot = {
      forEach: vi.fn((callback) => {
        callback({
          data: () => ({
            fileName: 'test.mp3',
            duration: 120,
            size: 1000000
          })
        });
      })
    };
    mockGetDocs.mockResolvedValueOnce(mockSnapshot);

    const result = await firestoreMetadataService.loadAllMetadata();

    expect(result).toHaveProperty('test.mp3');
    expect(result['test.mp3'].fileName).toBe('test.mp3');
    expect(firestoreMetadataService.cache.size).toBe(1);
  });

  it('should get metadata from cache', () => {
    firestoreMetadataService.cache.set('test.mp3', { fileName: 'test.mp3', duration: 120 });

    const result = firestoreMetadataService.getMetadata('test.mp3');

    expect(result).toEqual({ fileName: 'test.mp3', duration: 120 });
  });

  it('should return null if metadata not found', () => {
    const result = firestoreMetadataService.getMetadata('nonexistent.mp3');

    expect(result).toBeNull();
  });
});

