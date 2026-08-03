

const DEFAULT_MAX_HISTORY_SIZE = 100;

// Předpočítané pořadí úrovní — shouldLog() se volá při každém console.* v aplikaci,
// takže se vyplatí vyhnout se opakovanému indexOf nad polem.
const LOG_LEVEL_ORDER = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

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
    // Výchozí: 'silent' pro tichý režim (můžete změnit na 'warn' pro více logů)
    this.logLevel = this._isDevelopment ? 'silent' : 'silent';
  }

  get isDevelopment() {
    return this._isDevelopment;
  }

  set isDevelopment(value) {
    this._isDevelopment = Boolean(value);
    // Výchozí: 'silent' pro tichý režim
    this.logLevel = this._isDevelopment ? 'silent' : 'silent';
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
    const currentLevelIndex = LOG_LEVEL_ORDER[this.logLevel];
    const messageLevelIndex = LOG_LEVEL_ORDER[level];
    if (currentLevelIndex === undefined || messageLevelIndex === undefined) return false;
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

// Console wrapper pro centrální ovládání všech logů
let originalConsole = null;
let consoleWrapper = null;

/**
 * Inicializuje console wrapper, který zachytí všechna console.log() volání
 * a bude je filtrovat podle log levelu z loggeru
 */
export function initConsoleWrapper() {
  if (typeof window === 'undefined' || originalConsole) {
    return; // Už inicializováno nebo nejsme v browseru
  }

  // Ulož originální console
  originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
    trace: console.trace.bind(console),
    table: console.table.bind(console),
    group: console.group.bind(console),
    groupEnd: console.groupEnd.bind(console),
    groupCollapsed: console.groupCollapsed?.bind(console),
    time: console.time.bind(console),
    timeEnd: console.timeEnd.bind(console),
    timeLog: console.timeLog?.bind(console),
    clear: console.clear.bind(console),
    dir: console.dir?.bind(console),
    dirxml: console.dirxml?.bind(console),
    assert: console.assert?.bind(console),
    count: console.count?.bind(console),
    countReset: console.countReset?.bind(console)
  };

  // Mapování console metod na log levels
  const consoleLevelMap = {
    log: 'info',
    info: 'info',
    debug: 'debug',
    warn: 'warn',
    error: 'error'
  };

  // Vytvoř wrapper funkci
  const createWrappedMethod = (method, level) => {
    return (...args) => {
      // Vždy povol error a warn (důležité pro debugging)
      if (method === 'error' || method === 'warn') {
        originalConsole[method](...args);
        return;
      }

      // Pro log/info/debug kontroluj log level
      if (log.shouldLog(level)) {
        originalConsole[method](...args);
      }
    };
  };

  // Wrappery vytvoř JEDNOU dopředu. Dřív je Proxy tvořila v `get` trapu, takže
  // každé jednotlivé console.log() v aplikaci alokovalo novou closure.
  const wrappedMethods = {};
  for (const [method, level] of Object.entries(consoleLevelMap)) {
    wrappedMethods[method] = createWrappedMethod(method, level);
  }

  // Vytvoř wrapper objekt
  consoleWrapper = new Proxy(console, {
    get(target, prop) {
      // Pokud je to metoda, kterou chceme wrapovat
      if (prop in wrappedMethods) {
        return wrappedMethods[prop];
      }

      // Pro ostatní metody vrať originál
      if (prop in originalConsole) {
        return originalConsole[prop];
      }

      return target[prop];
    }
  });

  // Nahraď globální console
  Object.defineProperty(window, 'console', {
    value: consoleWrapper,
    writable: false,
    configurable: false
  });
}

/**
 * Obnoví originální console (pro testování)
 */
export function restoreConsole() {
  if (originalConsole && typeof window !== 'undefined') {
    Object.defineProperty(window, 'console', {
      value: originalConsole,
      writable: false,
      configurable: false
    });
    originalConsole = null;
    consoleWrapper = null;
  }
}

export default log;