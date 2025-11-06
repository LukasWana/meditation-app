/**
 * Mini-shader konverze (px-stream/twigl formát)
 * Obsahuje konverze pro mini-shader specifické proměnné (FC, r, t, m, f, o)
 */

/**
 * Detekuje, které proměnné a funkce jsou potřeba
 * @param {string} code - GLSL kód
 * @returns {Object} Detekované potřeby
 */
export const detectNeeds = (code) => {
  return {
    needsRotate2D: code.includes('rotate2D'),
    needsRotate3D: code.includes('rotate3D'),
    needsHsv: code.includes('hsv('),
    needsX: code.includes('X;') || code.match(/\bX\b/),
    needsTanh: code.includes('tanh('),
    needsSnoise2D: code.includes('snoise2D('),
    needsMod289: code.includes('mod289('),
    needsPermute: code.includes('permute('),
    needsRound: code.includes('round('),
    needsMat3x2: code.includes('mat3x2'),
    needsMat4x2: code.includes('mat4x2'),
    needsF4: code.match(/\bF4\b/),
    needsPI2: code.includes('PI2') && !code.match(/\bPI2\b.*=/) && !code.match(/\bconst\s+float\s+PI2\b/),
    usesMiniShaderVars: code.includes('FC.') || code.includes('r.') || code.match(/\br\b/) ||
                       code.includes(' t') || code.includes('o=') || code.includes('o+=') ||
                       code.includes('o-=') || code.includes('m.') || code.match(/\bm\b/) ||
                       code.match(/\bf\b/)
  };
};

/**
 * Určí typy proměnných FC a r podle použití
 * @param {string} code - GLSL kód
 * @returns {Object} Deklarace proměnných
 */
export const getVariableDeclarations = (code) => {
  const usesFC4D = code.includes('FC.xyzw') || code.includes('FC.rgba') || code.match(/FC\.[xyzwrgba]{4}/);
  const usesFC3D = code.includes('FC.rgb') || code.includes('FC.xyz') || code.match(/FC\.[xyzrgb]{3}/);
  const usesR3D = code.includes('r.xyy') || code.includes('r.rgb') || code.match(/r\.[xyz]{3}/);
  const usesR4D = code.includes('r.xyzw') || code.match(/r\.[xyzw]{4}/);

  let fcDeclaration = 'vec4 FC = vec4(v_uv * u_resolution, 0.0, 1.0);';
  if (usesFC4D) {
    fcDeclaration = 'vec4 FC = vec4(v_uv * u_resolution, 0.0, 1.0);';
  } else if (usesFC3D) {
    fcDeclaration = 'vec3 FC = vec3(v_uv * u_resolution, 0.0);';
  } else if (code.includes('FC.xy') || code.includes('FC.x') || code.includes('FC.y')) {
    fcDeclaration = 'vec2 FC = v_uv * u_resolution;';
  }

  let rDeclaration = 'vec2 r = u_resolution;';
  if (usesR4D) {
    rDeclaration = 'vec4 r = vec4(u_resolution, u_resolution);';
  } else if (usesR3D) {
    rDeclaration = 'vec3 r = vec3(u_resolution, 0.0);';
  }

  const needsMouse = code.includes('m.') || code.match(/\bm\s*[=.]/);
  const mouseDeclaration = needsMouse ? 'vec2 m = vec2(0.5, 0.5);' : '';

  const needsFrame = code.match(/\bf\b/);
  const frameDeclaration = needsFrame ? 'float f = u_time * 60.0;' : '';

  return {
    fcDeclaration,
    rDeclaration,
    mouseDeclaration,
    frameDeclaration
  };
};

/**
 * Přidá konstanty (PI2, F4) pokud jsou potřeba
 * @param {string} code - GLSL kód
 * @param {boolean} needsPI2 - Zda je potřeba PI2
 * @param {boolean} needsF4 - Zda je potřeba F4
 * @returns {string} Opravený kód
 */
export const addMiniShaderConstants = (code, needsPI2, needsF4) => {
  let constants = [];

  if (needsPI2) {
    constants.push('const float PI2 = 6.283185307179586;');
  }

  if (needsF4 && !code.match(/\bF4\b.*=/) && !code.match(/\bconst\s+float\s+F4\b/)) {
    constants.push('const float F4 = 4.0;');
  }

  if (constants.length > 0) {
    const firstFunctionMatch = code.match(/(\w+\s+\w+\s*\([^)]*\)\s*\{|void\s+main\s*\([^)]*\)\s*\{)/);
    if (firstFunctionMatch) {
      const functionIndex = code.indexOf(firstFunctionMatch[0]);
      code = code.substring(0, functionIndex) +
             constants.join('\n') + '\n' +
             code.substring(functionIndex);
    } else if (code.includes('void main()')) {
      code = code.replace(/void\s+main\s*\([^)]*\)\s*\{/, (match) => {
        return match + '\n\t' + constants.join('\n\t');
      });
    }
  }

  return code;
};

/**
 * Zabalí mini-shader kód do WebGL 1.0 kompatibilního formátu
 * @param {string} code - GLSL kód
 * @param {Object} needs - Detekované potřeby
 * @param {Object} declarations - Deklarace proměnných
 * @param {string} defines - Helper definice (#define)
 * @param {string} helpers - Helper funkce
 * @returns {string} Zabaleno kód
 */
export const wrapMiniShader = (code, needs, declarations, defines, helpers, isWebGL2 = false) => {
  const { fcDeclaration, rDeclaration, mouseDeclaration, frameDeclaration } = declarations;
  const pi2Declaration = needs.needsPI2 ? 'const float PI2 = 6.283185307179586;' : '';

  // Pro WebGL 2.0 (GLSL ES 3.00) použij #version 300 es
  // #version MUSÍ být na prvním řádku bez žádných mezer nebo prázdných řádků
  const versionHeader = isWebGL2 ? '#version 300 es' : '';
  const precision = 'precision mediump float;';
  const varyingOut = isWebGL2 ? 'in' : 'varying';
  const fragColor = isWebGL2 ? 'out vec4 fragColor;' : '';
  const fragColorAssign = isWebGL2 ? 'fragColor' : 'gl_FragColor';

  // Odstraň mezery a prázdné řádky z defines a helpers pro čistý začátek
  const cleanDefines = defines ? defines.trim() : '';
  const cleanHelpers = helpers ? helpers.trim() : '';

  // Sestav shader - pokud je WebGL 2.0, #version musí být na prvním řádku
  if (isWebGL2) {
    return `${versionHeader}
${cleanDefines}
${precision}
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
${varyingOut} vec2 v_uv;
${fragColor}
${cleanHelpers}

void main() {
  ${pi2Declaration ? pi2Declaration + '\n  ' : ''}${fcDeclaration}
  ${rDeclaration}
  ${mouseDeclaration}
  float t = u_time;
  ${frameDeclaration}
  vec4 o = vec4(0.0);
  ${code}
  ${fragColorAssign} = o * u_intensity;
}
`;
  } else {
    return `
    ${cleanDefines}
    ${precision}
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_intensity;
    ${varyingOut} vec2 v_uv;

    ${cleanHelpers}

    void main() {
      ${pi2Declaration ? pi2Declaration + '\n\t' : ''}${fcDeclaration}
      ${rDeclaration}
      ${mouseDeclaration}
      float t = u_time;
      ${frameDeclaration}
      vec4 o = vec4(0.0);
      ${code}
      ${fragColorAssign} = o * u_intensity;
    }
  `;
  }
};

/**
 * Přidá standardní hlavičku pokud chybí
 * @param {string} code - GLSL kód
 * @param {string} defines - Helper definice
 * @param {string} helpers - Helper funkce
 * @returns {string} Opravený kód
 */
export const addStandardHeader = (code, defines, helpers, isWebGL2 = false) => {
  if (!code.includes('precision mediump float')) {
    // Pro WebGL 2.0 (GLSL ES 3.00) použij #version 300 es
    // #version MUSÍ být na prvním řádku bez žádných mezer nebo prázdných řádků
    const versionHeader = isWebGL2 ? '#version 300 es' : '';
    const varyingOut = isWebGL2 ? 'in' : 'varying';
    const fragColor = isWebGL2 ? 'out vec4 fragColor;' : '';

    if (isWebGL2) {
      // Odstraň mezery a prázdné řádky z defines a helpers pro čistý začátek
      const cleanDefines = defines ? defines.trim() : '';
      const cleanHelpers = helpers ? helpers.trim() : '';

      return `${versionHeader}
${cleanDefines}
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
${varyingOut} vec2 v_uv;
${fragColor}
${cleanHelpers}

${code}
`;
    } else {
      return `
      ${defines}
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_intensity;
      ${varyingOut} vec2 v_uv;

      ${helpers}

      ${code}
    `;
    }
  }
  return code;
};

