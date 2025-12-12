import { describe, it, expect, vi, beforeEach } from 'vitest';
import errorHandler from '../../utils/error-handler';

// Mock fetch
global.fetch = vi.fn();

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset error queue
    errorHandler.errorQueue = [];
  });

  describe('handleError', () => {
    it('should create error data with correct structure', async () => {
      const error = new Error('Test error');
      const context = { type: 'test_error' };

      const result = await errorHandler.handleError(error, context);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('timestampISO');
      expect(result).toHaveProperty('message', 'Test error');
      expect(result).toHaveProperty('name', 'Error');
      expect(result).toHaveProperty('stack');
      expect(result).toHaveProperty('context');
      expect(result.context).toHaveProperty('type', 'test_error');
    });

    it('should add error to queue', async () => {
      const error = new Error('Test error');

      await errorHandler.handleError(error);

      expect(errorHandler.errorQueue).toHaveLength(1);
      expect(errorHandler.errorQueue[0].message).toBe('Test error');
    });

    it('should handle non-Error objects', async () => {
      const result = await errorHandler.handleError('String error');

      expect(result.message).toBe('String error');
      expect(result.name).toBe('UnknownError');
    });
  });

  describe('handleFirebaseError', () => {
    it('should handle Firebase errors with correct context', async () => {
      const error = new Error('Firebase error');
      error.code = 'auth/user-not-found';

      const result = await errorHandler.handleFirebaseError(error, 'signIn', { userId: '123' });

      expect(result.context.type).toBe('firebase_error');
      expect(result.context.operation).toBe('signIn');
      expect(result.context.userId).toBe('123');
    });
  });

  describe('handleAudioError', () => {
    it('should handle audio errors with correct context', async () => {
      const error = new Error('Audio error');

      const result = await errorHandler.handleAudioError(error, 'audio.mp3', { duration: 300 });

      expect(result.context.type).toBe('audio_error');
      expect(result.context.fileName).toBe('audio.mp3');
      expect(result.context.duration).toBe(300);
    });
  });

  describe('handleCacheError', () => {
    it('should handle cache errors with correct context', async () => {
      const error = new Error('Cache error');

      const result = await errorHandler.handleCacheError(error, 'metadata', { key: 'test' });

      expect(result.context.type).toBe('cache_error');
      expect(result.context.cacheType).toBe('metadata');
      expect(result.context.key).toBe('test');
    });
  });

  describe('wrapAsync', () => {
    it('should execute function successfully', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await errorHandler.wrapAsync(fn, { context: 'test' });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
      expect(errorHandler.errorQueue).toHaveLength(0);
    });

    it('should handle function errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Async error'));

      await expect(errorHandler.wrapAsync(fn, { context: 'test' })).rejects.toThrow('Async error');

      expect(errorHandler.errorQueue).toHaveLength(1);
      expect(errorHandler.errorQueue[0].context.context).toBe('test');
    });
  });

  describe('wrapSync', () => {
    it('should execute function successfully', () => {
      const fn = vi.fn().mockReturnValue('success');

      const result = errorHandler.wrapSync(fn, { context: 'test' });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
      expect(errorHandler.errorQueue).toHaveLength(0);
    });

    it('should handle function errors', () => {
      const fn = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      const result = errorHandler.wrapSync(fn, { context: 'test' });

      expect(result).toBe(null);
      expect(errorHandler.errorQueue).toHaveLength(1);
      expect(errorHandler.errorQueue[0].context.context).toBe('test');
    });
  });

  describe('reportError', () => {
    it('should report error to external service', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const errorData = {
        id: 'test-error-id',
        message: 'Test error',
        context: { type: 'test' }
      };

      await errorHandler.reportError(errorData);

      expect(fetch).toHaveBeenCalledWith('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': errorHandler.sessionId
        },
        body: JSON.stringify(errorData)
      });
    });

    it('should handle reporting errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const errorData = {
        id: 'test-error-id',
        message: 'Test error'
      };

      // Should not throw
      await expect(errorHandler.reportError(errorData)).resolves.toBeUndefined();
    });
  });

  describe('flushErrors', () => {
    it('should flush errors from queue', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      // Add some errors to queue
      const seededErrors = [
        { id: 'error1', message: 'Error 1' },
        { id: 'error2', message: 'Error 2' }
      ];
      errorHandler.errorQueue = [...seededErrors];

      await errorHandler.flushErrors();

      expect(fetch).toHaveBeenCalledWith('/api/errors/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': errorHandler.sessionId
        },
        body: JSON.stringify({ errors: seededErrors })
      });

      expect(errorHandler.errorQueue).toHaveLength(0);
    });

    it('should handle flush errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      errorHandler.errorQueue = [
        { id: 'error1', message: 'Error 1' }
      ];

      await errorHandler.flushErrors();

      // Errors should be back in queue
      expect(errorHandler.errorQueue).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return error statistics', () => {
      errorHandler.errorQueue = [
        { id: 'error1', context: { type: 'firebase_error' } },
        { id: 'error2', context: { type: 'audio_error' } },
        { id: 'error3', context: { type: 'firebase_error' } }
      ];

      const stats = errorHandler.getStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorTypes).toEqual({
        firebase_error: 2,
        audio_error: 1
      });
      expect(stats.recentErrors).toHaveLength(3);
      expect(stats.sessionId).toBe(errorHandler.sessionId);
    });
  });

  describe('Error ID generation', () => {
    it('should generate unique error IDs', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const result1 = errorHandler.createErrorData(error1);
      const result2 = errorHandler.createErrorData(error2);

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id).toMatch(/^error_\d+_[a-z0-9]+$/);
      expect(result2.id).toMatch(/^error_\d+_[a-z0-9]+$/);
    });
  });

  describe('Performance data collection', () => {
    it('should collect performance data when available', () => {
      // Mock performance API
      Object.defineProperty(window, 'performance', {
        value: {
          timing: {
            navigationStart: 1000,
            loadEventEnd: 2000,
            domContentLoadedEventEnd: 1500
          },
          getEntriesByType: vi.fn().mockReturnValue([
            { name: 'first-paint', startTime: 1200 },
            { name: 'first-contentful-paint', startTime: 1300 }
          ])
        },
        writable: true
      });

      const error = new Error('Test error');
      const result = errorHandler.createErrorData(error);

      expect(result.performance).toBeDefined();
      expect(result.performance.loadTime).toBe(1000);
      expect(result.performance.domContentLoaded).toBe(500);
    });
  });

  describe('Memory data collection', () => {
    it('should collect memory data when available', () => {
      // Mock performance.memory API
      Object.defineProperty(window, 'performance', {
        value: {
          memory: {
            usedJSHeapSize: 1000000,
            totalJSHeapSize: 2000000,
            jsHeapSizeLimit: 4000000
          }
        },
        writable: true
      });

      const error = new Error('Test error');
      const result = errorHandler.createErrorData(error);

      expect(result.memory).toBeDefined();
      expect(result.memory.usedJSHeapSize).toBe(1000000);
      expect(result.memory.totalJSHeapSize).toBe(2000000);
      expect(result.memory.jsHeapSizeLimit).toBe(4000000);
    });
  });
});


