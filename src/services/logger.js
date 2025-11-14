

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.isProduction = import.meta.env.MODE === 'production';
    // Úrovně: 'silent', 'error', 'warn', 'info', 'debug'
    // Nastav vždy na 'error' pro produkci - logovat pouze chyby
    this.logLevel = 'error';
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

  // eslint-disable-next-line no-unused-vars
  info(_message, ..._args) {
    // Info logy deaktivovány - příliš mnoho výpisů
    // Použij pouze pro skutečné chyby
    // if (this.shouldLog('error')) {
    //   console.error(`ℹ️ [INFO] ${_message}`, ..._args);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  warn(_message, ..._args) {
    // Warn logy deaktivovány - příliš mnoho výpisů
    // Použij pouze pro skutečné chyby
    // Warn se bude vypisovat pouze pokud je logLevel nastaven na 'warn' nebo vyšší
    // if (this.shouldLog('error')) {
    //   console.error(`⚠️ [WARN] ${_message}`, ..._args);
    // }
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(`❌ [ERROR] ${message}`, ...args);
    }
  }

  // eslint-disable-next-line no-unused-vars
  success(_message, ..._args) {
    // Success logy deaktivovány - příliš mnoho výpisů
    // Použij pouze pro skutečné chyby
    // if (this.shouldLog('error')) {
    //   console.error(`✅ [SUCCESS] ${_message}`, ..._args);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  debug(_message, ..._args) {
    // Debug logy deaktivovány - příliš mnoho výpisů
    // Použij pouze pro skutečné chyby
    // if (this.shouldLog('error')) {
    //   console.error(`🐛 [DEBUG] ${_message}`, ..._args);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  performance(_metric, _value, _unit = 'ms') {
    // Performance logy deaktivovány - příliš mnoho výpisů
    // if (this.shouldLog('error')) {
    //   console.error(`⚡ [PERF] ${_metric}: ${_value}${_unit}`);
    // }
  }

  api(method, url, status, duration) {
    // API logy deaktivovány - příliš mnoho výpisů
    // Použij pouze pro chyby (status >= 400)
    if (status >= 400 && this.shouldLog('error')) {
      console.error(`❌ [API] ${method} ${url} - ${status} (${duration}ms)`);
    }
  }

  // eslint-disable-next-line no-unused-vars
  cache(_operation, _key, _hit = null) {
    // Cache logy deaktivovány - příliš mnoho výpisů
    // if (this.shouldLog('error')) {
    //   console.error(`📦 [CACHE] ${_operation}: ${_key}`);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  firebase(_operation, _collection, _docId = null) {
    // Firebase logy deaktivovány - příliš mnoho výpisů
    // Použij pouze pro chyby
    // if (this.shouldLog('error')) {
    //   console.error(`🔥 [FIREBASE] ${_operation} ${_collection}${_docId ? `/${_docId}` : ''}`);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  sw(_operation, _details = '') {
    // Service Worker logy deaktivovány - příliš mnoho výpisů
    // if (this.shouldLog('error')) {
    //   console.error(`🔧 [SW] ${_operation} ${_details}`);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  metadata(_operation, _fileName, _details = '') {
    // Metadata logy deaktivovány - příliš mnoho výpisů
    // if (this.shouldLog('error')) {
    //   console.error(`📊 [METADATA] ${_operation}: ${_fileName} ${_details}`);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  audio(_operation, _fileName, _details = '') {
    // Audio logy deaktivovány - příliš mnoho výpisů
    // Použij pouze pro skutečné chyby pomocí log.error()
    // if (this.shouldLog('error')) {
    //   console.error(`🎵 [AUDIO] ${_operation}: ${_fileName} ${_details}`);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  ui(_operation, _component, _details = '') {
    // UI logy deaktivovány - příliš mnoho výpisů
    // if (this.shouldLog('error')) {
    //   console.error(`🎨 [UI] ${_operation}: ${_component} ${_details}`);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  navigation(_from, _to, _method = 'click') {
    // Navigation logy deaktivovány - příliš mnoho výpisů
    // if (this.shouldLog('error')) {
    //   console.error(`🧭 [NAV] ${_from} → ${_to} (${_method})`);
    // }
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
    // Group logy deaktivovány - příliš mnoho výpisů
    // if (this.shouldLog('error')) {
    //   console.group(`📁 ${name}`);
    //   fn();
    //   console.groupEnd();
    // } else {
    fn();
    // }
  }

  // eslint-disable-next-line no-unused-vars
  table(_data, _title = 'Data') {
    // Table logy deaktivovány - příliš mnoho výpisů
    // if (this.shouldLog('error')) {
    //   console.error(`📋 ${_title}:`);
    //   console.table(_data);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  time(_label) {
    // Time logy deaktivovány - příliš mnoho výpisů
    // if (this.shouldLog('error')) {
    //   console.time(`⏱️ ${_label}`);
    // }
  }

  // eslint-disable-next-line no-unused-vars
  timeEnd(_label) {
    // Time logy deaktivovány - příliš mnoho výpisů
    // if (this.shouldLog('error')) {
    //   console.timeEnd(`⏱️ ${_label}`);
    // }
  }
}

// Singleton instance
const log = new Logger();

export default log;
export { Logger };