/**
 * Shader Error Analytics
 * Sledování a analýza shader chyb
 */

// Storage pro error analytics
const errorStats = {
  totalErrors: 0,
  errorsByType: {},
  errorsByShader: {},
  errorsByTime: [],
  recoveryAttempts: 0,
  recoverySuccesses: 0,
  fallbackUsage: 0
};

// Maximální počet záznamů v historii
const MAX_HISTORY_SIZE = 1000;

/**
 * Zaznamená shader chybu
 * @param {string} shaderPath - Cesta k shaderu
 * @param {string} errorType - Typ chyby
 * @param {string} errorMessage - Chybová zpráva
 * @param {Object} errorInfo - Další informace o chybě
 */
export function recordShaderError(shaderPath, errorType, errorMessage, errorInfo = {}) {
  errorStats.totalErrors++;

  // Zaznamenej podle typu
  if (!errorStats.errorsByType[errorType]) {
    errorStats.errorsByType[errorType] = 0;
  }
  errorStats.errorsByType[errorType]++;

  // Zaznamenej podle shaderu
  const shaderKey = shaderPath || 'unknown';
  if (!errorStats.errorsByShader[shaderKey]) {
    errorStats.errorsByShader[shaderKey] = {
      count: 0,
      errors: []
    };
  }
  errorStats.errorsByShader[shaderKey].count++;
  errorStats.errorsByShader[shaderKey].errors.push({
    type: errorType,
    message: errorMessage,
    timestamp: Date.now(),
    ...errorInfo
  });

  // Zaznamenej do časové historie
  errorStats.errorsByTime.push({
    timestamp: Date.now(),
    shaderPath,
    errorType,
    errorMessage
  });

  // Omezení velikosti historie
  if (errorStats.errorsByTime.length > MAX_HISTORY_SIZE) {
    errorStats.errorsByTime.shift();
  }

  // Log do konzole v development módu
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Error Analytics:', {
      shaderPath,
      errorType,
      totalErrors: errorStats.totalErrors
    });
  }
}

/**
 * Zaznamená pokus o recovery
 * @param {string} shaderPath - Cesta k shaderu
 * @param {boolean} success - Zda byl recovery úspěšný
 * @param {Array<string>} appliedFixes - Aplikované opravy
 */
export function recordRecoveryAttempt(shaderPath, success, appliedFixes = []) {
  errorStats.recoveryAttempts++;

  if (success) {
    errorStats.recoverySuccesses++;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Recovery Analytics:', {
      shaderPath,
      success,
      appliedFixes,
      successRate: (errorStats.recoverySuccesses / errorStats.recoveryAttempts * 100).toFixed(2) + '%'
    });
  }
}

/**
 * Zaznamená použití fallback shaderu
 * @param {string} shaderPath - Cesta k shaderu
 * @param {string} reason - Důvod použití fallbacku
 */
export function recordFallbackUsage(shaderPath, reason) {
  errorStats.fallbackUsage++;

  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Fallback Analytics:', {
      shaderPath,
      reason,
      totalFallbacks: errorStats.fallbackUsage
    });
  }
}

/**
 * Získá statistiky chyb
 * @returns {Object} Statistiky chyb
 */
export function getErrorStats() {
  return {
    totalErrors: errorStats.totalErrors,
    errorsByType: { ...errorStats.errorsByType },
    errorsByShader: { ...errorStats.errorsByShader },
    recentErrors: errorStats.errorsByTime.slice(-50), // Posledních 50 chyb
    recoveryStats: {
      attempts: errorStats.recoveryAttempts,
      successes: errorStats.recoverySuccesses,
      successRate: errorStats.recoveryAttempts > 0
        ? (errorStats.recoverySuccesses / errorStats.recoveryAttempts * 100).toFixed(2) + '%'
        : '0%'
    },
    fallbackUsage: errorStats.fallbackUsage
  };
}

/**
 * Získá nejčastější typy chyb
 * @param {number} limit - Počet typů k vrácení
 * @returns {Array<Object>} Nejčastější typy chyb
 */
export function getTopErrorTypes(limit = 10) {
  return Object.entries(errorStats.errorsByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([type, count]) => ({
      type,
      count,
      percentage: ((count / errorStats.totalErrors) * 100).toFixed(2) + '%'
    }));
}

/**
 * Získá shadery s nejvíce chybami
 * @param {number} limit - Počet shaderů k vrácení
 * @returns {Array<Object>} Shadery s nejvíce chybami
 */
export function getTopErrorShaders(limit = 10) {
  return Object.entries(errorStats.errorsByShader)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([shaderPath, data]) => ({
      shaderPath,
      errorCount: data.count,
      recentErrors: data.errors.slice(-5) // Posledních 5 chyb
    }));
}

/**
 * Získá chyby za poslední časové období
 * @param {number} minutes - Počet minut zpět
 * @returns {Array<Object>} Chyby za období
 */
export function getRecentErrors(minutes = 60) {
  const cutoff = Date.now() - (minutes * 60 * 1000);
  return errorStats.errorsByTime.filter(error => error.timestamp >= cutoff);
}

/**
 * Vyčistí statistiky
 */
export function clearErrorStats() {
  errorStats.totalErrors = 0;
  errorStats.errorsByType = {};
  errorStats.errorsByShader = {};
  errorStats.errorsByTime = [];
  errorStats.recoveryAttempts = 0;
  errorStats.recoverySuccesses = 0;
  errorStats.fallbackUsage = 0;
  console.log('🧹 clearErrorStats: Statistiky vyčištěny');
}

/**
 * Exportuje statistiky jako JSON
 * @returns {string} JSON string
 */
export function exportErrorStats() {
  return JSON.stringify(getErrorStats(), null, 2);
}



