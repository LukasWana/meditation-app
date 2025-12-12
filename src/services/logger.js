

const DEFAULT_MAX_HISTORY_SIZE = 100;

function getEnvMode() {
  // Vitest/Node
  if (typeof process !== 'undefined' && process?.env?.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  // Vite runtime
  return import.meta?.env?.MODE || 'production';
}

export class Logger {
  constructor({ maxHistorySize = DEFAULT_MAX_HISTORY_SIZE } = {}) {
    this.maxHistorySize = maxHistorySize;
    this.history = [];

    const mode = getEnvMode();
    this._isDevelopment = mode === 'development';
    this._isProduction = mode === 'production';

    // Úrovně: 'silent', 'error', 'warn', 'info', 'debug'
    this.logLevel = this._isDevelopment ? 'debug' : 'warn';
  }

  get isDevelopment() {
    return this._isDevelopment;
  }

  set isDevelopment(value) {
    this._isDevelopment = Boolean(value);
    this.logLevel = this._isDevelopment ? 'debug' : 'warn';
  }

  get isProduction() {
    return this._isProduction;
  }

  set isProduction(value) {
    this._isProduction = Boolean(value);
  }

  setLogLevel(level) {
    this.logLevel = level;
  }

  shouldLog(level) {
    const levels = ['silent', 'error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    if (currentLevelIndex === -1 || messageLevelIndex === -1) return false;
    return messageLevelIndex <= currentLevelIndex;
  }

  _pushHistory(entry) {
    this.history.push(entry);
    if (this.history.length > this.maxHistorySize) {
      this.history.splice(0, this.history.length - this.maxHistorySize);
    }
  }

  _addHistory(level, message, args = [], error = null) {
    const entry = {
      timestamp: Date.now(),
      level,
      message,
      args,
      error: error
        ? {
          name: error?.name || 'Error',
          message: error?.message || String(error),
          stack: error?.stack || ''
        }
        : null
    };
    this._pushHistory(entry);
  }

  getHistory(level = null) {
    if (!level) return [...this.history];
    return this.history.filter((e) => e.level === level);
  }

  clearHistory() {
    this.history = [];
  }

  exportLogs() {
    const environment = getEnvMode();
    const userAgent =
      typeof navigator !== 'undefined' && navigator?.userAgent ? navigator.userAgent : 'unknown';

    return JSON.stringify({
      timestamp: Date.now(),
      environment,
      userAgent,
      logs: this.getHistory()
    });
  }

  debug(message, ...args) {
    this._addHistory('debug', message, args);
    if (this.shouldLog('debug')) {
      console.log(`🐛 [DEBUG] ${message}`, ...args);
    }
  }

  info(message, ...args) {
    this._addHistory('info', message, args);
    if (this.shouldLog('info')) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  success(message, ...args) {
    this._addHistory('info', message, args);
    if (this.shouldLog('info')) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    this._addHistory('warn', message, args);
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  }

  error(message, error = null, ...args) {
    this._addHistory('error', message, args, error instanceof Error ? error : null);
    if (this.shouldLog('error')) {
      if (error instanceof Error) {
        console.error(`❌ [ERROR] ${message}`, error, ...args);
      } else {
        console.error(`❌ [ERROR] ${message}`, error, ...args);
      }
    }
  }

  audio(message, ...args) {
    this._addHistory('info', message, args);
    if (this.shouldLog('info')) {
      console.log(`🎵 [AUDIO] ${message}`, ...args);
    }
  }

  cache(message, ...args) {
    this._addHistory('debug', message, args);
    if (this.shouldLog('debug')) {
      console.log(`💾 [CACHE] ${message}`, ...args);
    }
  }

  firebase(message, ...args) {
    this._addHistory('info', message, args);
    if (this.shouldLog('info')) {
      console.log(`🔥 [FIREBASE] ${message}`, ...args);
    }
  }

  performance(operation, durationMs) {
    this._addHistory('debug', operation, [durationMs]);
    if (this.shouldLog('debug')) {
      const d = Number(durationMs);
      const icon = Number.isFinite(d) ? (d < 1000 ? '🟢' : d < 3000 ? '🟡' : '🔴') : '⚪';
      const display = Number.isFinite(d) ? `${d}ms` : 'unknown';
      console.log(`${icon} [PERF] ${operation} (${display})`);
    }
  }

  errorWithStack(error, context = '') {
    const err = error instanceof Error ? error : new Error(String(error));
    this._addHistory('error', context || err.message, [], err);
    if (this.shouldLog('error')) {
      console.error(`❌ [ERROR] ${context}`, err);
      if (err.stack) console.error('Stack trace:', err.stack);
    }
  }
}

// Singleton instance
const log = new Logger();

export default log;