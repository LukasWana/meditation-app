/**
 * Unit testy pro Logger service
 */

import logger, { log } from '@services/logger';
import { vi } from 'vitest';

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

global.console = mockConsole;

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logger.clearHistory();
  });

  describe('Development mode logging', () => {
    beforeEach(() => {
      // Mock development environment
      process.env.NODE_ENV = 'development';
      // Reset logger instance pro nové testy
      logger.isDevelopment = true;
    });

    it('should log debug messages in development', () => {
      log.debug('Test debug message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] Test debug message')
      );
    });

    it('should log info messages in development', () => {
      log.info('Test info message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Test info message')
      );
    });

    it('should log success messages in development', () => {
      log.success('Test success message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[SUCCESS] Test success message')
      );
    });

    it('should log audio messages with audio emoji', () => {
      log.audio('Test audio message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('🎵 [AUDIO] Test audio message')
      );
    });

    it('should log cache messages with cache emoji', () => {
      log.cache('Test cache message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('💾 [CACHE] Test cache message')
      );
    });

    it('should log firebase messages with firebase emoji', () => {
      log.firebase('Test firebase message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('🔥 [FIREBASE] Test firebase message')
      );
    });

    it('should log performance messages with color indicators', () => {
      log.performance('Test operation', 500);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('🟢 [PERF] Test operation (500ms)')
      );
    });
  });

  describe('Production mode logging', () => {
    beforeEach(() => {
      // Mock production environment
      process.env.NODE_ENV = 'production';
      // Reset logger instance pro nové testy
      logger.isDevelopment = false;
    });

    it('should not log debug messages in production', () => {
      log.debug('Test debug message');

      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should not log info messages in production', () => {
      log.info('Test info message');

      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should still log warnings in production', () => {
      log.warn('Test warning message');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] Test warning message')
      );
    });

    it('should still log errors in production', () => {
      const error = new Error('Test error');
      log.error('Test error message', error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] Test error message'),
        error
      );
    });
  });

  describe('Log history', () => {
    beforeEach(() => {
      // Nastav development mode pro log history testy
      logger.isDevelopment = true;
    });

    it('should maintain log history', () => {
      log.info('Test message 1');
      log.warn('Test message 2');

      const history = logger.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Test message 1');
      expect(history[1].message).toBe('Test message 2');
    });

    it('should filter history by level', () => {
      log.info('Info message');
      log.warn('Warning message');
      log.error('Error message');

      const errorHistory = logger.getHistory('error');

      expect(errorHistory).toHaveLength(1);
      expect(errorHistory[0].message).toBe('Error message');
    });

    it('should limit history size', () => {
      // Přidej více položek než maxHistorySize
      for (let i = 0; i < 150; i++) {
        log.info(`Message ${i}`);
      }

      const history = logger.getHistory();

      expect(history.length).toBeLessThanOrEqual(100); // maxHistorySize
    });

    it('should clear history', () => {
      log.info('Test message');
      expect(logger.getHistory()).toHaveLength(1);

      logger.clearHistory();
      expect(logger.getHistory()).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('should capture error details in history', () => {
      const error = new Error('Test error');
      log.error('Test error message', error);

      const history = logger.getHistory('error');
      const errorEntry = history[0];

      expect(errorEntry.error).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: expect.any(String)
      });
    });

    it('should handle errors without error object', () => {
      log.error('Test error message');

      const history = logger.getHistory('error');
      const errorEntry = history[0];

      expect(errorEntry.message).toBe('Test error message');
      expect(errorEntry.error).toBeNull();
    });
  });

  describe('Export functionality', () => {
    beforeEach(() => {
      // Nastav development mode pro export testy
      logger.isDevelopment = true;
    });

    it('should export logs as JSON', () => {
      log.info('Test message');

      const exportedLogs = logger.exportLogs();
      const parsedLogs = JSON.parse(exportedLogs);

      expect(parsedLogs).toHaveProperty('timestamp');
      expect(parsedLogs).toHaveProperty('environment');
      expect(parsedLogs).toHaveProperty('logs');
      expect(parsedLogs.logs).toHaveLength(1);
    });

    it('should include environment and user agent in export', () => {
      const exportedLogs = logger.exportLogs();
      const parsedLogs = JSON.parse(exportedLogs);

      expect(parsedLogs.environment).toBe(process.env.NODE_ENV);
      expect(parsedLogs.userAgent).toContain('jsdom'); // V testovacím prostředí s jsdom
    });
  });
});

