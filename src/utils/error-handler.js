/**
 * Enhanced Error Handling System
 * Centralizovaný error handling s reporting a monitoring
 */

import log from '@services/logger';

/**
 * Error Handler třída
 */
class ErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.maxQueueSize = 100;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.sessionId = this.generateSessionId();
    this.isReportingEnabled = import.meta.env.MODE === 'production';

    // Setup global error handlers
    this.setupGlobalErrorHandlers();
  }

  /**
   * Generuje unikátní session ID
   * @returns {string} - Session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Nastaví globální error handlery
   */
  setupGlobalErrorHandlers() {
    if (typeof window !== 'undefined') {
      // Uncaught errors
      window.addEventListener('error', (event) => {
        this.handleError(event.error, {
          type: 'uncaught_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      // Unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          type: 'unhandled_promise_rejection',
          promise: event.promise
        });
      });
    }
  }

  /**
   * Hlavní metoda pro handling chyb
   * @param {Error|any} error - Chyba
   * @param {object} context - Kontext
   * @returns {object} - Error data
   */
  async handleError(error, context = {}) {
    const errorData = this.createErrorData(error, context);

    // Log error
    this.logError(errorData);

    // Add to queue for reporting
    this.addToQueue(errorData);

    // Report to external service if enabled
    if (this.isReportingEnabled) {
      await this.reportError(errorData);
    }

    return errorData;
  }

  /**
   * Vytvoří error data objekt
   * @param {Error|any} error - Chyba
   * @param {object} context - Kontext
   * @returns {object} - Error data
   */
  createErrorData(error, context = {}) {
    const timestamp = Date.now();

    return {
      id: this.generateErrorId(timestamp),
      sessionId: this.sessionId,
      timestamp,
      timestampISO: new Date(timestamp).toISOString(),

      // Error details
      message: error?.message || String(error),
      name: error?.name || 'UnknownError',
      stack: error?.stack || '',

      // Context
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
        screen: typeof window !== 'undefined' ? {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth
        } : null,
        viewport: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight
        } : null
      },

      // Performance data
      performance: this.getPerformanceData(),

      // Memory data (if available)
      memory: this.getMemoryData()
    };
  }

  /**
   * Generuje unikátní error ID
   * @param {number} timestamp - Timestamp
   * @returns {string} - Error ID
   */
  generateErrorId(timestamp) {
    return `error_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Získá performance data
   * @returns {object|null} - Performance data
   */
  getPerformanceData() {
    if (typeof performance === 'undefined') return null;

    try {
      const timing = performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Získá memory data
   * @returns {object|null} - Memory data
   */
  getMemoryData() {
    if (typeof performance === 'undefined' || !performance.memory) return null;

    try {
      const memory = performance.memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Loguje error
   * @param {object} errorData - Error data
   */
  logError(errorData) {
    const { message, name, stack, context } = errorData;

    // Log based on error type
    if (context?.type === 'firebase_error') {
      log.firebase('error', context.collection || 'unknown', message);
    } else if (context?.type === 'audio_error') {
      log.audio('error', context.fileName || 'unknown', message);
    } else if (context?.type === 'cache_error') {
      log.cache('error', context.cacheType || 'unknown', message);
    } else {
      log.error(`[${name}] ${message}`, { stack, context });
    }
  }

  /**
   * Přidá error do queue
   * @param {object} errorData - Error data
   */
  addToQueue(errorData) {
    this.errorQueue.push(errorData);

    // Limit queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Auto-flush if queue is getting large
    if (this.errorQueue.length >= this.maxQueueSize / 2) {
      this.flushErrors();
    }
  }

  /**
   * Odešle error do externí služby
   * @param {object} errorData - Error data
   */
  async reportError(errorData) {
    try {
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify(errorData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      log.debug('Error reported successfully:', errorData.id);
    } catch (reportError) {
      log.warn('Failed to report error:', reportError.message);

      // Retry mechanism
      if (errorData.retryCount < this.maxRetries) {
        errorData.retryCount = (errorData.retryCount || 0) + 1;
        setTimeout(() => this.reportError(errorData), this.retryDelay * errorData.retryCount);
      }
    }
  }

  /**
   * Odešle všechny errors z queue
   */
  async flushErrors() {
    if (this.errorQueue.length === 0) return;

    const errorsToReport = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const response = await fetch('/api/errors/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify({ errors: errorsToReport })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      log.debug(`Flushed ${errorsToReport.length} errors successfully`);
    } catch (flushError) {
      log.warn('Failed to flush errors:', flushError.message);

      // Put errors back in queue for retry
      this.errorQueue.unshift(...errorsToReport);
    }
  }

  /**
   * Specializované error handling pro Firebase
   * @param {Error} error - Firebase error
   * @param {string} operation - Operation name
   * @param {object} context - Additional context
   */
  async handleFirebaseError(error, operation, context = {}) {
    return this.handleError(error, {
      type: 'firebase_error',
      operation,
      ...context
    });
  }

  /**
   * Specializované error handling pro Audio
   * @param {Error} error - Audio error
   * @param {string} fileName - File name
   * @param {object} context - Additional context
   */
  async handleAudioError(error, fileName, context = {}) {
    return this.handleError(error, {
      type: 'audio_error',
      fileName,
      ...context
    });
  }

  /**
   * Specializované error handling pro Cache
   * @param {Error} error - Cache error
   * @param {string} cacheType - Cache type
   * @param {object} context - Additional context
   */
  async handleCacheError(error, cacheType, context = {}) {
    return this.handleError(error, {
      type: 'cache_error',
      cacheType,
      ...context
    });
  }

  /**
   * Wrapper pro async funkce s error handling
   * @param {Function} fn - Funkce k provedení
   * @param {object} context - Kontext
   * @returns {Promise} - Promise s error handling
   */
  async wrapAsync(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      await this.handleError(error, context);
      throw error;
    }
  }

  /**
   * Wrapper pro sync funkce s error handling
   * @param {Function} fn - Funkce k provedení
   * @param {object} context - Kontext
   * @returns {any} - Výsledek nebo null při chybě
   */
  wrapSync(fn, context = {}) {
    try {
      return fn();
    } catch (error) {
      this.handleError(error, context);
      return null;
    }
  }

  /**
   * Vrátí error statistiky
   * @returns {object} - Error statistics
   */
  getStats() {
    const errorTypes = {};
    const recentErrors = this.errorQueue.slice(-10);

    this.errorQueue.forEach(error => {
      const type = error.context?.type || 'unknown';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });

    return {
      totalErrors: this.errorQueue.length,
      errorTypes,
      recentErrors: recentErrors.map(error => ({
        id: error.id,
        message: error.message,
        type: error.context?.type || 'unknown',
        timestamp: error.timestampISO
      })),
      sessionId: this.sessionId
    };
  }
}

// Singleton instance
const errorHandler = new ErrorHandler();

// Export pro použití v aplikaci
export default errorHandler;

// Export helper funkcí
export const withErrorHandling = (fn, context = {}) => {
  return errorHandler.wrapAsync(fn, context);
};

export const withSyncErrorHandling = (fn, context = {}) => {
  return errorHandler.wrapSync(fn, context);
};

export const handleFirebaseError = (error, operation, context = {}) => {
  return errorHandler.handleFirebaseError(error, operation, context);
};

export const handleAudioError = (error, fileName, context = {}) => {
  return errorHandler.handleAudioError(error, fileName, context);
};

export const handleCacheError = (error, cacheType, context = {}) => {
  return errorHandler.handleCacheError(error, cacheType, context);
};


