/**
 * Unit testy pro authService — rozhodnutí popup→redirect, dokončení redirectu
 * a mazání uživatelských dat z localStorage při odhlášení.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  isNative: false,
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn()
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
    addScope() {}
    static credential() { return {}; }
  },
  signInWithPopup: mocks.signInWithPopup,
  signInWithRedirect: mocks.signInWithRedirect,
  getRedirectResult: mocks.getRedirectResult,
  signInWithCredential: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getIdTokenResult: vi.fn()
}));

vi.mock('@config/secure-firebase', () => ({
  auth: {},
  ensureFirebase: vi.fn(() => Promise.resolve())
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => mocks.isNative }
}));

vi.mock('@codetrix-studio/capacitor-google-auth', () => ({
  GoogleAuth: { initialize: vi.fn(), signIn: vi.fn() }
}));

import {
  shouldFallbackToRedirect,
  signInWithGoogle,
  completeRedirectSignIn,
  clearUserLocalData
} from '../services/authService';

const popupError = (code) => Object.assign(new Error(code), { code });

describe('authService.shouldFallbackToRedirect', () => {
  it('zablokovaný popup na webu → redirect', () => {
    expect(shouldFallbackToRedirect(popupError('auth/popup-blocked'), false)).toBe(true);
  });

  it('zavření popupu uživatelem ani souběžný požadavek redirect nespustí', () => {
    expect(shouldFallbackToRedirect(popupError('auth/popup-closed-by-user'), false)).toBe(false);
    expect(shouldFallbackToRedirect(popupError('auth/cancelled-popup-request'), false)).toBe(false);
  });

  it('na nativní platformě nikdy', () => {
    expect(shouldFallbackToRedirect(popupError('auth/popup-blocked'), true)).toBe(false);
  });

  it('chyba bez kódu', () => {
    expect(shouldFallbackToRedirect(undefined, false)).toBe(false);
    expect(shouldFallbackToRedirect(new Error('x'), false)).toBe(false);
  });
});

describe('authService.signInWithGoogle (web)', () => {
  beforeEach(() => {
    mocks.isNative = false;
    mocks.signInWithPopup.mockReset();
    mocks.signInWithRedirect.mockReset();
  });

  it('zavřený popup vyhodí chybu, redirect se nevolá', async () => {
    mocks.signInWithPopup.mockRejectedValue(popupError('auth/popup-closed-by-user'));
    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'auth/popup-closed-by-user' });
    expect(mocks.signInWithRedirect).not.toHaveBeenCalled();
  });

  it('zablokovaný popup přejde na redirect', async () => {
    mocks.signInWithPopup.mockRejectedValue(popupError('auth/popup-blocked'));
    mocks.signInWithRedirect.mockResolvedValue(undefined);
    await signInWithGoogle();
    expect(mocks.signInWithRedirect).toHaveBeenCalledTimes(1);
  });
});

describe('authService.completeRedirectSignIn', () => {
  beforeEach(() => {
    mocks.getRedirectResult.mockReset();
  });

  it('na nativní platformě nic nevolá', async () => {
    mocks.isNative = true;
    await expect(completeRedirectSignIn()).resolves.toBeNull();
    expect(mocks.getRedirectResult).not.toHaveBeenCalled();
  });

  it('na webu vrací výsledek redirectu a propaguje chybu', async () => {
    mocks.isNative = false;
    mocks.getRedirectResult.mockResolvedValueOnce(null);
    await expect(completeRedirectSignIn()).resolves.toBeNull();
    mocks.getRedirectResult.mockRejectedValueOnce(popupError('auth/account-exists-with-different-credential'));
    await expect(completeRedirectSignIn()).rejects.toMatchObject({
      code: 'auth/account-exists-with-different-credential'
    });
  });
});

describe('authService.clearUserLocalData', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('meditation-app-activity-history-uidA', '[1]');
    localStorage.setItem('meditation-app-activity-history-uidB', '[2]');
    localStorage.setItem('meditation-app-activity-history-anonymous', '[3]');
    localStorage.setItem('meditation-app-breath-profiles', '[]');
    localStorage.setItem('meditation-app-theme', 'dark');
    localStorage.setItem('meditation-app-language', 'cs');
  });

  it('smaže uživatelskou historii a profily, nechá anonymní historii a nastavení zařízení', () => {
    const removed = clearUserLocalData(localStorage);
    expect(removed.sort()).toEqual([
      'meditation-app-activity-history-uidA',
      'meditation-app-activity-history-uidB',
      'meditation-app-breath-profiles'
    ]);
    expect(localStorage.getItem('meditation-app-activity-history-anonymous')).toBe('[3]');
    expect(localStorage.getItem('meditation-app-theme')).toBe('dark');
    expect(localStorage.getItem('meditation-app-language')).toBe('cs');
  });

  it('bez includeBreathProfiles profily nechá', () => {
    clearUserLocalData(localStorage, { includeBreathProfiles: false });
    expect(localStorage.getItem('meditation-app-breath-profiles')).toBe('[]');
    expect(localStorage.getItem('meditation-app-activity-history-uidA')).toBeNull();
  });

  it('bez úložiště nic nedělá', () => {
    expect(clearUserLocalData(null)).toEqual([]);
  });
});
