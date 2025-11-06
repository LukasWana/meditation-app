import React, { useRef, useEffect, useState, useMemo } from 'react';
import { loadShader, convertShaderToWebGL } from '@utils/shaderLoader';
import { createProgramManager } from '@utils/webgl/programManager';

/**
 * Univerzální shader komponenta pro pozadí stránek
 * Podporuje různé varianty shaderů a načítání shaderů ze souborů (px-stream formát)
 */
const BackgroundShader = ({
  variant = 'default', // 'default', 'meditace', 'dychani', 'hudba', 'settings', nebo ID shaderu (např. 'mini-ShaderName', 'shader-ShaderName')
  intensity = 0.3, // Intenzita shaderu (0-1)
  enabled = true, // Zda je shader aktivní
  opacity = 1.0, // Opacity pro plynulé prolnutí (0-1)
  // Parametry dýchání pro synchronizaci animace
  breathPhase = null, // 'in' | 'out' | null - fáze dýchání
  breathInDuration = 4, // Délka nádechu v sekundách
  breathOutDuration = 4, // Délka výdechu v sekundách
  // Audio data pro synchronizaci s hudbou
  audioData = null // { frequencies: Array<number>, amplitude: number, bass: number, mid: number, treble: number }
}) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);
  const programManagerRef = useRef(null);
  const [gl, setGl] = useState(null);
  const [programInfo, setProgramInfo] = useState(null);
  const [loadedShaderCode, setLoadedShaderCode] = useState(null);
  const [shaderError, setShaderError] = useState(null);
  const phaseStartTimeRef = useRef(Date.now());
  const previousPhaseRef = useRef(breathPhase);
  const previousVariantRef = useRef(variant);

  // Inicializuj Program Manager
  useEffect(() => {
    if (!programManagerRef.current) {
      programManagerRef.current = createProgramManager();
    }
    return () => {
      // Cleanup při unmount
      if (programManagerRef.current && gl) {
        programManagerRef.current.cleanup(gl);
      }
    };
  }, [gl]);

  // Aktualizuj čas začátku fáze při změně breathPhase
  useEffect(() => {
    if (breathPhase && breathPhase !== previousPhaseRef.current) {
      phaseStartTimeRef.current = Date.now();
      previousPhaseRef.current = breathPhase;
    }
  }, [breathPhase]);

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

  // Fragment shadery pro různé varianty - podle WebGL verze
  const getFragmentShader = (variant, isWebGL2) => {
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
        vec3 color1 = vec3(0.956, 0.867, 0.769); // #f4ddc4
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
      uniform float u_breathPhase; // -1 = žádné dýchání, 0 = nádech, 1 = výdech
      uniform float u_breathProgress; // 0.0 - 1.0 = progress aktuální fáze
      varying vec2 v_uv;

      // Paleta barev - pro bílou variantu
      vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
        return a + b*cos( 6.28318*(c*t+d) );
      }

      void main() {
        // UV souřadnice jsou v rozsahu 0-1, převedeme na pixelové souřadnice
        // u_resolution obsahuje skutečnou velikost canvasu (width * dpr, height * dpr)
        vec2 pixelCoord = v_uv * u_resolution;
        vec2 spiralCenter = u_resolution * 0.5;

        float abstandSpiralCenter = distance(pixelCoord, spiralCenter);
        float abstandSpiralCenterNorm = abstandSpiralCenter / length(u_resolution / 2.0);

        // První spirála - synchronizovaná s dýcháním
        float timeMultiplier = u_breathPhase >= 0.0 ? mix(1.5, 0.5, u_breathPhase) : 1.0;
        float breathTime = u_time * timeMultiplier + (u_breathPhase >= 0.0 ? u_breathProgress * 2.0 : 0.0);
        float winkel = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(breathTime * 0.17) + breathTime * 0.61;
        vec2 vergleichspunkt = spiralCenter + abstandSpiralCenter * vec2(sin(winkel), cos(winkel));
        float abstandVergleichspunkt = distance(pixelCoord, vergleichspunkt);
        float abstandVergleichspunktNorm = abstandVergleichspunkt / length(u_resolution / 2.0);
        float subtrahend = abstandVergleichspunktNorm / max(abstandSpiralCenterNorm, 0.001);

        // Druhá spirála - synchronizovaná s dýcháním
        float winkel2 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(breathTime * 0.23 + 0.1) + breathTime * 0.31;
        vec2 vergleichspunkt2 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel2), cos(winkel2));
        float abstandVergleichspunkt2 = distance(pixelCoord, vergleichspunkt2);
        float abstandVergleichspunktNorm2 = abstandVergleichspunkt2 / length(u_resolution / 2.0);
        float subtrahend2 = abstandVergleichspunktNorm2 / max(abstandSpiralCenterNorm, 0.001);

        // Třetí spirála - synchronizovaná s dýcháním
        float winkel3 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(breathTime * 0.41 + 0.62) + breathTime * 0.47;
        vec2 vergleichspunkt3 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel3), cos(winkel3));
        float abstandVergleichspunkt3 = distance(pixelCoord, vergleichspunkt3);
        float abstandVergleichspunktNorm3 = abstandVergleichspunkt3 / length(u_resolution / 2.0);
        float subtrahend3 = abstandVergleichspunktNorm3 / max(abstandSpiralCenterNorm, 0.001);

        // Čtvrtá spirála - synchronizovaná s dýcháním
        float winkel4 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(breathTime * 0.38 + 0.17) + breathTime * 0.85;
        vec2 vergleichspunkt4 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel4), cos(winkel4));
        float abstandVergleichspunkt4 = distance(pixelCoord, vergleichspunkt4);
        float abstandVergleichspunktNorm4 = abstandVergleichspunkt4 / length(u_resolution / 2.0);
        float subtrahend4 = abstandVergleichspunktNorm4 / max(abstandSpiralCenterNorm, 0.001);

        // Pátá spirála - synchronizovaná s dýcháním
        float winkel5 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(breathTime * 0.48 + 0.95) + breathTime * 0.57;
        vec2 vergleichspunkt5 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel5), cos(winkel5));
        float abstandVergleichspunkt5 = distance(pixelCoord, vergleichspunkt5);
        float abstandVergleichspunktNorm5 = abstandVergleichspunkt5 / length(u_resolution / 2.0);
        float subtrahend5 = abstandVergleichspunktNorm5 / max(abstandSpiralCenterNorm, 0.001);

        // Šestá spirála - synchronizovaná s dýcháním
        float winkel6 = sqrt(abstandSpiralCenterNorm) * 10.0 * sin(breathTime * 0.29 + 0.27) + breathTime * 0.54;
        vec2 vergleichspunkt6 = spiralCenter + abstandSpiralCenter * vec2(sin(winkel6), cos(winkel6));
        float abstandVergleichspunkt6 = distance(pixelCoord, vergleichspunkt6);
        float abstandVergleichspunktNorm6 = abstandVergleichspunkt6 / length(u_resolution / 2.0);
        float subtrahend6 = abstandVergleichspunktNorm6 / max(abstandSpiralCenterNorm, 0.001);

        // Kombinuj spirály
        vec3 fragColor1 = vec3(
          2.0 - abstandVergleichspunktNorm - abstandVergleichspunktNorm4 - abstandVergleichspunktNorm6,
          2.0 - abstandVergleichspunktNorm2 - abstandVergleichspunktNorm5 - abstandVergleichspunktNorm4,
          2.0 - abstandVergleichspunktNorm3 - abstandVergleichspunktNorm6 - abstandVergleichspunktNorm5
        );

        vec3 fragColor2 = vec3(
          4.0 - subtrahend - subtrahend4 - subtrahend6,
          4.0 - subtrahend2 - subtrahend5 - subtrahend4,
          4.0 - subtrahend3 - subtrahend6 - subtrahend5
        );

        // Simulace audio faktoru - synchronizovaná s dýcháním
        float faktor = u_breathPhase >= 0.0
          ? u_breathProgress // Použij progress dýchání přímo
          : sin(breathTime * 0.5) * 0.5 + 0.5; // Fallback na čas, pokud není dýchání
        faktor = pow(faktor, 5.0);

        // Mix barev
        vec3 mixedColor = mix(fragColor1, fragColor2, faktor);

        // Převod na bílou variantu - normalizuj a převést na bílou
        float brightness = length(mixedColor) / 3.0;
        brightness = smoothstep(0.0, 1.5, brightness);

        // Bílá barva s jemným gradientem
        vec3 whiteColor = vec3(1.0, 1.0, 1.0);
        float gradient = 1.0 - smoothstep(0.0, 0.8, abstandSpiralCenterNorm);

        // Finální bílá barva
        vec3 finalColor = whiteColor * brightness * gradient;

        // Průhledné pozadí s animovanou opacity
        float alpha = brightness * gradient * u_intensity;

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    hudba: `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_intensity;
      uniform float u_audioAmplitude; // Celková amplituda (0-1)
      uniform float u_audioBass; // Bass frekvence (0-1)
      uniform float u_audioMid; // Mid frekvence (0-1)
      uniform float u_audioTreble; // Treble frekvence (0-1)
      uniform sampler2D u_audioFrequencies; // Texture s frekvenčními daty (64 hodnot)
      varying vec2 v_uv;

      void main() {
        vec2 uv = v_uv;
        uv -= 0.5;
        uv.x *= u_resolution.x / u_resolution.y;
        float dist = length(uv);

        // Použij audio amplitudu pro modulaci rychlosti animace
        float audioSpeed = 1.0 + u_audioAmplitude * 2.0; // 1.0 - 3.0
        float audioTime = u_time * audioSpeed;

        // Vytvoř vlny reagující na audio
        float wave1 = sin(dist * 6.0 - audioTime * 3.0) * 0.5 + 0.5;
        float wave2 = sin(dist * 10.0 - audioTime * 4.0) * 0.5 + 0.5;
        float wave3 = sin(dist * 14.0 - audioTime * 5.0) * 0.5 + 0.5;

        // Moduluj vlny podle frekvenčních pásem
        wave1 *= (1.0 + u_audioBass * 0.5); // Bass ovlivňuje první vlnu
        wave2 *= (1.0 + u_audioMid * 0.5); // Mid ovlivňuje druhou vlnu
        wave3 *= (1.0 + u_audioTreble * 0.5); // Treble ovlivňuje třetí vlnu

        float combined = (wave1 + wave2 + wave3) / 3.0;

        // Použij amplitudu pro modulaci gradientu
        float gradient = 1.0 - smoothstep(0.0, 0.9 - u_audioAmplitude * 0.3, dist);

        // Barvy reagující na audio
        vec3 color1 = vec3(0.956, 0.867, 0.769); // #f4ddc4
        vec3 color2 = vec3(0.9, 0.8, 0.7);
        vec3 color3 = vec3(0.85, 0.75, 0.65);

        // Mix barev podle audio dat
        vec3 finalColor = mix(color1, color2, combined * gradient);
        finalColor = mix(finalColor, color3, wave2 * 0.2);

        // Přidej pulzování podle amplitudy
        float pulse = 1.0 + u_audioAmplitude * 0.2;
        finalColor *= pulse;

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
        vec3 color1 = vec3(0.956, 0.867, 0.769); // #f4ddc4
        vec3 color2 = vec3(0.94, 0.84, 0.74);
        vec3 finalColor = mix(color1, color2, combined * gradient);
        float alpha = combined * gradient * u_intensity;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `
  };

    // Získej shader podle varianty
    let shaderCode = fragmentShaders[variant] || fragmentShaders.default;

    // Pokud je WebGL 2.0, převeď shader na WebGL 2.0 syntax
    if (isWebGL2 && shaderCode) {
      // Přidej verzi na začátek
      if (!shaderCode.includes('#version')) {
        shaderCode = '#version 300 es\n' + shaderCode;
      }
      // Nahraď 'varying' za 'in' pro vstupní proměnné
      shaderCode = shaderCode.replace(/\bvarying\s+vec2\s+v_uv\b/g, 'in vec2 v_uv');
      // Nahraď 'gl_FragColor' za 'out vec4 fragColor' a přidej deklaraci
      if (shaderCode.includes('gl_FragColor')) {
        shaderCode = shaderCode.replace(/precision\s+mediump\s+float;/g, 'precision mediump float;\nout vec4 fragColor;');
        shaderCode = shaderCode.replace(/\bgl_FragColor\b/g, 'fragColor');
      }
    }

    return shaderCode;
  };

  // Zjisti, zda je variant ID shaderu ze souboru
  const isFileShader = variant && (variant.startsWith('mini-') || variant.startsWith('shader-'));

  // Načti shader ze souboru, pokud je to ID shaderu
  useEffect(() => {
    // Resetuj stav při změně varianty
    if (!isFileShader || !enabled) {
      setLoadedShaderCode(null);
      setShaderError(null);
      setProgramInfo(null);
      setGl(null);
      return;
    }

    // Získej cestu k shaderu z ID
    let shaderPath = null;
    if (variant.startsWith('mini-')) {
      const shaderName = variant.replace('mini-', '');
      shaderPath = `/src/assets/mini-shaders/${shaderName}.glsl`;
    } else if (variant.startsWith('shader-')) {
      const shaderName = variant.replace('shader-', '');
      shaderPath = `/src/assets/shaders/${shaderName}.fs`;
    }

    if (!shaderPath) {
      console.error('❌ BackgroundShader: Invalid shader ID:', variant);
      setShaderError('Invalid shader ID');
      return;
    }

    let isMounted = true;

    // Resetuj před načtením nového shaderu
    setLoadedShaderCode(null);
    setShaderError(null);

    console.log('📥 BackgroundShader: Načítám shader z:', shaderPath, 'variant:', variant);

    loadShader(shaderPath)
      .then(code => {
        if (!isMounted) return;

        if (code && typeof code === 'string' && code.trim().length > 0) {
          try {
            // Neukonvertuj shader tady - počkáme až při kompilaci, kdy známe WebGL verzi
            if (isMounted) {
              console.log('✅ BackgroundShader: Shader načten, délka:', code.length, 'variant:', variant);
              setLoadedShaderCode(code); // Ulož původní kód
              setShaderError(null);
            }
          } catch (error) {
            console.error('❌ BackgroundShader: Failed to convert shader:', error);
            if (isMounted) {
              setShaderError(error?.message || error?.toString() || 'Failed to convert shader');
            }
          }
        } else {
          console.error('❌ BackgroundShader: Shader je prázdný nebo neplatný');
          if (isMounted) {
            setShaderError('Failed to load shader: empty or invalid code');
          }
        }
      })
      .catch(error => {
        console.error('❌ BackgroundShader: Failed to load shader:', shaderPath, error);
        if (isMounted) {
          setShaderError(error?.message || error?.toString() || 'Failed to load shader');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [variant, isFileShader, enabled]);

  // Získej fragment shader source - buď vestavěný nebo načtený ze souboru
  // Pro vestavěné shadery použijeme getFragmentShader s WebGL 1.0 jako základ
  // (skutečná verze se použije při kompilaci)
  const fragmentShaderSource = useMemo(() => {
    console.log('🔄 BackgroundShader: fragmentShaderSource useMemo, variant:', variant, 'isFileShader:', isFileShader, 'loadedShaderCode:', !!loadedShaderCode);
    if (isFileShader && loadedShaderCode) {
      return loadedShaderCode;
    }
    // Pro vestavěné shadery použij getFragmentShader s WebGL 1.0 jako základ
    // (bude převedeno na WebGL 2.0 při kompilaci pokud je potřeba)
    const shader = getFragmentShader(variant, false);
    console.log('🔄 BackgroundShader: Vytvořen vestavěný shader pro variant:', variant, 'délka:', shader?.length);
    return shader;
  }, [isFileShader, loadedShaderCode, variant]);

  // Inicializace WebGL
  useEffect(() => {
    console.log('🔄 BackgroundShader: useEffect spuštěn, variant:', variant, 'enabled:', enabled, 'isFileShader:', isFileShader, 'previousVariant:', previousVariantRef.current);

    // Resetuj stav pouze při změně varianty
    if (previousVariantRef.current !== variant) {
      console.log('🔄 BackgroundShader: Varianta se změnila z', previousVariantRef.current, 'na', variant, '- resetuji stav');
      setGl(null);
      setProgramInfo(null);
      previousVariantRef.current = variant;
    }

    if (!enabled) {
      console.log('🔴 BackgroundShader: Disabled, resetuji stav');
      setGl(null);
      setProgramInfo(null);
      return;
    }

    // Pokud načítáme shader ze souboru, počkej na načtení
    if (isFileShader && !loadedShaderCode && !shaderError) {
      console.log('⏳ BackgroundShader: Čekám na načtení shaderu ze souboru...', variant);
      // Resetuj stav při čekání na načtení
      setGl(null);
      setProgramInfo(null);
      return;
    }

    // Pokud se načítání shaderu nezdařilo, použij fallback
    if (isFileShader && shaderError) {
      console.warn('⚠️ BackgroundShader: Chyba při načítání shaderu, použiji default:', shaderError);
      // Resetuj stav a použijeme default shader místo načteného
      setLoadedShaderCode(null);
      setShaderError(null);
      setGl(null);
      setProgramInfo(null);
      // Pokračuj s default shaderem - ale variant musí být vestavěný shader
      // Pokud je to file shader, nemůžeme použít fallback, protože variant je stále file shader ID
      // Takže prostě neinicializujeme WebGL
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('⏳ BackgroundShader: Čekám na canvas...');
      return;
    }

    console.log('🎨 BackgroundShader: Inicializuji WebGL, variant:', variant, 'isFileShader:', isFileShader, 'fragmentShaderSource length:', fragmentShaderSource?.length);

    // Zkus WebGL 2.0, pokud není podporováno, použij WebGL 1.0
    let glContext = canvas.getContext('webgl2');
    const isWebGL2 = !!glContext;
    if (!glContext) {
      glContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    }
    if (!glContext) {
      console.warn('⚠️ BackgroundShader: WebGL není podporován');
      return;
    }
    console.log('✅ BackgroundShader: WebGL verze:', glContext.getParameter(glContext.VERSION), 'isWebGL2:', isWebGL2);

    console.log('✅ BackgroundShader: WebGL kontext vytvořen');

    // Nastav velikost canvasu - použij velikost okna s devicePixelRatio
    // Ale pro shadery použijeme viewport rozlišení (bez devicePixelRatio), aby byly vycentrované na play button
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Nastav skutečnou velikost canvasu (pixely) - pro ostré renderování
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Nastav CSS velikost (logické pixely) - viewport velikost
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      glContext.viewport(0, 0, canvas.width, canvas.height);
      console.log('📐 BackgroundShader: Canvas velikost:', canvas.width, 'x', canvas.height, 'CSS:', width, 'x', height, 'Viewport:', width, 'x', height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Získej vertex shader source s správnou verzí
    const vertexShaderSourceWithVersion = getVertexShaderSource(isWebGL2);

    // Konvertuj shader s aktuální WebGL verzí
    let convertedFragmentSource = fragmentShaderSource;

    // Pro vestavěné shadery použij getFragmentShader s správnou WebGL verzí
    if (!isFileShader && fragmentShaderSource) {
      convertedFragmentSource = getFragmentShader(variant, isWebGL2);
    }

    if (isFileShader && loadedShaderCode) {
      const shaderPath = variant.startsWith('mini-')
        ? `/src/assets/mini-shaders/${variant.replace('mini-', '')}.glsl`
        : variant.startsWith('shader-')
        ? `/src/assets/shaders/${variant.replace('shader-', '')}.fs`
        : null;
      if (shaderPath) {
        try {
          convertedFragmentSource = convertShaderToWebGL(loadedShaderCode, shaderPath, isWebGL2);
          console.log('✅ BackgroundShader: Shader konvertován, variant:', variant);
          // Vymaž chybu při úspěšné konverzi
          setShaderError(null);
        } catch (error) {
          const errorMessage = `Failed to convert shader (${variant}): ${error?.message || error?.toString() || 'Unknown error'}`;
          console.error('❌ BackgroundShader:', errorMessage);
          setShaderError(errorMessage);
          return;
        }
      }
    }

    // Použij Program Manager pro získání nebo vytvoření shader programu
    const manager = programManagerRef.current;
    if (!manager) {
      console.error('❌ BackgroundShader: Program Manager není inicializován');
      return;
    }

    // Vytvoř unikátní klíč pro cachování shader programu
    const programKey = `${variant}-${isWebGL2 ? 'webgl2' : 'webgl1'}`;

    const programInfo = manager.getProgram(
      glContext,
      programKey,
      vertexShaderSourceWithVersion,
      convertedFragmentSource,
      (key, error) => {
        if (error) {
          const errorMessage = `Shader compilation/linking error (${key}):\n${error}`;
          console.error(`❌ BackgroundShader: ${errorMessage}`);
          setShaderError(errorMessage);
        } else {
          // Vymaž chybu při úspěšné kompilaci
          setShaderError(null);
        }
      }
    );

    if (!programInfo) {
      const errorMessage = `Failed to create shader program for variant: ${variant} (key: ${programKey})`;
      console.error(`❌ BackgroundShader: ${errorMessage}`);
      setShaderError(errorMessage);
      return;
    }

    setGl(glContext);
    setProgramInfo(programInfo);
    console.log('✅ BackgroundShader: Shader program vytvořen/načten z cache, variant:', variant, 'key:', programKey);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      // Program Manager si spravuje životnost programů, takže neodstraňujeme programy zde
    };
  }, [enabled, variant, isFileShader, loadedShaderCode, shaderError, fragmentShaderSource]);

  // Render loop
  useEffect(() => {
    console.log('🔄 BackgroundShader: Render loop check:', {
      hasGl: !!gl,
      hasProgram: !!programInfo,
      enabled,
      variant
    });

    if (!gl || !programInfo || !enabled) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    console.log('✅ BackgroundShader: Spouštím render loop');

    const render = (currentTime) => {
      if (!gl || !programInfo) return;

      timeRef.current = currentTime * 0.001;

      gl.useProgram(programInfo.program);

      // Použij cached uniform locations
      if (programInfo.uniforms.u_time) {
        gl.uniform1f(programInfo.uniforms.u_time, timeRef.current);
      }
      if (programInfo.uniforms.u_resolution) {
        // Použij viewport rozlišení (bez devicePixelRatio), aby shadery byly vycentrované na play button
        // Play buttony jsou ve viewport souřadnicích, ne v canvas souřadnicích
        const viewportWidth = window.innerWidth || 1;
        const viewportHeight = window.innerHeight || 1;
        gl.uniform2f(programInfo.uniforms.u_resolution, viewportWidth, viewportHeight);
      }
      if (programInfo.uniforms.u_intensity) {
        gl.uniform1f(programInfo.uniforms.u_intensity, intensity);
      }

      // Audio data pro synchronizaci s hudbou
      if (programInfo.uniforms.u_audioAmplitude !== undefined && programInfo.uniforms.u_audioAmplitude !== null) {
        const amplitude = audioData?.amplitude || 0;
        gl.uniform1f(programInfo.uniforms.u_audioAmplitude, amplitude);
      }
      if (programInfo.uniforms.u_audioBass !== undefined && programInfo.uniforms.u_audioBass !== null) {
        const bass = audioData?.bass || 0;
        gl.uniform1f(programInfo.uniforms.u_audioBass, bass);
      }
      if (programInfo.uniforms.u_audioMid !== undefined && programInfo.uniforms.u_audioMid !== null) {
        const mid = audioData?.mid || 0;
        gl.uniform1f(programInfo.uniforms.u_audioMid, mid);
      }
      if (programInfo.uniforms.u_audioTreble !== undefined && programInfo.uniforms.u_audioTreble !== null) {
        const treble = audioData?.treble || 0;
        gl.uniform1f(programInfo.uniforms.u_audioTreble, treble);
      }

      // Parametry dýchání pro synchronizaci animace
      if (programInfo.uniforms.u_breathPhase !== undefined && programInfo.uniforms.u_breathPhase !== null) {
        // Vypočti hodnotu fáze dýchání: -1 = žádné dýchání, 0 = nádech, 1 = výdech
        let breathPhaseValue = -1.0;
        if (breathPhase && enabled) {
          breathPhaseValue = breathPhase === 'in' ? 0.0 : 1.0;
        }
        gl.uniform1f(programInfo.uniforms.u_breathPhase, breathPhaseValue);
      }
      if (programInfo.uniforms.u_breathProgress !== undefined && programInfo.uniforms.u_breathProgress !== null) {
        // Vypočti progress aktuální fáze dýchání (0.0 - 1.0)
        let breathProgressValue = 0.0;
        if (breathPhase && enabled) {
          const now = Date.now();
          const elapsed = (now - phaseStartTimeRef.current) / 1000; // sekundy
          const phaseDuration = breathPhase === 'in' ? breathInDuration : breathOutDuration;
          breathProgressValue = Math.min(elapsed / phaseDuration, 1.0);
        }
        gl.uniform1f(programInfo.uniforms.u_breathProgress, breathProgressValue);
      }

      // Nastav pozice - vytvoř buffer jednou
      if (!gl.positionBuffer) {
        gl.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.positionBuffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
          ]),
          gl.STATIC_DRAW
        );
      }

      // Použij cached attribute location
      const positionLocation = programInfo.attribs.a_position;
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gl, programInfo, enabled, intensity, breathPhase, breathInDuration, breathOutDuration]);

  // Pokud je shader disabled a opacity je 0, můžeme canvas zcela odstranit
  // Jinak ho necháme zobrazený pro plynulé prolnutí
  if (!enabled && opacity <= 0) {
    console.log('⏸️ BackgroundShader: Není zobrazen - disabled a opacity 0');
    return null;
  }

  console.log('🎨 BackgroundShader: Renderuji canvas, variant:', variant, 'intensity:', intensity, 'opacity:', opacity, 'enabled:', enabled, 'error:', shaderError);

  // Zobraz chybu v UI, pokud je shader error a je enabled
  if (shaderError && enabled) {
    console.error('❌ BackgroundShader: Shader error:', shaderError);
    // Zobraz chybu v konzoli, ale neblokuj renderování - použij fallback
    // Můžeme zobrazit chybu jako overlay nebo v konzoli
  }

  return (
    <>
      {shaderError && enabled && (
        <div
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            padding: '12px 16px',
            backgroundColor: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 10000,
            maxWidth: '300px',
            wordBreak: 'break-word',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Shader Error:</div>
          <div style={{ fontSize: '11px', whiteSpace: 'pre-wrap' }}>
            {shaderError.length > 200 ? shaderError.substring(0, 200) + '...' : shaderError}
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0, // Pod obsahem, nad background color
          pointerEvents: 'none',
          opacity: opacity,
          backgroundColor: 'transparent',
          display: 'block',
          transition: 'opacity 3s ease-in-out' // Plynulé prolnutí (3 sekundy)
        }}
      />
    </>
  );
};

export default BackgroundShader;

