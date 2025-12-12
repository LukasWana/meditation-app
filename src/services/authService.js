import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  getIdTokenResult
} from 'firebase/auth';
import { auth } from '@config/secure-firebase';
import log from './logger';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
// Přidat scopes pro získání profilu a fotky
provider.addScope('profile');
provider.addScope('email');

export async function signInWithGoogle() {
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    // Fallback na redirect (např. mobilní prohlížeče blokující popup)
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/popup-closed-by-user') {
      log.warn('Popup login blokován, zkouším redirect');
      return signInWithRedirect(auth, provider);
    }
    throw error;
  }
}

export async function signOutUser() {
  return signOut(auth);
}

export async function fetchTokenResult(user) {
  if (!user) return null;
  return getIdTokenResult(user, true);
}

export function subscribeToAuth(onChange) {
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

