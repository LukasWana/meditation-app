import {
  sanitizeHtml,
  validateEmail,
  validatePassword,
  validateFileName,
  validateFirebaseDocId,
  validateUrl,
  validateStoragePath,
  validateJson,
  validateNumber,
  validateString,
  validateInput
} from '@utils/validation';

describe('Validation Utils', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = sanitizeHtml(input);
      expect(result).toBe('Hello World');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>Content';
      const result = sanitizeHtml(input);
      expect(result).toBe('Content');
    });

    it('should remove javascript: protocols', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeHtml(input);
      expect(result).toBe('alert("xss")');
    });

    it('should handle non-string input', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(123)).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check for uppercase letters', () => {
      const result = validatePassword('lowercase123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Heslo musí obsahovat velké písmeno');
    });

    it('should check for lowercase letters', () => {
      const result = validatePassword('UPPERCASE123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Heslo musí obsahovat malé písmeno');
    });

    it('should check for numbers', () => {
      const result = validatePassword('NoNumbers');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Heslo musí obsahovat číslici');
    });

    it('should check minimum length', () => {
      const result = validatePassword('Abc1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Heslo musí mít alespoň 8 znaků');
    });
  });

  describe('validateFileName', () => {
    it('should validate correct file names', () => {
      expect(validateFileName('audio.mp3')).toBe(true);
      expect(validateFileName('my-audio-file.wav')).toBe(true);
      expect(validateFileName('test_file.m4a')).toBe(true);
    });

    it('should reject invalid file names', () => {
      expect(validateFileName('')).toBe(false);
      expect(validateFileName('file<name.mp3')).toBe(false);
      expect(validateFileName('file:name.mp3')).toBe(false);
      expect(validateFileName('CON.mp3')).toBe(false); // Windows reserved name
      expect(validateFileName('file/name.mp3')).toBe(false);
    });
  });

  describe('validateFirebaseDocId', () => {
    it('should validate correct document IDs', () => {
      expect(validateFirebaseDocId('document123')).toBe(true);
      expect(validateFirebaseDocId('audio-file-name')).toBe(true);
      expect(validateFirebaseDocId('test_doc')).toBe(true);
    });

    it('should reject invalid document IDs', () => {
      expect(validateFirebaseDocId('')).toBe(false);
      expect(validateFirebaseDocId('doc with spaces')).toBe(false);
      expect(validateFirebaseDocId('doc/with/slashes')).toBe(false);
      expect(validateFirebaseDocId(' doc-with-leading-space')).toBe(false);
      expect(validateFirebaseDocId('doc-with-trailing-space ')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
      expect(validateUrl('https://subdomain.example.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false); // Wrong protocol
      expect(validateUrl('javascript:alert("xss")')).toBe(false); // Dangerous protocol
      expect(validateUrl('')).toBe(false);
      expect(validateUrl(null)).toBe(false);
    });
  });

  describe('validateStoragePath', () => {
    it('should validate correct storage paths', () => {
      expect(validateStoragePath('audio/file.mp3')).toBe(true);
      expect(validateStoragePath('folder/subfolder/file.wav')).toBe(true);
      expect(validateStoragePath('simple-file')).toBe(true);
    });

    it('should reject invalid storage paths', () => {
      expect(validateStoragePath('')).toBe(false);
      expect(validateStoragePath('/leading-slash')).toBe(false);
      expect(validateStoragePath('trailing-slash/')).toBe(false);
      expect(validateStoragePath('double//slash')).toBe(false);
      expect(validateStoragePath('file<name.mp3')).toBe(false);
    });
  });

  describe('validateJson', () => {
    it('should validate correct JSON', () => {
      const result = validateJson('{"key": "value"}');
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ key: 'value' });
    });

    it('should reject invalid JSON', () => {
      const result = validateJson('invalid json');
      expect(result.isValid).toBe(false);
      expect(result.data).toBe(null);
      expect(result.error).toBeDefined();
    });

    it('should handle non-string input', () => {
      const result = validateJson(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid input type');
    });
  });

  describe('validateNumber', () => {
    it('should validate correct numbers', () => {
      const result = validateNumber(42);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate numbers within range', () => {
      const result = validateNumber(50, { min: 0, max: 100 });
      expect(result.isValid).toBe(true);
    });

    it('should reject numbers outside range', () => {
      const result = validateNumber(150, { min: 0, max: 100 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hodnota nesmí být větší než 100');
    });

    it('should validate integers', () => {
      const result = validateNumber(42.5, { integer: true });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hodnota musí být celé číslo');
    });

    it('should validate positive numbers', () => {
      const result = validateNumber(-5, { positive: true });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hodnota musí být kladná');
    });
  });

  describe('validateString', () => {
    it('should validate correct strings', () => {
      const result = validateString('Hello World');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate strings with length constraints', () => {
      const result = validateString('Hello', { minLength: 3, maxLength: 10 });
      expect(result.isValid).toBe(true);
    });

    it('should reject strings that are too short', () => {
      const result = validateString('Hi', { minLength: 3 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text musí mít alespoň 3 znaků');
    });

    it('should reject strings that are too long', () => {
      const result = validateString('Very long string', { maxLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text nesmí mít více než 5 znaků');
    });

    it('should validate with regex pattern', () => {
      const result = validateString('abc123', { pattern: /^[a-z0-9]+$/ });
      expect(result.isValid).toBe(true);
    });

    it('should reject strings that do not match pattern', () => {
      const result = validateString('ABC123', { pattern: /^[a-z0-9]+$/ });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Text neodpovídá požadovanému formátu');
    });
  });

  describe('validateInput', () => {
    it('should validate complete input object', () => {
      const input = {
        email: 'test@example.com',
        password: 'StrongPass123',
        age: 25
      };

      const schema = {
        email: { type: 'email' },
        password: { type: 'password' },
        age: { type: 'number', options: { min: 0, max: 120 } }
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid input', () => {
      const input = {
        email: 'invalid-email',
        password: 'weak',
        age: -5
      };

      const schema = {
        email: { type: 'email' },
        password: { type: 'password' },
        age: { type: 'number', options: { min: 0, max: 120 } }
      };

      const result = validateInput(input, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toContain('Neplatný email');
      expect(result.errors.password.length).toBeGreaterThan(0);
      expect(result.errors.age).toContain('Hodnota musí být alespoň 0');
    });
  });
});
