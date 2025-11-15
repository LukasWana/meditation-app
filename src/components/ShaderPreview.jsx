import React, { useRef, useEffect, useState } from 'react';
import { loadShader, convertShaderToWebGL, validateShaderCode, sanitizeSyntaxErrors } from '@utils/shaderLoader';
import { handleShaderError } from '@utils/shaderErrorHandler';
import { attemptErrorRecovery } from '@utils/shaderErrorRecovery';
import { getFallbackShaders } from '@utils/fallbackShaders';
import { getWebGLContext, releaseWebGLContext, updateContextUsage } from '@utils/webgl/contextManager';
import { getCachedShader, cacheShader, getCachedProgram, cacheProgram } from '@utils/shaderCache';
import { recordShaderError, recordRecoveryAttempt, recordFallbackUsage } from '@utils/shaderErrorAnalytics';
import { logDebug, getShaderDebugInfo, isDebugModeEnabled } from '@utils/shaderDebug';
import { getOptimalDPR } from '@utils/deviceDetection';
import { useTheme } from '@hooks/useTheme';

/**
 * Komponenta pro statický náhled shaderu
 * Zobrazuje shader jako čtvercový náhled
 */
const ShaderPreview = ({
  variant, // Starý způsob - použije vestavěné shadery
  shaderPath, // Nový způsob - načte shader ze souboru
  shaderCode, // Přímý kód shaderu
  size = 120,
  isSelected = false,
  onClick,
  intensity = 0.8
}) => {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);
  const positionBufferRef = useRef(null);
  const [gl, setGl] = useState(null);
  const [shaderProgram, setShaderProgram] = useState(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Vertex shader - jednoduchý fullscreen quad
  // Verze se přidá dynamicky podle WebGL verze
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

  // Fragment shadery pro různé varianty (zkopírované z BackgroundShader)
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

        // paint color circle
        color = paintCircle(uv, center, radius, 0.1);

        // color with gradient
        vec2 v = rotate2d(u_time) * uv;
        color *= vec3(v.x, v.y, 0.7 - v.y * v.x);

        // paint white circle
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

  const [loadedShaderCode, setLoadedShaderCode] = useState(null);
  const [shaderError, setShaderError] = useState(null);

  // Načti shader ze souboru, pokud je zadán shaderPath
  useEffect(() => {
    // Resetuj stav při změně shaderPath nebo shaderCode
    setLoadedShaderCode(null);
    setShaderError(null);
    setGl(null);
    setShaderProgram(null);

    if (shaderPath) {
      let isMounted = true;

      loadShader(shaderPath)
        .then(code => {
          if (!isMounted) return;

          if (code && typeof code === 'string' && code.trim().length > 0) {
            try {
              // Validuj shader kód před uložením
              const validation = validateShaderCode(code);
              if (!validation.isValid) {
                if (isMounted) {
                  setShaderError(validation.errors.join('; ') || 'Neplatný shader kód');
                }
                return;
              }

              // Zobraz varování v konzoli, pokud existují
              if (validation.warnings.length > 0) {
                console.warn('Shader validation warnings:', validation.warnings);
              }

              // Neukonvertuj shader tady - počkáme až při kompilaci, kdy známe WebGL verzi
              if (isMounted) {
                setLoadedShaderCode(code); // Ulož původní kód
                setShaderError(null);
              }
            } catch (error) {
              console.error('Failed to convert shader:', error);
              if (isMounted) {
                setShaderError(error?.message || error?.toString() || 'Chyba konverze shaderu');
              }
            }
          } else {
            if (isMounted) {
              setShaderError('Chyba načtení shaderu: prázdný nebo neplatný kód');
            }
          }
        })
        .catch(error => {
          console.error('Failed to load shader:', error);
          if (isMounted) {
            setShaderError(error?.message || error?.toString() || 'Chyba načtení shaderu');
          }
        });

      return () => {
        isMounted = false;
      };
    } else if (shaderCode) {
      setLoadedShaderCode(shaderCode);
      setShaderError(null);
    }
  }, [shaderPath, shaderCode]);

  // Získej fragment shader source
  const getFragmentShaderSource = () => {
    if (loadedShaderCode) {
      return loadedShaderCode;
    }
    if (shaderCode) {
      return shaderCode;
    }
    // Pokud je zadán shaderPath, ale ještě není načten, vrať null
    if (shaderPath && !loadedShaderCode) {
      return null;
    }
    return fragmentShaders[variant] || fragmentShaders.default;
  };

  const fragmentShaderSource = getFragmentShaderSource();

  // Inicializace WebGL
  useEffect(() => {
    // Vyčisti předchozí WebGL resources při změně
    if (gl && shaderProgram) {
      // Cleanup se provede v return funkci
    }

    if (shaderError) {
      // Neinicializuj, pokud je chyba
      setGl(null);
      setShaderProgram(null);
      return;
    }

    // Pokud je zadán shaderPath, počkej na načtení shaderu
    if (shaderPath && !loadedShaderCode && !shaderError) {
      return;
    }

    if (!fragmentShaderSource) {
      // Nemáme shader source
      setGl(null);
      setShaderProgram(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Použij WebGL context manager pro správné správa kontextů
    const glContext = getWebGLContext(canvas, {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false
    });

    if (!glContext) {
      console.warn('⚠️ ShaderPreview: Nelze vytvořit WebGL kontext');
      return;
    }

    const isWebGL2 = glContext instanceof WebGL2RenderingContext;

    // Aktualizuj použití kontextu
    updateContextUsage(glContext);

    const dpr = getOptimalDPR(); // Optimalizovaný DPR (max 1.5x na mobilních zařízeních)
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    glContext.viewport(0, 0, canvas.width, canvas.height);

    // Konvertuj shader s aktuální WebGL verzí
    let convertedFragmentSource = fragmentShaderSource;
    if (shaderPath && loadedShaderCode) {
      try {
        convertedFragmentSource = convertShaderToWebGL(loadedShaderCode, shaderPath, isWebGL2);
        if (!convertedFragmentSource || typeof convertedFragmentSource !== 'string') {
          setShaderError('Chyba konverze shaderu: neplatný výsledek');
          return;
        }
      } catch (error) {
        console.error('Shader conversion error:', error);
        let errorMessage = error?.message || 'Chyba konverze shaderu';

        // Zkrať dlouhé chybové hlášky
        if (errorMessage.length > 200) {
          errorMessage = errorMessage.substring(0, 200) + '...';
        }

        setShaderError(errorMessage);
        return;
      }
    }

    const createShader = (type, source) => {
      if (!source || typeof source !== 'string' || source.trim().length === 0) {
        return { shader: null, error: 'Prázdný shader kód' };
      }

      // Zkontroluj cache pro shader
      const shaderCacheKey = type === glContext.VERTEX_SHADER ? 'vertex' : 'fragment';
      const cached = getCachedShader(source, isWebGL2, shaderPath);
      if (cached && cached.shader) {
        // Zkontroluj, zda je shader stále validní
        if (glContext.isShader(cached.shader)) {
          if (isDebugModeEnabled()) {
            logDebug('shader.cache.hit', { type: shaderCacheKey, shaderPath });
          }
          return { shader: cached.shader, error: null };
        }
      }

      // Sanitizuj shader kód před kompilací - oprav neplatné formáty čísel
      const sanitizeShaderCode = (code) => {
        if (!code || typeof code !== 'string') {
          return code;
        }

        // Oprav formáty s více tečkami: "6.04.0" -> "6.04", "192.00.0" -> "192.0"
        let previousCode = '';
        let iterations = 0;
        while (previousCode !== code && iterations < 10) {
          previousCode = code;
          iterations++;

          // Oprav formáty s více tečkami: "6.04.0" -> "6.04"
          code = code.replace(/\b(-?\d+\.\d+\.\d+)\b/g, (match) => {
            const parts = match.split('.');
            // Pokud je druhá část "00" nebo "0", použij jen první část s ".0"
            if (parts[1] === '00' || parts[1] === '0') {
              return parts[0] + '.0';
            }
            // Jinak vezmi první dvě části
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
        // Oprav také formáty s tečkou na konci řádku
        code = code.replace(/\b(-?\d+\.\d+)\.(\s|$)/g, (match, num, after) => {
          return num + after;
        });

        // Oprav formáty jako "10.", "1." -> "10.0", "1.0"
        code = code.replace(/\b(-?\d+)\.(\s|;|,|\)|\[|\]|\+|-|\*|\/|%|&|\||\^|~|!|=|<|>|\?|:)/g, (match, num, after) => {
          return num + '.0' + after;
        });
        code = code.replace(/\b(-?\d+)\.(\s|$)/g, (match, num, after) => {
          return num + '.0' + after;
        });

        // Oprav tečky okolo čísla: ".6.04." -> "0.604" (ale opatrně, aby se nezměnilo něco jiného)
        code = code.replace(/\b\.(\d+)\./g, '0.$1');

        return code;
      };

      let sanitizedSource = sanitizeShaderCode(source);
      // Aplikuj také sanitizaci syntax chyb
      sanitizedSource = sanitizeSyntaxErrors(sanitizedSource);

      if (isWebGL2) {
        if (!sanitizedSource.trimStart().startsWith('#version')) {
          sanitizedSource = `#version 300 es\n${sanitizedSource}`;
        }
      } else {
        sanitizedSource = sanitizedSource
          .replace(/^\s*#version\s+.*$/gm, '')
          .replace(/\bout\s+vec4\s+fragColor\s*;?\s*/g, '')
          .replace(/(^|\s)in\s+(vec[234]\s+v_\w+)/g, '$1varying $2')
          .replace(/(^|\s)out\s+(vec[234]\s+v_\w+)/g, '$1varying $2')
          .replace(/\bfragColor\b/g, 'gl_FragColor');
      }

      // Debug: log shader source před kompilací (pouze pokud je chyba)
      // Uložíme source pro případné debugging
      const shader = glContext.createShader(type);
      glContext.shaderSource(shader, sanitizedSource);
      glContext.compileShader(shader);
      if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        const errorLog = glContext.getShaderInfoLog(shader);
        // Zpracuj chybovou hlášku - zkrať a zjednoduš
        let errorMessage = errorLog || 'Neznámá chyba kompilace shaderu';

        // Pokud je to warning, ignoruj ho
        if (errorMessage.includes('WARNING')) {
          // Pro warnings stále vrátíme shader, ale zalogujeme varování
          console.warn('Shader compilation warning:', errorMessage);
          return { shader, error: null };
        }

        // Použij centralizovaný error handler
        const errorInfo = handleShaderError(errorLog, sanitizedSource, type === glContext.VERTEX_SHADER ? 'vertex' : 'fragment');

        // Zaznamenej chybu do analytics
        const errorType = errorInfo.errors.length > 0 ? errorInfo.errors[0].type : 'unknown';
        recordShaderError(shaderPath, errorType, errorMessage, {
          line: errorInfo.errors.length > 0 ? errorInfo.errors[0].line : null,
          webglVersion: isWebGL2 ? 'webgl2' : 'webgl1'
        });

        // Debug: log shader source při chybě pro debugging
        if (isDebugModeEnabled()) {
          const debugInfo = getShaderDebugInfo(sanitizedSource, { shaderPath, isWebGL2 });
          logDebug('shader.error', {
            shaderPath,
            errorType,
            errorMessage,
            debugInfo,
            errorInfo
          });
        }

        if (errorInfo.errors.length > 0) {
          const mainError = errorInfo.errors[0];
          console.error(`❌ Shader compilation error at line ${mainError.line + 1}:`, mainError.lineContent);
          console.error('📋 Error context:', mainError.context);
          console.error('🔍 Error type:', errorType);
          console.error('📝 Error message:', mainError.message);
          if (errorInfo.errors.length > 1) {
            console.error(`⚠️ Total errors: ${errorInfo.errors.length}`);
            errorInfo.errors.slice(1, 4).forEach((err, idx) => {
              console.error(`  ${idx + 2}. Line ${err.line + 1}: ${err.message}`);
            });
          }
          if (isDebugModeEnabled()) {
            console.error('📄 Full shader source:', sanitizedSource);
          }
        } else {
          console.error('❌ Shader compilation error:', errorLog);
          console.error('🔍 Error type:', errorType);
          if (isDebugModeEnabled()) {
            console.error('📄 Shader source:', sanitizedSource);
          }
        }

        // Pokus se o automatickou opravu, pokud je to možné
        if (errorInfo.canRecover && errorInfo.recoveryStrategy) {
          const recovery = attemptErrorRecovery(sanitizedSource, errorInfo.errors, isWebGL2);
          if (recovery.fixed && recovery.appliedFixes.length > 0) {
            // Zaznamenej pokus o recovery
            recordRecoveryAttempt(shaderPath, false, recovery.appliedFixes);

            // Zkus znovu kompilovat s opraveným kódem
            const retryShader = glContext.createShader(type);
            glContext.shaderSource(retryShader, recovery.fixedCode);
            glContext.compileShader(retryShader);
            if (glContext.getShaderParameter(retryShader, glContext.COMPILE_STATUS)) {

              // Zaznamenej úspěšný recovery
              recordRecoveryAttempt(shaderPath, true, recovery.appliedFixes);

              if (isDebugModeEnabled()) {
                logDebug('shader.recovery', {
                  shaderPath,
                  success: true,
                  appliedFixes: recovery.appliedFixes
                });
              }

              return { shader: retryShader, error: null };
            } else {
              const retryError = glContext.getShaderInfoLog(retryShader);
              console.error('Shader compilation still failed after recovery:', retryError);
              glContext.deleteShader(retryShader);

              // Zaznamenej neúspěšný recovery
              recordRecoveryAttempt(shaderPath, false, recovery.appliedFixes);
            }
          }
        }

        // Zkrať dlouhé chybové hlášky
        if (errorMessage.length > 200) {
          errorMessage = errorMessage.substring(0, 200) + '...';
        }

        // Použij uživatelsky přívětivou zprávu z error handleru
        const finalErrorMessage = errorInfo.userMessage || errorMessage
          .replace(/ERROR:\s*\d+:\d+:/g, 'Řádek ')
          .replace(/ERROR:/g, 'Chyba:')
          .replace(/syntax error/g, 'syntaktická chyba')
          .replace(/invalid number/g, 'neplatné číslo')
          .replace(/dimension mismatch/g, 'nesoulad dimenzí')
          .replace(/cannot convert/g, 'nelze převést')
          .replace(/field selection requires/g, 'výběr pole vyžaduje')
          .replace(/Name of a built-in function cannot be redeclared/g, 'Vestavěná funkce nemůže být redeklarována')
          .replace(/Illegal use of reserved word/g, 'Nepovolené použití rezervovaného slova');

        glContext.deleteShader(shader);
        return { shader: null, error: finalErrorMessage };
      }

      // Ulož shader do cache, pokud je úspěšně zkompilován
      const shaderTypeKey = type === glContext.VERTEX_SHADER ? 'vertex' : 'fragment';
      cacheShader(source, shader, isWebGL2, shaderPath);
      if (isDebugModeEnabled()) {
        logDebug('shader.cache.store', { type: shaderTypeKey, shaderPath });
      }

      return { shader, error: null };
    };

    // Získej vertex shader source s správnou verzí
    const vertexShaderSourceWithVersion = getVertexShaderSource(isWebGL2);

    // Zkontroluj cache pro program
    const cachedProgram = getCachedProgram(vertexShaderSourceWithVersion, convertedFragmentSource, isWebGL2, shaderPath);
    if (cachedProgram && cachedProgram.program) {
      // Zkontroluj, zda je program stále validní
      if (glContext.isProgram(cachedProgram.program)) {
        if (isDebugModeEnabled()) {
          logDebug('program.cache.hit', { shaderPath });
        }
        // Použij cached program
        const positionBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
        glContext.bufferData(
          glContext.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          glContext.STATIC_DRAW
        );
        positionBufferRef.current = positionBuffer;
        setGl(glContext);
        setShaderProgram(cachedProgram.program);

        // Vrať cleanup funkci i pro cached program
        return () => {
          // Cleanup WebGL resources pro cached program
          try {
            if (glContext && !glContext.isContextLost()) {
              if (positionBufferRef.current && glContext.isBuffer(positionBufferRef.current)) {
                glContext.deleteBuffer(positionBufferRef.current);
                positionBufferRef.current = null;
              }
            }
          } catch (error) {
            console.warn('⚠️ ShaderPreview: Chyba při cleanup cached program resources:', error);
          }

          // Uvolni WebGL kontext pomocí context manageru
          if (glContext) {
            try {
              releaseWebGLContext(glContext);
            } catch (error) {
              console.warn('⚠️ ShaderPreview: Chyba při uvolňování kontextu:', error);
            }
          }

          // Neodstraňuj program z cache - může být použit jinde
          // Reset state
          setGl(null);
          setShaderProgram(null);
        };
      }
    }

    const vertexResult = createShader(glContext.VERTEX_SHADER, vertexShaderSourceWithVersion);
    const fragmentResult = createShader(glContext.FRAGMENT_SHADER, convertedFragmentSource);

    if (vertexResult.error) {
      setShaderError(vertexResult.error);
      setGl(null);
      setShaderProgram(null);
      return;
    }

    let fragmentShader = fragmentResult.shader;

    if (fragmentResult.error) {
      // Fragment shader selhal - zkus použít fallback shader
      console.warn('Fragment shader compilation failed, attempting fallback shader...');

      // Zaznamenej použití fallbacku
      recordFallbackUsage(shaderPath, 'compilation_failed');

      if (isDebugModeEnabled()) {
        logDebug('shader.fallback', {
          shaderPath,
          reason: 'compilation_failed'
        });
      }

      const fallbackShaders = getFallbackShaders(isWebGL2);
      const fallbackResult = createShader(glContext.FRAGMENT_SHADER, fallbackShaders.fragment);
      if (fallbackResult.error || !fallbackResult.shader) {
        // Fallback shader také selhal - zobraz detailní chybu
        console.error('❌ Fallback shader compilation failed:', fallbackResult.error);
        console.error('❌ Original shader error:', fragmentResult.error);
        console.error('⚠️ Both original and fallback shaders failed to compile');

        // Zobraz kombinovanou chybovou zprávu
        const combinedError = `Original shader failed: ${fragmentResult.error}\nFallback shader also failed: ${fallbackResult.error || 'Unknown error'}`;
        setShaderError(combinedError);
        setGl(null);
        setShaderProgram(null);
        return;
      }
      fragmentShader = fallbackResult.shader;
      setIsUsingFallback(true);
      console.warn('⚠️ Shader preview is using fallback shader - original shader had compilation errors');
    } else {
      setIsUsingFallback(false);
    }

    const vertexShader = vertexResult.shader;

    // Kontrola, zda jsou shadery zkompilovány před linkováním
    if (!vertexShader || !fragmentShader) {
      const errorMsg = 'Shader není zkompilován - nelze linkovat program';
      console.error('Program linking error:', errorMsg);
      setShaderError('Chyba: Shader není zkompilován');
      if (vertexShader) glContext.deleteShader(vertexShader);
      if (fragmentShader) glContext.deleteShader(fragmentShader);
      setGl(null);
      setShaderProgram(null);
      return;
    }

    const program = glContext.createProgram();
    glContext.attachShader(program, vertexShader);
    glContext.attachShader(program, fragmentShader);
    glContext.linkProgram(program);

    if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
      const errorLog = glContext.getProgramInfoLog(program);
      console.error('Program linking error:', errorLog);

      // Zpracuj chybovou hlášku - zkrať a zjednoduš
      let errorMessage = errorLog || 'Chyba propojení shader programu';

      // Zkrať dlouhé chybové hlášky
      if (errorMessage.length > 200) {
        errorMessage = errorMessage.substring(0, 200) + '...';
      }

      // Zjednoduš chybové hlášky
      errorMessage = errorMessage
        .replace(/ERROR:/g, 'Chyba:')
        .replace(/syntax error/g, 'syntaktická chyba')
        .replace(/invalid number/g, 'neplatné číslo')
        .replace(/dimension mismatch/g, 'nesoulad dimenzí')
        .replace(/cannot convert/g, 'nelze převést');

      setShaderError(errorMessage);
      glContext.deleteProgram(program);
      glContext.deleteShader(vertexShader);
      glContext.deleteShader(fragmentShader);
      setGl(null);
      setShaderProgram(null);
      return;
    }

    // Ulož program do cache
    cacheProgram(vertexShaderSourceWithVersion, convertedFragmentSource, program, isWebGL2, shaderPath);

    if (isDebugModeEnabled()) {
      logDebug('program.cache.store', { shaderPath });
      const debugInfo = getShaderDebugInfo(convertedFragmentSource, { shaderPath, isWebGL2 });
      logDebug('shader.compile', {
        shaderPath,
        success: true,
        debugInfo
      });
    }

    const positionBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
    glContext.bufferData(
      glContext.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      glContext.STATIC_DRAW
    );
    positionBufferRef.current = positionBuffer;

    setGl(glContext);
    setShaderProgram(program);

    return () => {
      // Cleanup WebGL resources
      // Použij try-catch pro bezpečné cleanup
      try {
        // Zkontroluj, zda je kontext stále validní
        if (glContext && !glContext.isContextLost()) {
          if (vertexShader && glContext.isShader(vertexShader)) {
            glContext.deleteShader(vertexShader);
          }
          if (fragmentShader && glContext.isShader(fragmentShader)) {
            glContext.deleteShader(fragmentShader);
          }
          if (program && glContext.isProgram(program)) {
            // Neodstraňuj program z cache - může být použit jinde
            // glContext.deleteProgram(program);
          }
          if (positionBufferRef.current && glContext.isBuffer(positionBufferRef.current)) {
            glContext.deleteBuffer(positionBufferRef.current);
            positionBufferRef.current = null;
          }
        }
      } catch (error) {
        console.warn('⚠️ ShaderPreview: Chyba při cleanup WebGL resources:', error);
      }

      // Uvolni WebGL kontext pomocí context manageru
      if (glContext) {
        try {
          releaseWebGLContext(glContext);
        } catch (error) {
          console.warn('⚠️ ShaderPreview: Chyba při uvolňování kontextu:', error);
        }
      }

      // Reset state
      setGl(null);
      setShaderProgram(null);
    };
  }, [fragmentShaderSource, size, shaderError, shaderPath, loadedShaderCode]);

  // Render loop
  useEffect(() => {
    if (!gl || !shaderProgram) {
      // Zastav předchozí render loop, pokud existuje
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let isMounted = true;

    // Pomocná funkce pro kontrolu kontextu a zastavení renderování
    const checkContextAndStop = (reason = '') => {
      if (gl && gl.isContextLost && gl.isContextLost()) {
        if (reason) {
          console.warn(`⚠️ ShaderPreview: WebGL kontext byl ztracen${reason ? ` - ${reason}` : ''}`);
        }
        isMounted = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setGl(null);
        setShaderProgram(null);
        return true;
      }
      return false;
    };

    const render = (currentTime) => {
      if (!isMounted || !gl || !shaderProgram) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }

      // Zkontroluj, zda je kontext stále validní
      try {
        // Zkontroluj, zda je kontext ztracen (před jakýmkoliv použitím)
        if (checkContextAndStop('na začátku renderování')) {
          return;
        }

        if (!gl.canvas || !gl.canvas.parentNode) {
          // Canvas byl odstraněn z DOM - zastav renderování
          isMounted = false;
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          return;
        }

        // Zkontroluj znovu, zda není kontext ztracen (může se stát během renderování)
        if (checkContextAndStop('během renderování')) {
          return;
        }

        timeRef.current = currentTime * 0.001;

        // Aktualizuj použití kontextu při renderování
        updateContextUsage(gl);

        // Zkontroluj znovu před použitím WebGL API
        if (checkContextAndStop('před použitím WebGL API')) {
          return;
        }

        gl.useProgram(shaderProgram);

        const timeLocation = gl.getUniformLocation(shaderProgram, 'u_time');
        const resolutionLocation = gl.getUniformLocation(shaderProgram, 'u_resolution');
        const mouseLocation = gl.getUniformLocation(shaderProgram, 'u_mouse');
        const intensityLocation = gl.getUniformLocation(shaderProgram, 'u_intensity');

        // Zkontroluj znovu před nastavením uniformů
        if (checkContextAndStop('před nastavením uniformů')) {
          return;
        }

        if (timeLocation) gl.uniform1f(timeLocation, timeRef.current);
        let width = gl.canvas.width || 1;
        let height = gl.canvas.height || 1;
        if (resolutionLocation) {
          gl.uniform2f(resolutionLocation, width, height);
        }
        if (mouseLocation) {
          const mouseX = width * 0.5;
          const mouseY = height * 0.5;
          gl.uniform2f(mouseLocation, mouseX, mouseY);
        }
        if (intensityLocation) gl.uniform1f(intensityLocation, intensity);

        const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
        if (positionBufferRef.current) {
          // Zkontroluj znovu před použitím bufferu
          if (checkContextAndStop('před použitím bufferu')) {
            return;
          }
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
          gl.enableVertexAttribArray(positionLocation);
          gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        }

        // Zkontroluj znovu před draw call
        if (checkContextAndStop('před draw call')) {
          return;
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } catch (error) {
        // Chyba při renderování - zastav renderování
        console.warn('⚠️ ShaderPreview: Chyba při renderování:', error);
        isMounted = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        // Zkontroluj, zda není kontext ztracen
        checkContextAndStop('v catch bloku');
        return;
      }

      // Zkontroluj znovu před requestAnimationFrame
      if (!isMounted || !gl || !shaderProgram || checkContextAndStop('před requestAnimationFrame')) {
        return;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Zkontroluj, zda kontext není ztracen před spuštěním render loop
    if (checkContextAndStop('před spuštěním render loop')) {
      return;
    }

    // Zkontroluj, zda canvas je stále v DOM
    if (!gl.canvas || !gl.canvas.parentNode) {
      console.warn('⚠️ ShaderPreview: Canvas byl odstraněn z DOM před spuštěním render loop');
      return;
    }

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gl, shaderProgram, intensity]);

  return (
    <div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        border: isSelected ? `3px solid ${theme.colors.black}` : (isUsingFallback ? `2px solid ${theme.colors.yellow?.[500] || '#ff9800'}` : `1px solid ${theme.colors.overlay.black20}`),
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        backgroundColor: theme.colors.background,
        transition: 'border-color 0.2s ease',
        boxShadow: isUsingFallback ? `0 0 4px ${theme.colors.yellow?.[500] || '#ff9800'}80` : 'none'
      }}
      title={isUsingFallback ? '⚠️ Using fallback shader - original shader had compilation errors' : undefined}
    >
      {shaderError ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            color: '#d32f2f',
            textAlign: 'center',
            padding: '8px',
            overflow: 'hidden'
          }}
          title={shaderError}
        >
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>Chyba</div>
          <div
            style={{
              fontSize: '10px',
              color: '#666',
              wordBreak: 'break-word',
              maxHeight: '60px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {shaderError.length > 100 ? shaderError.substring(0, 100) + '...' : shaderError}
          </div>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
      )}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: '2px solid #000',
            pointerEvents: 'none'
          }}
        />
      )}
      {isUsingFallback && !shaderError && (
        <div
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 8,
            height: 8,
            backgroundColor: '#ff9800',
            borderRadius: '50%',
            pointerEvents: 'none',
            boxShadow: '0 0 2px rgba(255, 152, 0, 0.8)'
          }}
          title="Using fallback shader"
        />
      )}
    </div>
  );
};

export default ShaderPreview;

