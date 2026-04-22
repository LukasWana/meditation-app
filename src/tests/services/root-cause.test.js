/**
 * FAILING TEST: Root Cause of Missing Meditacie Files
 *
 * This test demonstrates the bug: slovaDataService tries to access
 * fastMetadataService before it's initialized.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ROOT CAUSE: Initialization Order Bug', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should FAIL: slovaDataService before fastMetadataService initialization', async () => {
    // Simulate the problematic scenario
    const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
    const { slovaDataService } = await import('@services/slovaDataService');

    // slovaDataService is called BEFORE fastMetadataService.getAllMetadata()
    // This causes empty metadata to be returned
    const metadata = await realtimeMetadataService.getAllMetadata();

    console.log('Metadata keys:', Object.keys(metadata).length);
    console.log('Metadata sample:', Object.keys(metadata).slice(0, 5));

    // This FAILS because fastMetadataService hasn't been initialized yet
    expect(Object.keys(metadata).length).toBe(0);
  });

  it('should PASS: fastMetadataService initialized before slovaDataService', async () => {
    // Correct initialization order
    const { fastMetadataService } = await import('@services/fastMetadataService');

    // Mock Firebase calls
    vi.mock('firebase/storage', () => ({
      ref: vi.fn(),
      listAll: vi.fn(() => Promise.resolve({
        items: [{ name: 'test.mp3', fullPath: 'meditacie/SK/test.mp3' }],
        prefixes: [{ name: 'SK' }]
      })),
      getDownloadURL: vi.fn()
    }));

    // Initialize fastMetadataService FIRST
    await fastMetadataService.getAllMetadata();

    // Now slovaDataService can access the data
    const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
    const metadata = await realtimeMetadataService.getAllMetadata();

    // This PASSES because fastMetadataService was initialized first
    expect(Object.keys(metadata).length).toBeGreaterThan(0);
  });
});
