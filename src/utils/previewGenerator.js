/**
 * Generátor statických náhledů shaderů
 * Vytváří statické obrázky (data URLs) z shaderů pro rychlejší zobrazení v galerii
 * Inspirováno projektem Haluzator.eu
 */

import { loadShader, convertShaderToWebGL } from './shaderLoader';

// Vertex shader pro náhledy - podle WebGL verze
const getVertexShaderSource = (isWebGL2) => {
  if (isWebGL2) {
    // Pro WebGL 2.0 (GLSL ES 3.00) použij 'in' místo 'attribute'
    return `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = (a_position + 1.0) * 0.5;
}`;
  } else {
    // Pro WebGL 1.0 (GLSL ES 1.0) použij 'attribute' a 'varying'
    return `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_uv = (a_position + 1.0) * 0.5;
  }
`;
  }
};

// Vestavěné fragment shadery pro náhledy
const getBuiltInFragmentShader = (variant) => {
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
    meditation: `
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
        return sin(
          dot(normalize(v1), normalize(v2)) * strength + u_time * speed
        ) / 100.0;
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
    breath: `
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

  return fragmentShaders[variant] || fragmentShaders.default;
};

/**
 * Vytvoří a zkompiluje shader
 */
const createAndCompileShader = (gl, type, source, shaderId = 'unknown') => {
  if (!source || typeof source !== 'string') {
    const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    console.error(`Preview Gen: ${shaderType} shader source is null or invalid for ${shaderId}`, {
      source,
      type: typeof source,
      isNull: source === null,
      isUndefined: source === undefined
    });
    return null;
  }

  if (source.trim().length === 0) {
    const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    console.error(`Preview Gen: ${shaderType} shader source is empty for ${shaderId}`);
    return null;
  }

  const shader = gl.createShader(type);
  if (!shader) {
    const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    console.error(`Preview Gen: Failed to create ${shaderType} shader object for ${shaderId}`);
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  }

  const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
  const errorLog = gl.getShaderInfoLog(shader);
  console.error(`Preview Gen: Error compiling ${shaderType} shader for ${shaderId}:`, errorLog || 'Unknown error');
  if (errorLog) {
    // Zobraz první pár řádků source pro debugging
    const sourceLines = source.split('\n').slice(0, 5);
    console.error(`Preview Gen: First 5 lines of ${shaderType} shader source:`, sourceLines);
  }
  gl.deleteShader(shader);
  return null;
};

/**
 * Vytvoří a propojí shader program
 */
const createProgram = (gl, vsSrc, fsSrc, shaderId = 'unknown') => {
  const vertexShader = createAndCompileShader(gl, gl.VERTEX_SHADER, vsSrc, shaderId);
  const fragmentShader = createAndCompileShader(gl, gl.FRAGMENT_SHADER, fsSrc, shaderId);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    console.error(`Preview Gen: Failed to create program for ${shaderId}`);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const linkError = gl.getProgramInfoLog(program);
    console.error(`Preview Gen: Error linking program for ${shaderId}:`, linkError || 'Unknown error');
    gl.deleteProgram(program);
    return null;
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
};

/**
 * Generuje statické náhledy pro shadery
 * @param {Array} shaders - Pole objektů s informacemi o shaderech: { id, variant, path, shaderCode }
 * @param {Function} onPreviewGenerated - Callback pro každý vygenerovaný náhled: (id, dataUrl) => void
 * @param {Function} onProgress - Volitelný callback pro progress: (id, current, total) => void
 * @returns {Promise<void>}
 */
export const generateShaderPreviews = async (
  shaders,
  onPreviewGenerated,
  onProgress
) => {
  return new Promise((resolve) => {
    if (!shaders || shaders.length === 0) {
      resolve();
      return;
    }

    const shaderQueue = [...shaders];
    const totalShaders = shaderQueue.length;

    const previewCanvas = document.createElement('canvas');
    // Velikost náhledu - 96x96 pro rychlejší generování
    previewCanvas.width = 96;
    previewCanvas.height = 96;

    // Zkus nejprve WebGL 2.0, pak fallback na WebGL 1.0
    let gl = previewCanvas.getContext('webgl2', {
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power'
    });

    if (!gl) {
      gl = previewCanvas.getContext('webgl', {
        antialias: false,
        preserveDrawingBuffer: true,
        powerPreference: 'low-power'
      });
    }

    if (!gl) {
      console.error('Preview Gen: WebGL not supported');
      resolve();
      return;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    // Pevný čas pro statický náhled (5 sekund)
    const fixedTime = 5.0;
    const intensity = 0.8;

    const processBatch = async () => {
      if (shaderQueue.length === 0) {
        if (gl.isBuffer(positionBuffer)) gl.deleteBuffer(positionBuffer);
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
        resolve();
        return;
      }

      // Zpracuj 3 shadery najednou pro lepší výkon
      const batchSize = Math.min(3, shaderQueue.length);
      const batchPromises = [];

      for (let i = 0; i < batchSize; i++) {
        const shaderInfo = shaderQueue.shift();
        if (!shaderInfo) continue;

        const { id, variant, path, shaderCode } = shaderInfo;
        const currentShaderNum = totalShaders - shaderQueue.length;

        if (onProgress) {
          onProgress(id, currentShaderNum, totalShaders);
        }

        // Vytvoř promise pro každý shader
        const shaderPromise = (async () => {
          try {
            let fragmentShaderSource = null;

            // Získej fragment shader source
            if (shaderCode) {
              // Přímý kód shaderu
              fragmentShaderSource = shaderCode;
            } else if (path) {
              // Načti shader ze souboru
              try {
                const loadedCode = await loadShader(path);
                if (loadedCode && typeof loadedCode === 'string') {
                  fragmentShaderSource = loadedCode;
                } else {
                  console.warn(`Preview Gen: Failed to load shader from path ${path} for ${id}`);
                  return;
                }
              } catch (loadError) {
                console.error(`Preview Gen: Error loading shader ${id} from ${path}:`, loadError);
                return;
              }
            } else if (variant) {
              // Vestavěný shader
              fragmentShaderSource = getBuiltInFragmentShader(variant);
            } else {
              console.warn(`Preview Gen: No shader source available for ${id} (no variant, path, or shaderCode)`);
              return;
            }

            if (!fragmentShaderSource || typeof fragmentShaderSource !== 'string') {
              console.warn(`Preview Gen: No shader source for ${id} (variant: ${variant}, path: ${path})`);
              return;
            }

            // Zjisti WebGL verzi
            const isWebGL2 = gl instanceof WebGL2RenderingContext;

            // Získej vertex shader source podle WebGL verze
            const vertexShaderSource = getVertexShaderSource(isWebGL2);
            if (!vertexShaderSource || typeof vertexShaderSource !== 'string' || vertexShaderSource.trim().length === 0) {
              console.error(`Preview Gen: Invalid vertex shader source for ${id} (isWebGL2: ${isWebGL2})`);
              return;
            }

            // Konvertuj shader na WebGL kompatibilní formát
            let convertedFragmentSource = fragmentShaderSource;
            if (path || shaderCode) {
              try {
                console.log(`Preview Gen: Converting shader ${id} (path: ${path}, isWebGL2: ${isWebGL2})`);
                convertedFragmentSource = convertShaderToWebGL(
                  fragmentShaderSource,
                  path || id,
                  isWebGL2
                );

                if (!convertedFragmentSource || typeof convertedFragmentSource !== 'string') {
                  console.error(`Preview Gen: Shader conversion returned invalid result for ${id}`, {
                    result: convertedFragmentSource,
                    type: typeof convertedFragmentSource
                  });
                  return;
                }

                console.log(`Preview Gen: Shader ${id} converted successfully, length: ${convertedFragmentSource.length}`);
              } catch (error) {
                console.error(`Preview Gen: Error converting shader ${id}:`, error);
                return;
              }
            } else {
              // Pro vestavěné shadery není potřeba konverze
              console.log(`Preview Gen: Using built-in shader for ${id} (variant: ${variant})`);
            }

            // Zkontroluj, zda máme validní fragment shader source
            if (!convertedFragmentSource || typeof convertedFragmentSource !== 'string' || convertedFragmentSource.trim().length === 0) {
              console.error(`Preview Gen: Invalid fragment shader source for ${id}`, {
                convertedFragmentSource,
                type: typeof convertedFragmentSource,
                length: convertedFragmentSource ? convertedFragmentSource.length : 0
              });
              return;
            }

            // Vytvoř program
            console.log(`Preview Gen: Creating program for ${id} (isWebGL2: ${isWebGL2})...`);
            const program = createProgram(gl, vertexShaderSource, convertedFragmentSource, id);

            if (program) {
              console.log(`Preview Gen: Program created successfully for ${id}`);
              gl.useProgram(program);

              const a_position = gl.getAttribLocation(program, 'a_position');
              gl.enableVertexAttribArray(a_position);
              gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
              gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

              // Nastav uniformy
              const timeLocation = gl.getUniformLocation(program, 'u_time');
              const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
              const intensityLocation = gl.getUniformLocation(program, 'u_intensity');

              if (timeLocation) gl.uniform1f(timeLocation, fixedTime);
              if (resolutionLocation) {
                gl.uniform2f(resolutionLocation, previewCanvas.width, previewCanvas.height);
              }
              if (intensityLocation) gl.uniform1f(intensityLocation, intensity);

              // Renderuj
              gl.viewport(0, 0, previewCanvas.width, previewCanvas.height);
              gl.clearColor(0, 0, 0, 0);
              gl.clear(gl.COLOR_BUFFER_BIT);
              gl.drawArrays(gl.TRIANGLES, 0, 6);

              try {
                // Vytvoř data URL jako WebP obrázek (kvalita 0.6 pro menší velikost)
                const dataUrl = previewCanvas.toDataURL('image/webp', 0.6);
                onPreviewGenerated(id, dataUrl);
              } catch (e) {
                console.error(`Preview Gen: Error creating data URL for ${id}`, e);
              }

              gl.deleteProgram(program);
            }
          } catch (error) {
            console.error(`Preview Gen: Error processing shader ${id}:`, error);
          }
        })();

        batchPromises.push(shaderPromise);
      }

      // Počkej na dokončení všech shaderů v batchi
      await Promise.all(batchPromises);

      // Použij requestAnimationFrame pro lepší timing a responsivitu
      requestAnimationFrame(processBatch);
    };

    processBatch();
  });
};

