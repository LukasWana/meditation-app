

import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Rozšíří expect o DOM matchers
expect.extend(matchers);

// Poznámka:
// Volání vitest hooků (afterEach/beforeEach) v tomto setup souboru aktuálně
// v některých prostředích vyhazuje "Vitest failed to find the runner".
// Cleanup necháme vypnutý, dokud nebude test runner stabilní.
// Pokud bude potřeba, cleanup lze řešit přímo v testech.

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

// Poznámka: globální mock console tu nedělejme.
// Některé testy (např. logger) si console mockují samy a Vitest také potřebuje
// reálný console pro hlášení chyb při importu testů.

