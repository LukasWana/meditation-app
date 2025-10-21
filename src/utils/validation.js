/**
 * Input Validation Utilities
 * Centralizované validační funkce pro bezpečnost aplikace
 */

/**
 * Sanitizuje HTML input pro prevenci XSS
 * @param {string} input - Vstupní text
 * @returns {string} - Sanitizovaný text
 */
export const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

/**
 * Validuje email adresu
 * @param {string} email - Email adresa
 * @returns {boolean} - True pokud je email platný
 */
export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validuje heslo
 * @param {string} password - Heslo
 * @returns {object} - Objekt s validací a chybami
 */
export const validatePassword = (password) => {
  const result = {
    isValid: true,
    errors: []
  };

  if (!password || typeof password !== 'string') {
    result.isValid = false;
    result.errors.push('Heslo je povinné');
    return result;
  }

  if (password.length < 8) {
    result.isValid = false;
    result.errors.push('Heslo musí mít alespoň 8 znaků');
  }

  if (password.length > 128) {
    result.isValid = false;
    result.errors.push('Heslo nesmí mít více než 128 znaků');
  }

  if (!/[A-Z]/.test(password)) {
    result.isValid = false;
    result.errors.push('Heslo musí obsahovat velké písmeno');
  }

  if (!/[a-z]/.test(password)) {
    result.isValid = false;
    result.errors.push('Heslo musí obsahovat malé písmeno');
  }

  if (!/\d/.test(password)) {
    result.isValid = false;
    result.errors.push('Heslo musí obsahovat číslici');
  }

  return result;
};

/**
 * Validuje název souboru
 * @param {string} fileName - Název souboru
 * @returns {boolean} - True pokud je název platný
 */
export const validateFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') return false;

  // Zakázané znaky pro názvy souborů
  const forbiddenChars = /[<>:"/\\|?*]/;

  // Kontrola délky
  if (fileName.length === 0 || fileName.length > 255) return false;

  // Kontrola zakázaných znaků
  if (forbiddenChars.test(fileName)) return false;

  // Kontrola rezervovaných názvů (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExt = fileName.split('.')[0].toUpperCase();

  if (reservedNames.includes(nameWithoutExt)) return false;

  return true;
};

/**
 * Validuje Firebase document ID
 * @param {string} docId - Document ID
 * @returns {boolean} - True pokud je ID platné
 */
export const validateFirebaseDocId = (docId) => {
  if (!docId || typeof docId !== 'string') return false;

  // Firebase document ID omezení
  if (docId.length === 0 || docId.length > 1500) return false;

  // Nesmí začínat ani končit mezerou
  if (docId !== docId.trim()) return false;

  // Nesmí obsahovat některé speciální znaky
  const forbiddenChars = /[\/\s]/;
  if (forbiddenChars.test(docId)) return false;

  return true;
};

/**
 * Validuje URL
 * @param {string} url - URL
 * @returns {boolean} - True pokud je URL platná
 */
export const validateUrl = (url) => {
  if (!url || typeof url !== 'string') return false;

  try {
    const urlObj = new URL(url);

    // Povolené protokoly
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(urlObj.protocol)) return false;

    return true;
  } catch {
    return false;
  }
};

/**
 * Validuje Firebase Storage path
 * @param {string} path - Storage path
 * @returns {boolean} - True pokud je path platný
 */
export const validateStoragePath = (path) => {
  if (!path || typeof path !== 'string') return false;

  // Nesmí být prázdný
  if (path.trim().length === 0) return false;

  // Nesmí začínat nebo končit lomítkem
  if (path.startsWith('/') || path.endsWith('/')) return false;

  // Nesmí obsahovat dvojité lomítka
  if (path.includes('//')) return false;

  // Nesmí obsahovat zakázané znaky
  const forbiddenChars = /[<>:"|?*\x00-\x1f]/;
  if (forbiddenChars.test(path)) return false;

  return true;
};

/**
 * Validuje JSON string
 * @param {string} jsonString - JSON string
 * @returns {object} - Objekt s validací a parsed daty
 */
export const validateJson = (jsonString) => {
  const result = {
    isValid: false,
    data: null,
    error: null
  };

  if (!jsonString || typeof jsonString !== 'string') {
    result.error = 'Invalid input type';
    return result;
  }

  try {
    const parsed = JSON.parse(jsonString);
    result.isValid = true;
    result.data = parsed;
  } catch (error) {
    result.error = error.message;
  }

  return result;
};

/**
 * Validuje číslo s omezeními
 * @param {any} value - Hodnota k validaci
 * @param {object} options - Možnosti validace
 * @returns {object} - Objekt s validací
 */
export const validateNumber = (value, options = {}) => {
  const {
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    integer = false,
    positive = false
  } = options;

  const result = {
    isValid: true,
    errors: []
  };

  // Kontrola typu
  if (typeof value !== 'number' || isNaN(value)) {
    result.isValid = false;
    result.errors.push('Hodnota musí být platné číslo');
    return result;
  }

  // Kontrola celého čísla
  if (integer && !Number.isInteger(value)) {
    result.isValid = false;
    result.errors.push('Hodnota musí být celé číslo');
  }

  // Kontrola kladného čísla
  if (positive && value <= 0) {
    result.isValid = false;
    result.errors.push('Hodnota musí být kladná');
  }

  // Kontrola rozsahu
  if (value < min) {
    result.isValid = false;
    result.errors.push(`Hodnota musí být alespoň ${min}`);
  }

  if (value > max) {
    result.isValid = false;
    result.errors.push(`Hodnota nesmí být větší než ${max}`);
  }

  return result;
};

/**
 * Validuje string s omezeními
 * @param {any} value - Hodnota k validaci
 * @param {object} options - Možnosti validace
 * @returns {object} - Objekt s validací
 */
export const validateString = (value, options = {}) => {
  const {
    minLength = 0,
    maxLength = Infinity,
    required = false,
    pattern = null,
    sanitize = false
  } = options;

  const result = {
    isValid: true,
    errors: [],
    sanitizedValue: value
  };

  // Kontrola typu
  if (typeof value !== 'string') {
    if (required) {
      result.isValid = false;
      result.errors.push('Hodnota je povinná');
    }
    return result;
  }

  // Sanitizace
  if (sanitize) {
    result.sanitizedValue = sanitizeHtml(value);
  }

  const stringValue = result.sanitizedValue;

  // Kontrola délky
  if (stringValue.length < minLength) {
    result.isValid = false;
    result.errors.push(`Text musí mít alespoň ${minLength} znaků`);
  }

  if (stringValue.length > maxLength) {
    result.isValid = false;
    result.errors.push(`Text nesmí mít více než ${maxLength} znaků`);
  }

  // Kontrola patternu
  if (pattern && !pattern.test(stringValue)) {
    result.isValid = false;
    result.errors.push('Text neodpovídá požadovanému formátu');
  }

  return result;
};

/**
 * Kombinovaná validace pro user input
 * @param {object} input - Vstupní data
 * @param {object} schema - Validační schema
 * @returns {object} - Výsledek validace
 */
export const validateInput = (input, schema) => {
  const result = {
    isValid: true,
    errors: {},
    sanitizedData: {}
  };

  for (const [field, rules] of Object.entries(schema)) {
    const value = input[field];
    let fieldResult;

    switch (rules.type) {
      case 'string':
        fieldResult = validateString(value, rules.options);
        break;
      case 'email':
        fieldResult = {
          isValid: validateEmail(value),
          errors: validateEmail(value) ? [] : ['Neplatný email']
        };
        break;
      case 'password':
        fieldResult = validatePassword(value);
        break;
      case 'number':
        fieldResult = validateNumber(value, rules.options);
        break;
      case 'json':
        fieldResult = validateJson(value);
        break;
      default:
        fieldResult = { isValid: true, errors: [] };
    }

    result.isValid = result.isValid && fieldResult.isValid;
    result.errors[field] = fieldResult.errors || [];

    if (fieldResult.sanitizedValue !== undefined) {
      result.sanitizedData[field] = fieldResult.sanitizedValue;
    } else if (fieldResult.data !== undefined) {
      result.sanitizedData[field] = fieldResult.data;
    } else {
      result.sanitizedData[field] = value;
    }
  }

  return result;
};

export default {
  sanitizeHtml,
  validateEmail,
  validatePassword,
  validateFileName,
  validateFirebaseDocId,
  validateUrl,
  validateStoragePath,
  validateJson,
  validateNumber,
  validateString,
  validateInput
};


