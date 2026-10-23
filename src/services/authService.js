import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  getIdTokenResult
} from 'firebase/auth';
import { auth, ensureFirebase } from '@config/secure-firebase';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import log from './logger';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
// Přidat scopes pro získání profilu a fotky
provider.addScope('profile');
provider.addScope('email');

/**
 * Chybové kódy popupu, při kterých má smysl zkusit redirect.
 * Jen zablokovaný popup — zavření popupu uživatelem (auth/popup-closed-by-user)
 * nebo souběžný požadavek (auth/cancelled-popup-request) je vědomá akce / šum,
 * redirect by uživatele přesměroval proti jeho vůli.
 * auth/operation-not-supported-in-this-environment sem nepatří: znamená nepodporovaný
 * protokol nebo vypnuté web storage a redirect v takovém prostředí selže stejně.
 */
export const REDIRECT_FALLBACK_CODES = Object.freeze(['auth/popup-blocked']);

export function shouldFallbackToRedirect(error, isNative) {
  if (isNative) return false;
  return REDIRECT_FALLBACK_CODES.includes(error?.code);
}

/**
 * Klíče localStorage vázané na přihlášeného uživatele.
 * Historie aktivity: `meditation-app-activity-history-<uid>` (activityHistoryService.getLocalStorageKey);
 * anonymní historie (`...-anonymous`) patří zařízení, ta zůstává.
 * Dechové profily: uživatelský obsah, při dalším přihlášení by se přes syncSettings
 * nahrál do cizího účtu, který v cloudu žádné profily nemá.
 * Nastavení zařízení (téma, barva, jazyk, hlas, pozadí, …) se nemažou.
 */
export const USER_HISTORY_KEY_PREFIX = 'meditation-app-activity-history-';
export const BREATH_PROFILES_KEY = 'meditation-app-breath-profiles';

export function clearUserLocalData(storage, { includeBreathProfiles = true } = {}) {
  if (!storage) return [];
  const toRemove = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    if (key.startsWith(USER_HISTORY_KEY_PREFIX) && key !== `${USER_HISTORY_KEY_PREFIX}anonymous`) {
      toRemove.push(key);
    } else if (includeBreathProfiles && key === BREATH_PROFILES_KEY) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((key) => storage.removeItem(key));
  return toRemove;
}

export async function signInWithGoogle() {
  try {
    await ensureFirebase();
    if (Capacitor.isNativePlatform()) {
      log.info('Používám nativní Google přihlášení (Capacitor)');
      
      // Bezpečnostní pojistka: pokud chybí google-services.json, nespouštět, jinak dojde k pádu Android aplikace
      if (typeof __GOOGLE_SERVICES_JSON_PRESENT__ !== 'undefined' && !__GOOGLE_SERVICES_JSON_PRESENT__) {
        const errorMsg = 'Konfigurace Google přihlášení není dokončena. Nejprve nahrajte soubor google-services.json do složky android/app a restartujte aplikaci.';
        log.error('❌ ' + errorMsg);
        throw new Error(errorMsg);
      }

      // Inicializace Google Auth pluginu pro nativní platformu
      try {
        await GoogleAuth.initialize({
          scopes: ['profile', 'email'],
        });
      } catch (initError) {
        log.warn('GoogleAuth.initialize() warning (může být již inicializován):', initError);
      }

      let result;
      try {
        result = await GoogleAuth.signIn();
      } catch (signInError) {
        log.error('GoogleAuth.signIn() selhalo:', signInError);
        throw new Error('Google přihlášení selhalo. Zkontrolujte Firebase konfiguraci. Detail: ' + (signInError?.message || signInError));
      }
      
      const idToken = result?.authentication?.idToken;
      if (!idToken) {
        throw new Error('Google přihlášení nevrátilo idToken. Zkontrolujte OAuth konfiguraci.');
      }
      const credential = GoogleAuthProvider.credential(idToken);
      return await signInWithCredential(auth, credential);
    } else {
      log.info('Používám webové Google přihlášení');
      return await signInWithPopup(auth, provider);
    }
  } catch (error) {
    // Fallback na redirect jen při zablokovaném popupu (např. mobilní prohlížeče);
    // výsledek redirectu načítá completeRedirectSignIn() při startu aplikace.
    if (shouldFallbackToRedirect(error, Capacitor.isNativePlatform())) {
      log.warn('Popup login blokován, zkouším redirect');
      return signInWithRedirect(auth, provider);
    }
    log.error('Chyba při přihlašování přes Google:', error);
    throw error;
  }
}

/**
 * Dokončí přihlášení po návratu z signInWithRedirect (jen web).
 * Bez čekajícího redirectu vrací null; chybu redirectu vyhodí volajícímu.
 */
export async function completeRedirectSignIn() {
  if (Capacitor.isNativePlatform()) return null;
  await ensureFirebase();
  return getRedirectResult(auth);
}

export async function signOutUser() {
  await ensureFirebase();
  // Na Androidu odhlásit i Google účet v pluginu, jinak další přihlášení
  // vrátí tentýž účet bez nabídky výběru
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
    } catch (googleSignOutError) {
      log.warn('GoogleAuth.signOut() selhalo:', googleSignOutError);
    }
  }
  return signOut(auth);
}

export async function fetchTokenResult(user) {
  if (!user) return null;
  return getIdTokenResult(user, true);
}

export async function subscribeToAuth(onChange) {
  await ensureFirebase();
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onChange({ user: null, isAdmin: false, tokenResult: null });
      return;
    }

    try {
      const tokenResult = await fetchTokenResult(user);
      const isAdmin = !!tokenResult?.claims?.admin;
      onChange({ user, isAdmin, tokenResult });
    } catch (error) {
      log.error('❌ Failed to fetch token result', error);
      onChange({ user, isAdmin: false, tokenResult: null, error });
    }
  });
}

export const authService = {
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  fetchTokenResult,
  completeRedirectSignIn,
  clearUserLocalData
};

export default authService;

