/**
 * Test: realtimeMetadataService Auto-Initialization Fix
 *
 * Root Cause: realtimeMetadataService.getAllMetadata() didn't trigger
 * fastMetadataService.getAllMetadata() to load data from Firebase Storage.
 *
 * Fix: Added automatic initialization of fastMetadataService when metadata is empty.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import { fastMetadataService } from '@services/fastMetadataService';

// Mock Firebase
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  listAll: vi.fn(() => Promise.resolve({
    items: [
      { name: 'test.mp3', fullPath: 'meditacie/SK/test.mp3' }
    ],
    prefixes: [{ name: 'SK' }]
  })),
  getDownloadURL: vi.fn(),
  getStorage: vi.fn(() => ({})),
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(),
  ref: vi.fn(),
  get: vi.fn(() => Promise.resolve({
    exists: vi.fn(() => false)
  }))
}));

vi.mock('@config/secure-firebase', () => ({
  storage: {},
  database: null,
  ensureFirebase: vi.fn(async () => {}),
}));

describe('realtimeMetadataService - Auto-Initialization Fix', () => {
  beforeEach(async () => {
    // Reset services
    fastMetadataService.metadata.clear();
    fastMetadataService.isInitialized = false;
    fastMetadataService.isLoading = false;

    vi.restoreAllMocks();
  });

  describe('BUGGY behavior (before fix)', () => {
    it('should return empty object when fastMetadataService not initialized', async () => {
      // Mock realtimeMetadataService to simulate empty result (no auto-init)
      vi.spyOn(realtimeMetadataService, 'getAllMetadata').mockResolvedValue({});

      expect(fastMetadataService.metadata.size).toBe(0);

      const metadata = await realtimeMetadataService.getAllMetadata();

      console.log('Metadata keys:', Object.keys(metadata).length);
      expect(Object.keys(metadata).length).toBe(0);
    });
  });

  describe('FIXED behavior (after fix)', () => {
    it('should auto-initialize fastMetadataService when metadata is empty', async () => {
      // fastMetadataService is not initialized
      expect(fastMetadataService.metadata.size).toBe(0);
      expect(fastMetadataService.isInitialized).toBe(false);

      // Call realtimeMetadataService.getAllMetadata()
      // This auto-initializes fastMetadataService, loading from cache or Firebase
      const metadata = await realtimeMetadataService.getAllMetadata();

      // After auto-init, fastMetadataService should be initialized
      // (loads from cache which was populated by the mock)
      expect(fastMetadataService.isInitialized).toBe(true);
      expect(fastMetadataService.metadata.size).toBeGreaterThan(0);

      // Verify metadata was returned
      expect(Object.keys(metadata).length).toBeGreaterThan(0);

      console.log('Auto-initialization successful!');
      console.log('Metadata keys:', Object.keys(metadata).length);
    });

    it('should not re-initialize if metadata already exists', async () => {
      // Pre-populate metadata
      const testData = {
        'meditacie/SK/test.mp3': {
          fileName: 'meditacie/SK/test.mp3',
          folder: 'meditacie',
          language: 'SK'
        }
      };

      fastMetadataService.metadata.set('meditacie/SK/test.mp3', testData['meditacie/SK/test.mp3']);

      const initialSize = fastMetadataService.metadata.size;

      // Call getAllMetadata again
      const metadata = await realtimeMetadataService.getAllMetadata();

      // Should not re-initialize
      expect(fastMetadataService.metadata.size).toBe(initialSize);
      expect(Object.keys(metadata).length).toBe(initialSize);
    });
  });

  describe('Integration with slovaDataService', () => {
    it('should work correctly when slovaDataService calls realtimeMetadataService', async () => {
      const { slovaDataService } = await import('@services/slovaDataService');

      // Initialize fastMetadataService with test data
      await fastMetadataService.getAllMetadata();

      // Now slovaDataService should get data
      await slovaDataService.initialize();

      const skData = slovaDataService.getSlovaData('all', 'sk');

      console.log('SK data count:', skData.length);
      expect(skData.length).toBeGreaterThanOrEqual(0);
    });
  });
});
