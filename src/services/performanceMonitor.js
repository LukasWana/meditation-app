import { log } from './logger.js';
import { getCurrentConfig } from '@config/performance';

/**
 * Optimalizovaný Performance Monitor
 * Snižuje noise a zaměřuje se pouze na skutečné problémy
 */
class PerformanceMonitor {
  constructor() {
    this.isInitialized = false;
    this.config = getCurrentConfig();
    this.performanceThresholds = {
      longTask: this.config.longTaskThreshold,
      memoryWarning: 50 * 1024 * 1024, // 50MB
      slowNetwork: 3000 // ms
    };
    this.observers = new Map();
  }

  /**
   * Inicializace performance monitoringu
   */
  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // Pouze pokud je error monitoring povoleno v konfiguraci
      if (this.config.errorMonitoring) {
        this.setupLongTaskMonitoring();
        this.setupMemoryMonitoring();
        this.setupNetworkMonitoring();
      }

      this.isInitialized = true;
      if (this.config.performanceLogging) {
        log.info('Performance monitor initialized');
      }
    } catch (error) {
      log.warn('Failed to initialize performance monitor:', error);
    }
  }

  /**
   * Monitoring dlouhých úkolů - optimalizovaný
   */
  setupLongTaskMonitoring() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach(entry => {
          // Pouze skutečně dlouhé úkoly a pouze v production
          if (entry.duration > this.performanceThresholds.longTask) {
            // Pouze v production nebo pro velmi dlouhé úkoly
            if (import.meta.env.MODE === 'production' || entry.duration > 200) {
              this.handleLongTask(entry);
            }
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (error) {
      log.warn('Failed to setup long task monitoring:', error);
    }
  }

  /**
   * Zpracování dlouhého úkolu
   */
  handleLongTask(entry) {
    const severity = entry.duration > 200 ? 'high' : 'medium';

    log.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, {
      duration: entry.duration,
      startTime: entry.startTime,
      severity,
      threshold: this.performanceThresholds.longTask
    });

    // Pouze v production posílej do error monitoring
    if (import.meta.env.MODE === 'production') {
      this.reportToErrorMonitoring(entry);
    }
  }

  /**
   * Memory monitoring - pouze v production
   */
  setupMemoryMonitoring() {
    if (!('memory' in performance) || import.meta.env.MODE !== 'production') return;

    try {
      setInterval(() => {
        const memory = performance.memory;
        if (memory && memory.usedJSHeapSize > this.performanceThresholds.memoryWarning) {
          log.warn('High memory usage detected', {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
          });
        }
      }, 30000); // Check každých 30 sekund
    } catch (error) {
      log.warn('Failed to setup memory monitoring:', error);
    }
  }

  /**
   * Network monitoring - pouze pro velmi pomalé requesty
   */
  setupNetworkMonitoring() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach(entry => {
          if (entry.duration > this.performanceThresholds.slowNetwork) {
            log.warn('Slow network request detected', {
              url: entry.name,
              duration: entry.duration,
              size: entry.transferSize,
              threshold: this.performanceThresholds.slowNetwork
            });
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    } catch (error) {
      log.warn('Failed to setup network monitoring:', error);
    }
  }

  /**
   * Reportování do error monitoring služby
   */
  reportToErrorMonitoring(entry) {
    // Pouze pokud je error monitoring dostupný
    if (typeof window !== 'undefined' && window.errorMonitoring) {
      window.errorMonitoring.captureError('Performance Issue', {
        type: 'Long Task',
        duration: entry.duration,
        threshold: this.performanceThresholds.longTask,
        startTime: entry.startTime,
        severity: entry.duration > 200 ? 'high' : 'medium'
      });
    }
  }

  /**
   * Manuální měření performance
   */
  measurePerformance(name, fn) {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;

      if (duration > 50) { // Pouze pokud trvá déle než 50ms
        log.performance(`Manual measurement: ${name}`, duration);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      log.error(`Performance measurement failed: ${name}`, error, { duration });
      throw error;
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.observers.forEach((observer, type) => {
      try {
        observer.disconnect();
      } catch (error) {
        log.warn(`Failed to cleanup ${type} observer:`, error);
      }
    });
    this.observers.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-initialize v production nebo při debug flag
if (import.meta.env.MODE === 'production' || import.meta.env.VITE_DEBUG_PERFORMANCE === 'true') {
  performanceMonitor.initialize();
}

export { performanceMonitor };
export default performanceMonitor;
