/**
 * Utility pro načítání shader souborů
 */

// Načti všechny mini-shader soubory
const miniShadersModules = import.meta.glob('/src/assets/mini-shaders/*.glsl', {
  as: 'raw',
  eager: false
});

// Načti všechny shader soubory
const shadersModules = import.meta.glob('/src/assets/shaders/*.fs', {
  as: 'raw',
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
    const name = fileName.replace('.fs', '');
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
        return await module();
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to load shader:', shaderPath, error);
    return null;
  }
};

/**
 * Převeď shader kód na WebGL fragment shader
 */
export const convertShaderToWebGL = (shaderCode, shaderPath) => {
  // Pro mini-shaders - často mají jen kód bez hlavičky
  if (shaderPath.includes('mini-shaders')) {
    // Mini-shaders často používají FC (fragCoord), r (resolution), t (time), o (output)
    // Musíme je převést na standardní WebGL
    let converted = shaderCode;

    // Pokud shader používá FC (fragCoord), nahraď za v_uv * u_resolution
    if (converted.includes('FC.xy')) {
      converted = `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform float u_intensity;
        varying vec2 v_uv;

        void main() {
          vec2 FC = v_uv * u_resolution;
          vec2 r = u_resolution;
          float t = u_time;
          vec4 o;
          ${converted}
          gl_FragColor = o * u_intensity;
        }
      `;
    } else {
      // Pokud už má standardní formát, přidej jen uniformy
      if (!converted.includes('precision mediump float')) {
        converted = `
          precision mediump float;
          uniform float u_time;
          uniform vec2 u_resolution;
          uniform float u_intensity;
          varying vec2 v_uv;

          ${converted}
        `;
      }
    }

    return converted;
  }

  // Pro shaders (.fs) - ISF formát
  if (shaderPath.includes('shaders')) {
    // Odstraň JSON metadata (pokud existuje)
    const jsonEnd = shaderCode.indexOf('*/');
    let code = shaderCode;
    if (jsonEnd !== -1) {
      code = shaderCode.substring(jsonEnd + 2).trim();
    }

    // ISF používá isf_FragNormCoord místo v_uv
    code = code.replace(/isf_FragNormCoord/g, 'v_uv');
    code = code.replace(/IMG_NORM_PIXEL\(/g, 'texture2D(');

    // Přidej standardní hlavičku
    if (!code.includes('precision mediump float')) {
      code = `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform float u_intensity;
        varying vec2 v_uv;

        ${code}
      `;
    }

    return code;
  }

  return shaderCode;
};

