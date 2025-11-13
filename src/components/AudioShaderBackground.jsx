import React, { useRef, useEffect, useState } from 'react';
import { getWebGLContext, updateContextUsage } from '@utils/webgl/contextManager';
import { getOptimalDPR } from '@utils/deviceDetection';

/**
 * Jednoduchý WebGL shader pro pozadí aplikace při přehrávání MP3
 * Inspirováno shadery z px-stream projektu
 */
const AudioShaderBackground = ({
  isPlayerActive = false,
  breathPhase = null, // 'in' | 'out' | null
  breathInDuration = 4, // v sekundách
  breathOutDuration = 4, // v sekundách
  color = { r: 1.0, g: 1.0, b: 1.0 } // RGB barva pro shader (hodnoty 0.0 - 1.0)
}) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);
  const [gl, setGl] = useState(null);
  const [shaderProgram, setShaderProgram] = useState(null);
  const positionBufferRef = useRef(null);
  const positionLocationRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Sledování času fáze dýchání pro pulzování
  const phaseStartTimeRef = useRef(Date.now());
  const previousPhaseRef = useRef(breathPhase);

  // Použij přímo isPlayerActive - zjednodušená verze
  const isActuallyPlaying = isPlayerActive;

  // Aktualizuj čas začátku fáze při změně breathPhase
  useEffect(() => {
    if (breathPhase && breathPhase !== previousPhaseRef.current) {
      phaseStartTimeRef.current = Date.now();
      previousPhaseRef.current = breathPhase;
    }
  }, [breathPhase]);

  // Vertex shader - jednoduchý fullscreen quad
  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_uv = (a_position + 1.0) * 0.5;
    }
  `;

  // Fragment shader - ripple efekt s centrálními vlnami
  const fragmentShaderSource = `
    precision mediump float;

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec3 u_color; // RGB barva
    varying vec2 v_uv;

    void main() {
      vec2 center = vec2(0.5, 0.5);
      float speed = 0.035;

      float invAr = u_resolution.y / u_resolution.x;
      vec2 uv = v_uv;

      vec3 col = vec3(uv.x, uv.y, 0.5 + 0.5 * sin(u_time));

      vec3 texcol;

      float x = (center.x - uv.x);
      float y = (center.y - uv.y) * invAr;

      // float r = -sqrt(x*x + y*y); // uncomment this line to symmetric ripples
      float r = -(x*x + y*y);
      float z = 1.0 + 0.5 * sin((r + u_time * speed) / 0.013);

      texcol.x = z;
      texcol.y = z;
      texcol.z = z;

      // Aplikuj RGB barvu na efekt
      vec3 finalColor = col * texcol * u_color;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // Inicializace WebGL - inicializuj hned když je canvas ready
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('⏳ AudioShaderBackground: Čekám na canvas...');
      return;
    }

    // Pokud už máme WebGL kontext, neinicializuj znovu
    if (isInitializedRef.current || (gl && shaderProgram)) {
      console.log('✅ AudioShaderBackground: WebGL už je inicializován');
      return;
    }

    console.log('🎨 AudioShaderBackground: Canvas nalezen, inicializuji WebGL...');

    // Použij getWebGLContext() pro optimalizované nastavení (Android optimalizace)
    let glContext = getWebGLContext(canvas, {
      alpha: true,
      antialias: false, // Bude automaticky upraveno podle zařízení v contextManager
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false
    });

    if (!glContext) {
      console.warn('⚠️ WebGL není podporován');
      return;
    }
    console.log('✅ AudioShaderBackground: WebGL verze:', glContext.getParameter(glContext.VERSION));

    console.log('✅ AudioShaderBackground: WebGL kontext vytvořen');

    // Nastav velikost canvasu - použij fullscreen velikost s optimalizovaným DPR
    // Na mobilních zařízeních max 1.5x DPR pro lepší výkon
    const resizeCanvas = () => {
      // Použij CSS velikost, ale nastav pixel rozlišení pro WebGL
      const dpr = getOptimalDPR(); // Optimalizovaný DPR (max 1.5x na mobilních zařízeních)
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      glContext.viewport(0, 0, canvas.width, canvas.height);
      console.log('📐 AudioShaderBackground: Canvas velikost:', canvas.width, 'x', canvas.height, 'CSS:', width, 'x', height, 'DPR:', dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Vytvoř shader program
    const createShader = (type, source) => {
      const shader = glContext.createShader(type);
      glContext.shaderSource(shader, source);
      glContext.compileShader(shader);

      if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        console.error('Shader compilation error:', glContext.getShaderInfoLog(shader));
        glContext.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = createShader(glContext.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(glContext.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      return;
    }

    const program = glContext.createProgram();
    glContext.attachShader(program, vertexShader);
    glContext.attachShader(program, fragmentShader);
    glContext.linkProgram(program);

    if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
      console.error('Program linking error:', glContext.getProgramInfoLog(program));
      return;
    }

    // Vytvoř position buffer jednou při inicializaci
    const positionBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
    glContext.bufferData(
      glContext.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]),
      glContext.STATIC_DRAW
    );
    positionBufferRef.current = positionBuffer;

    // Získej position location jednou
    glContext.useProgram(program);
    const positionLocation = glContext.getAttribLocation(program, 'a_position');
    positionLocationRef.current = positionLocation;

    setGl(glContext);
    setShaderProgram(program);
    isInitializedRef.current = true;
    console.log('✅ Shader program vytvořen');

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (glContext) {
        // Vyčisti buffer
        if (positionBufferRef.current) {
          glContext.deleteBuffer(positionBufferRef.current);
          positionBufferRef.current = null;
        }
        glContext.deleteShader(vertexShader);
        glContext.deleteShader(fragmentShader);
        glContext.deleteProgram(program);
      }
      positionLocationRef.current = null;
      isInitializedRef.current = false;
    };
  }, []); // Inicializuj pouze jednou při mount, nezávisle na stavu

  // Render loop
  useEffect(() => {
    console.log('🔄 Render loop check:', { hasGl: !!gl, hasShader: !!shaderProgram, isPlaying: isActuallyPlaying });

    if (!gl || !shaderProgram || !isActuallyPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    console.log('✅ Spouštím render loop');

    const render = (currentTime) => {
      // Kontrola, zda je WebGL kontext stále platný
      if (!gl || !shaderProgram || !positionBufferRef.current || positionLocationRef.current === null) {
        console.warn('⚠️ AudioShaderBackground: WebGL není připraven, zastavuji render loop');
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }

      // Kontrola WebGL chyb před renderováním
      const error = gl.getError();
      if (error !== gl.NO_ERROR && error !== 0) {
        console.warn('⚠️ AudioShaderBackground: WebGL chyba před renderováním:', error);
        // Nepokračuj, pokud je příliš mnoho chyb
        return;
      }

      timeRef.current = currentTime * 0.001; // Převod na sekundy

      // Aktualizuj lastUsed pro context manager (prevence agresivního cleanupu)
      updateContextUsage(gl);

      // Nastav uniformy
      gl.useProgram(shaderProgram);

      const timeLocation = gl.getUniformLocation(shaderProgram, 'u_time');
      const resolutionLocation = gl.getUniformLocation(shaderProgram, 'u_resolution');
      const colorLocation = gl.getUniformLocation(shaderProgram, 'u_color');
      const breathPhaseLocation = gl.getUniformLocation(shaderProgram, 'u_breathPhase');
      const breathProgressLocation = gl.getUniformLocation(shaderProgram, 'u_breathProgress');

      if (timeLocation) gl.uniform1f(timeLocation, timeRef.current);
      if (resolutionLocation) {
        // Použij viewport rozlišení (bez devicePixelRatio), aby shadery byly vycentrované na play button
        // Play buttony jsou ve viewport souřadnicích, ne v canvas souřadnicích
        const viewportWidth = window.innerWidth || 1;
        const viewportHeight = window.innerHeight || 1;
        gl.uniform2f(resolutionLocation, viewportWidth, viewportHeight);
      }

      // Předaj RGB barvu do shaderu (hodnoty 0.0 - 1.0)
      if (colorLocation) {
        const r = typeof color.r === 'number' ? color.r : 1.0;
        const g = typeof color.g === 'number' ? color.g : 1.0;
        const b = typeof color.b === 'number' ? color.b : 1.0;
        gl.uniform3f(colorLocation, r, g, b);
      }

      // Vypočti progress dýchání a předaj do shaderu
      let breathPhaseValue = -1.0; // -1 = žádné dýchání
      let breathProgressValue = 0.0;

      if (breathPhase && isActuallyPlaying) {
        const now = Date.now();
        const elapsed = (now - phaseStartTimeRef.current) / 1000; // sekundy
        const phaseDuration = breathPhase === 'in' ? breathInDuration : breathOutDuration;

        breathPhaseValue = breathPhase === 'in' ? 0.0 : 1.0; // 0 = nádech, 1 = výdech
        breathProgressValue = Math.min(elapsed / phaseDuration, 1.0); // 0.0 - 1.0
      }

      if (breathPhaseLocation) gl.uniform1f(breathPhaseLocation, breathPhaseValue);
      if (breathProgressLocation) gl.uniform1f(breathProgressLocation, breathProgressValue);

      // Bind position buffer (vytvořen při inicializaci)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBufferRef.current);
      gl.enableVertexAttribArray(positionLocationRef.current);
      gl.vertexAttribPointer(positionLocationRef.current, 2, gl.FLOAT, false, 0, 0);

      // Vykresli - důležité: použij správný blend mode pro alpha
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Kontrola WebGL chyb po renderování
      const errorAfter = gl.getError();
      if (errorAfter !== gl.NO_ERROR && errorAfter !== 0) {
        console.warn('⚠️ AudioShaderBackground: WebGL chyba po renderování:', errorAfter);
        // Zastav render loop při chybě
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [gl, shaderProgram, isActuallyPlaying, breathPhase, breathInDuration, breathOutDuration, color]);

  // Renderuj canvas vždy, ale inicializace WebGL proběhne při mount
  const shouldShow = isActuallyPlaying && gl && shaderProgram;
  const canvasOpacity = shouldShow ? 1 : 0;

  console.log('🎨 AudioShaderBackground: Renderuji canvas', {
    isPlayerActive: isActuallyPlaying,
    hasGl: !!gl,
    hasShader: !!shaderProgram,
    shouldShow,
    canvasOpacity,
    display: gl && shaderProgram ? 'block' : 'none'
  });

  // Renderuj canvas vždy, zobraz pouze když je WebGL inicializován a přehrávání aktivní
  // Z-index vrstvy:
  // - Pozadí stránky: zIndex 0 (nejnižší)
  // - BackgroundShader: zIndex 0 (pod obsahem, nad background color)
  // - AudioShaderBackground: zIndex 9 (nad pozadím, pod obsahem stránky, pod AudioPlayer)
  // - Obsah stránky: zIndex 10 (hlavní obsah stránky)
  // - AudioPlayer: zIndex 9999 (nad vším)
  // - UI controls: zIndex 10000+ (dropdown, modaly, atd.)
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9, // Nad pozadím (0), pod obsahem stránky (10), pod AudioPlayer (9999)
        pointerEvents: 'none',
        opacity: canvasOpacity,
        backgroundColor: 'transparent',
        display: gl && shaderProgram ? 'block' : 'none', // Zobraz pouze když je WebGL připraven
        transition: 'opacity 0.3s ease-in-out'
      }}
    />
  );
};

export default AudioShaderBackground;

