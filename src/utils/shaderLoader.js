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
  query: '?raw',
  import: 'default',
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
  return Object.keys(shadersModules)
    .filter(path => !path.endsWith('/index.ts'))
    .map(path => {
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

function convertMainImageShader(shaderCode, isWebGL2 = false) {
  let code = shaderCode;

  // Detekuj vlastní názvy parametrů
  const mainImageParamMatch = code.match(/void\s+mainImage\s*\(\s*out\s+vec4\s+(\w+)\s*,\s*(?:in\s+)?vec2\s+(\w+)/);
  if (mainImageParamMatch) {
    const [, outputVar, inputVar] = mainImageParamMatch;
    if (outputVar && outputVar !== 'fragColor') {
      const outputRegex = new RegExp(`\\b${outputVar}\\b`, 'g');
      code = code.replace(outputRegex, 'fragColor');
    }
    if (inputVar && inputVar !== 'fragCoord') {
      const inputRegex = new RegExp(`\\b${inputVar}\\b`, 'g');
      code = code.replace(inputRegex, 'fragCoord');
    }
  }

  // Odeber #version – přidáme vlastní
  code = code.replace(/^\s*#version\s+\d+\s*\w*\s*$/gm, '');
  code = code.replace(/\n\s*#version\s+\d+\s*\w*\s*\n/g, '\n');
  code = code.replace(/\r?\n\s*#version\s+\d+\s*\w*\s*\r?\n/g, '\n');
  if (code.trim().startsWith('#version')) {
    code = code.replace(/^\s*#version\s+\d+\s*\w*\s*\r?\n?/m, '');
  }

  // Převod mainImage → main
  code = code.replace(/void\s+mainImage\s*\(\s*out\s+vec4\s+fragColor\s*,\s*in\s+vec2\s+fragCoord\s*\)/g, 'void main()');
  code = code.replace(/void\s+mainImage\s*\(\s*out\s+vec4\s+fragColor\s*,\s*vec2\s+fragCoord\s*\)/g, 'void main()');
  code = code.replace(/void\s+mainImage\s*\([^)]*\)/g, 'void main()');

  // Uniformy ShaderToy → naše uniformy
  code = code.replace(/\biTime\b/g, 'u_time');
  code = code.replace(/\biResolution\.xy\b/g, 'u_resolution');
  code = code.replace(/\biResolution\.x\b/g, 'u_resolution.x');
  code = code.replace(/\biResolution\.y\b/g, 'u_resolution.y');
  code = code.replace(/\biResolution\b/g, 'u_resolution');

  code = code.replace(/\biAudio\.x\b/g, 'u_audioBass');
  code = code.replace(/\biAudio\.y\b/g, 'u_audioMid');
  code = code.replace(/\biAudio\.z\b/g, 'u_audioTreble');
  code = code.replace(/\biAudio\.w\b/g, 'u_audioAmplitude');
  code = code.replace(/\biAudio\b/g, 'vec4(u_audioBass, u_audioMid, u_audioTreble, u_audioAmplitude)');

  code = code.replace(/\biMouse\b/g, 'vec4(u_mouse, 0.0, 0.0)');
  code = code.replace(/u_mouse\.xy\b/g, 'u_mouse');
  code = code.replace(/u_mouse\.zw\b/g, 'vec2(0.0)');
  code = code.replace(/u_mouse\.z\b/g, '0.0');
  code = code.replace(/u_mouse\.w\b/g, '0.0');

  // fragCoord → v_uv*u_resolution
  code = code.replace(/\bfragCoord\b/g, 'v_uv * u_resolution');

  if (isWebGL2) {
    code = code.replace(/\bgl_FragColor\b/g, 'fragColor');
  } else {
    code = code.replace(/\bfragColor\s*=/g, 'gl_FragColor =');
    code = code.replace(/\bfragColor\s*\./g, 'gl_FragColor.');
    code = code.replace(/\bfragColor\b/g, 'gl_FragColor');
  }

  // Odeber existující precision deklarace
  code = code.replace(/^\s*precision\s+\w+\s+\w+\s*;?\s*$/gm, '');
  code = code.replace(/\n\s*precision\s+\w+\s+\w+\s*;?\s*\n/g, '\n');
  code = code.replace(/^\s*\n+/, '');

  const headerLines = [
    isWebGL2 ? '#version 300 es' : '',
    'precision mediump float;',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    'uniform vec2 u_mouse;',
    'uniform float u_intensity;',
    'uniform float u_audioBass;',
    'uniform float u_audioMid;',
    'uniform float u_audioTreble;',
    'uniform float u_audioAmplitude;',
    `${isWebGL2 ? 'in' : 'varying'} vec2 v_uv;`
  ].filter(Boolean);

  if (isWebGL2) {
    const hasFragColorDecl = /\bout\s+vec4\s+fragColor\b/.test(code);
    const fragColorDecl = hasFragColorDecl ? '' : 'out vec4 fragColor;\n';
    return `${headerLines.join('\n')}\n${fragColorDecl}${code}\n`;
  }

  return `${headerLines.join('\n')}\n${code}\n`;
}

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

  // Poté oprav případy bez operátoru
  fixedCode = fixedCode.replace(/vec4\s*\(([^)]+)\)\)/g,
    (match, first) => {
      if (first.match(/^-?\d+\.?\d*$/)) {
        return `vec4(${first}, ${first}, ${first}, ${first})`;
      }
      return match;
    }
  );

  return fixedCode;
};