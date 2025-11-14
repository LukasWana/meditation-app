import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attemptErrorRecovery } from '@utils/shaderErrorRecovery';

describe('shaderErrorRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('attemptErrorRecovery', () => {
    it('should return original code if no errors', () => {
      const shaderCode = `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const result = attemptErrorRecovery(shaderCode, [], false);

      expect(result).toBe(shaderCode);
    });

    it('should attempt to fix undeclared variable errors', () => {
      const shaderCode = `
        precision mediump float;
        void main() {
          float x = undefinedVar;
          gl_FragColor = vec4(1.0);
        }
      `;

      const errors = ['0:3: error: \'undefinedVar\' : undeclared identifier'];
      const result = attemptErrorRecovery(shaderCode, errors, false);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should attempt to fix type mismatch errors', () => {
      const shaderCode = `
        precision mediump float;
        void main() {
          vec2 v = 1.0;
          gl_FragColor = vec4(1.0);
        }
      `;

      const errors = ['0:3: error: cannot convert from \'float\' to \'vec2\''];
      const result = attemptErrorRecovery(shaderCode, errors, false);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle multiple errors', () => {
      const shaderCode = `
        precision mediump float;
        void main() {
          float x = undefinedVar1;
          vec2 v = undefinedVar2;
          gl_FragColor = vec4(1.0);
        }
      `;

      const errors = [
        '0:3: error: \'undefinedVar1\' : undeclared identifier',
        '0:4: error: \'undefinedVar2\' : undeclared identifier'
      ];
      const result = attemptErrorRecovery(shaderCode, errors, false);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle WebGL2 specific errors', () => {
      const shaderCode = `
        #version 300 es
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0);
        }
      `;

      const errors = ['0:4: error: \'gl_FragColor\' : undeclared identifier'];
      const result = attemptErrorRecovery(shaderCode, errors, true);

      expect(result).toBeTruthy();
      expect(result).toContain('fragColor');
    });
  });
});

