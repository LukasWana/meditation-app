import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateShaderCode, convertShaderToWebGL, sanitizeNumberFormats } from '@utils/shaderLoader';

describe('shaderLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateShaderCode', () => {
    it('should validate valid shader code', () => {
      const validCode = `
        precision mediump float;
        uniform float u_time;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `;

      const result = validateShaderCode(validCode);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty shader code', () => {
      const result = validateShaderCode('');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject null shader code', () => {
      const result = validateShaderCode(null);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about invalid number formats', () => {
      const codeWithInvalidNumbers = `
        precision mediump float;
        void main() {
          float x = 1.2.3;
          gl_FragColor = vec4(1.0);
        }
      `;

      const result = validateShaderCode(codeWithInvalidNumbers);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn if main function is missing', () => {
      const codeWithoutMain = `
        precision mediump float;
        uniform float u_time;
      `;

      const result = validateShaderCode(codeWithoutMain);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('sanitizeNumberFormats', () => {
    it('should fix invalid number formats', () => {
      const code = 'float x = 1.2.3;';
      const result = sanitizeNumberFormats(code);

      expect(result).not.toContain('1.2.3');
    });

    it('should preserve valid numbers', () => {
      const code = 'float x = 1.5; float y = 2.0;';
      const result = sanitizeNumberFormats(code);

      expect(result).toContain('1.5');
      expect(result).toContain('2.0');
    });
  });

  describe('convertShaderToWebGL', () => {
    it('should convert shader code to WebGL format', () => {
      const shaderCode = `
        void mainImage(out vec4 fragColor, in vec2 fragCoord) {
          fragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `;

      const result = convertShaderToWebGL(shaderCode, 'shaders/test.ts', false);

      expect(result).toContain('void main()');
      expect(result).toContain('precision mediump float');
    });

    it('should handle mini-shader format', () => {
      const miniShaderCode = 'vec3 color = vec3(1.0);';
      const result = convertShaderToWebGL(miniShaderCode, 'mini-shaders/test.glsl', false);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should throw error for invalid shader code', () => {
      expect(() => {
        convertShaderToWebGL(null, 'test.ts', false);
      }).toThrow();
    });
  });
});

