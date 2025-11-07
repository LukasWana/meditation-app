/**
 * Utility pro načítání shader souborů
 * Refaktorovaná verze - používá moduly pro lepší organizaci
 */

// Import pomocných modulů
import { getHelperFunctions, getHelperDefines } from './glslHelpers';
import { applyAllFixes, fixForLoops, fixMatrixTypes, fixIntToFloatAssignments, fixDimensionMismatch } from './glslFixes';
import {
  replaceISFVariables,
  replaceISFFunctions,
  processISFInputs,
  fixBoolOperators,
  addConstants
} from './isfConverter';
import {
  detectNeeds,
  getVariableDeclarations,
  addMiniShaderConstants,
  wrapMiniShader,
  addStandardHeader
} from './miniShaderConverter';

// Načti všechny mini-shader soubory
const miniShadersModules = import.meta.glob('/src/assets/mini-shaders/*.glsl', {
  as: 'raw',
  eager: false
});

// Načti všechny shader soubory (nový formát: .ts soubory s export default source)
const shadersModules = import.meta.glob('/src/assets/shaders/*.ts', {
  eager: false
});

/**
 * Získej seznam všech mini-shaderů
 */
export const getMiniShaderList = () => {
  return Object.keys(miniShadersModules).map(path => {
    const fileName = path.split('/').pop();
    const name = fileName.replace('.glsl', '');
    return {
      id: `mini-${name}`,
      name: name,
      path: path,
      category: 'mini-shaders'
    };
  });
};

/**
 * Získej seznam všech shaderů
 */
export const getShaderList = () => {
  return Object.keys(shadersModules).map(path => {
    const fileName = path.split('/').pop();
    const name = fileName.replace('.ts', '');
    return {
      id: `shader-${name}`,
      name: name,
      path: path,
      category: 'shaders'
    };
  });
};

/**
 * Načti obsah shader souboru
 */
export const loadShader = async (shaderPath) => {
  try {
    if (shaderPath.includes('mini-shaders')) {
      const module = miniShadersModules[shaderPath];
      if (module) {
        return await module();
      }
    } else if (shaderPath.includes('shaders')) {
      const module = shadersModules[shaderPath];
      if (module) {
        // Nový formát: .ts soubory exportují default source
        const moduleExports = await module();
        // Pokud je to objekt s default, vezmi default, jinak vezmi přímo
        if (moduleExports && typeof moduleExports === 'object' && 'default' in moduleExports) {
          return moduleExports.default;
        }
        // Pokud je to string, vrať ho přímo
        if (typeof moduleExports === 'string') {
          return moduleExports;
        }
        // Fallback: zkus najít source
        return moduleExports?.source || moduleExports;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to load shader:', shaderPath, error);
    return null;
  }
};

/**
 * Validuje shader kód před konverzí
 * @param {string} shaderCode - GLSL kód
 * @returns {Object} { isValid: boolean, errors: Array<string>, warnings: Array<string> }
 */
export const validateShaderCode = (shaderCode) => {
  const errors = [];
  const warnings = [];

  if (!shaderCode || typeof shaderCode !== 'string') {
    errors.push('Shader kód musí být neprázdný řetězec');
    return { isValid: false, errors, warnings };
  }

  if (shaderCode.trim().length === 0) {
    errors.push('Shader kód je prázdný');
    return { isValid: false, errors, warnings };
  }

  // Zkontroluj neplatné formáty čísel
  const invalidNumberFormats = shaderCode.match(/\b\d+\.\d+\.\d+\b/g);
  if (invalidNumberFormats && invalidNumberFormats.length > 0) {
    warnings.push(`Nalezeny neplatné formáty čísel: ${invalidNumberFormats.slice(0, 3).join(', ')}${invalidNumberFormats.length > 3 ? '...' : ''}`);
  }

  // Zkontroluj neplatné formáty s tečkou na konci
  const invalidTrailingDot = shaderCode.match(/\b\d+\.\d+\.\b/g);
  if (invalidTrailingDot && invalidTrailingDot.length > 0) {
    warnings.push(`Nalezeny neplatné formáty čísel s tečkou na konci: ${invalidTrailingDot.slice(0, 3).join(', ')}${invalidTrailingDot.length > 3 ? '...' : ''}`);
  }

  // Zkontroluj základní syntaxi - musí obsahovat void main()
  if (!shaderCode.includes('void main()') && !shaderCode.includes('void main (')) {
    warnings.push('Shader nemusí obsahovat funkci main() - může být neplatný');
  }

  // Zkontroluj základní GLSL klíčová slova
  const requiredKeywords = ['precision', 'uniform', 'varying', 'attribute', 'vec', 'float', 'int', 'void', 'return'];
  const hasRequiredKeywords = requiredKeywords.some(keyword => shaderCode.includes(keyword));
  if (!hasRequiredKeywords) {
    warnings.push('Shader neobsahuje základní GLSL klíčová slova - může být neplatný');
  }

  return { isValid: errors.length === 0, errors, warnings };
};

/**
 * Převeď shader kód na WebGL fragment shader
 * Refaktorovaná verze - používá moduly pro lepší organizaci
 */
export const convertShaderToWebGL = (shaderCode, shaderPath, isWebGL2 = false) => {
  if (!shaderCode || typeof shaderCode !== 'string') {
    throw new Error('Invalid shader code: must be a non-empty string');
  }

  try {
    // Pro mini-shaders
    if (shaderPath && shaderPath.includes('mini-shaders')) {
      return convertMiniShader(shaderCode, isWebGL2);
    }

    // Pro shaders (nový formát: .ts soubory s mainImage)
    if (shaderPath && shaderPath.includes('shaders')) {
      // Zkontroluj, zda je to nový formát (mainImage) nebo starý formát (ISF)
      if (shaderCode.includes('void mainImage(') || shaderCode.includes('mainImage(')) {
        return convertMainImageShader(shaderCode, isWebGL2);
      } else {
        // Starý ISF formát
        return convertISFShader(shaderCode, isWebGL2);
      }
    }

    // Pro ostatní - vrátí beze změny
    return shaderCode;
  } catch (error) {
    console.error('Error converting shader:', error);
    throw error;
  }
};

/**
 * Sanitizuje neplatné formáty čísel v celém kódu shaderu
 * @param {string} code - GLSL kód
 * @returns {string} Sanitizovaný kód
 */
export const sanitizeNumberFormats = (code) => {
  if (!code || typeof code !== 'string') {
    return code;
  }

  // Nejdřív oprav formáty s více tečkami: "6.04.0", "192.00.0", "3.00.0", "2.01.0", "3.05.0", "1000.00.0"
  // Opravíme je na správný formát: "6.04.0" -> "6.04", "192.00.0" -> "192.0"
  // Musíme opakovat, dokud jsou ještě neplatné formáty (může být více teček)
  let previousCode = '';
  let iterations = 0;
  while (previousCode !== code && iterations < 10) {
    previousCode = code;
    iterations++;

    // Oprav formáty s více tečkami: "6.04.0" -> "6.04"
    code = code.replace(/\b(-?\d+\.\d+\.\d+)\b/g, (match) => {
      const parts = match.split('.');
      // Vezmi první dvě části (před první tečkou a mezi tečkami)
      // Pokud je druhá část "00", použij jen první část s ".0"
      if (parts[1] === '00' || parts[1] === '0') {
        return parts[0] + '.0';
      }
      return parts[0] + '.' + parts[1];
    });

    // Oprav také formáty s více než dvěma tečkami: "6.04.0.5" -> "6.04"
    code = code.replace(/\b(-?\d+\.\d+\.\d+\.\d+)\b/g, (match) => {
      const parts = match.split('.');
      if (parts[1] === '00' || parts[1] === '0') {
        return parts[0] + '.0';
      }
      return parts[0] + '.' + parts[1];
    });
  }

  // Oprav dvojité tečky: "6..04" -> "6.04"
  code = code.replace(/(\d+)\.\.(\d+)/g, '$1.$2');

  // Oprav formáty s tečkou na konci: "10.0.", "1.0.", "2.0."
  code = code.replace(/\b(-?\d+\.\d+)\.(\s|;|,|\)|\[|\]|\+|-|\*|\/|%|&|\||\^|~|!|=|<|>|\?|:)/g, (match, num, after) => {
    return num + after;
  });
  // Oprav také formáty s tečkou na konci řádku nebo před mezerou
  code = code.replace(/\b(-?\d+\.\d+)\.(\s|$)/g, (match, num, after) => {
    return num + after;
  });

  // Oprav formáty jako "10.", "1." (ale ne "vec4(" nebo podobné)
  code = code.replace(/\b(-?\d+)\.(\s|;|,|\)|\[|\]|\+|-|\*|\/|%|&|\||\^|~|!|=|<|>|\?|:)/g, (match, num, after) => {
    // Má tečku na konci bez desetinné části - převeď na "10.0"
    return num + '.0' + after;
  });
  // Oprav také formáty s tečkou na konci řádku nebo před mezerou
  code = code.replace(/\b(-?\d+)\.(\s|$)/g, (match, num, after) => {
    return num + '.0' + after;
  });

  // Oprav tečky okolo čísla: ".6.04." -> "0.604"
  code = code.replace(/\.(\d+)\./g, '0.$1');

  return code;
};

/**
 * Přidá chybějící běžné proměnné a konstanty
 * @param {string} code - Shader kód
 * @returns {string} Kód s přidanými proměnnými
 */
const addMissingCommonVariables = (code) => {
  if (!code || typeof code !== 'string') {
    return code;
  }

  let fixedCode = code;
  const lines = fixedCode.split('\n');
  const mainIndex = lines.findIndex(line => line.includes('void main()'));

  if (mainIndex === -1) {
    return fixedCode;
  }

  // Přidej PI konstantu na začátek shaderu (po precision)
  if (fixedCode.includes('PI') && !fixedCode.match(/\bconst\s+float\s+PI\b/)) {
    const precisionIndex = fixedCode.indexOf('precision');
    if (precisionIndex !== -1) {
      const afterPrecision = fixedCode.indexOf('\n', precisionIndex);
      if (afterPrecision !== -1) {
        fixedCode = fixedCode.slice(0, afterPrecision + 1) +
                   'const float PI = 3.14159265359;\n' +
                   fixedCode.slice(afterPrecision + 1);

        // Přidej také GAIN konstantu, pokud je použita
        if (fixedCode.includes('GAIN') && !fixedCode.match(/\bconst\s+float\s+GAIN\b/)) {
          const piIndex = fixedCode.indexOf('const float PI');
          if (piIndex !== -1) {
            const afterPI = fixedCode.indexOf('\n', piIndex);
            if (afterPI !== -1) {
              fixedCode = fixedCode.slice(0, afterPI + 1) +
                         'const float GAIN = 1.0;\n' +
                         fixedCode.slice(afterPI + 1);
            }
          }
        }
      }
    }
  }

  // Přidej GAIN konstantu i když PI neexistuje
  if (fixedCode.includes('GAIN') && !fixedCode.match(/\bconst\s+float\s+GAIN\b/)) {
    const piIndex = fixedCode.indexOf('const float PI');
    if (piIndex !== -1) {
      // PI existuje, přidej GAIN po PI
      const afterPI = fixedCode.indexOf('\n', piIndex);
      if (afterPI !== -1) {
        fixedCode = fixedCode.slice(0, afterPI + 1) +
                   'const float GAIN = 1.0;\n' +
                   fixedCode.slice(afterPI + 1);
      }
    } else {
      // PI neexistuje, přidej GAIN po precision
      const precisionIndex = fixedCode.indexOf('precision');
      if (precisionIndex !== -1) {
        const afterPrecision = fixedCode.indexOf('\n', precisionIndex);
        if (afterPrecision !== -1) {
          fixedCode = fixedCode.slice(0, afterPrecision + 1) +
                     'const float GAIN = 1.0;\n' +
                     fixedCode.slice(afterPrecision + 1);
        }
      }
    }
  }

  // Aktualizuj lines po přidání PI/GAIN
  let updatedLines = fixedCode.split('\n');
  let updatedMainIndex = updatedLines.findIndex(line => line.includes('void main()'));

  if (updatedMainIndex !== -1) {
    // Přidej běžné proměnné na začátek main()
    let beforeMain = updatedLines.slice(0, updatedMainIndex).join('\n');
    const mainLine = updatedLines[updatedMainIndex];
    const indent = mainLine.match(/^(\s*)/)?.[1] || '';
    const declarations = [];

    // Běžné proměnné, které jsou často zakomentované
    // Některé proměnné (iters, minDst) se mohou používat před main() - ty musí být globální
    // Pro C.9 FFT Spiral.fs: dis, vol_min, vol_max jsou zakomentované, ale používají se
    // Výchozí hodnoty z ISF inputs: dis=0.06, vol_min=0.0, vol_max=0.8
    // Rozšířený seznam common variables pro různé shadery
    const commonVars = {
      // C.9 FFT Spiral.fs
      'dis': { type: 'float', value: '0.06', check: /\bdis\b/, global: false }, // Z ISF: DEFAULT 0.06
      'vol_min': { type: 'float', value: '0.0', check: /\bvol_min\b/, global: false }, // Z ISF: DEFAULT 0
      'vol_max': { type: 'float', value: '0.8', check: /\bvol_max\b/, global: false }, // Z ISF: DEFAULT 0.8
      'blur': { type: 'float', value: '0.08', check: /\bblur\b/, global: false }, // Z ISF: DEFAULT 0.08
      'width': { type: 'float', value: '0.02', check: /\bwidth\b/, global: false },
      'exp': { type: 'float', value: '1.0', check: /\bexp\b/, global: false }, // Z ISF: DEFAULT 1
      'saturation': { type: 'float', value: '1.0', check: /\bsaturation\b/, global: false }, // Z ISF: DEFAULT 1
      'scale': { type: 'float', value: '0.85', check: /\bscale\b/, global: false }, // Z ISF: DEFAULT 0.85
      'speed': { type: 'float', value: '0.5', check: /\bspeed\b/, global: false }, // Z ISF: DEFAULT 0.5
      'nturns': { type: 'float', value: '10.0', check: /\bnturns\b/, global: false },
      'A': { type: 'float', value: '220.0', check: /\bA\b/, global: true }, // Musical parameter
      'tet_root': { type: 'float', value: '1.05946309435929', check: /\btet_root\b/, global: true }, // 12th root of 2
      'iSampleRate': { type: 'float', value: '48000.0', check: /\biSampleRate\b/, global: true },
      'BRIGHTNESS': { type: 'float', value: '1.0', check: /\bBRIGHTNESS\b/, global: true },
      // S.1 Synthwave.fs a další
      'iters': { type: 'float', value: '10.0', check: /\biters\b/, global: true }, // Může být použito v funkcích před main()
      'minDst': { type: 'float', value: '0.1', check: /\bminDst\b/, global: true }, // Může být použito v funkcích před main()
      'flickerSpeed': { type: 'float', value: '1.0', check: /\bflickerSpeed\b/, global: false },
      'flickerFreq': { type: 'float', value: '1.0', check: /\bflickerFreq\b/, global: false },
      // D.2 Glitch Shifter.fs
      'glitch_size': { type: 'float', value: '0.1', check: /\bglitch_size\b/, global: false },
      'glitch_horizontal': { type: 'float', value: '0.2', check: /\bglitch_horizontal\b/, global: false },
      'glitch_vertical': { type: 'float', value: '0.0', check: /\bglitch_vertical\b/, global: false },
      'randomize_size': { type: 'bool', value: 'true', check: /\brandomize_size\b/, global: false },
      'randomize_zoom': { type: 'bool', value: 'false', check: /\brandomize_zoom\b/, global: false },
      'use_alt_image': { type: 'bool', value: 'false', check: /\buse_alt_image\b/, global: false },
      'offset': { type: 'vec2', value: 'vec2(0.0, 0.0)', check: /\boffset\b/, global: false },
      // D.3 VHS Glitch.fs
      'autoScan': { type: 'bool', value: 'true', check: /\bautoScan\b/, global: false },
      'xScanline': { type: 'float', value: '0.5', check: /\bxScanline\b/, global: false },
      'xScanline2': { type: 'float', value: '0.5', check: /\bxScanline2\b/, global: false },
      'yScanline': { type: 'float', value: '0.0', check: /\byScanline\b/, global: false },
      'xScanlineSize': { type: 'float', value: '0.5', check: /\bxScanlineSize\b/, global: false },
      'xScanlineSize2': { type: 'float', value: '0.25', check: /\bxScanlineSize2\b/, global: false },
      'yScanlineAmount': { type: 'float', value: '0.25', check: /\byScanlineAmount\b/, global: false },
      'grainLevel': { type: 'float', value: '0.0', check: /\bgrainLevel\b/, global: false },
      'scanFollow': { type: 'bool', value: 'true', check: /\bscanFollow\b/, global: false },
      'analogDistort': { type: 'float', value: '1.0', check: /\banalogDistort\b/, global: false },
      'bleedAmount': { type: 'float', value: '1.0', check: /\bbleedAmount\b/, global: false },
      'bleedDistort': { type: 'float', value: '0.5', check: /\bbleedDistort\b/, global: false },
      'bleedRange': { type: 'float', value: '1.0', check: /\bbleedRange\b/, global: false },
      // M.2 Circles.fs
      'maxPolyphony': { type: 'float', value: '4.0', check: /\bmaxPolyphony\b/, global: false },
      'circleSharpness': { type: 'float', value: '0.8', check: /\bcircleSharpness\b/, global: false },
      'margin': { type: 'float', value: '0.2', check: /\bmargin\b/, global: false },
      'radius': { type: 'float', value: '1.0', check: /\bradius\b/, global: false }
    };

    for (const [varName, varDef] of Object.entries(commonVars)) {
      // Zkontroluj, zda je proměnná použita v nezakomentovaném kódu
      // Najdi všechna použití proměnné
      const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
      const allMatches = fixedCode.match(usageRegex);
      if (allMatches && allMatches.length > 0) {
        // Zkontroluj, zda je alespoň jedno použití v nezakomentovaném kódu
        const lines = fixedCode.split('\n');
        let isUsed = false;

        // Vytvoř mapu komentářů - zjisti, které části kódu jsou zakomentované
        const isCommented = (lineIndex, charIndex) => {
          let inBlockComment = false;

          for (let i = 0; i <= lineIndex; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Zkontroluj blokové komentáře
            let blockStart = -1;
            let blockEnd = -1;
            while ((blockStart = line.indexOf('/*', blockEnd + 1)) !== -1) {
              blockEnd = line.indexOf('*/', blockStart);
              if (blockEnd === -1) {
                // Komentář pokračuje na další řádek
                if (i === lineIndex && charIndex >= blockStart) {
                  return true;
                }
                inBlockComment = true;
                break;
              } else {
                // Komentář je na stejném řádku
                if (i === lineIndex && charIndex >= blockStart && charIndex <= blockEnd + 1) {
                  return true;
                }
              }
            }

            // Zkontroluj, zda jsme stále v blokovém komentáři
            if (blockEnd === -1 && inBlockComment) {
              if (i < lineIndex) {
                // Jsme v blokovém komentáři
                if (line.includes('*/')) {
                  inBlockComment = false;
                } else {
                  return true;
                }
              } else if (i === lineIndex) {
                // Jsme na aktuálním řádku a stále v blokovém komentáři
                if (line.includes('*/')) {
                  const endIndex = line.indexOf('*/');
                  if (charIndex <= endIndex + 1) {
                    return true;
                  }
                  inBlockComment = false;
                } else {
                  return true;
                }
              }
            }

            // Zkontroluj řádkové komentáře
            if (i === lineIndex) {
              const lineCommentIndex = line.indexOf('//');
              if (lineCommentIndex !== -1 && charIndex >= lineCommentIndex) {
                // Zkontroluj, zda není v řetězci
                const beforeComment = line.substring(0, lineCommentIndex);
                const stringCount = (beforeComment.match(/"/g) || []).length;
                if (stringCount % 2 === 0) {
                  return true;
                }
              }
            }

            // Zkontroluj, zda řádek začíná komentářem
            if (i === lineIndex && (trimmedLine.startsWith('//') || trimmedLine.startsWith('*'))) {
              return true;
            }
          }

          return false;
        };

        // Najdi všechna použití proměnné a zkontroluj, zda jsou v nezakomentovaném kódu
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          // Přeskoč řádky, které jsou celé zakomentované
          if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
            continue;
          }

          // Najdi všechna použití proměnné na tomto řádku
          // Vylepšený regex - zohledňuje různé formáty použití (v funkcích, podmínkách, loopech)
          let match;
          // Použij word boundary, ale zohledni i použití v různých kontextech
          const regex = new RegExp(`\\b${varName}\\b`, 'g');
          while ((match = regex.exec(line)) !== null) {
            const charIndex = match.index;

            // Zkontroluj, zda není v komentáři
            if (!isCommented(i, charIndex)) {
              // Zkontroluj, zda to není deklarace (může být zakomentovaná)
              const beforeMatch = line.substring(0, charIndex);
              const afterMatch = line.substring(charIndex);

              // Vylepšená detekce deklarace - zohledňuje různé formáty
              const isDeclaration =
                // Standardní deklarace: float varName = ...
                beforeMatch.match(new RegExp(`\\b(${varDef.type}|const\\s+${varDef.type}|vec[234]|int|bool)\\s+$`)) ||
                // Deklarace s přiřazením: varName = ...
                afterMatch.match(new RegExp(`^${varName}\\s*[=;]`)) ||
                // Deklarace v parametru funkce: func(float varName)
                beforeMatch.match(new RegExp(`\\(\\s*(${varDef.type}|const\\s+${varDef.type})\\s+$`)) ||
                // Deklarace v for loop: for(int varName = ...
                beforeMatch.match(new RegExp(`for\\s*\\(\\s*(int|float)\\s+$`));

              if (!isDeclaration) {
                // Zkontroluj kontext použití pro lepší detekci typu
                const context = line.substring(Math.max(0, charIndex - 20), Math.min(line.length, charIndex + 20));

                // Detekuj použití v různých kontextech:
                // - V podmínkách: if(varName), if(varName > ...)
                // - V loopech: for(...; varName; ...)
                // - V funkcích: func(varName)
                // - V aritmetických operacích: varName + ..., ... + varName
                // - S swizzle: varName.xy, varName.rgb
                const varNameRegex = new RegExp(`\\b${varName}\\b`);
                const isInCondition = context.match(new RegExp(`(if|while|for)\\s*\\([^)]*${varNameRegex.source}`));
                const isInFunction = context.match(new RegExp(`\\w+\\s*\\(\\s*${varNameRegex.source}`));
                const isInArithmetic = context.match(new RegExp(`${varNameRegex.source}\\s*[+\\-*/]`)) ||
                                       context.match(new RegExp(`[+\\-*/]\\s*${varNameRegex.source}`));
                const isWithSwizzle = afterMatch.match(new RegExp(`^${varName}\\s*\\.([xyzwrgba]|rgb|rgba|xy|xyz|xyzw)`));

                // Pokud je použito v některém z těchto kontextů, je to skutečné použití
                if (isInCondition || isInFunction || isInArithmetic || isWithSwizzle ||
                    !context.match(/^\s*(float|vec|int|bool|const)\s+/)) {
                  isUsed = true;
                  break;
                }
              }
            }
          }

          if (isUsed) {
            break;
          }
        }

        // Zkontroluj, zda není deklarována (ani jako const, ani jako float/vec)
        // Musíme zkontrolovat i v aktuálním fixedCode, protože se může měnit během cyklu
        const isDeclared = beforeMain.match(new RegExp(`\\b(${varDef.type}|const\\s+${varDef.type})\\s+${varName}\\b`)) ||
                           fixedCode.match(new RegExp(`\\bconst\\s+${varDef.type}\\s+${varName}\\b`)) ||
                           fixedCode.match(new RegExp(`\\b${varDef.type}\\s+${varName}\\s*[=;]`)) ||
                           fixedCode.match(new RegExp(`\\bconst\\s+${varName}\\s*=`));
        if (isUsed && !isDeclared) {
          // Zkontroluj, zda se proměnná používá před main() (v jiných funkcích)
          const usedBeforeMain = beforeMain.match(new RegExp(`\\b${varName}\\b`));

          if (varDef.global || usedBeforeMain) {
            // Přidej jako globální proměnnou (před main())
            // Najdi vhodné místo - po precision, PI, GAIN, ale před funkcemi
            let insertIndex = -1;
            const precisionIndex = beforeMain.indexOf('precision');
            if (precisionIndex !== -1) {
              // Najdi konec precision řádku
              let afterPrecision = beforeMain.indexOf('\n', precisionIndex);
              if (afterPrecision === -1) afterPrecision = beforeMain.length;

              // Najdi konec PI/GAIN konstant
              const piIndex = beforeMain.indexOf('const float PI');
              const gainIndex = beforeMain.indexOf('const float GAIN');
              let afterConstants = afterPrecision;
              if (piIndex !== -1) {
                const afterPI = beforeMain.indexOf('\n', piIndex);
                if (afterPI !== -1 && afterPI > afterConstants) {
                  afterConstants = afterPI;
                }
              }
              if (gainIndex !== -1) {
                const afterGain = beforeMain.indexOf('\n', gainIndex);
                if (afterGain !== -1 && afterGain > afterConstants) {
                  afterConstants = afterGain;
                }
              }

              // Najdi první funkci nebo main()
              const firstFunction = beforeMain.search(/\b(void|float|vec|int|bool|mat)\s+\w+\s*\(/);
              if (firstFunction !== -1 && firstFunction > afterConstants) {
                insertIndex = firstFunction;
              } else {
                insertIndex = afterConstants;
              }
            }

            if (insertIndex !== -1) {
              // Zkontroluj, zda už není deklarována na tomto místě
              const checkBeforeInsert = beforeMain.slice(0, insertIndex);
              const alreadyDeclared = checkBeforeInsert.match(new RegExp(`\\b(${varDef.type}|const\\s+${varDef.type})\\s+${varName}\\b`)) ||
                                     checkBeforeInsert.match(new RegExp(`\\bconst\\s+${varName}\\s*=`));

              if (!alreadyDeclared) {
                // Automatická detekce typu proměnné podle kontextu použití
                let detectedType = varDef.type;
                let detectedValue = varDef.value;

                // Analyzuj kontext použití pro automatickou detekci typu
                const usageContext = fixedCode.substring(
                  Math.max(0, fixedCode.indexOf(varName) - 100),
                  Math.min(fixedCode.length, fixedCode.indexOf(varName) + 100)
                );

                // Detekuj typ podle použití
                if (usageContext.match(new RegExp(`\\b${varName}\\s*\\.\\s*(xy|rg)`)) ||
                    usageContext.match(new RegExp(`vec2\\s*\\([^)]*\\b${varName}\\b`)) ||
                    usageContext.match(new RegExp(`\\b${varName}\\s*\\+\\s*vec2`)) ||
                    usageContext.match(new RegExp(`vec2\\s*\\+\\s*\\b${varName}\\b`))) {
                  detectedType = 'vec2';
                  detectedValue = 'vec2(0.0)';
                } else if (usageContext.match(new RegExp(`\\b${varName}\\s*\\.\\s*(xyz|rgb)`)) ||
                           usageContext.match(new RegExp(`vec3\\s*\\([^)]*\\b${varName}\\b`))) {
                  detectedType = 'vec3';
                  detectedValue = 'vec3(0.0)';
                } else if (usageContext.match(new RegExp(`\\b${varName}\\s*\\.\\s*(xyzw|rgba)`)) ||
                           usageContext.match(new RegExp(`vec4\\s*\\([^)]*\\b${varName}\\b`))) {
                  detectedType = 'vec4';
                  detectedValue = 'vec4(0.0)';
                } else if (usageContext.match(new RegExp(`\\b${varName}\\s*[<>]`)) ||
                           usageContext.match(new RegExp(`\\b${varName}\\s*==`)) ||
                           usageContext.match(new RegExp(`\\b${varName}\\s*!=`)) ||
                           usageContext.match(new RegExp(`if\\s*\\([^)]*\\b${varName}\\b`)) ||
                           usageContext.match(new RegExp(`while\\s*\\([^)]*\\b${varName}\\b`))) {
                  // Použití v boolean kontextu - může být bool nebo float
                  if (!usageContext.match(new RegExp(`bool\\s+${varName}`))) {
                    detectedType = 'float';
                    detectedValue = '0.0';
                  } else {
                    detectedType = 'bool';
                    detectedValue = 'false';
                  }
                } else if (usageContext.match(new RegExp(`for\\s*\\([^)]*\\b${varName}\\b`)) ||
                           usageContext.match(new RegExp(`int\\s+${varName}`))) {
                  detectedType = 'int';
                  detectedValue = '0';
                }

                // Použij detekovaný typ, pokud není explicitně definován v varDef
                const finalType = varDef.type !== 'float' ? varDef.type : detectedType;
                const finalValue = varDef.value !== '0.0' ? varDef.value : detectedValue;

                // Vlož globální proměnnou s detekovaným typem
                const beforeInsert = beforeMain.slice(0, insertIndex);
                const afterInsert = beforeMain.slice(insertIndex);
                const globalDecl = `${finalType} ${varName} = ${finalValue};\n`;
                const newBeforeMain = beforeInsert + globalDecl + afterInsert;
                // Aktualizuj fixedCode
                fixedCode = newBeforeMain + '\n' + updatedLines.slice(updatedMainIndex).join('\n');
                // Aktualizuj updatedLines a beforeMain
                updatedLines = fixedCode.split('\n');
                const newUpdatedMainIndex = updatedLines.findIndex(line => line.includes('void main()'));
                if (newUpdatedMainIndex !== -1) {
                  updatedMainIndex = newUpdatedMainIndex;
                  beforeMain = updatedLines.slice(0, updatedMainIndex).join('\n');
                }
              }
            } else {
              // Pokud se nepodařilo najít vhodné místo, přidej do main()
              // Automatická detekce typu
              let detectedType = varDef.type;
              let detectedValue = varDef.value;
              const usageContext = fixedCode.substring(
                Math.max(0, fixedCode.indexOf(varName) - 100),
                Math.min(fixedCode.length, fixedCode.indexOf(varName) + 100)
              );
              if (usageContext.match(new RegExp(`\\b${varName}\\s*\\.\\s*(xy|rg)`)) ||
                  usageContext.match(new RegExp(`vec2\\s*\\([^)]*\\b${varName}\\b`))) {
                detectedType = 'vec2';
                detectedValue = 'vec2(0.0)';
              } else if (usageContext.match(new RegExp(`\\b${varName}\\s*\\.\\s*(xyz|rgb)`)) ||
                         usageContext.match(new RegExp(`vec3\\s*\\([^)]*\\b${varName}\\b`))) {
                detectedType = 'vec3';
                detectedValue = 'vec3(0.0)';
              } else if (usageContext.match(new RegExp(`\\b${varName}\\s*\\.\\s*(xyzw|rgba)`)) ||
                         usageContext.match(new RegExp(`vec4\\s*\\([^)]*\\b${varName}\\b`))) {
                detectedType = 'vec4';
                detectedValue = 'vec4(0.0)';
              }
              const finalType = varDef.type !== 'float' ? varDef.type : detectedType;
              const finalValue = varDef.value !== '0.0' ? varDef.value : detectedValue;
              declarations.push(`${indent}  ${finalType} ${varName} = ${finalValue};`);
            }
          } else {
            // Přidej do main()
            // Automatická detekce typu
            let detectedType = varDef.type;
            let detectedValue = varDef.value;
            const usageContext = fixedCode.substring(
              Math.max(0, fixedCode.indexOf(varName) - 100),
              Math.min(fixedCode.length, fixedCode.indexOf(varName) + 100)
            );
            if (usageContext.match(new RegExp(`\\b${varName}\\s*\\.\\s*(xy|rg)`)) ||
                usageContext.match(new RegExp(`vec2\\s*\\([^)]*\\b${varName}\\b`))) {
              detectedType = 'vec2';
              detectedValue = 'vec2(0.0)';
            } else if (usageContext.match(new RegExp(`\\b${varName}\\s*\\.\\s*(xyz|rgb)`)) ||
                       usageContext.match(new RegExp(`vec3\\s*\\([^)]*\\b${varName}\\b`))) {
              detectedType = 'vec3';
              detectedValue = 'vec3(0.0)';
            } else if (usageContext.match(new RegExp(`\\b${varName}\\s*\\.\\s*(xyzw|rgba)`)) ||
                       usageContext.match(new RegExp(`vec4\\s*\\([^)]*\\b${varName}\\b`))) {
              detectedType = 'vec4';
              detectedValue = 'vec4(0.0)';
            }
            const finalType = varDef.type !== 'float' ? varDef.type : detectedType;
            const finalValue = varDef.value !== '0.0' ? varDef.value : detectedValue;
            declarations.push(`${indent}  ${finalType} ${varName} = ${finalValue};`);
          }
        }
      }
    }

    if (declarations.length > 0) {
      updatedLines.splice(updatedMainIndex + 1, 0, ...declarations);
      fixedCode = updatedLines.join('\n');
    }
  } else if (mainIndex !== -1) {
    // Pokud PI už existuje, jen přidej běžné proměnné
    const beforeMain = lines.slice(0, mainIndex).join('\n');
    const mainLine = lines[mainIndex];
    const indent = mainLine.match(/^(\s*)/)?.[1] || '';
    const declarations = [];

    // Pro C.9 FFT Spiral.fs: dis, vol_min, vol_max jsou zakomentované, ale používají se
    // Výchozí hodnoty z ISF inputs: dis=0.06, vol_min=0.0, vol_max=0.8
    // Rozšířený seznam common variables pro různé shadery (stejný jako výše)
    const commonVars = {
      // C.9 FFT Spiral.fs
      'dis': { type: 'float', value: '0.06', check: /\bdis\b/, global: false }, // Z ISF: DEFAULT 0.06
      'vol_min': { type: 'float', value: '0.0', check: /\bvol_min\b/, global: false }, // Z ISF: DEFAULT 0
      'vol_max': { type: 'float', value: '0.8', check: /\bvol_max\b/, global: false }, // Z ISF: DEFAULT 0.8
      'blur': { type: 'float', value: '0.08', check: /\bblur\b/, global: false }, // Z ISF: DEFAULT 0.08
      'width': { type: 'float', value: '0.02', check: /\bwidth\b/, global: false },
      'exp': { type: 'float', value: '1.0', check: /\bexp\b/, global: false }, // Z ISF: DEFAULT 1
      'saturation': { type: 'float', value: '1.0', check: /\bsaturation\b/, global: false }, // Z ISF: DEFAULT 1
      'scale': { type: 'float', value: '0.85', check: /\bscale\b/, global: false }, // Z ISF: DEFAULT 0.85
      'speed': { type: 'float', value: '0.5', check: /\bspeed\b/, global: false }, // Z ISF: DEFAULT 0.5
      'nturns': { type: 'float', value: '10.0', check: /\bnturns\b/, global: false },
      'A': { type: 'float', value: '220.0', check: /\bA\b/, global: true }, // Musical parameter
      'tet_root': { type: 'float', value: '1.05946309435929', check: /\btet_root\b/, global: true }, // 12th root of 2
      'iSampleRate': { type: 'float', value: '48000.0', check: /\biSampleRate\b/, global: true },
      'BRIGHTNESS': { type: 'float', value: '1.0', check: /\bBRIGHTNESS\b/, global: true },
      // S.1 Synthwave.fs a další
      'iters': { type: 'float', value: '10.0', check: /\biters\b/, global: true }, // Může být použito v funkcích před main()
      'minDst': { type: 'float', value: '0.1', check: /\bminDst\b/, global: true }, // Může být použito v funkcích před main()
      'flickerSpeed': { type: 'float', value: '1.0', check: /\bflickerSpeed\b/, global: false },
      'flickerFreq': { type: 'float', value: '1.0', check: /\bflickerFreq\b/, global: false },
      // D.2 Glitch Shifter.fs
      'glitch_size': { type: 'float', value: '0.1', check: /\bglitch_size\b/, global: false },
      'glitch_horizontal': { type: 'float', value: '0.2', check: /\bglitch_horizontal\b/, global: false },
      'glitch_vertical': { type: 'float', value: '0.0', check: /\bglitch_vertical\b/, global: false },
      'randomize_size': { type: 'bool', value: 'true', check: /\brandomize_size\b/, global: false },
      'randomize_zoom': { type: 'bool', value: 'false', check: /\brandomize_zoom\b/, global: false },
      'use_alt_image': { type: 'bool', value: 'false', check: /\buse_alt_image\b/, global: false },
      'offset': { type: 'vec2', value: 'vec2(0.0, 0.0)', check: /\boffset\b/, global: false },
      // D.3 VHS Glitch.fs
      'autoScan': { type: 'bool', value: 'true', check: /\bautoScan\b/, global: false },
      'xScanline': { type: 'float', value: '0.5', check: /\bxScanline\b/, global: false },
      'xScanline2': { type: 'float', value: '0.5', check: /\bxScanline2\b/, global: false },
      'yScanline': { type: 'float', value: '0.0', check: /\byScanline\b/, global: false },
      'xScanlineSize': { type: 'float', value: '0.5', check: /\bxScanlineSize\b/, global: false },
      'xScanlineSize2': { type: 'float', value: '0.25', check: /\bxScanlineSize2\b/, global: false },
      'yScanlineAmount': { type: 'float', value: '0.25', check: /\byScanlineAmount\b/, global: false },
      'grainLevel': { type: 'float', value: '0.0', check: /\bgrainLevel\b/, global: false },
      'scanFollow': { type: 'bool', value: 'true', check: /\bscanFollow\b/, global: false },
      'analogDistort': { type: 'float', value: '1.0', check: /\banalogDistort\b/, global: false },
      'bleedAmount': { type: 'float', value: '1.0', check: /\bbleedAmount\b/, global: false },
      'bleedDistort': { type: 'float', value: '0.5', check: /\bbleedDistort\b/, global: false },
      'bleedRange': { type: 'float', value: '1.0', check: /\bbleedRange\b/, global: false },
      // M.2 Circles.fs
      'maxPolyphony': { type: 'float', value: '4.0', check: /\bmaxPolyphony\b/, global: false },
      'circleSharpness': { type: 'float', value: '0.8', check: /\bcircleSharpness\b/, global: false },
      'margin': { type: 'float', value: '0.2', check: /\bmargin\b/, global: false },
      'radius': { type: 'float', value: '1.0', check: /\bradius\b/, global: false }
    };

    for (const [varName, varDef] of Object.entries(commonVars)) {
      // Zkontroluj, zda je proměnná použita v nezakomentovaném kódu
      const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
      const allMatches = fixedCode.match(usageRegex);
      if (allMatches && allMatches.length > 0) {
        // Zkontroluj, zda je alespoň jedno použití v nezakomentovaném kódu
        const lines = fixedCode.split('\n');
        let isUsed = false;
        let isInComment = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          // Zkontroluj, zda jsme v blokovém komentáři
          if (line.includes('/*')) {
            isInComment = true;
          }
          if (line.includes('*/')) {
            isInComment = false;
          }

          // Zkontroluj, zda řádek obsahuje proměnnou a není zakomentovaný
          if (line.match(usageRegex) && !isInComment &&
              !trimmedLine.startsWith('//') &&
              !trimmedLine.startsWith('*')) {
            // Zkontroluj, zda to není deklarace (může být zakomentovaná)
            if (!line.match(new RegExp(`\\b(${varDef.type}|const\\s+${varDef.type})\\s+${varName}\\b`))) {
              isUsed = true;
              break;
            }
          }
        }

        // Zkontroluj, zda není deklarována (ani jako const, ani jako float/vec)
        const isDeclared = beforeMain.match(new RegExp(`\\b(${varDef.type}|const\\s+${varDef.type})\\s+${varName}\\b`)) ||
                           fixedCode.match(new RegExp(`\\bconst\\s+${varDef.type}\\s+${varName}\\b`)) ||
                           fixedCode.match(new RegExp(`\\b${varDef.type}\\s+${varName}\\s*[=;]`));
        if (isUsed && !isDeclared) {
          // Zkontroluj, zda se proměnná používá před main() (v jiných funkcích)
          const usedBeforeMain = beforeMain.match(new RegExp(`\\b${varName}\\b`));

          if (varDef.global || usedBeforeMain) {
            // Přidej jako globální proměnnou (před main())
            // Najdi vhodné místo - po precision, PI, GAIN, ale před funkcemi
            let insertIndex = -1;
            const precisionIndex = beforeMain.indexOf('precision');
            if (precisionIndex !== -1) {
              // Najdi konec precision řádku
              let afterPrecision = beforeMain.indexOf('\n', precisionIndex);
              if (afterPrecision === -1) afterPrecision = beforeMain.length;

              // Najdi konec PI/GAIN konstant
              const piIndex = beforeMain.indexOf('const float PI');
              const gainIndex = beforeMain.indexOf('const float GAIN');
              let afterConstants = afterPrecision;
              if (piIndex !== -1) {
                const afterPI = beforeMain.indexOf('\n', piIndex);
                if (afterPI !== -1 && afterPI > afterConstants) {
                  afterConstants = afterPI;
                }
              }
              if (gainIndex !== -1) {
                const afterGain = beforeMain.indexOf('\n', gainIndex);
                if (afterGain !== -1 && afterGain > afterConstants) {
                  afterConstants = afterGain;
                }
              }

              // Najdi první funkci nebo main()
              const firstFunction = beforeMain.search(/\b(void|float|vec|int|bool|mat)\s+\w+\s*\(/);
              if (firstFunction !== -1 && firstFunction > afterConstants) {
                insertIndex = firstFunction;
              } else {
                insertIndex = afterConstants;
              }
            }

            if (insertIndex !== -1) {
              // Vlož globální proměnnou
              const beforeInsert = beforeMain.slice(0, insertIndex);
              const afterInsert = beforeMain.slice(insertIndex);
              const globalDecl = `${varDef.type} ${varName} = ${varDef.value};\n`;
              const newBeforeMain = beforeInsert + globalDecl + afterInsert;
              // Aktualizuj fixedCode
              fixedCode = newBeforeMain + '\n' + lines.slice(mainIndex).join('\n');
              // Aktualizuj lines a beforeMain
              lines = fixedCode.split('\n');
              const newMainIndex = lines.findIndex(line => line.includes('void main()'));
              if (newMainIndex !== -1) {
                mainIndex = newMainIndex;
                beforeMain = lines.slice(0, mainIndex).join('\n');
              }
            } else {
              // Pokud se nepodařilo najít vhodné místo, přidej do main()
              declarations.push(`${indent}  ${varDef.type} ${varName} = ${varDef.value};`);
            }
          } else {
            // Přidej do main()
            declarations.push(`${indent}  ${varDef.type} ${varName} = ${varDef.value};`);
          }
        }
      }
    }

    if (declarations.length > 0) {
      lines.splice(mainIndex + 1, 0, ...declarations);
      fixedCode = lines.join('\n');
    }
  }

  return fixedCode;
};

/**
 * Sanitizuje syntax chyby v shader kódu
 * Opravuje nevyvážené závorky, chybějící operátory, atd.
 * @param {string} code - Shader kód
 * @returns {string} Sanitizovaný kód
 */
export const sanitizeSyntaxErrors = (code) => {
  if (!code || typeof code !== 'string') {
    return code;
  }

  let fixedCode = code;

  // Oprava 1: vec4(0.5) / FREQ_RANGE, 0.25),1.0)) -> vec4(0.5 / FREQ_RANGE, 0.25, 1.0, 1.0)
  fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\s*\/\s*(\w+)\s*,\s*(\d+\.?\d*)\)\s*,\s*(\d+\.?\d*)\)\)/g,
    (match, first, varName, second, third) => {
      return `vec4(${first} / ${varName}, ${second}, ${third}, 1.0)`;
    }
  );

  // Oprava 2: vec4(0.0)vec4(0.5)) -> vec4(0.0) + vec4(0.5)
  fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\s*vec\d+\s*\(([^)]+)\)\)/g,
    (match, first, second) => {
      return `vec4(${first}) + vec4(${second})`;
    }
  );

  // Oprava 3a: vec4(0.5),1.0)) -> vec4(0.5, 1.0, 1.0, 1.0)
  fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\s*,\s*(\d+\.?\d*)\)\)/g,
    (match, first, second) => {
      return `vec4(${first}, ${second}, 1.0, 1.0)`;
    }
  );

  // Oprava 3b: vec4(0.5)) -> vec4(0.5, 0.5, 0.5, 0.5) (ale pouze pokud není následováno operátorem nebo swizzle)
  fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\)(?!\s*[\.\w\+\-\*\/])/g,
    (match, first) => {
      // Pokud je to jediné číslo, použij ho pro všechny komponenty
      if (first.match(/^-?\d+\.?\d*$/)) {
        return `vec4(${first}, ${first}, ${first}, ${first})`;
      }
      // Jinak vrať původní (možná je to správně)
      return match;
    }
  );

  // Oprava 4: vec4(0.5) + .5, ...) -> vec4(0.5 + 0.5, ...)
  fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\s*\+\s*\.(\d+)\s*,\s*/g,
    (match, first, second) => {
      return `vec4(${first} + 0.${second}, `;
    }
  );

  // Oprava 5: vec4(0.5)).r -> vec4(0.5, 0.5, 0.5, 0.5).r
  fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\)\s*\.([rgba]|x|y|z|w|r|g|b|a)/g,
    (match, first, swizzle) => {
      if (first.match(/^-?\d+\.?\d*$/)) {
        return `vec4(${first}, ${first}, ${first}, ${first}).${swizzle}`;
      }
      return match;
    }
  );

  // Oprava 6: vec4(0.5)).rgb -> vec4(0.5, 0.5, 0.5, 0.5).rgb
  fixedCode = fixedCode.replace(/vec\d+\s*\(([^)]+)\)\)\s*\.(rgb|rgba|xy|xyz|xyzw)/g,
    (match, first, swizzle) => {
      if (first.match(/^-?\d+\.?\d*$/)) {
        return `vec4(${first}, ${first}, ${first}, ${first}).${swizzle}`;
      }
      return match;
    }
  );

  // Oprava 7: const float offset = 0,0; -> const float offset = 0.0;
  fixedCode = fixedCode.replace(/const\s+float\s+(\w+)\s*=\s*(\d+),(\d+);/g,
    (match, name, first, second) => {
      return `const float ${name} = ${first}.${second};`;
    }
  );

  // Oprava 8: vec4(0.5)) -> vec4(0.5, 0.5, 0.5, 0.5) (vylepšená verze opravy 3b)
  // Musíme opravit i případy, kde je následováno operátorem (např. vec4(0.5)) + ...)
  // Nejdřív opravíme případy s operátorem
  fixedCode = fixedCode.replace(/vec4\s*\(([^)]+)\)\)\s*([\+\-\*\/])/g,
    (match, first, op) => {
      if (first.match(/^-?\d+\.?\d*$/)) {
        return `vec4(${first}, ${first}, ${first}, ${first}) ${op}`;
      }
      return match;
    }
  );
  // Oprava 8b: vec4(0.5)) bez operátoru (ale před swizzle nebo dalšími výrazy)
  fixedCode = fixedCode.replace(/vec4\s*\(([^)]+)\)\)(?!\s*[\.\w\+\-\*\/])/g,
    (match, first) => {
      if (first.match(/^-?\d+\.?\d*$/)) {
        return `vec4(${first}, ${first}, ${first}, ${first})`;
      }
      return match;
    }
  );

  // Oprava 9: vec4(0.5 + 0.5, float(channel) + .5)) -> vec4(0.5 + 0.5, float(channel) + 0.5, 0.5, 0.5)
  // Musíme zachytit i případy s mezerami: vec4(0.5 + 0.5, float(channel) + .5))
  // Problém: ([^)]+) nezachytí správně float(channel), protože obsahuje závorky
  // Použijeme lepší regex, který počítá závorky
  fixedCode = fixedCode.replace(/vec4\s*\(([^,]+),\s*([^)]*(?:\([^)]*\)[^)]*)*)\s*\+\s*\.(\d+)\)\)/g,
    (match, first, second, third) => {
      // Zkontroluj, zda už není opraveno
      if (!match.includes(', 0.5, 0.5)')) {
        return `vec4(${first}, ${second} + 0.${third}, 0.5, 0.5)`;
      }
      return match;
    }
  );

  // Oprava 9b: Alternativní regex pro případy, kde první regex nefunguje
  // Použijeme jednodušší přístup - najdeme pattern a opravíme ho
  fixedCode = fixedCode.replace(/vec4\s*\(([^,]+),\s*([^)]+)\s*\+\s*\.(\d+)\)\)/g,
    (match, first, second, third) => {
      // Zkontroluj, zda už není opraveno
      if (!match.includes(', 0.5, 0.5)')) {
        // Pokud second obsahuje "float(", musíme zachytit celý výraz správně
        if (second.includes('float(')) {
          // Najdi konec float() výrazu
          const floatMatch = second.match(/float\([^)]+\)/);
          if (floatMatch) {
            const floatExpr = floatMatch[0];
            const rest = second.substring(floatMatch.index + floatMatch[0].length);
            // Pokud je rest prázdný nebo obsahuje jen mezery a +, použij ho
            if (rest.trim().match(/^\s*\+/)) {
              return `vec4(${first}, ${floatExpr} + 0.${third}, 0.5, 0.5)`;
            }
          }
        }
        return `vec4(${first}, ${second} + 0.${third}, 0.5, 0.5)`;
      }
      return match;
    }
  );

  // Oprava 10: vec4(float(v + 1 + 0.5, .5); -> vec2(float(v + 1) + 0.5, 0.5)
  fixedCode = fixedCode.replace(/vec4\s*\(float\s*\(([^)]+)\s*\+\s*(\d+)\s*\+\s*([^,]+),\s*\.(\d+)\);/g,
    (match, expr, num1, num2, num3) => {
      return `vec2(float(${expr} + ${num1}) + ${num2}, 0.${num3});`;
    }
  );

  // Oprava 16: vec3 rgb = vec4(...) + vec4(...).rgb; -> vec3 rgb = (vec4(...) + vec4(...)).rgb;
  // Oprav type mismatch - vec4 + vec3 není validní, musí být (vec4 + vec4).rgb
  fixedCode = fixedCode.replace(/(vec3\s+\w+\s*=\s*)(vec4\([^)]+\))\s*\+\s*(vec4\([^)]+\))\s*\.(rgb|rgba|xy|xyz|xyzw)\s*;/g,
    (match, prefix, first, second, swizzle) => {
      return `${prefix}(${first} + ${second}).${swizzle};`;
    }
  );

  // Oprava 17: mod(int(currentNote) / 12.0, 1.0) -> mod(float(currentNote) / 12.0, 1.0)
  // Oprav type mismatch - mod očekává float, ne int
  fixedCode = fixedCode.replace(/mod\s*\(\s*int\s*\(([^)]+)\)\s*\/\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*\)/g,
    (match, varName, divisor, modulo) => {
      return `mod(float(${varName}) / ${divisor}, ${modulo})`;
    }
  );

  // Oprava 18: bleed += vec4(...).r; (opakováno 4x) -> bleed += vec4(...).r * 4.0;
  // Oprav missing token - možná chybí násobení
  // Zlepšený regex pro různé formáty
  fixedCode = fixedCode.replace(/(\w+)\s*\+=\s*vec4\(([^)]+)\)\s*\.r\s*;\s*\n\s*\1\s*\+=\s*vec4\(([^)]+)\)\s*\.r\s*;\s*\n\s*\1\s*\+=\s*vec4\(([^)]+)\)\s*\.r\s*;\s*\n\s*\1\s*\+=\s*vec4\(([^)]+)\)\s*\.r\s*;/g,
    (match, varName, first, second, third, fourth) => {
      // Zkontroluj, zda jsou všechny stejné
      if (first === second && second === third && third === fourth) {
        return `${varName} += vec4(${first}).r * 4.0;`;
      }
      return match;
    }
  );

  // Alternativní regex pro jednodušší formát (bez mezery před +=)
  fixedCode = fixedCode.replace(/(\w+)\s*\+=\s*vec4\(([^)]+)\)\s*\.r\s*;\s*(\1\s*\+=\s*vec4\([^)]+\)\s*\.r\s*;\s*){3}/g,
    (match, varName, first) => {
      // Zkontroluj, zda jsou všechny stejné
      const matches = match.match(/vec4\(([^)]+)\)/g);
      if (matches && matches.length === 4) {
        const allSame = matches.every(m => m === matches[0]);
        if (allSame) {
          return `${varName} += vec4(${first}).r * 4.0;`;
        }
      }
      return match;
    }
  );

  // Oprava 11: Odstranit výrazy bez přiřazení vec4(...).r;
  fixedCode = fixedCode.replace(/^\s*vec\d+\s*\([^)]+\)\s*\.([rgba]|x|y|z|w|rgb|rgba|xy|xyz|xyzw)\s*;\s*$/gm,
    (match) => {
      // Odstranit tento řádek (je to pravděpodobně debug kód)
      return '';
    }
  );

  // Oprava 12: sample -> sampleTex (pokud je deklarováno jako sampleTex)
  if (fixedCode.includes('vec3 sampleTex') || fixedCode.includes('vec2 sampleTex') || fixedCode.includes('vec4 sampleTex')) {
    // Přejmenuj všechny použití sample na sampleTex (ale pouze pokud není deklarováno jako sample)
    fixedCode = fixedCode.replace(/\bsample\s*\*/g, 'sampleTex *');
    fixedCode = fixedCode.replace(/\bsample\s*\+/g, 'sampleTex +');
    fixedCode = fixedCode.replace(/\bsample\s*\-/g, 'sampleTex -');
    fixedCode = fixedCode.replace(/\bsample\s*\//g, 'sampleTex /');
    fixedCode = fixedCode.replace(/\bsample\s*;/g, 'sampleTex;');
    fixedCode = fixedCode.replace(/\bsample\s*\)/g, 'sampleTex)');
  }

  // Oprava 13: int samples = 32.0; -> int samples = 32;
  fixedCode = fixedCode.replace(/int\s+(\w+)\s*=\s*(\d+)\.0\s*;/g,
    (match, name, value) => {
      return `int ${name} = ${value};`;
    }
  );

  // Oprava 14: for(int i = 1.0; -> for(int i = 1;
  fixedCode = fixedCode.replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\.0\s*;/g,
    (match, varName, value) => {
      return `for(int ${varName} = ${value};`;
    }
  );

  // Oprava 19: mod(vec2(...), 1.0) -> mod(vec2(...), vec2(1.0))
  // Oprav dimension mismatch - mod očekává stejný typ pro oba argumenty
  // Rozšířeno pro více formátů: mod(vec2(...), float), mod(vec2(...), floatVar)
  // Vylepšeno: také opraví mod(vec3(...), float) a mod(vec4(...), float)
  fixedCode = fixedCode.replace(/mod\s*\(\s*(vec[234]\([^)]+\))\s*,\s*(\d+\.?\d*|\w+)\s*\)/g,
    (match, vecExpr, scalar) => {
      // Zjisti typ vec (vec2, vec3, vec4)
      const vecType = vecExpr.match(/^(vec[234])/)?.[1] || 'vec2';

      // Zkontroluj, zda scalar není už stejný typ jako vecExpr
      if (scalar.match(new RegExp(`^${vecType}\\(`))) {
        return match;
      }
      // Zkontroluj, zda scalar není proměnná typu vec2/vec3/vec4
      const isVecVar = fixedCode.match(new RegExp(`\\b${vecType}\\s+${scalar}\\s*[=;]`));
      if (isVecVar) {
        return match;
      }
      // Zkontroluj, zda scalar není číselná konstanta
      if (/^\d+\.?\d*$/.test(scalar)) {
        return `mod(${vecExpr}, ${vecType}(${scalar}))`;
      }
      // Pro proměnné použij vec2 (nejběžnější)
      return `mod(${vecExpr}, ${vecType}(${scalar}))`;
    }
  );

  // Oprava 20: vec2(...) + float -> vec2(...) + vec2(float)
  // Oprav dimension mismatch při aritmetických operacích
  // Rozšířeno pro více formátů: vec2(...) + float, vec2(...) + floatVar, vec2(...) - float
  fixedCode = fixedCode.replace(/(vec2\([^)]+\))\s*([+\-])\s*(\d+\.?\d*|\w+)\s*([,;\)])/g,
    (match, vecExpr, op, scalar, suffix) => {
      // Zkontroluj, zda scalar není už vec2
      if (scalar.match(/^vec2\(/)) {
        return match;
      }
      // Zkontroluj, zda scalar není proměnná typu vec2
      const isVec2Var = fixedCode.match(new RegExp(`\\bvec2\\s+${scalar}\\s*[=;]`));
      if (isVec2Var) {
        return match;
      }
      return `${vecExpr} ${op} vec2(${scalar})${suffix}`;
    }
  );

  // Oprava 21: vec2(...) * float -> vec2(...) * vec2(float)
  // Rozšířeno pro více formátů: vec2(...) * float, vec2(...) * floatVar, vec2(...) / float
  fixedCode = fixedCode.replace(/(vec2\([^)]+\))\s*([*/])\s*(\d+\.?\d*|\w+)\s*([,;\)])/g,
    (match, vecExpr, op, scalar, suffix) => {
      // Zkontroluj, zda scalar není už vec2
      if (scalar.match(/^vec2\(/)) {
        return match;
      }
      // Zkontroluj, zda scalar není proměnná typu vec2
      const isVec2Var = fixedCode.match(new RegExp(`\\bvec2\\s+${scalar}\\s*[=;]`));
      if (isVec2Var) {
        return match;
      }
      return `${vecExpr} ${op} vec2(${scalar})${suffix}`;
    }
  );

  // Oprava 27: "cannot convert from float to vec2" - float použitý tam, kde je očekáván vec2
  // Detekuj případy, kdy se float používá tam, kde je očekáván vec2 (např. v konstruktoru)
  // Opraví případy jako: vec2(floatVar) kde floatVar je float, ale očekává se vec2
  // Poznámka: GLSL automaticky rozšiřuje skaláry, ale někdy je potřeba explicitní převod

  // Oprava 28: boolean expression expected - oprav chybějící operátory v boolean výrazech
  // Detekuj případy, kdy chybí operátor mezi výrazy v boolean kontextu
  // Např: if(var1 var2) -> if(var1 && var2) nebo if(var1 == var2)
  fixedCode = fixedCode.replace(/(if|while|for)\s*\(\s*(\w+)\s+(\w+)\s*\)/g,
    (match, keyword, var1, var2) => {
      // Zkontroluj, zda to není už správně (např. if(var1 == var2))
      if (match.includes('==') || match.includes('!=') || match.includes('&&') || match.includes('||')) {
        return match;
      }
      // Přidej && operátor (nejběžnější pro boolean výrazy)
      return `${keyword}(${var1} && ${var2})`;
    }
  );

  // Oprava 29: chybějící závorky v boolean výrazech
  // Detekuj nevyvážené závorky v boolean výrazech
  fixedCode = fixedCode.replace(/(if|while|for)\s*\(([^)]*)\s*\)/g,
    (match, keyword, expr) => {
      const openCount = (expr.match(/\(/g) || []).length;
      const closeCount = (expr.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        // Přidej chybějící uzavírací závorky
        return `${keyword}(${expr}${')'.repeat(openCount - closeCount)})`;
      }
      return match;
    }
  );

  // Oprava 30: too many arguments - oprav počet argumentů funkcí
  // Detekuj funkce s nesprávným počtem argumentů
  // Poznámka: Toto je složitější - potřebujeme parsovat chybové hlášky
  // Prozatím přidáme základní opravy pro běžné funkce

  // Oprava 22: for(int i = 0; i < floatVar; i++) -> for(int i = 0; i < int(floatVar); i++)
  // Oprav type mismatch - loop očekává int, ne float
  // Zlepšený regex pro různé formáty (s mezerami i bez mezer)
  fixedCode = fixedCode.replace(/for\s*\(\s*int\s+(\w+)\s*=\s*(\d+\.?\d*)\s*;\s*\1\s*<\s*(\w+)\s*;\s*\1\s*\+\+\s*\)/g,
    (match, varName, start, limitVar) => {
      // Zkontroluj, zda limitVar není už int nebo konstanta
      // Musíme zkontrolovat, zda není deklarován jako int
      const isIntVar = fixedCode.match(new RegExp(`\\bint\\s+${limitVar}\\s*[=;]`));
      const isConstInt = fixedCode.match(new RegExp(`\\bconst\\s+int\\s+${limitVar}\\s*[=;]`));
      const isIntLiteral = /^\d+$/.test(limitVar);

      if (!isIntVar && !isConstInt && !isIntLiteral) {
        // limitVar je pravděpodobně float - převeď na int
        return `for(int ${varName} = ${start}; ${varName} < int(${limitVar}); ${varName}++)`;
      }
      return match;
    }
  );

  // Oprava 23: mod(float / float, float) -> mod(float / float, float) (zajistit správný typ)
  // Oprav type mismatch v mod() - může být problém s int/float
  fixedCode = fixedCode.replace(/mod\s*\(\s*(\w+)\s*\/\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*\)/g,
    (match, varName, divisor, modulo) => {
      // Zkontroluj, zda varName není int
      const isIntVar = fixedCode.match(new RegExp(`\\bint\\s+${varName}\\s*[=;]`));
      if (isIntVar) {
        // Pokud je int, převeď na float
        return `mod(float(${varName}) / ${divisor}, ${modulo})`;
      }
      return match;
    }
  );

  // Oprava 24: Zajistit, že IMG_PIXEL je správně nahrazeno
  // Pokud zůstane IMG_PIXEL v kódu, nahraď ho vec4(0.5)
  fixedCode = fixedCode.replace(/IMG_PIXEL\s*\([^)]+\)/g, 'vec4(0.5)');

  // Oprava 25: Zajistit, že isf_FragNormCoord je správně nahrazeno
  // Pokud zůstane isf_FragNormCoord v kódu, nahraď ho v_uv
  fixedCode = fixedCode.replace(/\bisf_FragNormCoord\b/g, 'v_uv');

  // Oprava 26: Zajistit, že RENDERSIZE je správně nahrazeno
  // Pokud zůstane RENDERSIZE v kódu, nahraď ho u_resolution
  fixedCode = fixedCode.replace(/\bRENDERSIZE\b/g, 'u_resolution');

  // Oprava 15: int min(int a, int b) -> int myMin(int a, int b) (preventivní oprava redeclaration)
  if (fixedCode.includes('int min(') && !fixedCode.includes('int myMin(')) {
    // Přejmenuj definici
    fixedCode = fixedCode.replace(/int\s+min\s*\(/g, 'int myMin(');
    // Přejmenuj všechna volání min() v kontextu, kde je použita jako int funkce
    // Musíme být opatrní - přejmenovat pouze volání naší funkce, ne built-in min()
    let lastIndex = 0;
    let iterations = 0;
    const maxIterations = 100; // Prevence nekonečné smyčky

    while (iterations < maxIterations) {
      iterations++;
      const match = fixedCode.substring(lastIndex).match(/\bmin\s*\(/);
      if (!match) break;

      const matchIndex = lastIndex + match.index;
      const beforeMatch = fixedCode.substring(Math.max(0, matchIndex - 100), matchIndex);
      const afterMatch = fixedCode.substring(matchIndex, Math.min(fixedCode.length, matchIndex + 100));

      // Zkontroluj, zda už není přejmenováno
      if (!beforeMatch.match(/\b(myMin|myMax|myTanh)\b/)) {
        // Pokud je použito v colors[...] nebo v kontextu, kde očekáváme int, přejmenuj
        if (beforeMatch.match(/colors\[|int\s+myMin|return\s+myMin/) ||
            afterMatch.match(/int\s+\)|colors\[|,\s*6\]|,\s*\d+\]/)) {
          fixedCode = fixedCode.substring(0, matchIndex) + 'myMin(' + fixedCode.substring(matchIndex + match[0].length);
          lastIndex = matchIndex + 6; // myMin( má 6 znaků
        } else {
          lastIndex = matchIndex + match[0].length;
        }
      } else {
        lastIndex = matchIndex + match[0].length;
      }
    }
  }

  return fixedCode;
};

/**
 * Konverze mini-shaderu (px-stream/twigl formát)
 * @param {string} shaderCode - Původní shader kód
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0 (GLSL ES 3.00) nebo WebGL 1.0 (GLSL ES 1.0)
 */
const convertMiniShader = (shaderCode, isWebGL2 = false) => {
  let converted = shaderCode;

  // Detekuj, co je potřeba
  const needs = detectNeeds(converted);

  // Oprav matice (mat3x2, mat4x2) - jen pro WebGL 1.0
  if (!isWebGL2 && (needs.needsMat3x2 || needs.needsMat4x2)) {
    converted = fixMatrixTypes(converted);
  }

  // Přidej konstanty (PI2, F4)
  converted = addMiniShaderConstants(converted, needs.needsPI2, needs.needsF4);

  // Sestav helper funkce a definice
  const helperDefines = needs.needsX ? getHelperDefines() : '';
  const helperFunctions = getHelperFunctions({
    needsRotate2D: needs.needsRotate2D,
    needsRotate3D: needs.needsRotate3D,
    needsHsv: needs.needsHsv,
    needsTanh: needs.needsTanh,
    needsSnoise2D: needs.needsSnoise2D,
    needsMod289: needs.needsMod289 || needs.needsSnoise2D,
    needsPermute: needs.needsPermute || needs.needsSnoise2D,
    needsRound: needs.needsRound
  });

  // Zabal mini-shader nebo přidej hlavičku
  if (needs.usesMiniShaderVars) {
    const declarations = getVariableDeclarations(converted);
    converted = wrapMiniShader(converted, needs, declarations, helperDefines, helperFunctions, isWebGL2);
  } else {
    converted = addStandardHeader(converted, helperDefines, helperFunctions, isWebGL2);
  }

  // Oprav for smyčky a další syntax - jen pro WebGL 1.0
  if (!isWebGL2) {
    converted = fixForLoops(converted);
    converted = applyAllFixes(converted);
  }

  // Finální sanitizace: oprav všechny neplatné formáty čísel v celém kódu
  converted = sanitizeNumberFormats(converted);
  converted = addMissingCommonVariables(converted);
  converted = sanitizeSyntaxErrors(converted);

  return converted;
};

/**
 * Konverze ISF shaderu
 * @param {string} shaderCode - Původní shader kód
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0 (GLSL ES 3.00) nebo WebGL 1.0 (GLSL ES 1.0)
 */
const convertISFShader = (shaderCode, isWebGL2 = false) => {
  // Extrahuj JSON metadata
  const jsonStart = shaderCode.indexOf('/*{');
  const jsonEnd = shaderCode.indexOf('}*/');
  let code = shaderCode;
  let inputParams = [];
  let passes = [];

  if (jsonStart !== -1 && jsonEnd !== -1) {
    const jsonStr = shaderCode.substring(jsonStart + 2, jsonEnd + 1);
    try {
      const metadata = JSON.parse(jsonStr);
      if (metadata.INPUTS && Array.isArray(metadata.INPUTS)) {
        inputParams = metadata.INPUTS;
      }
      if (metadata.PASSES && Array.isArray(metadata.PASSES)) {
        passes = metadata.PASSES;
      }
    } catch (e) {
      console.warn('Failed to parse ISF metadata:', e);
    }
    code = shaderCode.substring(jsonEnd + 3).trim();
  }

  // Odstraň #define makra
  code = code.replace(/^#define\s+\w+.*$/gm, '');
  code = code.replace(/\n\s*\n\s*\n/g, '\n\n');

  // Zpracuj PERSISTENT buffery
  const persistentBuffers = [];
  passes.forEach(pass => {
    if (pass.PERSISTENT && pass.TARGET) {
      persistentBuffers.push(pass.TARGET);
    }
  });

  // Detekuj audio/video inputs
  const audioInputMatches = code.match(/\b(\w+Image)\b/g);
  const audioInputs = audioInputMatches ? [...new Set(audioInputMatches)] : [];

  // Nahraď ISF proměnné a funkce
  code = replaceISFVariables(code);
  code = replaceISFFunctions(code, audioInputs, persistentBuffers);

  // Přejmenuj funkce, které přepisují vestavěné (např. min, max, tanh)
  // Detekuj vlastní definice min, max, tanh funkcí
  // Musíme hledat definice funkcí - typ následovaný mezerou, pak názvem funkce, pak závorkou
  const hasCustomMin = code.match(/\b(float|vec2|vec3|vec4)\s+min\s*\([^)]*\)\s*\{/);
  const hasCustomMax = code.match(/\b(float|vec2|vec3|vec4)\s+max\s*\([^)]*\)\s*\{/);
  const hasCustomTanh = code.match(/\b(float|vec2|vec3|vec4)\s+tanh\s*\([^)]*\)\s*\{/);

  if (hasCustomMin) {
    // Nejdřív přejmenuj definice min funkcí na myMin
    code = code.replace(/\b(float|vec2|vec3|vec4)\s+min\s*\(/g, '$1 myMin(');

    // Pak nahraď všechna volání min() na myMin() - protože shader obsahuje vlastní definici,
    // všechna volání min() jsou volání vlastní funkce, ne vestavěné
    // Musíme být opatrní - přejmenujme pouze pokud není už přejmenováno
    let lastIndex = 0;
    let matchFound = true;
    while (matchFound) {
      const match = code.substring(lastIndex).match(/\bmin\s*\(/);
      if (!match) {
        matchFound = false;
        break;
      }

      const matchIndex = lastIndex + match.index;
      // Zkontroluj, zda už není přejmenováno (zkontroluj před match)
      const beforeMatch = code.substring(Math.max(0, matchIndex - 30), matchIndex);
      if (!beforeMatch.match(/\b(myMin|myMax|myTanh)\b/)) {
        // Není přejmenováno - přejmenuj na myMin
        code = code.substring(0, matchIndex) + 'myMin(' + code.substring(matchIndex + match[0].length);
        lastIndex = matchIndex + 5; // myMin( má 5 znaků
      } else {
        // Už je přejmenováno - přeskoč
        lastIndex = matchIndex + match[0].length;
      }
    }
  }

  if (hasCustomMax) {
    // Nejdřív přejmenuj definice max funkcí na myMax
    code = code.replace(/\b(float|vec2|vec3|vec4)\s+max\s*\(/g, '$1 myMax(');

    // Pak nahraď všechna volání max() na myMax() - protože shader obsahuje vlastní definici,
    // všechna volání max() jsou volání vlastní funkce, ne vestavěné
    let lastIndex = 0;
    let matchFound = true;
    while (matchFound) {
      const match = code.substring(lastIndex).match(/\bmax\s*\(/);
      if (!match) {
        matchFound = false;
        break;
      }

      const matchIndex = lastIndex + match.index;
      // Zkontroluj, zda už není přejmenováno (zkontroluj před match)
      const beforeMatch = code.substring(Math.max(0, matchIndex - 30), matchIndex);
      if (!beforeMatch.match(/\b(myMin|myMax|myTanh)\b/)) {
        // Není přejmenováno - přejmenuj na myMax
        code = code.substring(0, matchIndex) + 'myMax(' + code.substring(matchIndex + match[0].length);
        lastIndex = matchIndex + 5; // myMax( má 5 znaků
      } else {
        // Už je přejmenováno - přeskoč
        lastIndex = matchIndex + match[0].length;
      }
    }
  }

  // Pro WebGL 2.0, kde je tanh vestavěná funkce, musíme přejmenovat vlastní definice
  // Pokud shader obsahuje vlastní definici tanh, všechny volání tanh() v tomto shaderu
  // jsou volání vlastní funkce, ne vestavěné
  if (hasCustomTanh && isWebGL2) {
    // Nejdřív přejmenuj definice tanh funkcí na myTanh
    code = code.replace(/\b(float|vec2|vec3|vec4)\s+tanh\s*\(/g, '$1 myTanh(');

    // Pak přejmenuj všechna volání tanh() na myTanh() - protože shader obsahuje vlastní definici,
    // všechna volání tanh() jsou volání vlastní funkce
    // Musíme být opatrní - přejmenujme pouze pokud není už přejmenováno
    let lastIndex = 0;
    let matchFound = true;
    while (matchFound) {
      const match = code.substring(lastIndex).match(/\btanh\s*\(/);
      if (!match) {
        matchFound = false;
        break;
      }

      const matchIndex = lastIndex + match.index;
      // Zkontroluj, zda už není přejmenováno (zkontroluj před match)
      const beforeMatch = code.substring(Math.max(0, matchIndex - 30), matchIndex);
      if (!beforeMatch.match(/\b(myMin|myMax|myTanh)\b/)) {
        // Není přejmenováno - přejmenuj na myTanh
        code = code.substring(0, matchIndex) + 'myTanh(' + code.substring(matchIndex + match[0].length);
        lastIndex = matchIndex + 6; // myTanh( má 6 znaků
      } else {
        // Už je přejmenováno - přeskoč
        lastIndex = matchIndex + match[0].length;
      }
    }
  }

  // Zpracuj INPUTS parametry
  const { code: processedCode, constantDeclarations } = processISFInputs(code, inputParams);

  // Sanitizuj konstanty před jejich přidáním do kódu
  const sanitizedConstantDeclarations = constantDeclarations.map(decl => sanitizeNumberFormats(decl));

  // Debug: zkontroluj, zda se všechny INPUTS parametry deklarují
  // (Odstraněno - zbytečně zahlcuje konzoli)

  // Oprav bool operátory
  code = fixBoolOperators(processedCode, inputParams);

  // Oprav nedefinované proměnné (xy, gr)
  code = fixUndefinedVariables(code);

  // Přidej konstanty (PI, PI2, F4)
  code = addConstants(code);

  // Detekuj existující definice funkcí, abychom nezpůsobili duplicity
  const hasMod289 = code.match(/\b(mod289|vec4\s+mod289|vec3\s+mod289|vec2\s+mod289)\s*\(/);
  const hasPermute = code.match(/\b(permute|vec4\s+permute|vec3\s+permute)\s*\(/);
  const hasTanh = code.match(/\b(tanh|float\s+tanh|vec2\s+tanh|vec3\s+tanh|vec4\s+tanh)\s*\(/);
  const hasMyTanh = code.match(/\b(myTanh|float\s+myTanh|vec2\s+myTanh|vec3\s+myTanh|vec4\s+myTanh)\s*\(/);
  const hasRound = code.match(/\b(round|float\s+round)\s*\(/);

  // Detekuj helper funkce - pouze pokud už nejsou definovány v kódu
  // Pro WebGL 2.0:
  // - Pokud máme vlastní definici tanh (přejmenovali jsme na myTanh), nepřidávej helper (vestavěná tanh je k dispozici)
  // - Pokud nemáme vlastní definici tanh, nepřidávej helper (vestavěná tanh je k dispozici)
  // - hasMyTanh znamená, že jsme přejmenovali vlastní definici na myTanh, takže helper NEPOTŘEBUJEME
  // Pro WebGL 1.0:
  // - Pokud máme vlastní definici tanh (hasCustomTanh), nepřidávej helper
  // - Pokud nemáme vlastní definici tanh a potřebujeme tanh, přidávej helper
  const needsTanh = !isWebGL2 && code.includes('tanh(') && !hasTanh && !hasMyTanh && !hasCustomTanh;
  const needsMod289 = code.includes('mod289(') && !hasMod289;
  const needsPermute = code.includes('permute(') && !hasPermute;
  const needsRound = code.includes('round(') && !hasRound;
  const needsSnoise2D = code.includes('snoise2D(') && (!needsMod289 && !needsPermute);

  const helperFunctionsStr = getHelperFunctions({
    needsTanh,
    needsMod289: needsMod289 || (needsSnoise2D && !hasMod289),
    needsPermute: needsPermute || (needsSnoise2D && !hasPermute),
    needsRound,
    needsSnoise2D: needsSnoise2D && (!hasMod289 && !hasPermute)
  });

  // Přidej hlavičku a deklarace
  // Předáme informaci o tom, zda existuje vlastní definice tanh (přejmenovaná na myTanh)
  code = addISFHeader(code, sanitizedConstantDeclarations, helperFunctionsStr, isWebGL2, hasMyTanh || hasCustomTanh);

  // Oprav syntax (for loops, in qualifier, mat3x2/mat4x2, atd.) - jen pro WebGL 1.0
  if (!isWebGL2) {
    code = fixForLoops(code);
    code = applyAllFixes(code);
  } else {
    // Pro WebGL 2.0 stále potřebujeme opravit int->float konverze v přiřazeních
    // (i když je to méně kritické, může to stále způsobit chyby)
    code = fixIntToFloatAssignments(code);
    // Oprav také dimension mismatch (vec4->float, vec4->vec3, atd.)
    code = fixDimensionMismatch(code);
  }

  // Oprav rezervované slovo 'sample' v GLSL ES 3.00 (přejmenuj na 'sampleTex')
  if (isWebGL2) {
    // Přejmenuj proměnné s názvem 'sample' na 'sampleTex'
    // Nejdřív přejmenuj deklarace
    code = code.replace(/\b(sampler2D|samplerCube)\s+sample\b/g, '$1 sampleTex');
    code = code.replace(/\b(float|vec2|vec3|vec4)\s+sample\b/g, '$1 sampleTex');
    // Pak nahraď použití 'sample' jako proměnné (ale ne jako funkce texture())
    // Musíme být opatrní - nepřejmenovat texture() volání
    code = code.replace(/\b([^a-zA-Z_])sample([^a-zA-Z_(])/g, '$1sampleTex$2');
  }

  // Finální sanitizace: oprav všechny neplatné formáty čísel a syntax chyby v celém kódu
  // Musí být na konci, aby opravila všechny formáty, které se mohly vytvořit během konverze
  code = sanitizeNumberFormats(code);
  code = addMissingCommonVariables(code);
  code = sanitizeSyntaxErrors(code);

  return code;
};

/**
 * Opraví nedefinované proměnné (xy, gr)
 */
const fixUndefinedVariables = (code) => {
  // Oprav xy proměnnou
  if (code.match(/\bxy\s*[=.]/) && !code.match(/\b(vec2|vec3|vec4)\s+xy\b/)) {
    if ((code.match(/xy\.(x|y|xy)/) || code.match(/xy\s*=/)) &&
        !code.match(/xy\s*=\s*isf_FragNormCoord/) && !code.match(/xy\s*=\s*v_uv/)) {
      code = code.replace(/void\s+main\s*\([^)]*\)\s*\{/, (match) => {
        return match + '\n\tvec2 xy = v_uv;';
      });
    }
  }

  // Oprav gr proměnnou
  if (code.match(/\bgr\s*[=.]/) && !code.match(/\b(vec2|vec3|vec4|float)\s+gr\b/)) {
    if (code.match(/gr\.(x|y|xy)/)) {
      code = code.replace(/void\s+main\s*\([^)]*\)\s*\{/, (match) => {
        return match + '\n\tvec2 gr = v_uv;';
      });
    }
  }

  return code;
};

/**
 * Přidá hlavičku a deklarace pro ISF shader
 */
const addISFHeader = (code, constantDeclarations, helperFunctionsStr, isWebGL2 = false, hasCustomTanhDef = false) => {
  // Odstraň existující #version a precision řádky, abychom předešli "redefinition" chybám
  let processedCode = code;

  // Odstraň existující #version řádky (může být #version 300 es, #version 100, atd.)
  // Zlepšený regex, který zachytí všechny případy, včetně případů na začátku souboru
  processedCode = processedCode.replace(/^\s*#version\s+\d+\s*\w*\s*$/gm, '');
  processedCode = processedCode.replace(/\n\s*#version\s+\d+\s*\w*\s*\n/g, '\n');
  processedCode = processedCode.replace(/\r?\n\s*#version\s+\d+\s*\w*\s*\r?\n/g, '\n');
  // Odstraň také případ, kdy je #version na samostatném řádku na začátku
  if (processedCode.trim().startsWith('#version')) {
    processedCode = processedCode.replace(/^\s*#version\s+\d+\s*\w*\s*\r?\n?/m, '');
  }

  // Odstraň existující precision řádky
  processedCode = processedCode.replace(/^\s*precision\s+\w+\s+\w+\s*;?\s*$/gm, '');
  processedCode = processedCode.replace(/\n\s*precision\s+\w+\s+\w+\s*;?\s*\n/g, '\n');

  // Vyčisti prázdné řádky na začátku
  processedCode = processedCode.replace(/^\s*\n+/, '');

  // Pro WebGL 1.0: zajisti, že se odstraní všechny #version řádky (včetně případů, které regex nezachytil)
  if (!isWebGL2) {
    // Odstraň všechny #version řádky pro WebGL 1.0
    processedCode = processedCode.replace(/^\s*#version\s+.*$/gm, '');
    processedCode = processedCode.replace(/\r?\n\s*#version\s+.*\r?\n?/g, '\n');
    // Zkontroluj, zda na začátku není #version
    const trimmed = processedCode.trim();
    if (trimmed.startsWith('#version')) {
      const firstNewline = trimmed.indexOf('\n');
      if (firstNewline !== -1) {
        processedCode = trimmed.substring(firstNewline + 1);
      } else {
        processedCode = '';
      }
    }
  }

  // Zkontroluj, zda už není precision v kódu (po odstranění)
  const hasPrecision = processedCode.includes('precision mediump float') ||
                       processedCode.includes('precision highp float') ||
                       processedCode.includes('precision lowp float');

  if (!hasPrecision) {
    // Pro WebGL 2.0 (GLSL ES 3.00) použij #version 300 es
    // #version MUSÍ být na prvním řádku bez žádných mezer nebo prázdných řádků
    const versionHeader = isWebGL2 ? '#version 300 es' : '';
    const varyingOut = isWebGL2 ? 'in' : 'varying';
    const fragColor = isWebGL2 ? 'out vec4 fragColor;' : '';

    // Přidej hlavičku s konstantami před kód
    // Odstraň prázdné řádky a mezery z deklarací
    const constantsPrefix = constantDeclarations.length > 0
      ? constantDeclarations.filter(d => d.trim().length > 0).join('\n') + '\n'
      : '';

    // Pokud kód obsahuje gl_FragColor, nahraď ho pro WebGL 2.0
    if (isWebGL2 && processedCode.includes('gl_FragColor')) {
      processedCode = processedCode.replace(/gl_FragColor/g, 'fragColor');
    }

    if (isWebGL2) {
      // Odstraň mezery a prázdné řádky z helperFunctionsStr a constantsPrefix pro čistý začátek
      // Pro WebGL 2.0: pokud máme vlastní definici tanh (přejmenovanou na myTanh), nepřidávej helper
      // (vestavěná tanh je k dispozici, takže helper NEPOTŘEBUJEME)
      const cleanHelpers = (helperFunctionsStr && !hasCustomTanhDef) ? helperFunctionsStr.trim() : '';
      const cleanConstants = constantsPrefix ? constantsPrefix.trim() : '';

      // #version musí být na prvním řádku bez mezer
      // Zajistíme, že cleanConstants má správný formát (bez prázdných řádků na začátku/konci)
      const finalConstants = cleanConstants ? cleanConstants + '\n' : '';
      const finalHelpers = cleanHelpers ? cleanHelpers + '\n' : '';

      return `${versionHeader}
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
${varyingOut} vec2 v_uv;
${fragColor}
${finalHelpers}${finalConstants}${processedCode}
`;
    } else {
      return `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_intensity;
      ${varyingOut} vec2 v_uv;
      ${helperFunctionsStr}
      ${constantsPrefix}
      ${processedCode}
    `;
    }
  } else {
    // Kód už má precision - přidej pouze helper funkce a konstanty před funkce
    // Pro WebGL 2.0: pokud máme vlastní definici tanh (přejmenovanou na myTanh), nepřidávej helper
    // Pro WebGL 1.0: pokud máme vlastní definici tanh, nepřidávej helper
    if (helperFunctionsStr && !hasCustomTanhDef && !processedCode.includes('float tanh(') && !processedCode.includes('float mod289(')) {
      const firstFunctionMatch = processedCode.match(/(\w+\s+\w+\s*\([^)]*\)\s*\{|void\s+main\s*\([^)]*\)\s*\{)/);
      if (firstFunctionMatch) {
        const functionIndex = processedCode.indexOf(firstFunctionMatch[0]);
        processedCode = processedCode.substring(0, functionIndex) +
               helperFunctionsStr + '\n' +
               processedCode.substring(functionIndex);
      }
    }

    if (constantDeclarations.length > 0) {
      const firstFunctionMatch = processedCode.match(/(\w+\s+\w+\s*\([^)]*\)\s*\{|void\s+main\s*\([^)]*\)\s*\{)/);
      if (firstFunctionMatch) {
        const functionIndex = processedCode.indexOf(firstFunctionMatch[0]);
        // Odstraň prázdné řádky a mezery z deklarací
        const cleanDeclarations = constantDeclarations.filter(d => d.trim().length > 0).join('\n');
        processedCode = processedCode.substring(0, functionIndex) +
               cleanDeclarations + '\n' +
               processedCode.substring(functionIndex);
      }
    }
  }

  return processedCode;
};

/**
 * Konverze shaderu s mainImage (nový formát: .ts soubory)
 * @param {string} shaderCode - Původní shader kód
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0 (GLSL ES 3.00) nebo WebGL 1.0 (GLSL ES 1.0)
 */
const convertMainImageShader = (shaderCode, isWebGL2 = false) => {
  let code = shaderCode;

  // Odstraň #version řádky (budou přidány později)
  code = code.replace(/^\s*#version\s+\d+\s*\w*\s*$/gm, '');
  code = code.replace(/\n\s*#version\s+\d+\s*\w*\s*\n/g, '\n');
  code = code.replace(/\r?\n\s*#version\s+\d+\s*\w*\s*\r?\n/g, '\n');
  if (code.trim().startsWith('#version')) {
    code = code.replace(/^\s*#version\s+\d+\s*\w*\s*\r?\n?/m, '');
  }

  // Konvertuj mainImage na main
  // mainImage( out vec4 fragColor, in vec2 fragCoord ) -> main()
  code = code.replace(/void\s+mainImage\s*\(\s*out\s+vec4\s+fragColor\s*,\s*in\s+vec2\s+fragCoord\s*\)/g, 'void main()');
  code = code.replace(/void\s+mainImage\s*\(\s*out\s+vec4\s+fragColor\s*,\s*vec2\s+fragCoord\s*\)/g, 'void main()');
  code = code.replace(/void\s+mainImage\s*\([^)]*\)/g, 'void main()');

  // Konvertuj iTime na u_time
  code = code.replace(/\biTime\b/g, 'u_time');

  // Konvertuj iResolution na u_resolution
  code = code.replace(/\biResolution\b/g, 'u_resolution');
  // iResolution.xy -> u_resolution
  code = code.replace(/\biResolution\.xy\b/g, 'u_resolution');
  code = code.replace(/\biResolution\.x\b/g, 'u_resolution.x');
  code = code.replace(/\biResolution\.y\b/g, 'u_resolution.y');

  // Konvertuj iAudio na audio uniforms
  // iAudio.x -> u_audioBass
  // iAudio.y -> u_audioMid
  // iAudio.z -> u_audioTreble
  // iAudio.w -> u_audioAmplitude
  code = code.replace(/\biAudio\.x\b/g, 'u_audioBass');
  code = code.replace(/\biAudio\.y\b/g, 'u_audioMid');
  code = code.replace(/\biAudio\.z\b/g, 'u_audioTreble');
  code = code.replace(/\biAudio\.w\b/g, 'u_audioAmplitude');
  code = code.replace(/\biAudio\b/g, 'vec4(u_audioBass, u_audioMid, u_audioTreble, u_audioAmplitude)');

  // Konvertuj fragCoord na v_uv
  // fragCoord je v pixelech, v_uv je v normalizovaných souřadnicích [0,1]
  // fragCoord / iResolution.xy -> v_uv
  // (2.0 * fragCoord - iResolution.xy) / iResolution.y -> přepočet na normalizované souřadnice
  // Musíme nahradit všechny použití fragCoord
  code = code.replace(/\bfragCoord\b/g, 'v_uv * u_resolution');

  // Konvertuj fragColor podle WebGL verze
  if (isWebGL2) {
    // Pro WebGL 2.0: fragColor je out parametr, takže ho necháme
    // Pokud není deklarováno, přidáme ho později
    // Nahraď gl_FragColor za fragColor (pro zpětnou kompatibilitu)
    code = code.replace(/\bgl_FragColor\b/g, 'fragColor');
  } else {
    // Pro WebGL 1.0: nahraď fragColor za gl_FragColor
    // fragColor je out parametr v mainImage, ale v WebGL 1.0 používáme gl_FragColor
    code = code.replace(/\bfragColor\s*=/g, 'gl_FragColor =');
    code = code.replace(/\bfragColor\s*\./g, 'gl_FragColor.');
    // Pokud je fragColor použito jako proměnná, nahraď ho za gl_FragColor
    code = code.replace(/\bfragColor\b/g, 'gl_FragColor');
  }

  // Přidej hlavičku s uniformy a varying
  const versionHeader = isWebGL2 ? '#version 300 es' : '';
  const varyingOut = isWebGL2 ? 'in' : 'varying';
  const fragColorDecl = isWebGL2 ? 'out vec4 fragColor;' : '';

  // Odstraň existující precision řádky
  code = code.replace(/^\s*precision\s+\w+\s+\w+\s*;?\s*$/gm, '');
  code = code.replace(/\n\s*precision\s+\w+\s+\w+\s*;?\s*\n/g, '\n');

  // Vyčisti prázdné řádky na začátku
  code = code.replace(/^\s*\n+/, '');

  // Pro WebGL 1.0: zajisti, že se odstraní všechny #version řádky
  if (!isWebGL2) {
    code = code.replace(/^\s*#version\s+.*$/gm, '');
    code = code.replace(/\r?\n\s*#version\s+.*\r?\n?/g, '\n');
    const trimmed = code.trim();
    if (trimmed.startsWith('#version')) {
      const firstNewline = trimmed.indexOf('\n');
      if (firstNewline !== -1) {
        code = trimmed.substring(firstNewline + 1);
      } else {
        code = '';
      }
    }
  }

  // Zkontroluj, zda už není precision v kódu
  const hasPrecision = code.includes('precision mediump float') ||
                       code.includes('precision highp float') ||
                       code.includes('precision lowp float');

  // Sestav finální shader
  if (isWebGL2) {
    // Pro WebGL 2.0: zkontroluj, zda už není fragColor deklarováno v kódu
    let finalCode = code;
    if (!code.includes('out vec4 fragColor') && !code.includes('fragColor')) {
      // Přidej deklaraci fragColor před void main()
      finalCode = code.replace(/void\s+main\s*\(/g, 'out vec4 fragColor;\nvoid main(');
    }

    return `${versionHeader}
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_audioBass;
uniform float u_audioMid;
uniform float u_audioTreble;
uniform float u_audioAmplitude;
${varyingOut} vec2 v_uv;
${finalCode}
`;
  } else {
    // Pro WebGL 1.0: zkontroluj, zda není fragColor v kódu (mělo by být nahrazeno za gl_FragColor)
    // Pokud je, přidej deklaraci gl_FragColor není potřeba (je vestavěné)
    return `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_audioBass;
uniform float u_audioMid;
uniform float u_audioTreble;
uniform float u_audioAmplitude;
${varyingOut} vec2 v_uv;
${code}
`;
  }
};
