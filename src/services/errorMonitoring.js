/**
 * Error monitoring service pro production
 * Sleduje chyby a odesílá je na monitoring služby
 */

import { log } from './logger.js';
import { performanceMonitor } from './performanceMonitor.js';

class ErrorMonitoringService {
  constructor() {
    this.isProduction = import.meta.env.MODE === 'production';
    this.errorQueue = [];
    this.maxQueueSize = 50;
    this.flushInterval = 30000; // 30 sekund
    this.isInitialized = false;

    this.initialize();
  }

  /**
   * Inicializace error monitoring
   */
  initialize() {
    if (this.isInitialized) return;

    try {
      // Nastavení globálního error handleru
      this.setupGlobalErrorHandlers();

      // Nastavení performance monitoring - delegováno na performanceMonitor
      this.setupPerformanceMonitoring();

      // Nastavení periodic flush
      this.setupPeriodicFlush();

      this.isInitialized = true;
      log.info('Error monitoring service initialized');

    } catch (error) {
      console.error('Failed to initialize error monitoring:', error);
    }
  }

  /**
   * Nastavení globálních error handlerů
   */
  setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });

    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.captureError('Resource Loading Error', {
          type: event.target.tagName,
          src: event.target.src || event.target.href,
          error: event.error
        });
      }
    }, true);
  }

  /**
   * Nastavení performance monitoring
   */
  setupPerformanceMonitoring() {
    if (typeof window === 'undefined' || !window.performance) return;

    // Monitorování Core Web Vitals
    this.monitorWebVitals();

    // Monitorování long tasks
    this.monitorLongTasks();
  }

  /**
   * Monitorování Core Web Vitals
   */
  monitorWebVitals() {
    try {
      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];

          if (lastEntry && lastEntry.startTime > 3000) {
            this.captureError('Performance Issue', {
              type: 'LCP',
              value: lastEntry.startTime,
              threshold: 3000
            });
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      }

      // First Input Delay (FID)
      if ('PerformanceObserver' in window) {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.processingStart - entry.startTime > 100) {
              this.captureError('Performance Issue', {
                type: 'FID',
                value: entry.processingStart - entry.startTime,
                threshold: 100
              });
            }
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
      }

    } catch (error) {
      log.warn('Failed to setup Web Vitals monitoring:', error);
    }
  }

  /**
   * Monitorování long tasks - DELEGOVÁNO na performanceMonitor
   */
  monitorLongTasks() {
    // Long task monitoring je nyní delegováno na performanceMonitor
    // který má lepší optimalizace a méně noise
    log.debug('Long task monitoring delegated to performanceMonitor');
  }

  /**
   * Nastavení periodic flush
   */
  setupPeriodicFlush() {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      this.flushErrors();
    }, this.flushInterval);

    // Flush při unload stránky
    window.addEventListener('beforeunload', () => {
      this.flushErrors();
    });
  }

  /**
   * Zachycení erroru
   */
  captureError(message, error, context = {}) {
    const errorData = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message,
      error: this.sanitizeError(error),
      context: this.sanitizeContext(context),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      userId: this.getUserId(),
      sessionId: this.getSessionId()
    };

    // Přidat do queue
    this.errorQueue.push(errorData);

    // Omezení velikosti queue
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Log lokálně
    log.error(message, error, context);

    // V production módu odeslat okamžitě pro kritické chyby
    if (this.isProduction && this.isCriticalError(errorData)) {
      this.sendErrorToServices(errorData);
    }
  }

  /**
   * Sanitizace error objektu
   */
  sanitizeError(error) {
    if (!error) return null;

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      };
    }

    if (typeof error === 'object') {
      return JSON.parse(JSON.stringify(error));
    }

    return String(error);
  }

  /**
   * Sanitizace context objektu
   */
  sanitizeContext(context) {
    try {
      // Odstraň citlivé údaje
      const sanitized = { ...context };
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.apiKey;
      delete sanitized.secret;

      return sanitized;
    } catch {
      return { context: 'Unable to sanitize context' };
    }
  }

  /**
   * Kontrola kritické chyby
   */
  isCriticalError(errorData) {
    const criticalMessages = [
      'Unhandled Promise Rejection',
      'JavaScript Error',
      'Network Error',
      'Authentication Error'
    ];

    return criticalMessages.some(msg =>
      errorData.message.includes(msg)
    );
  }

  /**
   * Odeslání erroru na monitoring služby
   */
  sendErrorToServices(errorData) {
    try {
      // Google Analytics
      this.sendToGoogleAnalytics(errorData);

      // Custom endpoint (pokud je nakonfigurován)
      this.sendToCustomEndpoint(errorData);

      // Console v development módu
      if (!this.isProduction) {
        console.error('Error captured:', errorData);
      }

    } catch (error) {
      console.error('Failed to send error to monitoring services:', error);
    }
  }

  /**
   * Odeslání na Google Analytics
   */
  sendToGoogleAnalytics(errorData) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: errorData.message,
        fatal: this.isCriticalError(errorData),
        custom_map: {
          error_id: errorData.id,
          error_type: errorData.error?.name || 'Unknown',
          user_id: errorData.userId,
          session_id: errorData.sessionId
        }
      });
    }
  }

  /**
   * Odeslání na custom endpoint
   */
  async sendToCustomEndpoint(errorData) {
    // TODO: Implementovat odeslání na vlastní error tracking endpoint
    // const response = await fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData)
    // });
  }

  /**
   * Flush všech errorů z queue
   */
  flushErrors() {
    if (this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    errorsToSend.forEach(error => {
      this.sendErrorToServices(error);
    });

    log.debug(`Flushed ${errorsToSend.length} errors to monitoring services`);
  }

  /**
   * Generování error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Získání user ID
   */
  getUserId() {
    // TODO: Implementovat získání skutečného user ID
    return localStorage.getItem('userId') || 'anonymous';
  }

  /**
   * Získání session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Manuální zachycení erroru
   */
  captureException(error, context = {}) {
    this.captureError('Manual Exception', error, context);
  }

  /**
   * Zachycení custom erroru
   */
  captureMessage(message, level = 'info', context = {}) {
    this.captureError(`Custom Message [${level.toUpperCase()}]`, message, context);
  }

  /**
   * Získání error queue
   */
  getErrorQueue() {
    return [...this.errorQueue];
  }

  /**
   * Vyčištění error queue
   */
  clearErrorQueue() {
    this.errorQueue = [];
  }
}

// Singleton instance
const errorMonitoring = new ErrorMonitoringService();

export default errorMonitoring;

// Export utility functions
export const captureError = (message, error, context) =>
  errorMonitoring.captureError(message, error, context);

export const captureException = (error, context) =>
  errorMonitoring.captureException(error, context);

export const captureMessage = (message, level, context) =>
  errorMonitoring.captureMessage(message, level, context);
