import React, { useRef, useEffect, useState } from 'react';
import { loadShader, convertShaderToWebGL } from '@utils/shaderLoader';

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
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);
  const [gl, setGl] = useState(null);
  const [shaderProgram, setShaderProgram] = useState(null);

  // Vertex shader - jednoduchý fullscreen quad
  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_uv = (a_position + 1.0) * 0.5;
    }
  `;

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
    meditation: `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_intensity;
      varying vec2 v_uv;

      const float MATH_PI = float(3.14159265359);

      void Rotate(inout vec2 p, float a) {
        p = cos(a) * p + sin(a) * vec2(p.y, -p.x);
      }

      float Circle(vec2 p, float r) {
        return (length(p / r) - 1.0) * r;
      }

      float Rand(vec2 c) {
        return fract(sin(dot(c.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void BokehLayer(inout vec3 color, vec2 p, vec3 c) {
        float wrap = 450.0;
        if (mod(floor(p.y / wrap + 0.5), 2.0) == 0.0) {
          p.x += wrap * 0.5;
        }
        vec2 p2 = mod(p + 0.5 * wrap, wrap) - 0.5 * wrap;
        vec2 cell = floor(p / wrap + 0.5);
        float cellR = Rand(cell);
        c *= fract(cellR * 3.33 + 3.33);
        float radius = mix(30.0, 70.0, fract(cellR * 7.77 + 7.77));
        p2.x *= mix(0.9, 1.1, fract(cellR * 11.13 + 11.13));
        p2.y *= mix(0.9, 1.1, fract(cellR * 17.17 + 17.17));
        float sdf = Circle(p2, radius);
        float circle = 1.0 - smoothstep(0.0, 1.0, sdf * 0.04);
        float glow = exp(-sdf * 0.025) * 0.3 * (1.0 - circle);
        color += c * (circle + glow);
      }

      void main() {
        vec2 uv = v_uv;
        vec2 fragCoord = uv * u_resolution;
        vec2 p = (2.0 * fragCoord - u_resolution.xy) / u_resolution.x * 1000.0;
        vec3 color = mix(vec3(0.3, 0.1, 0.3), vec3(0.1, 0.4, 0.5), dot(uv, vec2(0.2, 0.7)));
        float time = u_time - 15.0;
        Rotate(p, 0.2 + time * 0.03);
        BokehLayer(color, p + vec2(-50.0 * time + 0.0, 0.0), 3.0 * vec3(0.4, 0.1, 0.2));
        Rotate(p, 0.3 - time * 0.05);
        BokehLayer(color, p + vec2(-70.0 * time + 33.0, -33.0), 3.5 * vec3(0.6, 0.4, 0.2));
        Rotate(p, 0.5 + time * 0.07);
        BokehLayer(color, p + vec2(-60.0 * time + 55.0, 55.0), 3.0 * vec3(0.4, 0.3, 0.2));
        Rotate(p, 0.9 - time * 0.03);
        BokehLayer(color, p + vec2(-25.0 * time + 77.0, 77.0), 3.0 * vec3(0.4, 0.2, 0.1));
        Rotate(p, 0.0 + time * 0.05);
        BokehLayer(color, p + vec2(-15.0 * time + 99.0, 99.0), 3.0 * vec3(0.2, 0.0, 0.4));
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

  const fragmentShaderSource = fragmentShaders[variant] || fragmentShaders.default;

  // Inicializace WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const glContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!glContext) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    glContext.viewport(0, 0, canvas.width, canvas.height);

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

    if (!vertexShader || !fragmentShader) return;

    const program = glContext.createProgram();
    glContext.attachShader(program, vertexShader);
    glContext.attachShader(program, fragmentShader);
    glContext.linkProgram(program);

    if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
      console.error('Program linking error:', glContext.getProgramInfoLog(program));
      return;
    }

    const positionBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
    glContext.bufferData(
      glContext.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      glContext.STATIC_DRAW
    );

    setGl(glContext);
    setShaderProgram(program);

    return () => {
      glContext.deleteShader(vertexShader);
      glContext.deleteShader(fragmentShader);
      glContext.deleteProgram(program);
      glContext.deleteBuffer(positionBuffer);
    };
  }, [variant, size]);

  // Render loop
  useEffect(() => {
    if (!gl || !shaderProgram) return;

    const render = (currentTime) => {
      if (!gl || !shaderProgram) return;

      timeRef.current = currentTime * 0.001;

      gl.useProgram(shaderProgram);

      const timeLocation = gl.getUniformLocation(shaderProgram, 'u_time');
      const resolutionLocation = gl.getUniformLocation(shaderProgram, 'u_resolution');
      const intensityLocation = gl.getUniformLocation(shaderProgram, 'u_intensity');

      if (timeLocation) gl.uniform1f(timeLocation, timeRef.current);
      if (resolutionLocation) {
        const width = gl.canvas.width || 1;
        const height = gl.canvas.height || 1;
        gl.uniform2f(resolutionLocation, width, height);
      }
      if (intensityLocation) gl.uniform1f(intensityLocation, intensity);

      const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
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
  }, [gl, shaderProgram, intensity]);

  return (
    <div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        border: isSelected ? '3px solid #000' : '1px solid rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        overflow: 'hidden',
        backgroundColor: '#f4ddc4',
        transition: 'border-color 0.2s ease'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
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
    </div>
  );
};

export default ShaderPreview;

