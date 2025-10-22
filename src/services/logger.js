

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.isProduction = import.meta.env.MODE === 'production';
    // Úrovně: 'silent', 'error', 'warn', 'info', 'debug'
    this.logLevel = this.isDevelopment ? 'silent' : 'error';
  }

  setLogLevel(level) {
    this.logLevel = level;
  }

  shouldLog(level) {
    const levels = ['silent', 'error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(`❌ [ERROR] ${message}`, ...args);
    }
  }

  success(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
    }
  }

  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.debug(`🐛 [DEBUG] ${message}`, ...args);
    }
  }

  performance(metric, value, unit = 'ms') {
    if (this.shouldLog('debug')) {
      console.log(`⚡ [PERF] ${metric}: ${value}${unit}`);
    }
  }

  api(method, url, status, duration) {
    if (this.shouldLog('info')) {
      const statusIcon = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`${statusIcon} [API] ${method} ${url} - ${status} (${duration}ms)`);
    }
  }

  cache(operation, key, hit = null) {
    if (this.shouldLog('debug')) {
      const hitIcon = hit === true ? '🎯' : hit === false ? '💾' : '📦';
      console.log(`${hitIcon} [CACHE] ${operation}: ${key}`);
    }
  }

  firebase(operation, collection, docId = null) {
    if (this.shouldLog('info')) {
      console.log(`🔥 [FIREBASE] ${operation} ${collection}${docId ? `/${docId}` : ''}`);
    }
  }

  sw(operation, details = '') {
    if (this.shouldLog('debug')) {
      console.log(`🔧 [SW] ${operation} ${details}`);
    }
  }

  metadata(operation, fileName, details = '') {
    if (this.shouldLog('debug')) {
      console.log(`📊 [METADATA] ${operation}: ${fileName} ${details}`);
    }
  }

  audio(operation, fileName, details = '') {
    if (this.shouldLog('warn')) {
      console.log(`🎵 [AUDIO] ${operation}: ${fileName} ${details}`);
    }
  }

  ui(operation, component, details = '') {
    if (this.shouldLog('debug')) {
      console.log(`🎨 [UI] ${operation}: ${component} ${details}`);
    }
  }

  navigation(from, to, method = 'click') {
    if (this.shouldLog('debug')) {
      console.log(`🧭 [NAV] ${from} → ${to} (${method})`);
    }
  }

  errorWithStack(error, context = '') {
    if (this.shouldLog('error')) {
      console.error(`❌ [ERROR] ${context}`, error);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  group(name, fn) {
    if (this.shouldLog('debug')) {
      console.group(`📁 ${name}`);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }

  table(data, title = 'Data') {
    if (this.shouldLog('debug')) {
      console.log(`📋 ${title}:`);
      console.table(data);
    }
  }

  time(label) {
    if (this.shouldLog('debug')) {
      console.time(`⏱️ ${label}`);
    }
  }

  timeEnd(label) {
    if (this.shouldLog('debug')) {
      console.timeEnd(`⏱️ ${label}`);
    }
  }
}

// Singleton instance
const log = new Logger();

export default log;
export { Logger };