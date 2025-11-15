/**
 * Fallback shadery pro případ selhání kompilace
 * Jednoduché shadery, které by měly fungovat vždy
 */

/**
 * Získá fallback fragment shader pro WebGL 1.0
 * @returns {string} Fallback fragment shader
 */
export const getFallbackFragmentShaderWebGL1 = () => {
  return `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_intensity;
    varying vec2 v_uv;

    void main() {
      vec2 uv = v_uv;
      vec3 color = vec3(0.0);

      // Jednoduchý gradient
      color.r = uv.x;
      color.g = uv.y;
      color.b = sin(u_time) * 0.5 + 0.5;

      gl_FragColor = vec4(color * u_intensity, 1.0);
    }
  `;
};

/**
 * Získá fallback fragment shader pro WebGL 2.0
 * @returns {string} Fallback fragment shader
 */
export const getFallbackFragmentShaderWebGL2 = () => {
  return `#version 300 es
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 uv = v_uv;
  vec3 color = vec3(0.0);

  // Jednoduchý gradient
  color.r = uv.x;
  color.g = uv.y;
  color.b = sin(u_time) * 0.5 + 0.5;

  fragColor = vec4(color * u_intensity, 1.0);
}
`;
};

/**
 * Získá fallback vertex shader pro WebGL 1.0
 * @returns {string} Fallback vertex shader
 */
export const getFallbackVertexShaderWebGL1 = () => {
  return `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_uv = (a_position + 1.0) * 0.5;
    }
  `;
};

/**
 * Získá fallback vertex shader pro WebGL 2.0
 * @returns {string} Fallback vertex shader
 */
export const getFallbackVertexShaderWebGL2 = () => {
  return `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = (a_position + 1.0) * 0.5;
}
`;
};

/**
 * Získá fallback shader podle WebGL verze
 * @param {boolean} isWebGL2 - Zda používáme WebGL 2.0
 * @returns {Object} { vertex: string, fragment: string }
 */
export const getFallbackShaders = (isWebGL2 = false) => {
  return {
    vertex: isWebGL2 ? getFallbackVertexShaderWebGL2() : getFallbackVertexShaderWebGL1(),
    fragment: isWebGL2 ? getFallbackFragmentShaderWebGL2() : getFallbackFragmentShaderWebGL1()
  };
};



