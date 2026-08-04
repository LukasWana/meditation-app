/**
 * Secure Firebase Configuration
 * Centralizovaná a bezpečná konfigurace Firebase služeb
 *
 * Firebase SDK je v samostatném chunku (díky manualChunks v vite.config),
 * ale načítá se při startu aplikace (eager init).
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

function detectNativePlatform() {
  try {
    const win = typeof window !== 'undefined' ? window : null;
    if (win && win.Capacitor && typeof win.Capacitor.isNativePlatform === 'function') {
      return win.Capacitor.isNativePlatform();
    }
    if (win && win.Capacitor && win.Capacitor.isNative === true) {
      return true;
    }
  } catch (e) { void e; }
  return false;
}

/**
 * Validace Firebase konfigurace
 */
const validateFirebaseConfig = () => {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const missingKeys = requiredKeys.filter(key => !import.meta.env[key]);

  if (missingKeys.length > 0) {
    const errorMessage = `Missing Firebase configuration: ${missingKeys.join(', ')}`;
    console.error('Firebase Configuration Error:', errorMessage);
    throw new Error(errorMessage);
  }

  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  if (!config.projectId || config.projectId.length < 3) {
    throw new Error('Invalid Firebase projectId configuration');
  }

  if (!config.storageBucket || !config.storageBucket.includes(config.projectId)) {
    throw new Error('Invalid Firebase storageBucket configuration');
  }

  return config;
};

const firebaseConfig = validateFirebaseConfig();

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export let storage;
try {
  storage = getStorage(app);
} catch (error) {
  console.error('Failed to initialize Firebase Storage:', error.message);
  try {
    storage = getStorage(app);
  } catch (retryError) {
    console.error('Firebase Storage retry failed:', retryError.message);
    storage = null;
  }
}

export let database;
try {
  database = getDatabase(app, 'https://meditations-audio-default-rtdb.europe-west1.firebasedatabase.app');
} catch (error) {
  console.error('Failed to initialize Realtime Database:', error.message);
  database = getDatabase(app);
}

export { database as realtimeDatabase };

let appCheck = null;
const isNative = detectNativePlatform();
const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (isNative) {
  console.warn('App Check: Play Integrity provider required for native Android. reCAPTCHA v3 is unreliable in WebView.');
} else if (recaptchaKey) {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaKey),
      isTokenAutoRefreshEnabled: true
    });
    if (import.meta.env.MODE === 'development') {
      console.log('Firebase App Check initialized with reCAPTCHA v3');
    }
  } catch (error) {
    console.warn('Firebase App Check initialization failed:', error.message);
  }
} else if (import.meta.env.MODE === 'production') {
  console.error('CRITICAL: App Check is NOT active in production! Set VITE_RECAPTCHA_SITE_KEY in .env.production');
}

export { appCheck };

/**
 * No-op pro zpětnou kompatibilitu s importéry, které volají ensureFirebase()
 * Eager init znamená, že Firebase je vždy ready.
 */
export const ensureFirebase = async () => {
  return { app, auth, db, storage, database, realtimeDatabase: database, appCheck };
};

export const withFirebaseErrorHandling = async (operation, fallback = null) => {
  try {
    return await operation();
  } catch (error) {
    console.error('Firebase operation failed:', error);

    if (import.meta.env.MODE === 'development') {
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    }

    if (fallback !== null) {
      return fallback;
    }

    throw error;
  }
};

export const firebaseUtils = {
  async getDocument(collection, docId) {
    return withFirebaseErrorHandling(
      async () => {
        const { doc, getDoc } = await import('firebase/firestore');
        const docRef = doc(db, collection, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          return docSnap.data();
        }
        return null;
      },
      null
    );
  },

  async setDocument(collection, docId, data) {
    return withFirebaseErrorHandling(
      async () => {
        const { doc, setDoc } = await import('firebase/firestore');
        const docRef = doc(db, collection, docId);
        await setDoc(docRef, {
          ...data,
          updated: new Date().toISOString()
        });
        return true;
      },
      false
    );
  },

  async getFile(path) {
    return withFirebaseErrorHandling(
      async () => {
        const { ref, getDownloadURL } = await import('firebase/storage');
        const fileRef = ref(storage, path);
        return await getDownloadURL(fileRef);
      },
      null
    );
  }
};

export default app;