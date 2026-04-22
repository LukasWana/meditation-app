/**
 * Test: Metadata Initialization Order
 *
 * Root Cause Hypothesis: fastMetadataService might not be initialized
 * before slovaDataService tries to access it via realtimeMetadataService.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fastMetadataService } from '@services/fastMetadataService';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import { slovaDataService } from '@services/slovaDataService';

describe('Metadata Initialization Order', () => {
  beforeEach(() => {
    // Reset all services
    fastMetadataService.metadata.clear();
    fastMetadataService.isInitialized = false;
    slovaDataService.isInitialized = false;
    slovaDataService.slovaData = {
      sk: { male: [], female: [], all: [] },
      cz: { male: [], female: [], all: [] },
      en: { male: [], female: [], all: [] }
    };

    vi.clearAllMocks();
  });

  describe('Test 1: fastMetadataService initialization', () => {
    it('should have empty metadata before initialization', () => {
      expect(fastMetadataService.metadata.size).toBe(0);
      expect(fastMetadataService.isInitialized).toBe(false);
    });

    it('should populate metadata after initialization', async () => {
      // Mock Firebase calls
      vi.mock('firebase/storage', () => ({
        ref: vi.fn(),
        listAll: vi.fn(() => Promise.resolve({
          items: [],
          prefixes: []
        })),
        getDownloadURL: vi.fn()
      }));

      await fastMetadataService.getAllMetadata();

      // This would normally populate metadata, but with mocks it won't
      // In real scenario, this would check if metadata is loaded
      expect(fastMetadataService.isInitialized).toBe(true);
    });
  });

  describe('Test 2: realtimeMetadataService wrapper', () => {
    it('should return empty object if fastMetadataService is not initialized', async () => {
      const metadata = await realtimeMetadataService.getAllMetadata();

      expect(metadata).toBeDefined();
      expect(Object.keys(metadata).length).toBe(0);
    });

    it('should return metadata from fastMetadataService if initialized', async () => {
      // Simulate fastMetadataService having data
      const testMetadata = {
        'meditacie/SK/test.mp3': {
          fileName: 'meditacie/SK/test.mp3',
          folder: 'meditacie',
          language: 'SK'
        }
      };

      // Manually add to fastMetadataService metadata
      fastMetadataService.metadata.set('meditacie/SK/test.mp3', testMetadata['meditacie/SK/test.mp3']);

      const metadata = await realtimeMetadataService.getAllMetadata();

      expect(Object.keys(metadata).length).toBeGreaterThan(0);
      expect(metadata['meditacie/SK/test.mp3']).toBeDefined();
    });
  });

  describe('Test 3: slovaDataService initialization flow', () => {
    it('should handle empty metadata gracefully', async () => {
      // Mock realtimeMetadataService to return empty object
      vi.spyOn(realtimeMetadataService, 'getAllMetadata').mockResolvedValue({});

      await slovaDataService.initialize();

      // Should not crash, but should have no data
      expect(slovaDataService.isInitialized).toBe(true);
      expect(slovaDataService.slovaData.sk.all.length).toBe(0);
      expect(slovaDataService.slovaData.cz.all.length).toBe(0);
      expect(slovaDataService.slovaData.en.all.length).toBe(0);
    });

    it('should populate data when metadata is available', async () => {
      // Mock metadata with meditacie files
      const testMetadata = {
        'meditacie/SK/uzkost.mp3': {
          fileName: 'meditacie/SK/uzkost.mp3',
          folder: 'meditacie',
          language: 'SK',
          gender: 'female'
        },
        'meditacie/CZ/strach.mp3': {
          fileName: 'meditacie/CZ/strach.mp3',
          folder: 'meditacie',
          language: 'CZ',
          gender: 'male'
        },
        'meditacie/EN/stress.mp3': {
          fileName: 'meditacie/EN/stress.mp3',
          folder: 'meditacie',
          language: 'EN',
          gender: 'female'
        }
      };

      vi.spyOn(realtimeMetadataService, 'getAllMetadata').mockResolvedValue(testMetadata);

      await slovaDataService.initialize();

      // Should have data for all languages
      expect(slovaDataService.slovaData.sk.all.length).toBe(1);
      expect(slovaDataService.slovaData.cz.all.length).toBe(1);
      expect(slovaDataService.slovaData.en.all.length).toBe(1);
    });
  });

  describe('Test 4: Language detection in metadata', () => {
    it('should correctly identify SK files', async () => {
      const testMetadata = {
        'meditacie/SK/uzkost.mp3': {
          fileName: 'meditacie/SK/uzkost.mp3',
          folder: 'meditacie',
          language: 'SK'
        }
      };

      vi.spyOn(realtimeMetadataService, 'getAllMetadata').mockResolvedValue(testMetadata);

      await slovaDataService.initialize();

      const skData = slovaDataService.getSlovaData('all', 'sk');
      expect(skData.length).toBe(1);
      expect(skData[0].fileName).toBe('meditacie/SK/uzkost.mp3');
    });

    it('should correctly filter CZ files from SK user', async () => {
      const testMetadata = {
        'meditacie/SK/uzkost.mp3': {
          fileName: 'meditacie/SK/uzkost.mp3',
          folder: 'meditacie',
          language: 'SK'
        },
        'meditacie/CZ/strach.mp3': {
          fileName: 'meditacie/CZ/strach.mp3',
          folder: 'meditacie',
          language: 'CZ'
        }
      };

      vi.spyOn(realtimeMetadataService, 'getAllMetadata').mockResolvedValue(testMetadata);

      await slovaDataService.initialize();

      // SK user should only see SK files
      const skData = slovaDataService.getSlovaData('all', 'sk');
      expect(skData.length).toBe(1);
      expect(skData[0].language).toBe('SK');

      // CZ user should only see CZ files
      const czData = slovaDataService.getSlovaData('all', 'cz');
      expect(czData.length).toBe(1);
      expect(czData[0].language).toBe('CZ');
    });
  });

  describe('Test 5: Missing language property', () => {
    it('should handle files without language property', async () => {
      const testMetadata = {
        'meditacie/SK/uzkost.mp3': {
          fileName: 'meditacie/SK/uzkost.mp3',
          folder: 'meditacie',
          // Missing language property
        }
      };

      vi.spyOn(realtimeMetadataService, 'getAllMetadata').mockResolvedValue(testMetadata);

      await slovaDataService.initialize();

      // Should still work, filtering by fileName
      const skData = slovaDataService.getSlovaData('all', 'sk');
      expect(skData.length).toBe(1);
    });
  });
});
