/**
 * Browserový wrapper nad sdíleným preview rendererem
 */

import { loadShader, convertShaderToWebGL } from './shaderLoader';
import {
  createShaderPreviewRenderer,
  getBuiltInFragmentShader
} from './previewRendererCore';
import { shouldDisableAntialiasing, isAndroid } from './deviceDetection';

let browserRenderer = null;

const createBrowserRenderer = () => {
  if (typeof document === 'undefined') {
    throw new Error('Shader preview renderer vyžaduje DOM');
  }

  return createShaderPreviewRenderer({
    width: 96,
    height: 96,
    createContext: ({ width, height }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      // Optimalizace pro Android
      const isAndroidDevice = isAndroid();
      const disableAntialiasing = shouldDisableAntialiasing();

      const contextAttributes = {
        antialias: !disableAntialiasing,
        preserveDrawingBuffer: true,
        powerPreference: isAndroidDevice ? 'low-power' : 'default',
        failIfMajorPerformanceCaveat: isAndroidDevice
      };

      let gl = canvas.getContext('webgl2', contextAttributes);
      if (!gl) {
        gl = canvas.getContext('webgl', contextAttributes);
      }

      if (!gl) {
        throw new Error('WebGL není podporován – nelze generovat náhledy shaderů');
      }

      return {
        gl,
        canvas,
        dispose: () => {
          try {
            if (typeof gl.getExtension === 'function') {
              const ext = gl.getExtension('WEBGL_lose_context');
              ext?.loseContext?.();
            }
          } catch (error) {
            console.warn('Preview Gen: Nepodařilo se uvolnit WebGL kontext', error);
          }
        }
      };
    },
    loadShaderSource: async (path) => {
      const code = await loadShader(path);
      if (!code) {
        throw new Error(`Preview Gen: Nelze načíst shader ${path}`);
      }
      return code;
    },
    convertShaderSource: (source, identifier, isWebGL2) => {
      return convertShaderToWebGL(source, identifier, isWebGL2);
    },
    builtInShaderResolver: getBuiltInFragmentShader,
    encode: async ({ canvas, options }) => {
      const mimeType = options?.mimeType || 'image/webp';
      const quality = options?.quality ?? 0.6;
      return canvas.toDataURL(mimeType, quality);
    },
    requestFrame: (cb) => (typeof window !== 'undefined' && window.requestAnimationFrame
      ? window.requestAnimationFrame(cb)
      : setTimeout(cb, 0)),
    logger: console
  });
};

const ensureRenderer = () => {
  if (!browserRenderer) {
    browserRenderer = createBrowserRenderer();
  }
  return browserRenderer;
};

export const disposeShaderPreviewRenderer = () => {
  if (browserRenderer) {
    browserRenderer.dispose();
    browserRenderer = null;
  }
};

export const renderShaderPreview = async (shaderInfo, options = {}) => {
  const renderer = ensureRenderer();
  return renderer.renderShader(shaderInfo, options);
};

export const generateShaderPreviews = async (
  shaders,
  onPreviewGenerated,
  onProgress,
  options = {}
) => {
  const renderer = ensureRenderer();

  await renderer.generateBatch(
    shaders,
    (id, result, shader) => {
      if (typeof onPreviewGenerated === 'function') {
        onPreviewGenerated(id, result, shader);
      }
    },
    onProgress,
    options
  );
};
