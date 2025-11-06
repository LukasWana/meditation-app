/**
 * GLSL helper funkce pro WebGL 1.0 kompatibilitu
 * Funkce, které nejsou v GLSL ES 1.0, ale jsou potřebné pro shadery
 */

/**
 * Vrátí všechny helper funkce jako string
 * @param {Object} options - Možnosti, které funkce jsou potřeba
 * @returns {string} GLSL kód s helper funkcemi
 */
export const getHelperFunctions = (options = {}) => {
  const {
    needsRotate2D = false,
    needsRotate3D = false,
    needsHsv = false,
    needsTanh = false,
    needsSnoise2D = false,
    needsMod289 = false,
    needsPermute = false,
    needsRound = false
  } = options;

  let functions = '';

  // rotate2D funkce
  if (needsRotate2D) {
    functions += `
    mat2 rotate2D(float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return mat2(c, -s, s, c);
    }`;
  }

  // rotate3D funkce
  if (needsRotate3D) {
    functions += `
    mat3 rotate3D(float angle, vec3 axis) {
      float c = cos(angle);
      float s = sin(angle);
      float oc = 1.0 - c;
      axis = normalize(axis);
      return mat3(
        oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
        oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,
        oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c
      );
    }`;
  }

  // hsv funkce
  if (needsHsv) {
    functions += `
    vec3 hsv(float h, float s, float v) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(vec3(h, h, h) + K.xyz) * 6.0 - K.www);
      return v * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), s);
    }`;
  }

  // tanh funkce - není v GLSL ES 1.0
  if (needsTanh) {
    functions += `
    float tanh(float x) {
      float ex = exp(x);
      float emx = exp(-x);
      return (ex - emx) / (ex + emx);
    }

    vec2 tanh(vec2 x) {
      return vec2(tanh(x.x), tanh(x.y));
    }

    vec3 tanh(vec3 x) {
      return vec3(tanh(x.x), tanh(x.y), tanh(x.z));
    }

    vec4 tanh(vec4 x) {
      return vec4(tanh(x.x), tanh(x.y), tanh(x.z), tanh(x.w));
    }`;
  }

  // mod289 funkce - potřebné pro snoise2D
  if (needsMod289 || needsPermute || needsSnoise2D) {
    functions += `
    vec4 mod289(vec4 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec3 mod289(vec3 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec2 mod289(vec2 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }`;
  }

  // permute funkce - potřebné pro snoise2D
  if (needsPermute || needsSnoise2D) {
    functions += `
    vec4 permute(vec4 x) {
      return mod289(((x * 34.0) + 1.0) * x);
    }

    vec3 permute(vec3 x) {
      return mod289(((x * 34.0) + 1.0) * x);
    }`;
  }

  // snoise2D - 2D simplex noise funkce
  if (needsSnoise2D) {
    functions += `
    float snoise2D(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }`;
  }

  // round funkce - není v GLSL ES 1.0
  if (needsRound) {
    functions += `
    float round(float x) {
      return floor(x + 0.5);
    }

    vec2 round(vec2 x) {
      return vec2(round(x.x), round(x.y));
    }

    vec3 round(vec3 x) {
      return vec3(round(x.x), round(x.y), round(x.z));
    }

    vec4 round(vec4 x) {
      return vec4(round(x.x), round(x.y), round(x.z), round(x.w));
    }`;
  }

  return functions;
};

/**
 * Helper definice (makro)
 */
export const getHelperDefines = () => {
  return `
    #define X d=min(d,length(p))
  `;
};


