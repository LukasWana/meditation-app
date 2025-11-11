#!/usr/bin/env node

import 'dotenv/config';

/**
 * Offline generátor shader náhledů.
 * - používá Puppeteer pro render ve WebGL (headless Chromium)
 * - uploaduje výstupy do Firebase Storage
 * - zapisuje metadata do Realtime Database
 *
 * Spuštění:
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json \
 *   FIREBASE_STORAGE_BUCKET=meditations-audio.appspot.com \
 *   FIREBASE_DATABASE_URL=https://meditations-audio-default-rtdb.europe-west1.firebasedatabase.app \
 *   npx vite-node scripts/generateShaderPreviews.js --all
 *
 * Volby:
 *   --all                     zpracuje všechny shadery
 *   --only=ShaderKey,Shader   vyfiltruje pouze uvedené klíče
 *   --filter=prefix           zpracuje shadery, které mají klíč s daným prefixem (case sensitive)
 *   --dry-run                 neukládá nic do Firebase (pouze loguje)
 *   --quality=0.85            kvalita WebP exportu (0-1)
 *   --width=512 --height=512  velikost hlavního náhledu
 *   --thumb=256               velikost kratší strany náhledu (thumbnail)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createHash, randomUUID } from 'crypto';
import admin from 'firebase-admin';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export const DEFAULT_OPTIONS = {
  width: 512,
  height: 512,
  thumbnailSize: 256,
  quality: 0.85,
  intensity: 0.8,
  time: 5.0,
  generationSource: 'client-offline',
  storagePrefix: 'shader-previews'
};

const BUILTIN_SHADERS = [
  { id: 'default', variant: 'default', name: 'Default' },
  { id: 'meditace', variant: 'meditace', name: 'Meditace' },
  { id: 'dychani', variant: 'dychani', name: 'Dýchání' },
  { id: 'hudba', variant: 'hudba', name: 'Hudba' },
  { id: 'settings', variant: 'settings', name: 'Settings' }
];

const BROWSER_BOOTSTRAP = `
window.__shaderPreviewHelpers = (() => {
  const getVertexShaderSource = (isWebGL2) => {
    if (isWebGL2) {
      return \`#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = (a_position + 1.0) * 0.5;
}\`;
    }

    return \`
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = (a_position + 1.0) * 0.5;
}
\`;
  };

  const builtInShaders = {
    default: \`
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
\`,
    meditace: \`
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
\`,
    dychani: \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
varying vec2 v_uv;

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
  float brightness = length(fragColor2) / 3.0;
  brightness = smoothstep(0.0, 1.5, brightness);
  vec3 whiteColor = vec3(1.0, 1.0, 1.0);
  float gradient = 1.0 - smoothstep(0.0, 0.8, abstandSpiralCenterNorm);
  vec3 finalColor = whiteColor * brightness * gradient;
  float alpha = brightness * gradient * u_intensity;
  gl_FragColor = vec4(finalColor, alpha);
}
\`,
    hudba: \`
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
\`,
    settings: \`
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
\`
  };

  const getBuiltInFragmentShader = (variant, isWebGL2) => {
    const body = builtInShaders[variant] || builtInShaders.default;
    if (!isWebGL2) return body;

    let adapted = body
      .replace(/\\bvarying\\s+vec2\\s+v_uv;/g, 'in vec2 v_uv;')
      .replace(/\\bgl_FragColor\\b/g, 'fragColor');

    if (!adapted.includes('out vec4 fragColor')) {
      if (adapted.includes('precision')) {
        adapted = adapted.replace(/(precision\\s+mediump\\s+float;)/, '$1\\nout vec4 fragColor;');
      } else {
        adapted = 'precision mediump float;\\nout vec4 fragColor;\\n' + adapted;
      }
    }
    return \`#version 300 es
\${adapted}\`;
  };

  const convertMainImageShader = (shaderCode, isWebGL2 = false) => {
    let code = shaderCode;

    const mainImageParamMatch = code.match(/void\\s+mainImage\\s*\\(\\s*out\\s+vec4\\s+(\\w+)\\s*,\\s*(?:in\\s+)?vec2\\s+(\\w+)/);
    if (mainImageParamMatch) {
      const [, outputVar, inputVar] = mainImageParamMatch;
      if (outputVar && outputVar !== 'fragColor') {
        const outputRegex = new RegExp(\`\\\\b\${outputVar}\\\\b\`, 'g');
        code = code.replace(outputRegex, 'fragColor');
      }
      if (inputVar && inputVar !== 'fragCoord') {
        const inputRegex = new RegExp(\`\\\\b\${inputVar}\\\\b\`, 'g');
        code = code.replace(inputRegex, 'fragCoord');
      }
    }

    code = code.replace(/^\\s*#version\\s+\\d+\\s*\\w*\\s*$/gm, '');
    code = code.replace(/\\n\\s*#version\\s+\\d+\\s*\\w*\\s*\\n/g, '\\n');
    code = code.replace(/\\r?\\n\\s*#version\\s+\\d+\\s*\\w*\\s*\\r?\\n/g, '\\n');
    if (code.trim().startsWith('#version')) {
      code = code.replace(/^\\s*#version\\s+\\d+\\s*\\w*\\s*\\r?\\n?/m, '');
    }

    code = code.replace(/void\\s+mainImage\\s*\\(\\s*out\\s+vec4\\s+fragColor\\s*,\\s*in\\s+vec2\\s+fragCoord\\s*\\)/g, 'void main()');
    code = code.replace(/void\\s+mainImage\\s*\\(\\s*out\\s+vec4\\s+fragColor\\s*,\\s*vec2\\s+fragCoord\\s*\\)/g, 'void main()');
    code = code.replace(/void\\s+mainImage\\s*\\([^)]*\\)/g, 'void main()');

    code = code.replace(/\\biTime\\b/g, 'u_time');
    code = code.replace(/\\biResolution\\.xy\\b/g, 'u_resolution');
    code = code.replace(/\\biResolution\\.x\\b/g, 'u_resolution.x');
    code = code.replace(/\\biResolution\\.y\\b/g, 'u_resolution.y');
    code = code.replace(/\\biResolution\\b/g, 'u_resolution');

    code = code.replace(/\\biAudio\\.x\\b/g, 'u_audioBass');
    code = code.replace(/\\biAudio\\.y\\b/g, 'u_audioMid');
    code = code.replace(/\\biAudio\\.z\\b/g, 'u_audioTreble');
    code = code.replace(/\\biAudio\\.w\\b/g, 'u_audioAmplitude');
    code = code.replace(/\\biAudio\\b/g, 'vec4(u_audioBass, u_audioMid, u_audioTreble, u_audioAmplitude)');

    code = code.replace(/\\biMouse\\b/g, 'vec4(u_mouse, 0.0, 0.0)');
    code = code.replace(/u_mouse\\.xy\\b/g, 'u_mouse');
    code = code.replace(/u_mouse\\.zw\\b/g, 'vec2(0.0)');
    code = code.replace(/u_mouse\\.z\\b/g, '0.0');
    code = code.replace(/u_mouse\\.w\\b/g, '0.0');

    code = code.replace(/\\bfragCoord\\b/g, 'v_uv * u_resolution');

    if (isWebGL2) {
      code = code.replace(/\\bgl_FragColor\\b/g, 'fragColor');
    } else {
      code = code.replace(/\\bfragColor\\s*=/g, 'gl_FragColor =');
      code = code.replace(/\\bfragColor\\s*\\./g, 'gl_FragColor.');
      code = code.replace(/\\bfragColor\\b/g, 'gl_FragColor');
    }

    code = code.replace(/^\\s*precision\\s+\\w+\\s+\\w+\\s*;?\\s*$/gm, '');
    code = code.replace(/\\n\\s*precision\\s+\\w+\\s+\\w+\\s*;?\\s*\\n/g, '\\n');
    code = code.replace(/^\\s*\\n+/, '');

    const headerLines = [
      isWebGL2 ? '#version 300 es' : '',
      'precision mediump float;',
      'uniform float u_time;',
      'uniform vec2 u_resolution;',
      'uniform vec2 u_mouse;',
      'uniform float u_intensity;',
      'uniform float u_audioBass;',
      'uniform float u_audioMid;',
      'uniform float u_audioTreble;',
      'uniform float u_audioAmplitude;',
      \`\${isWebGL2 ? 'in' : 'varying'} vec2 v_uv;\`
    ].filter(Boolean);

    if (isWebGL2) {
      const hasFragColorDecl = /\\bout\\s+vec4\\s+fragColor\\b/.test(code);
      const fragColorDecl = hasFragColorDecl ? '' : 'out vec4 fragColor;\\n';
      return \`\${headerLines.join('\\n')}\\n\${fragColorDecl}\${code}\\n\`;
    }

    return \`\${headerLines.join('\\n')}\\n\${code}\\n\`;
  };

  const convertShaderToWebGL = (shaderCode, shaderKey, isWebGL2) => {
    if (!shaderCode) return shaderCode;
    if (shaderCode.includes('void mainImage')) {
      return convertMainImageShader(shaderCode, isWebGL2);
    }
    return shaderCode;
  };

  const createAndCompileShader = (gl, type, source, shaderId) => {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error(\`Failed to create shader for \${shaderId}\`);
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(\`Shader compile error (\${shaderId}): \${err}\`);
    }
    return shader;
  };

  const createProgram = (gl, vertexSource, fragmentSource, shaderId) => {
    const program = gl.createProgram();
    if (!program) {
      throw new Error(\`Failed to create program for \${shaderId}\`);
    }
    const vertex = createAndCompileShader(gl, gl.VERTEX_SHADER, vertexSource, shaderId);
    const fragment = createAndCompileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, shaderId);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const err = gl.getProgramInfoLog(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteProgram(program);
      throw new Error(\`Program link error (\${shaderId}): \${err}\`);
    }
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return program;
  };

  return {
    getVertexShaderSource,
    getBuiltInFragmentShader,
    convertShaderToWebGL,
    createProgram
  };
})();
`;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    mode: 'all',
    filters: [],
    dryRun: false,
    width: DEFAULT_OPTIONS.width,
    height: DEFAULT_OPTIONS.height,
    thumbnailSize: DEFAULT_OPTIONS.thumbnailSize,
    quality: DEFAULT_OPTIONS.quality
  };

  for (const arg of args) {
    if (arg === '--all') {
      options.mode = 'all';
    } else if (arg.startsWith('--only=')) {
      options.mode = 'only';
      options.filters = arg.replace('--only=', '').split(',').map(v => v.trim()).filter(Boolean);
    } else if (arg.startsWith('--filter=')) {
      options.mode = 'filter';
      options.filters = [arg.replace('--filter=', '').trim()];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--quality=')) {
      options.quality = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--width=')) {
      options.width = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--height=')) {
      options.height = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--thumb=')) {
      options.thumbnailSize = parseInt(arg.split('=')[1], 10);
    }
  }

  return options;
};

let firebaseInitialized = false;

const resolveServiceAccount = async () => {
  const pathCandidate = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const jsonCandidate = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;

  let raw = null;

  if (pathCandidate) {
    raw = await fs.readFile(path.resolve(pathCandidate), 'utf8');
  } else if (jsonCandidate) {
    const trimmed = jsonCandidate.trim();
    if (trimmed.startsWith('{')) {
      raw = trimmed;
    } else {
      try {
        raw = Buffer.from(trimmed, 'base64').toString('utf8');
      } catch (error) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON není platný ani base64 ani JSON.');
      }
    }
  }

  if (!raw) {
    throw new Error(
      'Chybí konfigurace service account. Nastavte FIREBASE_SERVICE_ACCOUNT_PATH nebo FIREBASE_SERVICE_ACCOUNT_JSON.'
    );
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('Service account JSON nelze parsovat. Ověřte obsah souboru/env proměnné.');
  }
};

export const ensureFirebase = async () => {
  if (!firebaseInitialized) {
    const serviceAccount = await resolveServiceAccount();

    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ||
      serviceAccount.storageBucket ||
      `${serviceAccount.project_id}.appspot.com`;

    const databaseURL = process.env.FIREBASE_DATABASE_URL ||
      `https://${serviceAccount.project_id}.firebaseio.com`;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket,
      databaseURL
    });

    firebaseInitialized = true;
  }

  const app = admin.app();

  return {
    bucket: admin.storage().bucket(),
    database: admin.database(),
    projectId: app.options.projectId
  };
};

const readShaderFiles = async () => {
  const shadersDir = path.join(projectRoot, 'src', 'assets', 'shaders');
  const entries = await fs.readdir(shadersDir);

  const shaders = [];
  for (const entry of entries) {
    if (!entry.endsWith('.ts') || entry === 'index.ts') {
      continue;
    }
    const filePath = path.join(shadersDir, entry);
    const content = await fs.readFile(filePath, 'utf8');
    const match = content.match(/const\s+source\s*=\s*`([\s\S]*?)`;/);
    if (!match) {
      console.warn(`⚠️  Nelze extrahovat shader z ${entry}`);
      continue;
    }
    const shaderKey = entry.replace('.ts', '');
    shaders.push({
      id: shaderKey,
      name: shaderKey,
      path: `/src/assets/shaders/${entry}`,
      shaderCode: match[1]
    });
  }

  return shaders;
};

const filterShaders = (shaders, options) => {
  if (options.mode === 'all' || options.filters.length === 0) {
    return shaders;
  }

  if (options.mode === 'only') {
    const lookup = new Set(options.filters);
    return shaders.filter(shader => lookup.has(shader.id));
  }

  if (options.mode === 'filter') {
    return shaders.filter(shader =>
      options.filters.some(prefix => shader.id.startsWith(prefix)));
  }

  return shaders;
};

const decodeDataUrl = (dataUrl) => {
  const [, base64] = dataUrl.split(',');
  return Buffer.from(base64, 'base64');
};

const uploadBuffer = async (bucket, storagePath, buffer, contentType, metadata = {}) => {
  const file = bucket.file(storagePath);
  const token = randomUUID();
  await file.save(buffer, {
    contentType,
    gzip: false,
    metadata: {
      cacheControl: 'public,max-age=86400',
      metadata: {
        firebaseStorageDownloadTokens: token,
        ...metadata
      }
    }
  });

  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
};

const computeEtag = (dataUrl) => {
  const hash = createHash('sha1');
  hash.update(dataUrl);
  return hash.digest('hex');
};

const createJobLog = async (database, payload) => {
  const jobId = Date.now().toString();
  const jobRef = database.ref(`shader-previews-logs/${jobId}`);
  await jobRef.set({
    startedAt: new Date().toISOString(),
    status: 'running',
    requestedBy: 'offline-client-script',
    ...payload
  });
  return { jobId, jobRef };
};

const updateShaderStatus = async (database, shaderKey, status, extra = {}) => {
  const ref = database.ref(`shader-previews/${shaderKey}`);
  await ref.update({
    status,
    ...extra
  });
};

const renderShaderInBrowser = async (page, shader, renderOptions) => {
  return page.evaluate(async ({ shader, renderOptions }) => {
    const helpers = window.__shaderPreviewHelpers;
    if (!helpers) {
      throw new Error('Helpers nejsou inicializované');
    }

    const canvas = document.createElement('canvas');
    canvas.width = renderOptions.width;
    canvas.height = renderOptions.height;
    const contextAttributes = {
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power'
    };
    const gl = canvas.getContext('webgl2', contextAttributes) ||
               canvas.getContext('webgl', contextAttributes);
    if (!gl) {
      throw new Error('WebGL není dostupný v headless prohlížeči');
    }

    const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    let fragmentSource = null;

    if (shader.shaderCode) {
      fragmentSource = shader.shaderCode;
    }

    if (!fragmentSource && shader.variant) {
      fragmentSource = helpers.getBuiltInFragmentShader(shader.variant, isWebGL2);
    }

    if (!fragmentSource) {
      throw new Error('Chybí shader source');
    }

    if (shader.path || shader.shaderCode) {
      fragmentSource = helpers.convertShaderToWebGL(
        fragmentSource,
        shader.path || shader.id,
        isWebGL2
      );
    }

    const vertexSource = helpers.getVertexShaderSource(isWebGL2);
    const program = helpers.createProgram(gl, vertexSource, fragmentSource, shader.id);

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse');
    const intensityLocation = gl.getUniformLocation(program, 'u_intensity');

    if (timeLocation) gl.uniform1f(timeLocation, renderOptions.time);
    if (resolutionLocation) gl.uniform2f(resolutionLocation, renderOptions.width, renderOptions.height);
    if (mouseLocation) gl.uniform2f(mouseLocation, renderOptions.width * 0.5, renderOptions.height * 0.5);
    if (intensityLocation) gl.uniform1f(intensityLocation, renderOptions.intensity);

    gl.viewport(0, 0, renderOptions.width, renderOptions.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const dataUrl = canvas.toDataURL(renderOptions.mimeType, renderOptions.quality);

    gl.deleteBuffer(positionBuffer);
    gl.deleteProgram(program);

    return {
      dataUrl,
      webglVersion: isWebGL2 ? 'webgl2' : 'webgl1'
    };
  }, { shader, renderOptions });
};

export async function runShaderPreviewGeneration(rawOptions = {}, firebaseContext = null) {
  const options = {
    mode: rawOptions.mode || 'all',
    filters: Array.isArray(rawOptions.filters) ? rawOptions.filters.filter(Boolean) : [],
    dryRun: !!rawOptions.dryRun,
    width: rawOptions.width || DEFAULT_OPTIONS.width,
    height: rawOptions.height || DEFAULT_OPTIONS.height,
    thumbnailSize: rawOptions.thumbnailSize || DEFAULT_OPTIONS.thumbnailSize,
    quality: typeof rawOptions.quality === 'number' ? rawOptions.quality : DEFAULT_OPTIONS.quality,
    generationSource: rawOptions.generationSource || DEFAULT_OPTIONS.generationSource,
    requestedBy: rawOptions.requestedBy || 'offline-client-script',
    logJob: rawOptions.logJob !== false
  };

  const firebase = firebaseContext || await ensureFirebase();
  const shouldDisconnect = !firebaseContext;

  const [fileShaders] = await Promise.all([
    readShaderFiles()
  ]);

  const allShaders = [...fileShaders, ...BUILTIN_SHADERS];
  const selectedShaders = filterShaders(allShaders, options);

  if (selectedShaders.length === 0) {
    if (shouldDisconnect) {
      await firebase.database.goOffline();
    }
    console.log('⚠️  Nebyly nalezeny žádné shadery k renderu');
    return { total: 0, success: [], errors: [], jobId: null };
  }

  console.log(`🖼️  Generuji náhledy pro ${selectedShaders.length} shaderů (${options.dryRun ? 'dry-run' : 'produkční režim'})`);

  let jobId = null;
  let jobRef = null;
  if (!options.dryRun && options.logJob) {
    const job = await createJobLog(firebase.database, {
      shaderKeys: selectedShaders.map(shader => shader.id),
      total: selectedShaders.length,
      renderOptions: {
        width: options.width,
        height: options.height,
        thumbnailSize: options.thumbnailSize,
        quality: options.quality
      },
      generationSource: options.generationSource,
      requestedBy: options.requestedBy
    });
    jobId = job.jobId;
    jobRef = job.jobRef;
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const result = {
    total: selectedShaders.length,
    success: [],
    errors: [],
    jobId
  };

  try {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await page.addScriptTag({ content: BROWSER_BOOTSTRAP });

    let processed = 0;

    for (const shader of selectedShaders) {
      processed += 1;
      console.log(`→ [${processed}/${selectedShaders.length}] ${shader.id}`);

      const shaderStatusExtra = {
        lastRequester: options.requestedBy,
        generationSource: options.generationSource,
        etag: null
      };

      try {
        if (!options.dryRun) {
          await updateShaderStatus(firebase.database, shader.id, 'processing', {
            generationSource: options.generationSource,
            startedAt: new Date().toISOString(),
            lastRequester: options.requestedBy
          });
        }

        const previewOptions = {
          width: options.width,
          height: options.height,
          intensity: DEFAULT_OPTIONS.intensity,
          time: DEFAULT_OPTIONS.time,
          quality: options.quality,
          mimeType: 'image/webp'
        };

        const preview = await renderShaderInBrowser(page, shader, previewOptions);
        const thumbnail = await renderShaderInBrowser(page, shader, {
          ...previewOptions,
          width: options.thumbnailSize,
          height: options.thumbnailSize
        });

        const etag = computeEtag(preview.dataUrl);
        shaderStatusExtra.etag = etag;
        shaderStatusExtra.webglVersion = preview.webglVersion;

        if (options.dryRun) {
          console.log(`   • (dry-run) webgl=${preview.webglVersion}, etag=${etag}`);
        } else {
          const previewBuffer = decodeDataUrl(preview.dataUrl);
          const thumbnailBuffer = decodeDataUrl(thumbnail.dataUrl);

          const basePath = `${DEFAULT_OPTIONS.storagePrefix}/${shader.id}`;
          const previewPath = `${basePath}/preview.webp`;
          const thumbPath = `${basePath}/thumbnail.webp`;

          const previewUrl = await uploadBuffer(firebase.bucket, previewPath, previewBuffer, 'image/webp', { etag });
          const thumbnailUrl = await uploadBuffer(firebase.bucket, thumbPath, thumbnailBuffer, 'image/webp', { etag });

          await firebase.database.ref(`shader-previews/${shader.id}`).set({
            previewUrl,
            thumbnailUrl,
            generatedAt: new Date().toISOString(),
            generationSource: options.generationSource,
            webglVersion: preview.webglVersion,
            status: 'ready',
            errorMessage: '',
            etag,
            renderSettings: {
              width: options.width,
              height: options.height,
              thumbnail: options.thumbnailSize,
              format: 'image/webp'
            },
            lastRequester: options.requestedBy
          });
        }

        result.success.push(shader.id);
        console.log(`   • OK (webgl=${preview.webglVersion})`);
      } catch (error) {
        result.errors.push({ shaderId: shader.id, message: error.message });
        console.error(`   • Chyba: ${error.message}`);
        if (!options.dryRun) {
          await updateShaderStatus(firebase.database, shader.id, 'error', {
            errorMessage: error.message,
            finishedAt: new Date().toISOString(),
            generationSource: options.generationSource,
            lastRequester: options.requestedBy
          });
        }
      }
    }

    if (jobRef) {
      await jobRef.update({
        finishedAt: new Date().toISOString(),
        status: result.errors.length === 0 ? 'completed' : 'completed-with-errors',
        completed: result.success.length,
        failed: result.errors.length
      });
    }

    console.log(`✅ Hotovo: ${result.success.length} ok, ${result.errors.length} selhalo${jobId ? ` (job ${jobId})` : ''}`);
  } finally {
    await browser.close();
    if (shouldDisconnect) {
      await firebase.database.goOffline();
    }
  }

  return result;
}

const main = async () => {
  const options = parseArgs();
  await runShaderPreviewGeneration(options);
};

const isDirectExecution = process.argv[1]?.includes('generateShaderPreviews.js');

if (isDirectExecution) {
  main().catch(async (error) => {
    console.error('❌ Generátor selhal:', error);
    try {
      await admin.database().goOffline();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  });
}


