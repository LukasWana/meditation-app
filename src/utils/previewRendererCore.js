/**
 * Sdílené jádro pro generování shader náhledů (browser + Node)
 */

// --- Vertex + vestavěné fragment shadery ------------------------------------

export const getVertexShaderSource = (isWebGL2) => {
  if (isWebGL2) {
    return `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = (a_position + 1.0) * 0.5;
}`;
  }

  return `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = (a_position + 1.0) * 0.5;
}
`;
};

export const getBuiltInFragmentShader = (variant, isWebGL2 = false) => {
  const fragmentShaders = {
    default: `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
varying vec2 v_uv;

void main() {
  vec2 uv = v_uv;
  uv -= 0.5;
  uv.x *= u_resolution.x / u_resolution.y;
  float dist = length(uv);
  float wave1 = sin(dist * 8.0 - u_time * 2.0) * 0.5 + 0.5;
  float wave2 = sin(dist * 12.0 - u_time * 3.0) * 0.5 + 0.5;
  float wave3 = sin(dist * 6.0 - u_time * 1.5) * 0.5 + 0.5;
  float combined = (wave1 + wave2 + wave3) / 3.0;
  float gradient = 1.0 - smoothstep(0.0, 0.8, dist);
  vec3 color1 = vec3(0.956, 0.867, 0.769);
  vec3 color2 = vec3(0.9, 0.8, 0.7);
  vec3 finalColor = mix(color1, color2, combined * gradient);
  float centerGlow = 1.0 - smoothstep(0.0, 0.3, dist);
  finalColor += vec3(0.05) * centerGlow;
  float alpha = combined * gradient * u_intensity;
  gl_FragColor = vec4(finalColor, alpha);
}
`,
    meditace: `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
varying vec2 v_uv;

mat2 rotate2d(float angle) {
  return mat2(cos(angle), -sin(angle),
              sin(angle), cos(angle));
}

float variation(vec2 v1, vec2 v2, float strength, float speed) {
  return sin(dot(normalize(v1), normalize(v2)) * strength + u_time * speed) / 100.0;
}

vec3 paintCircle(vec2 uv, vec2 center, float rad, float width) {
  vec2 diff = center - uv;
  float len = length(diff);

  len += variation(diff, vec2(0.0, 1.0), 5.0, 2.0);
  len -= variation(diff, vec2(1.0, 0.0), 5.0, 2.0);

  float circle = smoothstep(rad - width, rad, len) - smoothstep(rad, rad + width, len);
  return vec3(circle);
}

void main() {
  vec2 uv = v_uv;
  uv.x *= 1.5;
  uv.x -= 0.25;

  vec3 color;
  float radius = 0.35;
  vec2 center = vec2(0.5);

  color = paintCircle(uv, center, radius, 0.1);

  vec2 v = rotate2d(u_time) * uv;
  color *= vec3(v.x, v.y, 0.7 - v.y * v.x);

  color += paintCircle(uv, center, radius, 0.01);

  gl_FragColor = vec4(color * u_intensity, u_intensity);
}
`,
    dychani: `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
varying vec2 v_uv;

vec3 pal(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
  return a + b*cos(6.28318*(c*t+d));
}

void main() {
  vec2 pixelCoord = v_uv * u_resolution;
  vec2 spiralCenter = u_resolution * 0.5;
  float abstandSpiralCenter = distance(pixelCoord, spiralCenter);
  float abstandSpiralCenterNorm = abstandSpiralCenter / length(u_resolution / 2.0);
  float winkel = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(u_time * 0.17) + u_time * 0.61;
  vec2 vergleichspunkt = spiralCenter + abstandSpiralCenter * vec2(sin(winkel), cos(winkel));
  float abstandVergleichspunkt = distance(pixelCoord, vergleichspunkt);
  float abstandVergleichspunktNorm = abstandVergleichspunkt / length(u_resolution / 2.0);
  float subtrahend = abstandVergleichspunktNorm / max(abstandSpiralCenterNorm, 0.001);
  float winkel2 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(u_time * 0.23 + 0.1) + u_time * 0.31;
  vec2 vergleichspunkt2 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel2), cos(winkel2));
  float abstandVergleichspunkt2 = distance(pixelCoord, vergleichspunkt2);
  float abstandVergleichspunktNorm2 = abstandVergleichspunkt2 / length(u_resolution / 2.0);
  float subtrahend2 = abstandVergleichspunktNorm2 / max(abstandSpiralCenterNorm, 0.001);
  float winkel3 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(u_time * 0.41 + 0.62) + u_time * 0.47;
  vec2 vergleichspunkt3 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel3), cos(winkel3));
  float abstandVergleichspunkt3 = distance(pixelCoord, vergleichspunkt3);
  float abstandVergleichspunktNorm3 = abstandVergleichspunkt3 / length(u_resolution / 2.0);
  float subtrahend3 = abstandVergleichspunktNorm3 / max(abstandSpiralCenterNorm, 0.001);
  vec3 fragColor2 = vec3(
    4.0 - subtrahend - subtrahend2 - subtrahend3,
    4.0 - subtrahend2 - subtrahend - subtrahend3,
    4.0 - subtrahend3 - subtrahend - subtrahend2
  );
  float faktor = sin(u_time * 0.5) * 0.5 + 0.5;
  faktor = pow(faktor, 5.0);
  float brightness = length(fragColor2) / 3.0;
  brightness = smoothstep(0.0, 1.5, brightness);
  vec3 whiteColor = vec3(1.0, 1.0, 1.0);
  float gradient = 1.0 - smoothstep(0.0, 0.8, abstandSpiralCenterNorm);
  vec3 finalColor = whiteColor * brightness * gradient;
  float alpha = brightness * gradient * u_intensity;
  gl_FragColor = vec4(finalColor, alpha);
}
`,
    hudba: `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
varying vec2 v_uv;

void main() {
  vec2 uv = v_uv;
  uv -= 0.5;
  uv.x *= u_resolution.x / u_resolution.y;
  float dist = length(uv);
  float wave1 = sin(dist * 6.0 - u_time * 3.0) * 0.5 + 0.5;
  float wave2 = sin(dist * 10.0 - u_time * 4.0) * 0.5 + 0.5;
  float wave3 = sin(dist * 14.0 - u_time * 5.0) * 0.5 + 0.5;
  float combined = (wave1 + wave2 + wave3) / 3.0;
  float gradient = 1.0 - smoothstep(0.0, 0.9, dist);
  vec3 color1 = vec3(0.956, 0.867, 0.769);
  vec3 color2 = vec3(0.9, 0.8, 0.7);
  vec3 color3 = vec3(0.85, 0.75, 0.65);
  vec3 finalColor = mix(color1, color2, combined * gradient);
  finalColor = mix(finalColor, color3, wave2 * 0.2);
  float alpha = combined * gradient * u_intensity;
  gl_FragColor = vec4(finalColor, alpha);
}
`,
    settings: `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
varying vec2 v_uv;

void main() {
  vec2 uv = v_uv;
  uv -= 0.5;
  uv.x *= u_resolution.x / u_resolution.y;
  float dist = length(uv);
  float wave1 = sin(dist * 7.0 - u_time * 1.0) * 0.5 + 0.5;
  float wave2 = sin(dist * 11.0 - u_time * 2.0) * 0.5 + 0.5;
  float combined = (wave1 + wave2) / 2.0;
  float gradient = 1.0 - smoothstep(0.0, 0.85, dist);
  vec3 color1 = vec3(0.956, 0.867, 0.769);
  vec3 color2 = vec3(0.94, 0.84, 0.74);
  vec3 finalColor = mix(color1, color2, combined * gradient);
  float alpha = combined * gradient * u_intensity;
  gl_FragColor = vec4(finalColor, alpha);
}
`
  };

  const shaderBody = (fragmentShaders[variant] || fragmentShaders.default).trim();

  if (!isWebGL2) {
    return shaderBody;
  }

  let webgl2Shader = shaderBody
    .replace(/\bvarying\s+vec2\s+v_uv;/g, 'in vec2 v_uv;')
    .replace(/\bgl_FragColor\b/g, 'fragColor');

  if (!webgl2Shader.includes('out vec4 fragColor')) {
    if (webgl2Shader.includes('precision')) {
      webgl2Shader = webgl2Shader.replace(
        /(precision\s+mediump\s+float;)/,
        '$1\nout vec4 fragColor;'
      );
    } else {
      webgl2Shader = `precision mediump float;\nout vec4 fragColor;\n${webgl2Shader}`;
    }
  }

  return `#version 300 es
${webgl2Shader}`;
};

// --- Helpery pro WebGL program ------------------------------------------------

const createAndCompileShader = (gl, type, source, shaderId = 'unknown', logger = console) => {
  if (!source || typeof source !== 'string') {
    const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    logger.error?.(`Preview Gen: ${shaderType} shader source invalid for ${shaderId}`, {
      source,
      type: typeof source
    });
    return null;
  }

  const shader = gl.createShader(type);
  if (!shader) {
    const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    logger.error?.(`Preview Gen: Failed to create ${shaderType} shader object for ${shaderId}`);
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  }

  const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
  const errorLog = gl.getShaderInfoLog(shader);
  logger.error?.(`Preview Gen: Error compiling ${shaderType} shader for ${shaderId}:`, errorLog || 'Unknown');
  gl.deleteShader(shader);
  return null;
};

const createProgram = (gl, vsSrc, fsSrc, shaderId = 'unknown', logger = console) => {
  const vertexShader = createAndCompileShader(gl, gl.VERTEX_SHADER, vsSrc, shaderId, logger);
  const fragmentShader = createAndCompileShader(gl, gl.FRAGMENT_SHADER, fsSrc, shaderId, logger);

  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    logger.error?.(`Preview Gen: Failed to create program for ${shaderId}`);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const linkError = gl.getProgramInfoLog(program);
    logger.error?.(`Preview Gen: Error linking program for ${shaderId}:`, linkError || 'Unknown error');
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);
    return null;
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
};

// --- Hlavní továrna -----------------------------------------------------------

export const createShaderPreviewRenderer = ({
  width = 96,
  height = 96,
  createContext,
  loadShaderSource,
  convertShaderSource,
  builtInShaderResolver = getBuiltInFragmentShader,
  encode,
  requestFrame = (cb) => setTimeout(cb, 0),
  logger = console,
  fixedTime = 5.0,
  intensity = 0.8
}) => {
  if (typeof createContext !== 'function') {
    throw new Error('createContext factory is required for shader preview renderer');
  }

  if (typeof loadShaderSource !== 'function') {
    throw new Error('loadShaderSource function is required');
  }

  if (typeof convertShaderSource !== 'function') {
    throw new Error('convertShaderSource function is required');
  }

  if (typeof encode !== 'function') {
    throw new Error('encode function is required');
  }

  const contextHandle = createContext({ width, height });
  const gl = contextHandle?.gl;
  const canvas = contextHandle?.canvas;

  if (!gl) {
    throw new Error('Failed to create WebGL context for shader preview renderer');
  }

  const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined'
    ? gl instanceof WebGL2RenderingContext
    : typeof gl.drawBuffers === 'function'; // headless-gl fallback

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const dispose = () => {
    try {
      if (gl && positionBuffer && typeof gl.deleteBuffer === 'function') {
        gl.deleteBuffer(positionBuffer);
      }
    } catch (error) {
      logger.warn?.('Preview Gen: Failed to dispose buffer', error);
    }

    try {
      contextHandle?.dispose?.();
    } catch (error) {
      logger.warn?.('Preview Gen: Failed to dispose context', error);
    }
  };

  const renderShader = async (shaderInfo, options = {}) => {
    const {
      id,
      variant,
      path,
      shaderCode
    } = shaderInfo || {};

    if (!id) {
      throw new Error('renderShader requires shaderInfo.id');
    }

    let fragmentShaderSource = null;

    if (shaderCode) {
      fragmentShaderSource = shaderCode;
    } else if (path) {
      fragmentShaderSource = await loadShaderSource(path, shaderInfo);
    }

    if (!fragmentShaderSource) {
      if (variant) {
        fragmentShaderSource = builtInShaderResolver(variant, isWebGL2);
      } else {
        throw new Error(`No shader source available for ${id}`);
      }
    }

    const vertexShaderSource = getVertexShaderSource(isWebGL2);
    let convertedFragmentSource = fragmentShaderSource;

    if (path || shaderCode) {
      convertedFragmentSource = convertShaderSource(fragmentShaderSource, path || id, isWebGL2);
    }

    const program = createProgram(gl, vertexShaderSource, convertedFragmentSource, id, logger);
    if (!program) {
      throw new Error(`Failed to create shader program for ${id}`);
    }

    gl.useProgram(program);

    const a_position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse');
    const intensityLocation = gl.getUniformLocation(program, 'u_intensity');

    if (timeLocation) gl.uniform1f(timeLocation, options.time ?? fixedTime);
    if (resolutionLocation) gl.uniform2f(resolutionLocation, width, height);
    if (mouseLocation) {
      gl.uniform2f(mouseLocation, width * 0.5, height * 0.5);
    }
    if (intensityLocation) gl.uniform1f(intensityLocation, options.intensity ?? intensity);

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const encoded = await encode({
      gl,
      canvas,
      width,
      height,
      shaderInfo,
      options
    });

    gl.deleteProgram(program);

    return encoded;
  };

  const generateBatch = async (shaders, onPreviewGenerated, onProgress, options = {}) => {
    if (!Array.isArray(shaders) || shaders.length === 0) {
      return;
    }

    const total = shaders.length;
    let index = 0;

    for (const shader of shaders) {
      index += 1;

      if (typeof onProgress === 'function') {
        onProgress(shader.id, index, total);
      }

      try {
        const result = await renderShader(shader, options);
        if (typeof onPreviewGenerated === 'function') {
          onPreviewGenerated(shader.id, result, shader);
        }
      } catch (error) {
        logger.error?.(`Preview Gen: Failed to render shader ${shader.id}`, error);
      }

      await new Promise((resolve) => requestFrame(resolve));
    }
  };

  return {
    gl,
    canvas,
    isWebGL2,
    renderShader,
    generateBatch,
    dispose
  };
};

