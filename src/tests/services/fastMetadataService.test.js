import { fastMetadataService } from '@services/fastMetadataService';


// Mockování Firebase Storage
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  listAll: vi.fn(),
  getDownloadURL: vi.fn()
}));

// Mockování secure-firebase
vi.mock('@config/secure-firebase', () => ({
  storage: {}
}));

// Mockování loggeru
vi.mock('@services/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  }
}));



describe('FastMetadataService Characterization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fastMetadataService.clearCache();
    // Reset private state if necessary, but singleton should be fine after clearCache
  });

  it('should have correct initial state', () => {
    expect(fastMetadataService.metadata).toBeInstanceOf(Map);
    expect(fastMetadataService.isLoading).toBe(false);
  });

  describe('normalizeRealtimeMetadata', () => {
    it('should normalize waveformData from object to array', () => {
      const input = {
        fileName: 'test.mp3',
        waveformData: { 0: 0.1, 1: 0.2, 2: 0.3 }
      };

      const result = fastMetadataService.normalizeRealtimeMetadata(input);
      expect(result.waveformData).toEqual([0.1, 0.2, 0.3]);
    });

    it('should handle already normalized waveformData', () => {
      const input = {
        fileName: 'test.mp3',
        waveformData: [0.1, 0.2, 0.3]
      };

      const result = fastMetadataService.normalizeRealtimeMetadata(input);
      expect(result.waveformData).toEqual([0.1, 0.2, 0.3]);
    });

    it('should return null for null input', () => {
      expect(fastMetadataService.normalizeRealtimeMetadata(null)).toBeNull();
    });
  });

  describe('getMetadata', () => {
    it('should return metadata from map if existing', () => {
      const mockMeta = { fileName: 'test.mp3' };
      fastMetadataService.metadata.set('test.mp3', mockMeta);
      expect(fastMetadataService.getMetadata('test.mp3')).toEqual(mockMeta);
    });

    it('should return undefined for missing metadata', () => {
      expect(fastMetadataService.getMetadata('nonexistent.mp3')).toBeUndefined();
    });
  });

  describe('formatDuration', () => {
    it('should format seconds into mm:ss', () => {
      expect(fastMetadataService.formatDuration(65)).toBe('1:05');
      expect(fastMetadataService.formatDuration(3600)).toBe('60:00');
    });

    it('should return N/A for invalid input', () => {
      expect(fastMetadataService.formatDuration(null)).toBe('N/A');
      expect(fastMetadataService.formatDuration(-1)).toBe('N/A');
    });
  });
});
