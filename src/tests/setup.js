

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Rozšíří expect o DOM matchers
expect.extend(matchers);

// Cleanup po každém testu
afterEach(() => {
  cleanup();
});

// Mock Firebase pro testy
global.mockFirebase = {
  storage: {
    ref: vi.fn(),
    listAll: vi.fn(),
    getDownloadURL: vi.fn()
  },
  firestore: {
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn()
  }
};

// Mock window.gtag pro Google Analytics testy
global.gtag = vi.fn();

// Mock console methods pro testy
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

