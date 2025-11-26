/**
 * Secure Firebase Configuration
 * Centralizovaná a bezpečná konfigurace Firebase služeb
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

/**
 * Validace Firebase konfigurace
 * Kontroluje, že všechny potřebné environment variables jsou nastavené
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
    console.error('❌ Firebase Configuration Error:', errorMessage);
    throw new Error(errorMessage);
  }

  // Základní validace formátu
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  // Validace projectId
  if (!config.projectId || config.projectId.length < 3) {
    throw new Error('Invalid Firebase projectId configuration');
  }

  // Validace storageBucket
  if (!config.storageBucket || !config.storageBucket.includes(config.projectId)) {
    throw new Error('Invalid Firebase storageBucket configuration');
  }

  return config;
};

/**
 * Vytvoření Firebase konfigurace
 */
const firebaseConfig = validateFirebaseConfig();

/**
 * Inicializace Firebase App
 */
export const app = initializeApp(firebaseConfig);

/**
 * Inicializace Firebase Auth s error handling
 */
export const auth = getAuth(app);

/**
 * Inicializace Firestore s error handling
 */
export const db = getFirestore(app);

/**
 * Inicializace Firebase Storage s error handling
 */
export const storage = getStorage(app);

/**
 * Inicializace Firebase Realtime Database s error handling
 */
export let database;
try {
  // Vždy používej produkční databázi (emulator není dostupný)
  database = getDatabase(app, 'https://meditations-audio-default-rtdb.europe-west1.firebasedatabase.app');
  console.log('🗄️ Realtime Database: Using production database');
} catch (error) {
  console.error('❌ Failed to initialize Realtime Database:', error.message);
  // Fallback na default databázi
  database = getDatabase(app);
  console.log('🗄️ Realtime Database: Using default database');
}

export { database as realtimeDatabase };

/**
 * Inicializace Firebase App Check pro ochranu proti abuse
 */
let appCheck = null;
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });

    if (import.meta.env.MODE === 'development') {
      console.log('🛡️ Firebase App Check initialized with reCAPTCHA v3');
    }
  } catch (error) {
    console.warn('⚠️ Firebase App Check initialization failed:', error.message);
    console.warn('   App Check je volitelný, ale doporučený pro produkci');
  }
}

export { appCheck };

/**
 * Debug Firebase připojení - pouze v development módu a bez citlivých dat
 */
if (import.meta.env.MODE === 'development') {
  console.log('🔥 Firebase initialized successfully');
  console.log('📊 Services available:', {
    auth: !!auth,
    firestore: !!db,
    storage: !!storage,
    database: !!database,
    appCheck: !!appCheck
  });
}

/**
 * Error handling wrapper pro Firebase operace
 */
export const withFirebaseErrorHandling = async (operation, fallback = null) => {
  try {
    return await operation();
  } catch (error) {
    console.error('Firebase operation failed:', error);

    // Log error details pro debugging (pouze v development)
    if (import.meta.env.MODE === 'development') {
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    }

    // Return fallback nebo throw error
    if (fallback !== null) {
      return fallback;
    }

    throw error;
  }
};

/**
 * Utility funkce pro bezpečné Firebase operace
 */
export const firebaseUtils = {
  /**
   * Bezpečné načtení dokumentu z Firestore
   */
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

  /**
   * Bezpečné uložení dokumentu do Firestore
   */
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

  /**
   * Bezpečné načtení souboru ze Storage
   */
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
