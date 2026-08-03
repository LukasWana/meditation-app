import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
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
          grantOfflineAccess: true,
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
    if (!Capacitor.isNativePlatform()) {
      // Fallback na redirect (např. mobilní prohlížeče blokující popup)
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user') {
        log.warn('Popup login blokován, zkouším redirect');
        return signInWithRedirect(auth, provider);
      }
    }
    log.error('Chyba při přihlašování přes Google:', error);
    throw error;
  }
}

export async function signOutUser() {
  await ensureFirebase();
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
  fetchTokenResult
};

export default authService;

