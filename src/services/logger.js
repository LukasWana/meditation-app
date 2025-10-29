

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.isProduction = import.meta.env.MODE === 'production';
    this.history = [];
    this.maxHistorySize = 100;
  }

  _addToHistory(level, message, error = null) {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    };

    this.history.push(entry);

    // Limit history size (LRU - remove oldest)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  clearHistory() {
    this.history = [];
  }

  getHistory(level = null) {
    if (level) {
      return this.history.filter(entry => entry.level === level);
    }
    return this.history;
  }

  exportLogs() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE || process.env.NODE_ENV || 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      logs: this.history
    });
  }

  info(message, ...args) {
    this._addToHistory('info', message);
    if (this.isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    this._addToHistory('warn', message);
    console.warn(`⚠️ [WARN] ${message}`, ...args);
  }

  error(message, ...args) {
    // Extract error object if present
    const errorObj = args.find(arg => arg instanceof Error);
    this._addToHistory('error', message, errorObj);
    console.error(`❌ [ERROR] ${message}`, ...args);
  }

  success(message, ...args) {
    this._addToHistory('success', message);
    if (this.isDevelopment) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
    }
  }

  debug(message, ...args) {
    this._addToHistory('debug', message);
    if (this.isDevelopment) {
      console.log(`🐛 [DEBUG] ${message}`, ...args);
    }
  }

  performance(metric, value, unit = 'ms') {
    // Color indicators based on performance thresholds
    let indicator = '🟢'; // Good
    if (value > 500) indicator = '🟡'; // Medium
    if (value > 1000) indicator = '🔴'; // Bad

    this._addToHistory('performance', `${metric} (${value}${unit})`);
    if (this.isDevelopment) {
      console.log(`${indicator} [PERF] ${metric} (${value}${unit})`);
    }
  }

  api(method, url, status, duration) {
    if (this.isDevelopment) {
      const statusIcon = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`${statusIcon} [API] ${method} ${url} - ${status} (${duration}ms)`);
    }
  }

  cache(operation, key = '', hit = false) {
    const message = key
      ? `${operation}: ${key}`.trim()
      : operation;
    this._addToHistory('cache', message);
    if (this.isDevelopment) {
      const hitIcon = hit === true ? '🎯' : hit === false ? '💾' : '📦';
      console.log(`${hitIcon} [CACHE] ${message}`);
    }
  }

  firebase(operation, collection = '', docId = null) {
    const message = collection
      ? `${operation} ${collection}${docId ? `/${docId}` : ''}`.trim()
      : operation;
    this._addToHistory('firebase', message);
    if (this.isDevelopment) {
      console.log(`🔥 [FIREBASE] ${message}`);
    }
  }

  sw(operation, details = '') {
    if (this.isDevelopment) {
      console.log(`🔧 [SW] ${operation} ${details}`);
    }
  }

  metadata(operation, fileName, details = '') {
    if (this.isDevelopment) {
      console.log(`📊 [METADATA] ${operation}: ${fileName} ${details}`);
    }
  }

  audio(operation, fileName = '', details = '') {
    const message = fileName
      ? `${operation}: ${fileName} ${details}`.trim()
      : operation;
    this._addToHistory('audio', message);
    if (this.isDevelopment) {
      console.log(`🎵 [AUDIO] ${message}`);
    }
  }

  ui(operation, component, details = '') {
    if (this.isDevelopment) {
      console.log(`🎨 [UI] ${operation}: ${component} ${details}`);
    }
  }

  navigation(from, to, method = 'click') {
    if (this.isDevelopment) {
      console.log(`🧭 [NAV] ${from} → ${to} (${method})`);
    }
  }

  errorWithStack(error, context = '') {
    console.error(`❌ [ERROR] ${context}`, error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  group(name, fn) {
    if (this.isDevelopment) {
      console.group(`📁 ${name}`);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }

  table(data, title = 'Data') {
    if (this.isDevelopment) {
      console.log(`📋 ${title}:`);
      console.table(data);
    }
  }

  time(label) {
    if (this.isDevelopment) {
      console.time(`⏱️ ${label}`);
    }
  }

  timeEnd(label) {
    if (this.isDevelopment) {
      console.timeEnd(`⏱️ ${label}`);
    }
  }
}

// Singleton instance
const log = new Logger();

export default log;
export { Logger };