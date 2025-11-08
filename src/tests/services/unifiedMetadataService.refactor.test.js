import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import unifiedMetadataService from '@services/unifiedMetadataService.js';

describe('unifiedMetadataService – refaktor názvů sekcí', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    unifiedMetadataService.clearCache();
  });

  it('normalizuje kořenové složky na nové názvy', () => {
    expect(unifiedMetadataService.extractFolder('meditacie/sk/file.mp3')).toBe('meditace');
    expect(unifiedMetadataService.extractFolder('dychanie/cz/file.mp3')).toBe('dychani');
    expect(unifiedMetadataService.extractFolder('meditace/file.mp3')).toBe('meditace');
  });

  it('rozpozná typ souboru pro nové i legacy kořeny', () => {
    expect(unifiedMetadataService.extractType('meditace/sk/file.mp3')).toBe('meditace');
    expect(unifiedMetadataService.extractType('meditacie/sk/file.mp3')).toBe('meditace');
    expect(unifiedMetadataService.extractType('dychani/file.mp3')).toBe('dychani');
    expect(unifiedMetadataService.extractType('dychanie/file.mp3')).toBe('dychani');
  });
});


