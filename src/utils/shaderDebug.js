/**
 * Shader Debug Mode
 * Debug nástroje pro shadery
 */

let debugMode = false;
let debugCallbacks = {
  onShaderCompile: null,
  onShaderError: null,
  onShaderRecovery: null,
  onFallbackUsage: null
};

/**
 * Zapne debug mode
 * @param {Object} callbacks - Callback funkce pro debug události
 */
export function enableDebugMode(callbacks = {}) {
  debugMode = true;
  debugCallbacks = { ...debugCallbacks, ...callbacks };
  console.log('🐛 Debug mode enabled');
}

/**
 * Vypne debug mode
 */
export function disableDebugMode() {
  debugMode = false;
  console.log('🐛 Debug mode disabled');
}

/**
 * Zkontroluj, zda je debug mode zapnutý
 * @returns {boolean} Zda je debug mode zapnutý
 */
export function isDebugModeEnabled() {
  return debugMode;
}

/**
 * Loguje debug informace o shaderu
 * @param {string} event - Typ události
 * @param {Object} data - Data k logování
 */
export function logDebug(event, data) {
  if (!debugMode) return;

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    ...data
  };

  console.log(`🐛 [${timestamp}] ${event}:`, logEntry);

  // Zavolej callback, pokud existuje
  const callbackMap = {
    'shader.compile': debugCallbacks.onShaderCompile,
    'shader.error': debugCallbacks.onShaderError,
    'shader.recovery': debugCallbacks.onShaderRecovery,
    'shader.fallback': debugCallbacks.onFallbackUsage
  };

  const callback = callbackMap[event];
  if (callback && typeof callback === 'function') {
    callback(logEntry);
  }
}

/**
 * Získá debug informace o shaderu
 * @param {string} shaderSource - Zdrojový kód shaderu
 * @param {Object} options - Možnosti
 * @returns {Object} Debug informace
 */
export function getShaderDebugInfo(shaderSource, options = {}) {
  if (!shaderSource || typeof shaderSource !== 'string') {
    return { error: 'Invalid shader source' };
  }

  const lines = shaderSource.split('\n');
  const info = {
    lineCount: lines.length,
    charCount: shaderSource.length,
    hasVersion: shaderSource.includes('#version'),
    hasPrecision: shaderSource.includes('precision'),
    hasMain: shaderSource.includes('void main()'),
    hasUniforms: (shaderSource.match(/uniform\s+\w+\s+\w+/g) || []).length,
    hasVaryings: (shaderSource.match(/(varying|in|out)\s+\w+\s+\w+/g) || []).length,
    hasFunctions: (shaderSource.match(/\w+\s+\w+\s*\([^)]*\)\s*\{/g) || []).length,
    hasForLoops: (shaderSource.match(/for\s*\(/g) || []).length,
    hasIfStatements: (shaderSource.match(/if\s*\(/g) || []).length,
    hasComments: (shaderSource.match(/\/\/|\/\*/g) || []).length,
    webGLVersion: shaderSource.includes('#version 300 es') ? 'webgl2' : 'webgl1',
    ...options
  };

  return info;
}

/**
 * Zobrazí debug panel v konzoli
 * @param {Object} shaderInfo - Informace o shaderu
 * @param {Object} errorInfo - Informace o chybě (volitelné)
 */
export function showDebugPanel(shaderInfo, errorInfo = null) {
  if (!debugMode) return;

  console.group('🐛 Shader Debug Panel');
  console.log('Shader Info:', shaderInfo);
  if (errorInfo) {
    console.log('Error Info:', errorInfo);
  }
  console.groupEnd();
}



