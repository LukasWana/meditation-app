/**
 * Centralizovaný logging service
 * Nahrazuje všechny console.log statements v aplikaci
 */

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.logLevel = this.isDevelopment ? 'debug' : 'error';
    this.logHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Debug logging - pouze v development módu
   */
  debug(message, ...args) {
    if (this.isDevelopment) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
      this.addToHistory('debug', message, args);
    }
  }

  /**
   * Info logging - pouze v development módu
   */
  info(message, ...args) {
    if (this.isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
      this.addToHistory('info', message, args);
    }
  }

  /**
   * Warning logging - vždy se zobrazí
   */
  warn(message, ...args) {
    console.warn(`⚠️ [WARN] ${message}`, ...args);
    this.addToHistory('warn', message, args);
  }

  /**
   * Error logging - vždy se zobrazí
   */
  error(message, error = null, ...args) {
    // Lepší zobrazení error objektů
    let errorDisplay = error;
    if (error && typeof error === 'object') {
      if (error.message) {
        errorDisplay = error.message;
      } else if (error.toString && error.toString() !== '[object Object]') {
        errorDisplay = error.toString();
      } else {
        errorDisplay = JSON.stringify(error, null, 2);
      }
    }

    console.error(`❌ [ERROR] ${message}`, errorDisplay, ...args);
    this.addToHistory('error', message, args, error);

    // V production módu odeslat error na monitoring service
    if (!this.isDevelopment) {
      this.sendErrorToMonitoring(message, error);
    }
  }

  /**
   * Success logging - pouze v development módu
   */
  success(message, ...args) {
    if (this.isDevelopment) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
      this.addToHistory('success', message, args);
    }
  }

  /**
   * Audio specifické logging
   */
  audio(message, ...args) {
    if (this.isDevelopment) {
      console.log(`🎵 [AUDIO] ${message}`, ...args);
      this.addToHistory('audio', message, args);
    }
  }

  /**
   * Cache specifické logging
   */
  cache(message, ...args) {
    if (this.isDevelopment) {
      console.log(`💾 [CACHE] ${message}`, ...args);
      this.addToHistory('cache', message, args);
    }
  }

  /**
   * Firebase specifické logging
   */
  firebase(message, ...args) {
    if (this.isDevelopment) {
      console.log(`🔥 [FIREBASE] ${message}`, ...args);
      this.addToHistory('firebase', message, args);
    }
  }

  /**
   * Performance logging
   */
  performance(message, duration, ...args) {
    if (this.isDevelopment) {
      const color = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
      console.log(`${color} [PERF] ${message} (${duration}ms)`, ...args);
      this.addToHistory('performance', message, args, { duration });
    }
  }

  /**
   * Přidání do log historie
   */
  addToHistory(level, message, args, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      args: args.length > 0 ? args : null,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    };

    this.logHistory.push(logEntry);

    // Omezení velikosti historie
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * Odeslání erroru na monitoring service
   */
  sendErrorToMonitoring(message, error) {
    // Implementace pro production error monitoring
    // Může používat služby jako Sentry, LogRocket, atd.

    if (typeof window !== 'undefined' && window.gtag) {
      // Google Analytics error tracking
      window.gtag('event', 'exception', {
        description: message,
        fatal: false,
        custom_map: {
          error_name: error?.name || 'Unknown',
          error_message: error?.message || message
        }
      });
    }

    // TODO: Implementovat další monitoring služby
    // - Sentry
    // - LogRocket
    // - Custom error endpoint
  }

  /**
   * Získání log historie
   */
  getHistory(filter = null) {
    if (filter) {
      return this.logHistory.filter(entry => entry.level === filter);
    }
    return [...this.logHistory];
  }

  /**
   * Vyčištění log historie
   */
  clearHistory() {
    this.logHistory = [];
  }

  /**
   * Export logů pro debugging
   */
  exportLogs() {
    const logs = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
      logs: this.logHistory
    };

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Stáhnout logy jako soubor
   */
  downloadLogs() {
    if (typeof window === 'undefined') return;

    const logs = this.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `meditation-app-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
const logger = new Logger();

export default logger;

// Export utility functions pro snadné použití
export const log = {
  debug: (message, ...args) => logger.debug(message, ...args),
  info: (message, ...args) => logger.info(message, ...args),
  warn: (message, ...args) => logger.warn(message, ...args),
  error: (message, error, ...args) => logger.error(message, error, ...args),
  success: (message, ...args) => logger.success(message, ...args),
  audio: (message, ...args) => logger.audio(message, ...args),
  cache: (message, ...args) => logger.cache(message, ...args),
  firebase: (message, ...args) => logger.firebase(message, ...args),
  performance: (message, duration, ...args) => logger.performance(message, duration, ...args)
};

// Export pro development debugging
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.logger = logger;
  window.downloadLogs = () => logger.downloadLogs();
}

