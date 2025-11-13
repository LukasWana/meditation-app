/**
 * Centralizovaný handler pro shader chyby
 * Parsuje, kategorizuje a zpracovává chyby kompilace shaderů
 */

/**
 * Parsuje chybovou hlášku WebGL
 * @param {string} errorLog - Chybová hláška z WebGL
 * @returns {Array<Object>} Pole parsovaných chyb
 */
export const parseShaderError = (errorLog) => {
  if (!errorLog || typeof errorLog !== 'string') {
    return [];
  }

  const errors = [];
  const lines = errorLog.split('\n');

  for (const line of lines) {
    if (!line.trim() || line.includes('WARNING')) {
      continue;
    }

    // Parsuj formát: ERROR: 0:11: '6.04.0' : invalid number
    const match = line.match(/ERROR:\s*(\d+):(\d+):\s*'([^']*)'\s*:\s*(.+)/);
    if (match) {
      errors.push({
        line: parseInt(match[1], 10),
        column: parseInt(match[2], 10),
        token: match[3],
        message: match[4].trim(),
        type: categorizeErrorType(match[4])
      });
    } else {
      // Parsuj formát: ERROR: 0:11: invalid number
      const simpleMatch = line.match(/ERROR:\s*(\d+):(\d+):\s*(.+)/);
      if (simpleMatch) {
        errors.push({
          line: parseInt(simpleMatch[1], 10),
          column: parseInt(simpleMatch[2], 10),
          token: null,
          message: simpleMatch[3].trim(),
          type: categorizeErrorType(simpleMatch[3])
        });
      }
    }
  }

  return errors;
};

/**
 * Kategorizuje typ chyby podle chybové hlášky
 * @param {string} message - Chybová hláška
 * @returns {string} Typ chyby
 */
const categorizeErrorType = (message) => {
  const msg = message.toLowerCase();

  if (msg.includes('invalid number') || msg.match(/\d+\.\d+\.\d+/)) {
    return 'invalid_number';
  }
  if (msg.includes('dimension mismatch') || msg.includes('cannot convert')) {
    return 'dimension_mismatch';
  }
  if (msg.includes('syntax error') || msg.includes('unexpected')) {
    return 'syntax_error';
  }
  if (msg.includes('illegal use of reserved word') || msg.includes('reserved word')) {
    return 'reserved_word';
  }
  if (msg.includes('cannot be redeclared') || msg.includes('redeclared')) {
    return 'redeclaration';
  }
  if (msg.includes('undeclared identifier') || msg.includes('undeclared')) {
    return 'undeclared_variable';
  }
  if (msg.includes('missing') || msg.includes('expected')) {
    return 'missing_token';
  }
  if (msg.includes('wrong operand types') || msg.includes('no operation')) {
    return 'type_mismatch';
  }
  if (msg.includes('boolean expression expected') || msg.includes('boolean')) {
    return 'boolean_expression';
  }
  if (msg.includes('too many arguments') || msg.includes('too few arguments')) {
    return 'argument_count';
  }

  return 'unknown';
};

/**
 * Zpracuje chybu a vrátí uživatelsky přívětivou zprávu
 * @param {string} errorLog - Chybová hláška z WebGL
 * @param {string} shaderSource - Zdrojový kód shaderu
 * @param {string} shaderType - Typ shaderu ('vertex' nebo 'fragment')
 * @returns {Object} Zpracovaná chyba
 */
export const handleShaderError = (errorLog, shaderSource, shaderType = 'fragment') => {
  const parsedErrors = parseShaderError(errorLog);

  if (parsedErrors.length === 0) {
    return {
      hasError: false,
      errors: [],
      userMessage: null,
      canRecover: false
    };
  }

  // Získej problematické řádky
  const problematicLines = parsedErrors.map(err => {
    const lines = shaderSource.split('\n');
    return {
      ...err,
      lineContent: lines[err.line] || '',
      context: getContext(lines, err.line, 3)
    };
  });

  // Vytvoř uživatelsky přívětivou zprávu
  const userMessage = createUserFriendlyMessage(parsedErrors, problematicLines);

  // Zjisti, zda lze chybu opravit automaticky
  const canRecover = canAutoRecover(parsedErrors);

  return {
    hasError: true,
    errors: problematicLines,
    userMessage,
    canRecover,
    recoveryStrategy: canRecover ? getRecoveryStrategy(parsedErrors) : null,
    shaderType
  };
};

/**
 * Získá kontext okolo problematického řádku
 * @param {Array<string>} lines - Řádky shaderu
 * @param {number} lineNum - Číslo problematického řádku
 * @param {number} contextSize - Počet řádků před a po
 * @returns {Object} Kontext
 */
const getContext = (lines, lineNum, contextSize = 3) => {
  const start = Math.max(0, lineNum - contextSize);
  const end = Math.min(lines.length, lineNum + contextSize + 1);

  return {
    before: lines.slice(start, lineNum),
    line: lines[lineNum] || '',
    after: lines.slice(lineNum + 1, end),
    lineNumber: lineNum
  };
};

/**
 * Vytvoří uživatelsky přívětivou zprávu
 * @param {Array<Object>} errors - Parsované chyby
 * @param {Array<Object>} problematicLines - Problematické řádky s kontextem
 * @returns {string} Uživatelsky přívětivá zpráva
 */
const createUserFriendlyMessage = (errors) => {
  if (errors.length === 0) {
    return 'Neznámá chyba kompilace shaderu';
  }

  // Získej hlavní chybu (první nebo nejčastější typ)
  const mainError = errors[0];
  const errorType = mainError.type;

  const messages = {
    invalid_number: `Neplatné číslo na řádku ${mainError.line + 1}: "${mainError.token}"`,
    dimension_mismatch: `Nesoulad dimenzí na řádku ${mainError.line + 1}: nelze převést typ`,
    syntax_error: `Syntaktická chyba na řádku ${mainError.line + 1}`,
    reserved_word: `Rezervované slovo na řádku ${mainError.line + 1}: "${mainError.token}"`,
    redeclaration: `Redeclarace funkce na řádku ${mainError.line + 1}: "${mainError.token}"`,
    undeclared_variable: `Nedeklarovaná proměnná na řádku ${mainError.line + 1}: "${mainError.token}"`,
    missing_token: `Chybějící token na řádku ${mainError.line + 1}`,
    type_mismatch: `Nesoulad typů na řádku ${mainError.line + 1}`,
    unknown: `Chyba na řádku ${mainError.line + 1}: ${mainError.message}`
  };

  let message = messages[errorType] || messages.unknown;

  // Pokud je více chyb, přidej informaci
  if (errors.length > 1) {
    message += ` (a dalších ${errors.length - 1} chyb)`;
  }

  return message;
};

/**
 * Zjistí, zda lze chybu opravit automaticky
 * @param {Array<Object>} errors - Parsované chyby
 * @returns {boolean} Zda lze opravit automaticky
 */
const canAutoRecover = (errors) => {
  // Chyby, které lze opravit automaticky
  const recoverableTypes = [
    'invalid_number',
    'dimension_mismatch',
    'reserved_word',
    'missing_token'
  ];

  // Všechny chyby musí být opravitelné
  return errors.every(err => recoverableTypes.includes(err.type));
};

/**
 * Získá strategii pro opravu chyby
 * @param {Array<Object>} errors - Parsované chyby
 * @returns {Object} Recovery strategie
 */
const getRecoveryStrategy = (errors) => {
  const strategies = [];

  for (const error of errors) {
    switch (error.type) {
      case 'invalid_number':
        strategies.push({
          type: 'fix_number_format',
          line: error.line,
          token: error.token,
          fix: fixInvalidNumber(error.token)
        });
        break;
      case 'dimension_mismatch':
        strategies.push({
          type: 'fix_dimension',
          line: error.line,
          fix: 'add_swizzle'
        });
        break;
      case 'reserved_word':
        strategies.push({
          type: 'rename_variable',
          line: error.line,
          token: error.token,
          fix: renameReservedWord(error.token)
        });
        break;
      case 'missing_token':
        strategies.push({
          type: 'add_missing_token',
          line: error.line,
          fix: 'add_semicolon_or_parenthesis'
        });
        break;
    }
  }

  return strategies;
};

/**
 * Opraví neplatné číslo
 * @param {string} token - Neplatné číslo
 * @returns {string} Opravené číslo
 */
const fixInvalidNumber = (token) => {
  if (!token) return null;

  // Oprav formáty jako "6.04.0" -> "6.04"
  if (token.match(/^\d+\.\d+\.\d+$/)) {
    const parts = token.split('.');
    if (parts[1] === '00' || parts[1] === '0') {
      return parts[0] + '.0';
    }
    return parts[0] + '.' + parts[1];
  }

  // Oprav formáty jako "10.0." -> "10.0"
  if (token.match(/^\d+\.\d+\.$/)) {
    return token.replace(/\.$/, '');
  }

  return null;
};

/**
 * Přejmenuje rezervované slovo
 * @param {string} token - Rezervované slovo
 * @returns {string} Nový název
 */
const renameReservedWord = (token) => {
  const reservedWords = {
    'sample': 'sampleTex',
    'attribute': 'in', // Pro WebGL 2.0
    'varying': 'in' // Pro WebGL 2.0
  };

  return reservedWords[token] || token + 'Var';
};

/**
 * Přeloží chybovou hlášku do češtiny
 * @param {string} errorMessage - Anglická chybová hláška
 * @returns {string} Česká chybová hláška
 */
export const translateError = (errorMessage) => {
  const translations = {
    'invalid number': 'neplatné číslo',
    'syntax error': 'syntaktická chyba',
    'dimension mismatch': 'nesoulad dimenzí',
    'cannot convert': 'nelze převést',
    'illegal use of reserved word': 'nepovolené použití rezervovaného slova',
    'cannot be redeclared': 'nemůže být redeklarována',
    'undeclared identifier': 'nedeklarovaná proměnná',
    'missing': 'chybějící',
    'expected': 'očekáváno',
    'wrong operand types': 'nesprávné typy operandů',
    'no operation': 'žádná operace',
    'field selection requires': 'výběr pole vyžaduje'
  };

  let translated = errorMessage;
  for (const [en, cs] of Object.entries(translations)) {
    translated = translated.replace(new RegExp(en, 'gi'), cs);
  }

  return translated;
};

