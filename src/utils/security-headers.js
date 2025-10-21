/**
 * Security Headers Utility
 * Poskytuje bezpečnostní hlavičky pro aplikaci
 */

/**
 * Vytvoří Content Security Policy header
 * @param {object} options - Možnosti CSP
 * @returns {string} - CSP header value
 */
export const createCSPHeader = (options = {}) => {
  const {
    allowInlineScripts = false,
    allowInlineStyles = true,
    allowEval = false,
    allowUnsafeInline = false,
    allowedDomains = ['firebase.com', 'googleapis.com', 'gstatic.com'],
    reportUri = null
  } = options;

  const directives = [];

  // Default sources
  const defaultSrc = ["'self'"];
  if (allowedDomains.length > 0) {
    defaultSrc.push(...allowedDomains.map(domain => `https://*.${domain}`));
  }
  directives.push(`default-src ${defaultSrc.join(' ')}`);

  // Script sources
  const scriptSrc = ["'self'"];
  if (allowInlineScripts || allowUnsafeInline) {
    scriptSrc.push("'unsafe-inline'");
  }
  if (allowEval) {
    scriptSrc.push("'unsafe-eval'");
  }
  scriptSrc.push('https://*.firebase.com', 'https://*.googleapis.com');
  directives.push(`script-src ${scriptSrc.join(' ')}`);

  // Style sources
  const styleSrc = ["'self'"];
  if (allowInlineStyles) {
    styleSrc.push("'unsafe-inline'");
  }
  styleSrc.push('https://fonts.googleapis.com');
  directives.push(`style-src ${styleSrc.join(' ')}`);

  // Image sources
  directives.push("img-src 'self' data: https: blob:");

  // Font sources
  directives.push("font-src 'self' https://fonts.gstatic.com data:");

  // Connect sources (for API calls)
  directives.push(`connect-src 'self' https://*.firebase.com https://*.googleapis.com wss://*.firebase.com`);

  // Media sources
  directives.push("media-src 'self' blob: data: https:");

  // Object sources
  directives.push("object-src 'none'");

  // Frame sources
  directives.push("frame-src 'none'");

  // Worker sources
  directives.push("worker-src 'self' blob:");

  // Manifest source
  directives.push("manifest-src 'self'");

  // Add report URI if provided
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }

  return directives.join('; ');
};

/**
 * Vytvoří security headers pro aplikaci
 * @param {object} options - Možnosti headers
 * @returns {object} - Security headers
 */
export const createSecurityHeaders = (options = {}) => {
  const {
    cspOptions = {},
    enableHSTS = true,
    enableXFrameOptions = true,
    enableXContentTypeOptions = true,
    enableReferrerPolicy = true,
    enablePermissionsPolicy = true
  } = options;

  const headers = {};

  // Content Security Policy
  headers['Content-Security-Policy'] = createCSPHeader(cspOptions);

  // X-Frame-Options (prevents clickjacking)
  if (enableXFrameOptions) {
    headers['X-Frame-Options'] = 'DENY';
  }

  // X-Content-Type-Options (prevents MIME sniffing)
  if (enableXContentTypeOptions) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // X-XSS-Protection (legacy, but still useful for older browsers)
  headers['X-XSS-Protection'] = '1; mode=block';

  // Referrer Policy
  if (enableReferrerPolicy) {
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  }

  // Permissions Policy (formerly Feature Policy)
  if (enablePermissionsPolicy) {
    headers['Permissions-Policy'] = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()',
      'fullscreen=(self)'
    ].join(', ');
  }

  // Strict Transport Security (HSTS)
  if (enableHSTS) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  // Cross-Origin policies
  headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  headers['Cross-Origin-Resource-Policy'] = 'same-origin';

  return headers;
};

/**
 * Vytvoří security headers pro development prostředí
 * @returns {object} - Development security headers
 */
export const createDevelopmentSecurityHeaders = () => {
  return createSecurityHeaders({
    cspOptions: {
      allowInlineScripts: true,
      allowInlineStyles: true,
      allowEval: true,
      allowUnsafeInline: true,
      allowedDomains: ['localhost', '127.0.0.1', 'firebase.com', 'googleapis.com']
    },
    enableHSTS: false, // Disable HSTS in development
    enableXFrameOptions: false // Allow iframes in development
  });
};

/**
 * Vytvoří security headers pro production prostředí
 * @returns {object} - Production security headers
 */
export const createProductionSecurityHeaders = () => {
  return createSecurityHeaders({
    cspOptions: {
      allowInlineScripts: false,
      allowInlineStyles: true,
      allowEval: false,
      allowUnsafeInline: false,
      allowedDomains: ['firebase.com', 'googleapis.com', 'gstatic.com'],
      reportUri: '/api/csp-report' // CSP violation reporting
    },
    enableHSTS: true,
    enableXFrameOptions: true
  });
};

/**
 * Zkontroluje, zda jsou security headers správně nastavené
 * @param {object} headers - Headers k ověření
 * @returns {object} - Výsledek kontroly
 */
export const validateSecurityHeaders = (headers) => {
  const requiredHeaders = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Referrer-Policy'
  ];

  const results = {
    valid: true,
    missing: [],
    warnings: []
  };

  // Kontrola povinných headers
  requiredHeaders.forEach(header => {
    if (!headers[header]) {
      results.valid = false;
      results.missing.push(header);
    }
  });

  // Kontrola CSP
  if (headers['Content-Security-Policy']) {
    const csp = headers['Content-Security-Policy'];

    // Kontrola nebezpečných direktiv
    if (csp.includes("'unsafe-eval'")) {
      results.warnings.push('CSP obsahuje unsafe-eval - bezpečnostní riziko');
    }

    if (csp.includes("'unsafe-inline'") && !csp.includes('nonce-') && !csp.includes('hash-')) {
      results.warnings.push('CSP obsahuje unsafe-inline bez nonce/hash - bezpečnostní riziko');
    }

    // Kontrola chybějících direktiv
    if (!csp.includes('object-src')) {
      results.warnings.push('CSP neobsahuje object-src direktivu');
    }

    if (!csp.includes('frame-src')) {
      results.warnings.push('CSP neobsahuje frame-src direktivu');
    }
  }

  // Kontrola HSTS
  if (headers['Strict-Transport-Security']) {
    const hsts = headers['Strict-Transport-Security'];
    if (!hsts.includes('max-age=')) {
      results.warnings.push('HSTS neobsahuje max-age');
    }
    if (!hsts.includes('includeSubDomains')) {
      results.warnings.push('HSTS neobsahuje includeSubDomains');
    }
  }

  return results;
};

/**
 * Vytvoří security report pro aplikaci
 * @returns {object} - Security report
 */
export const generateSecurityReport = () => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const headers = isDevelopment
    ? createDevelopmentSecurityHeaders()
    : createProductionSecurityHeaders();

  const validation = validateSecurityHeaders(headers);

  return {
    environment: isDevelopment ? 'development' : 'production',
    headers,
    validation,
    recommendations: generateSecurityRecommendations(validation),
    timestamp: new Date().toISOString()
  };
};

/**
 * Generuje bezpečnostní doporučení na základě validace
 * @param {object} validation - Výsledek validace
 * @returns {array} - Seznam doporučení
 */
const generateSecurityRecommendations = (validation) => {
  const recommendations = [];

  if (validation.missing.length > 0) {
    recommendations.push({
      type: 'critical',
      message: `Chybějící povinné security headers: ${validation.missing.join(', ')}`,
      action: 'Přidejte chybějící headers do server konfigurace'
    });
  }

  validation.warnings.forEach(warning => {
    recommendations.push({
      type: 'warning',
      message: warning,
      action: 'Zkontrolujte a opravte bezpečnostní konfiguraci'
    });
  });

  if (validation.valid && validation.warnings.length === 0) {
    recommendations.push({
      type: 'success',
      message: 'Security headers jsou správně nakonfigurovány',
      action: 'Pokračujte v pravidelném monitorování'
    });
  }

  return recommendations;
};

export default {
  createCSPHeader,
  createSecurityHeaders,
  createDevelopmentSecurityHeaders,
  createProductionSecurityHeaders,
  validateSecurityHeaders,
  generateSecurityReport
};


