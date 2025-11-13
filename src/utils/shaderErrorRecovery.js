/**
 * Error Recovery Mechanism
 * Automaticky opravuje opravitelné chyby v shader kódu
 */

import { sanitizeNumberFormats } from './shaderLoader';
import { fixDimensionMismatch } from './glslFixes';

/**
 * Pokusí se automaticky opravit chyby v shader kódu
 * @param {string} shaderCode - Shader kód s chybami
 * @param {Array<Object>} errors - Parsované chyby
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0
 * @returns {Object} { fixedCode: string, fixed: boolean, appliedFixes: Array<string> }
 */
export const attemptErrorRecovery = (shaderCode, errors, isWebGL2 = false) => {
  if (!shaderCode || !errors || errors.length === 0) {
    return { fixedCode: shaderCode, fixed: false, appliedFixes: [] };
  }

  let fixedCode = shaderCode;
  const appliedFixes = [];
  let fixed = false;

  // Projdeme všechny chyby a pokusíme se je opravit
  for (const error of errors) {
    switch (error.type) {
      case 'invalid_number':
        if (error.token) {
          const fixedNumber = fixInvalidNumber(error.token);
          if (fixedNumber) {
            // Nahraď neplatné číslo opraveným
            fixedCode = fixedCode.replace(
              new RegExp(`\\b${escapeRegex(error.token)}\\b`, 'g'),
              fixedNumber
            );
            appliedFixes.push(`Opraveno neplatné číslo: ${error.token} → ${fixedNumber}`);
            fixed = true;
          }
        }
        // Také aplikuj obecnou sanitizaci
        fixedCode = sanitizeNumberFormats(fixedCode);
        break;

      case 'missing_token': {
        // Oprav chybějící operátory a závorky
        const syntaxFixed = fixCommonSyntaxErrors(fixedCode, error);
        if (syntaxFixed !== fixedCode) {
          fixedCode = syntaxFixed;
          appliedFixes.push('Opravena syntaktická chyba (chybějící token)');
          fixed = true;
        }
        break;
      }

      case 'dimension_mismatch': {
        fixedCode = fixDimensionMismatch(fixedCode);
        appliedFixes.push('Opraven nesoulad dimenzí');
        fixed = true;
        break;
      }

      case 'reserved_word': {
        if (error.token) {
          const newName = renameReservedWord(error.token, isWebGL2);
          if (newName !== error.token) {
            // Přejmenuj proměnnou (ale opatrně - pouze pokud není součástí většího výrazu)
            fixedCode = fixedCode.replace(
              new RegExp(`\\b${escapeRegex(error.token)}\\b`, 'g'),
              newName
            );
            appliedFixes.push(`Přejmenováno rezervované slovo: ${error.token} → ${newName}`);
            fixed = true;
          }
        }
        break;
      }

      case 'syntax_error': {
        // Pokus se opravit běžné syntax chyby
        const syntaxFixed = fixCommonSyntaxErrors(fixedCode, error);
        if (syntaxFixed !== fixedCode) {
          fixedCode = syntaxFixed;
          appliedFixes.push('Opravena syntaktická chyba');
          fixed = true;
        }
        break;
      }

      case 'undeclared_variable': {
        // Pokus se přidat deklaraci chybějící proměnné
        const varFixed = fixUndeclaredVariable(fixedCode, error);
        if (varFixed !== fixedCode) {
          fixedCode = varFixed;
          appliedFixes.push(`Přidána deklarace proměnné: ${error.token}`);
          fixed = true;
        }
        // Také zkontroluj, zda to není ISF proměnná, která nebyla správně převedena
        if (error.token && (error.token.includes('IMG_') || error.token.includes('RENDERSIZE') || error.token.includes('isf_'))) {
          // Pokus se opravit ISF proměnné
          const isfFixed = fixISFVariables(fixedCode, error.token);
          if (isfFixed !== fixedCode) {
            fixedCode = isfFixed;
            appliedFixes.push(`Opravena ISF proměnná: ${error.token}`);
            fixed = true;
          }
        }
        break;
      }

      case 'type_mismatch': {
        // Pokus se opravit type mismatch
        const typeFixed = fixTypeMismatch(fixedCode, error);
        if (typeFixed !== fixedCode) {
          fixedCode = typeFixed;
          appliedFixes.push('Opraven type mismatch');
          fixed = true;
        }
        break;
      }

      case 'boolean_expression': {
        // Pokus se opravit boolean expression errors
        const boolFixed = fixBooleanExpression(fixedCode, error);
        if (boolFixed !== fixedCode) {
          fixedCode = boolFixed;
          appliedFixes.push('Opraven boolean expression');
          fixed = true;
        }
        break;
      }

      case 'argument_count': {
        // Pokus se opravit počet argumentů funkcí
        const argFixed = fixArgumentCount(fixedCode, error);
        if (argFixed !== fixedCode) {
          fixedCode = argFixed;
          appliedFixes.push('Opraven počet argumentů');
          fixed = true;
        }
        break;
      }

      case 'redeclaration': {
        // Oprav redeklaraci vestavěné funkce (např. min, max, tanh)
        const redeclFixed = fixRedeclaration(fixedCode, error);
        if (redeclFixed !== fixedCode) {
          fixedCode = redeclFixed;
          appliedFixes.push(`Opravena redeklarace funkce: ${error.token}`);
          fixed = true;
        }
        break;
      }
    }
  }

  // Finální sanitizace
  fixedCode = sanitizeNumberFormats(fixedCode);

  return { fixedCode, fixed, appliedFixes };
};

/**
 * Opraví neplatné číslo
 * @param {string} token - Neplatné číslo
 * @returns {string|null} Opravené číslo nebo null
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

  // Oprav formáty jako "192.00.0" -> "192.0"
  if (token.match(/^\d+\.\d+\.\d+$/)) {
    const parts = token.split('.');
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
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0
 * @returns {string} Nový název
 */
const renameReservedWord = (token, isWebGL2) => {
  const reservedWords = {
    'sample': 'sampleTex',
    'attribute': isWebGL2 ? 'in' : 'attribute', // Pro WebGL 2.0
    'varying': isWebGL2 ? 'in' : 'varying' // Pro WebGL 2.0
  };

  return reservedWords[token] || token + 'Var';
};

/**
 * Opraví běžné syntax chyby
 * @param {string} code - Shader kód
 * @param {Object} error - Chybová informace
 * @returns {string} Opravený kód
 */
const fixCommonSyntaxErrors = (code, error) => {
  const lines = code.split('\n');
  const lineNum = error.line;

  if (lineNum >= lines.length) {
    // Pokud je chyba na řádku mimo rozsah, zkus opravit celý kód
    return fixSyntaxErrorsInCode(code, error);
  }

  let line = lines[lineNum];
  let changed = false;

  // Speciální případ: syntax error na řádku 1 může být problém s hlavičkou shaderu
  if (lineNum === 0 && error.message.includes('syntax error')) {
    // Zkontroluj, zda má shader správnou hlavičku
    const firstLine = line.trim();
    if (!firstLine.startsWith('#version') && !firstLine.startsWith('precision') && !firstLine.startsWith('uniform')) {
      // Možná chybí hlavička nebo je neplatná - zkus opravit
      if (firstLine.includes('void main()')) {
        // Chybí hlavička - přidáme ji později v sanitizaci
        changed = true;
      }
    }
  }

  // Oprav chybějící operátory (např. vec4(0.0)vec4(0.5) -> vec4(0.0) + vec4(0.5))
  // Toto je nejčastější problém z logu
  if (line.match(/\)\s*vec\d+\s*\(/)) {
    line = line.replace(/\)\s*(vec\d+\s*\()/g, ') + $1');
    changed = true;
  }

  // Oprav také formáty jako vec4(0.0)vec4(0.5)) - chybějící operátor před druhým vec4
  if (line.match(/vec\d+\s*\([^)]+\)\s*vec\d+\s*\(/)) {
    line = line.replace(/(vec\d+\s*\([^)]+\))\s*(vec\d+\s*\()/g, '$1 + $2');
    changed = true;
  }

  // Oprav také formáty s uzavírací závorkou: vec4(0.0)vec4(0.5))
  if (line.match(/vec\d+\s*\([^)]+\)\s*vec\d+\s*\([^)]+\)\)/)) {
    line = line.replace(/vec\d+\s*\(([^)]+)\)\s*vec\d+\s*\(([^)]+)\)\)/g,
      (match, first, second) => {
        return `vec4(${first}) + vec4(${second})`;
      });
    changed = true;
  }

  // Oprav nevyvážené závorky: vec4(0.5),1.0)) -> vec4(0.5, 1.0, 1.0, 1.0)
  if (line.match(/vec\d+\s*\([^)]+\)\s*,\s*\d+\.?\d*\)\)/)) {
    line = line.replace(/vec\d+\s*\(([^)]+)\)\s*,\s*(\d+\.?\d*)\)\)/g,
      (match, first, second) => {
        return `vec4(${first}, ${second}, 1.0, 1.0)`;
      });
    changed = true;
  }

  // Oprav nevyvážené závorky s swizzle: vec4(0.5)).r -> vec4(0.5, 0.5, 0.5, 0.5).r
  if (line.match(/vec\d+\s*\([^)]+\)\)\s*\.([rgba]|x|y|z|w|rgb|rgba|xy|xyz|xyzw)/)) {
    line = line.replace(/vec\d+\s*\(([^)]+)\)\)\s*\.([rgba]|x|y|z|w|rgb|rgba|xy|xyz|xyzw)/g,
      (match, first, swizzle) => {
        if (first.match(/^-?\d+\.?\d*$/)) {
          return `vec4(${first}, ${first}, ${first}, ${first}).${swizzle}`;
        }
        return match;
      });
    changed = true;
  }

  // Oprav chybějící operátor v konstruktoru: vec4(0.5) + .5, ...) -> vec4(0.5 + 0.5, ...)
  if (line.match(/vec\d+\s*\([^)]+\)\s*\+\s*\.\d+\s*,/)) {
    line = line.replace(/vec\d+\s*\(([^)]+)\)\s*\+\s*\.(\d+)\s*,/g,
      (match, first, second) => {
        return `vec4(${first} + 0.${second}, `;
      });
    changed = true;
  }

  // Oprav nevyvážené závorky s dělením (např. vec4(0.5) / FREQ_RANGE, 0.25),1.0))
  // Oprav formát: vec4(0.5) / FREQ_RANGE, 0.25),1.0)) -> vec4(0.5 / FREQ_RANGE, 0.25, 1.0, 1.0)
  if (line.match(/vec\d+\s*\([^)]*\)\s*\/\s*\w+\s*,\s*\d+\.?\d*\)/)) {
    line = line.replace(/vec\d+\s*\(([^)]+)\)\s*\/\s*(\w+)\s*,\s*(\d+\.?\d*)\)\s*,\s*(\d+\.?\d*)\)\)/g,
      (match, first, varName, second, third) => {
        return `vec4(${first} / ${varName}, ${second}, ${third}, 1.0)`;
      });
    changed = true;
  }

  // Oprav také variantu s jednou hodnotou: vec4(0.5) / FREQ_RANGE, 0.0), 1.0))
  if (line.match(/vec\d+\s*\([^)]*\)\s*\/\s*\w+\s*,\s*\d+\.?\d*\)\s*,\s*\d+\.?\d*\)\)/)) {
    line = line.replace(/vec\d+\s*\(([^)]+)\)\s*\/\s*(\w+)\s*,\s*(\d+\.?\d*)\)\s*,\s*(\d+\.?\d*)\)\)/g,
      (match, first, varName, second, third) => {
        return `vec4(${first} / ${varName}, ${second}, ${third}, 1.0)`;
      });
    changed = true;
  }

  // Oprav chybějící středníky
  if (error.message.includes('syntax error') && !line.trim().endsWith(';') &&
      !line.trim().endsWith('{') && !line.trim().endsWith('}') &&
      !line.includes('if') && !line.includes('for') && !line.includes('while') &&
      !line.includes('void') && !line.includes('return')) {
    // Přidej středník na konec, pokud chybí
    if (line.trim() && !line.trim().endsWith(';')) {
      line = line.replace(/([^;{}])\s*$/, '$1;');
      changed = true;
    }
  }

  // Oprav chybějící závorky
  if (error.message.includes(')') || error.message.includes('(')) {
    // Pokus se opravit nevyvážené závorky
    const openCount = (line.match(/\(/g) || []).length;
    const closeCount = (line.match(/\)/g) || []).length;

    if (openCount > closeCount) {
      // Chybí uzavírací závorky
      line = line + ')'.repeat(openCount - closeCount);
      changed = true;
    }
  }

  if (changed) {
    lines[lineNum] = line;
    return lines.join('\n');
  }

  return code;
};

/**
 * Opraví syntax chyby v celém kódu (když není známý řádek)
 * @param {string} code - Shader kód
 * @param {Object} error - Chybová informace
 * @returns {string} Opravený kód
 */
const fixSyntaxErrorsInCode = (code, error) => {
  let fixedCode = code;
  let changed = false;

  // Oprav chybějící operátory v celém kódu
  if (error.message.includes('syntax error')) {
    // Oprava 1: vec4(0.5) / FREQ_RANGE, 0.25),1.0)) -> vec4(0.5 / FREQ_RANGE, 0.25, 1.0, 1.0)
    const before1 = fixedCode;
    fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\s*\/\s*(\w+)\s*,\s*(\d+\.?\d*)\)\s*,\s*(\d+\.?\d*)\)\)/g,
      (match, first, varName, second, third) => {
        return `vec4(${first} / ${varName}, ${second}, ${third}, 1.0)`;
      });
    if (fixedCode !== before1) {
      changed = true;
    }

    // Oprava 2: vec4(0.0)vec4(0.5)) -> vec4(0.0) + vec4(0.5)
    const before2 = fixedCode;
    fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\s*vec\d+\s*\(([^)]+)\)\)/g,
      (match, first, second) => {
        return `vec4(${first}) + vec4(${second})`;
      });
    if (fixedCode !== before2) {
      changed = true;
    }

    // Oprava 3: vec4(0.5),1.0)) -> vec4(0.5, 1.0, 1.0, 1.0)
    const before3 = fixedCode;
    fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\s*,\s*(\d+\.?\d*)\)\)/g,
      (match, first, second) => {
        return `vec4(${first}, ${second}, 1.0, 1.0)`;
      });
    if (fixedCode !== before3) {
      changed = true;
    }

    // Oprava 4: vec4(0.5)) -> vec4(0.5, 0.5, 0.5, 0.5) (pouze pokud je to jediné číslo)
    const before4 = fixedCode;
    fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\)(?!\s*[.\w+*/-])/g,
      (match, first) => {
        if (first.match(/^-?\d+\.?\d*$/)) {
          return `vec4(${first}, ${first}, ${first}, ${first})`;
        }
        return match;
      });
    if (fixedCode !== before4) {
      changed = true;
    }

    // Oprava 5: vec4(0.5)).r -> vec4(0.5, 0.5, 0.5, 0.5).r
    const before5 = fixedCode;
    fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\)\s*\.([rgba]|x|y|z|w|rgb|rgba|xy|xyz|xyzw)/g,
      (match, first, swizzle) => {
        if (first.match(/^-?\d+\.?\d*$/)) {
          return `vec4(${first}, ${first}, ${first}, ${first}).${swizzle}`;
        }
        return match;
      });
    if (fixedCode !== before5) {
      changed = true;
    }

    // Oprava 6: vec4(0.5) + .5, ...) -> vec4(0.5 + 0.5, ...)
    const before6 = fixedCode;
    fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\s*\+\s*\.(\d+)\s*,/g,
      (match, first, second) => {
        return `vec4(${first} + 0.${second}, `;
      });
    if (fixedCode !== before6) {
      changed = true;
    }

    // Oprav také formáty s uzavírací závorkou: )vec4(
    const before7 = fixedCode;
    fixedCode = fixedCode.replace(/\)\s*(vec\d+\s*\()/g, ') + $1');
    if (fixedCode !== before7) {
      changed = true;
    }
  }

  return changed ? fixedCode : code;
};

/**
 * Opraví nedeklarovanou proměnnou
 * @param {string} code - Shader kód
 * @param {Object} error - Chybová informace
 * @returns {string} Opravený kód
 */
const fixUndeclaredVariable = (code, error) => {
  if (!error.token) {
    return code;
  }

  const lines = code.split('\n');

  // Speciální případy pro rezervovaná slova
  if (error.token === 'sample') {
    // Přejmenuj sample na sampleTex
    const escapedToken = escapeRegex(error.token);
    code = code.replace(new RegExp(`\\b${escapedToken}\\b`, 'g'), 'sampleTex');
    return code;
  }

  // Speciální případ pro PI konstantu
  if (error.token === 'PI') {
    // Přidat na začátek shaderu (po precision)
    const precisionIndex = code.indexOf('precision');
    if (precisionIndex !== -1) {
      const afterPrecision = code.indexOf('\n', precisionIndex);
      if (afterPrecision !== -1) {
        // Zkontroluj, zda už není definováno
        if (!code.match(/\bconst\s+float\s+PI\b/)) {
          code = code.slice(0, afterPrecision + 1) +
                 'const float PI = 3.14159265359;\n' +
                 code.slice(afterPrecision + 1);
        }
      }
    }
    return code;
  }

  // Speciální případ pro GAIN konstantu
  if (error.token === 'GAIN') {
    // Přidat na začátek shaderu (po precision nebo PI)
    const piIndex = code.indexOf('const float PI');
    if (piIndex !== -1) {
      const afterPI = code.indexOf('\n', piIndex);
      if (afterPI !== -1) {
        // Zkontroluj, zda už není definováno
        if (!code.match(/\bconst\s+float\s+GAIN\b/)) {
          code = code.slice(0, afterPI + 1) +
                 'const float GAIN = 1.0;\n' +
                 code.slice(afterPI + 1);
        }
      }
    } else {
      // Pokud PI není, přidej po precision
      const precisionIndex = code.indexOf('precision');
      if (precisionIndex !== -1) {
        const afterPrecision = code.indexOf('\n', precisionIndex);
        if (afterPrecision !== -1) {
          if (!code.match(/\bconst\s+float\s+GAIN\b/)) {
            code = code.slice(0, afterPrecision + 1) +
                   'const float GAIN = 1.0;\n' +
                   code.slice(afterPrecision + 1);
          }
        }
      }
    }
    return code;
  }

  // Běžné proměnné, které jsou často zakomentované
  const commonVars = {
    'dis': { type: 'float', value: '0.05' },
    'vol_min': { type: 'float', value: '0.0' },
    'vol_max': { type: 'float', value: '1.0' },
    'blur': { type: 'float', value: '0.02' },
    'width': { type: 'float', value: '0.02' },
    'iters': { type: 'float', value: '10.0' },
    'minDst': { type: 'float', value: '0.1' },
    'flickerSpeed': { type: 'float', value: '1.0' },
    'flickerFreq': { type: 'float', value: '1.0' }
  };

  if (commonVars[error.token]) {
    const varDef = commonVars[error.token];
    // Najdi funkci main() a přidej deklaraci na začátek
    const mainIndex = lines.findIndex(line => line.includes('void main()'));
    if (mainIndex !== -1) {
      // Zkontroluj, zda už není deklarována
      const beforeMain = lines.slice(0, mainIndex).join('\n');
      if (!beforeMain.match(new RegExp(`\\b${varDef.type}\\s+${escapeRegex(error.token)}\\b`))) {
        // Najdi první řádek v main() a přidej deklaraci tam
        const mainLine = lines[mainIndex];
        const indent = mainLine.match(/^(\s*)/)?.[1] || '';
        const declaration = `${indent}  ${varDef.type} ${error.token} = ${varDef.value};`;
        lines.splice(mainIndex + 1, 0, declaration);
        return lines.join('\n');
      }
    }
    return code;
  }

  // Zjisti typ proměnné podle použití
  let varType = 'float';
  let defaultValue = '0.0';

  // Zkontroluj, jak je proměnná použita v kódu
  const usagePattern = new RegExp(`\\b${escapeRegex(error.token)}\\b`, 'g');
  const matches = code.match(usagePattern);

  if (matches) {
    // Zkontroluj kontext použití
    const context = code.substring(Math.max(0, code.indexOf(error.token) - 50), code.indexOf(error.token) + 50);

    if (context.match(/vec2|\.(x|y|xy)/)) {
      varType = 'vec2';
      defaultValue = 'vec2(0.0)';
    } else if (context.match(/vec3|\.(x|y|z|rgb)/)) {
      varType = 'vec3';
      defaultValue = 'vec3(0.0)';
    } else if (context.match(/vec4|\.(x|y|z|w|rgba)/)) {
      varType = 'vec4';
      defaultValue = 'vec4(0.0)';
    } else if (context.match(/int|for\s*\(/) && error.token.match(/^(iters|i|j|k)$/)) {
      // Pro loop proměnné použij float (WebGL 1.0 kompatibilita)
      varType = 'float';
      defaultValue = '0.0';
    }
  }

  // Najdi funkci main() a přidej deklaraci na začátek
  const mainIndex = lines.findIndex(line => line.includes('void main()'));
  if (mainIndex !== -1) {
    // Zkontroluj, zda už není deklarována
    const beforeMain = lines.slice(0, mainIndex).join('\n');
    if (!beforeMain.match(new RegExp(`\\b${varType}\\s+${escapeRegex(error.token)}\\b`))) {
      // Najdi první řádek v main() a přidej deklaraci tam
      const mainLine = lines[mainIndex];
      const indent = mainLine.match(/^(\s*)/)?.[1] || '';
      const declaration = `${indent}  ${varType} ${error.token} = ${defaultValue};`;
      lines.splice(mainIndex + 1, 0, declaration);
      return lines.join('\n');
    }
  }

  return code;
};

/**
 * Opraví redeklaraci vestavěné funkce
 * @param {string} code - Shader kód
 * @param {Object} error - Chybová informace
 * @returns {string} Opravený kód
 */
const fixRedeclaration = (code, error) => {
  if (!error.token) {
    return code;
  }

  const functionName = error.token;
  const renamedFunction = `my${functionName.charAt(0).toUpperCase() + functionName.slice(1)}`;

  // Přejmenuj definici funkce
  // Hledáme: typ functionName( parametry ) { (podporujeme float, vec2, vec3, vec4, int)
  const functionDefPattern = new RegExp(`\\b(float|vec2|vec3|vec4|int)\\s+${escapeRegex(functionName)}\\s*\\(`, 'g');
  if (functionDefPattern.test(code)) {
    code = code.replace(functionDefPattern, `$1 ${renamedFunction}(`);
  }

  // Speciální případ pro int min() - musíme přejmenovat všechna volání v kontextu, kde je použita jako int funkce
  if (functionName === 'min' && code.includes('int myMin(')) {
    // Najdi všechna volání min() a přejmenuj je na myMin()
    // Musíme být opatrní - přejmenovat pouze volání naší funkce, ne built-in min()
    // Zkontroluj kontext - pokud je min() použito v kontextu, kde očekáváme int, přejmenuj
    let lastIndex = 0;
    let matchFound = true;

    while (matchFound) {
      const match = code.substring(lastIndex).match(new RegExp(`\\b${escapeRegex(functionName)}\\s*\\(`));
      if (!match) {
        matchFound = false;
        break;
      }

      const matchIndex = lastIndex + match.index;
      const beforeMatch = code.substring(Math.max(0, matchIndex - 50), matchIndex);
      const afterMatch = code.substring(matchIndex, Math.min(code.length, matchIndex + 50));

      // Zkontroluj, zda už není přejmenováno
      if (!beforeMatch.match(/\b(myMin|myMax|myTanh)\b/)) {
        // Zkontroluj kontext - pokud je použito v int kontextu nebo v colors[...], přejmenuj
        if (beforeMatch.match(/int\s+myMin|colors\[|colors\[.*min/) || afterMatch.match(/int\s+\)|colors\[/)) {
          code = code.substring(0, matchIndex) + renamedFunction + '(' + code.substring(matchIndex + match[0].length);
          lastIndex = matchIndex + renamedFunction.length + 1; // myMin( má 6 znaků
        } else {
          lastIndex = matchIndex + match[0].length;
        }
      } else {
        lastIndex = matchIndex + match[0].length;
      }
    }
  } else {
    // Přejmenuj všechna volání funkce (obecný případ)
    // Musíme být opatrní - přejmenujme pouze pokud není už přejmenováno
    const functionCallPattern = new RegExp(`\\b${escapeRegex(functionName)}\\s*\\(`, 'g');
    let lastIndex = 0;
    let matchFound = true;

    while (matchFound) {
      const match = code.substring(lastIndex).match(functionCallPattern);
      if (!match) {
        matchFound = false;
        break;
      }

      const matchIndex = lastIndex + match.index;
      const beforeMatch = code.substring(Math.max(0, matchIndex - 30), matchIndex);
      if (!beforeMatch.match(new RegExp(`\\b(my${functionName.charAt(0).toUpperCase() + functionName.slice(1)}|my${functionName})\\b`))) {
        code = code.substring(0, matchIndex) + renamedFunction + '(' + code.substring(matchIndex + match[0].length);
        lastIndex = matchIndex + renamedFunction.length + 1;
      } else {
        lastIndex = matchIndex + match[0].length;
      }
    }
  }

  return code;
};

/**
 * Opraví ISF proměnné, které nebyly správně převedeny
 * @param {string} code - Shader kód
 * @param {string} token - ISF proměnná
 * @returns {string} Opravený kód
 */
const fixISFVariables = (code, token) => {
  let fixedCode = code;

  // Oprav IMG_PIXEL
  if (token.includes('IMG_PIXEL')) {
    fixedCode = fixedCode.replace(/IMG_PIXEL\s*\([^)]+\)/g, 'vec4(0.5)');
  }

  // Oprav IMG_NORM_PIXEL
  if (token.includes('IMG_NORM_PIXEL')) {
    fixedCode = fixedCode.replace(/IMG_NORM_PIXEL\s*\([^)]+\)/g, 'vec4(0.5)');
  }

  // Oprav RENDERSIZE
  if (token.includes('RENDERSIZE')) {
    fixedCode = fixedCode.replace(/\bRENDERSIZE\b/g, 'u_resolution');
    fixedCode = fixedCode.replace(/RENDERSIZE\.xy/g, 'u_resolution');
    fixedCode = fixedCode.replace(/RENDERSIZE\.x/g, 'u_resolution.x');
    fixedCode = fixedCode.replace(/RENDERSIZE\.y/g, 'u_resolution.y');
  }

  // Oprav isf_FragNormCoord
  if (token.includes('isf_FragNormCoord')) {
    fixedCode = fixedCode.replace(/\bisf_FragNormCoord\b/g, 'v_uv');
    fixedCode = fixedCode.replace(/isf_FragNormCoord\s*\[\s*0\s*\]/g, 'v_uv.x');
    fixedCode = fixedCode.replace(/isf_FragNormCoord\s*\[\s*1\s*\]/g, 'v_uv.y');
  }

  // Oprav isf_FragCoord
  if (token.includes('isf_FragCoord')) {
    fixedCode = fixedCode.replace(/\bisf_FragCoord\b/g, 'v_uv * u_resolution');
  }

  // Oprav TIME
  if (token.includes('TIME')) {
    fixedCode = fixedCode.replace(/\bTIME\b/g, 'u_time');
  }

  return fixedCode;
};

/**
 * Opraví type mismatch
 * @param {string} code - Shader kód
 * @param {Object} error - Chybová informace
 * @returns {string} Opravený kód
 */
const fixTypeMismatch = (code, error) => {
  let fixedCode = code;
  const lineNum = error.line;
  const lines = fixedCode.split('\n');

  if (lineNum >= 0 && lineNum < lines.length) {
    let line = lines[lineNum];
    let changed = false;

    // Oprav mod(int(...), float) -> mod(float(...), float)
    if (line.includes('mod(') && line.includes('int(')) {
      line = line.replace(/mod\s*\(\s*int\s*\(([^)]+)\)\s*\/\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*\)/g,
        (match, varName, divisor, modulo) => {
          changed = true;
          return `mod(float(${varName}) / ${divisor}, ${modulo})`;
        });
    }

    // Oprav for(int i = 0; i < floatVar; i++) -> for(int i = 0; i < int(floatVar); i++)
    if (line.includes('for(') && line.includes('int') && line.includes(';')) {
      line = line.replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\w+)\s*;\s*\1\s*\+\+\s*\)/g,
        (match, varName, start, limitVar) => {
          // Zkontroluj, zda limitVar není už int
          if (!code.match(new RegExp(`\\bint\\s+${limitVar}\\s*[=;]`)) &&
              !code.match(new RegExp(`\\bconst\\s+int\\s+${limitVar}\\s*[=;]`))) {
            changed = true;
            return `for(int ${varName} = ${start}; ${varName} < int(${limitVar}); ${varName}++)`;
          }
          return match;
        });
    }

    // Oprav vec2(...) + float -> vec2(...) + vec2(float)
    if (line.includes('vec2(') && line.includes('+') && line.match(/\d+\.?\d*/)) {
      line = line.replace(/(vec2\([^)]+\))\s*\+\s*(\d+\.?\d*)\s*([,;)])/g,
        (match, vecExpr, scalar, suffix) => {
          changed = true;
          return `${vecExpr} + vec2(${scalar})${suffix}`;
        });
    }

    // Oprav mod(vec2(...), float) -> mod(vec2(...), vec2(float))
    if (line.includes('mod(') && line.includes('vec2(')) {
      line = line.replace(/mod\s*\(\s*(vec2\([^)]+\))\s*,\s*(\d+\.?\d*)\s*\)/g,
        (match, vecExpr, scalar) => {
          changed = true;
          return `mod(${vecExpr}, vec2(${scalar}))`;
        });
    }

    if (changed) {
      lines[lineNum] = line;
      fixedCode = lines.join('\n');
    }
  }

  return fixedCode;
};

/**
 * Opraví boolean expression errors
 * @param {string} code - Shader kód
 * @param {Object} error - Chybová informace
 * @returns {string} Opravený kód
 */
const fixBooleanExpression = (code, error) => {
  let fixedCode = code;
  const lineNum = error.line;
  const lines = fixedCode.split('\n');

  if (lineNum >= 0 && lineNum < lines.length) {
    let line = lines[lineNum];
    let changed = false;

    // Oprav chybějící operátory v boolean výrazech
    // if(var1 var2) -> if(var1 && var2)
    if (line.includes('if(') || line.includes('while(') || line.includes('for(')) {
      line = line.replace(/(if|while|for)\s*\(\s*(\w+)\s+(\w+)\s*\)/g,
        (match, keyword, var1, var2) => {
          if (!match.includes('==') && !match.includes('!=') && !match.includes('&&') && !match.includes('||')) {
            changed = true;
            return `${keyword}(${var1} && ${var2})`;
          }
          return match;
        });
    }

    // Oprav nevyvážené závorky
    if (line.includes('if(') || line.includes('while(') || line.includes('for(')) {
      const openCount = (line.match(/\(/g) || []).length;
      const closeCount = (line.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        line = line + ')'.repeat(openCount - closeCount);
        changed = true;
      }
    }

    if (changed) {
      lines[lineNum] = line;
      fixedCode = lines.join('\n');
    }
  }

  return fixedCode;
};

/**
 * Opraví počet argumentů funkcí
 * @param {string} code - Shader kód
 * @param {Object} error - Chybová informace
 * @returns {string} Opravený kód
 */
const fixArgumentCount = (code, error) => {
  let fixedCode = code;
  const lineNum = error.line;
  const lines = fixedCode.split('\n');

  if (lineNum >= 0 && lineNum < lines.length) {
    let line = lines[lineNum];
    let changed = false;

    // Parsuj chybovou hlášku pro název funkce a počet argumentů
    const errorMsg = error.message || '';
    const functionMatch = errorMsg.match(/(\w+)\s*\(/);
    const argCountMatch = errorMsg.match(/(\d+)\s+arguments/);

    if (functionMatch && argCountMatch) {
      const funcName = functionMatch[1];
      const argCount = parseInt(argCountMatch[1], 10);

      // Najdi volání funkce na řádku
      const funcCallRegex = new RegExp(`\\b${funcName}\\s*\\(([^)]*)\\)`, 'g');
      line = line.replace(funcCallRegex, (match, args) => {
        const argList = args.split(',').map(a => a.trim()).filter(a => a);

        // Pokud je příliš mnoho argumentů, odstraň přebytečné
        if (argList.length > argCount) {
          changed = true;
          return `${funcName}(${argList.slice(0, argCount).join(', ')})`;
        }
        // Pokud je příliš málo argumentů, přidej výchozí hodnoty
        if (argList.length < argCount) {
          changed = true;
          const defaultArgs = Array(argCount - argList.length).fill('0.0');
          return `${funcName}(${argList.concat(defaultArgs).join(', ')})`;
        }
        return match;
      });
    }

    if (changed) {
      lines[lineNum] = line;
      fixedCode = lines.join('\n');
    }
  }

  return fixedCode;
};

/**
 * Escape regex speciální znaky
 * @param {string} str - Řetězec k escapování
 * @returns {string} Escapovaný řetězec
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

