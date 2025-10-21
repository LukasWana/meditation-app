

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.isProduction = import.meta.env.MODE === 'production';
  }

  info(message, ...args) {
    if (this.isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.isDevelopment) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  }

  error(message, ...args) {
    console.error(`❌ [ERROR] ${message}`, ...args);
  }

  success(message, ...args) {
    if (this.isDevelopment) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
    }
  }

  debug(message, ...args) {
    if (this.isDevelopment) {
      console.debug(`🐛 [DEBUG] ${message}`, ...args);
    }
  }

  performance(metric, value, unit = 'ms') {
    if (this.isDevelopment) {
      console.log(`⚡ [PERF] ${metric}: ${value}${unit}`);
    }
  }

  api(method, url, status, duration) {
    if (this.isDevelopment) {
      const statusIcon = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`${statusIcon} [API] ${method} ${url} - ${status} (${duration}ms)`);
    }
  }

  cache(operation, key, hit = null) {
    if (this.isDevelopment) {
      const hitIcon = hit === true ? '🎯' : hit === false ? '💾' : '📦';
      console.log(`${hitIcon} [CACHE] ${operation}: ${key}`);
    }
  }

  firebase(operation, collection, docId = null) {
    if (this.isDevelopment) {
      console.log(`🔥 [FIREBASE] ${operation} ${collection}${docId ? `/${docId}` : ''}`);
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

  audio(operation, fileName, details = '') {
    if (this.isDevelopment) {
      console.log(`🎵 [AUDIO] ${operation}: ${fileName} ${details}`);
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