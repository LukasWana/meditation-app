// DEPRECATED: Use ../config/secure-firebase.js instead
// This file is kept for backward compatibility

import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Validace Firebase konfigurace
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
    console.error('❌ Missing Firebase environment variables:', missingKeys);
    throw new Error(`Missing required Firebase configuration: ${missingKeys.join(', ')}`);
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

  // Validace projectId (nemělo by být prázdné nebo příliš krátké)
  if (!config.projectId || config.projectId.length < 3) {
    throw new Error('Invalid Firebase projectId configuration');
  }

  // Validace storageBucket (mělo by obsahovat projectId)
  if (!config.storageBucket || !config.storageBucket.includes(config.projectId)) {
    throw new Error('Invalid Firebase storageBucket configuration');
  }

  return config;
};

const firebaseConfig = validateFirebaseConfig();

// Inicializace Firebase App
export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Inicializace Firebase App Check pro ochranu proti abuse
// AppCheck je inicializován, ale proměnná není použita (pouze pro inicializaci)
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    // eslint-disable-next-line no-unused-vars
    const appCheck = initializeAppCheck(app, {
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
} else {
  // App Check logy deaktivovány
  // if (import.meta.env.MODE === 'development') {
  //   console.log('ℹ️ App Check je vypnutý - můžete nastavit VITE_RECAPTCHA_SITE_KEY pro aktivaci');
  // }
}

// Realtime Database - respektuj konfigurované prostředí
let database;
try {
  const databaseUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;
  const fallbackDatabaseUrl = 'https://meditations-audio-default-rtdb.europe-west1.firebasedatabase.app';

  const resolvedUrl = databaseUrl && databaseUrl.trim().length > 0
    ? databaseUrl
    : fallbackDatabaseUrl;

  database = getDatabase(app, resolvedUrl);

  // Database URL logy deaktivovány
  // if (import.meta.env.MODE === 'development') {
  //   console.log('🗄️ Realtime Database: Using URL', resolvedUrl);
  //   if (!databaseUrl) {
  //     console.log('ℹ️ No VITE_FIREBASE_DATABASE_URL provided, using regional fallback');
  //   }
  // }
} catch (error) {
  console.error('❌ Chyba při inicializaci Realtime Database:', error);
  // Fallback na default databázi
  database = getDatabase(app);
  // Database fallback logy deaktivovány
  // if (import.meta.env.MODE === 'development') {
  //   console.log('🗄️ Realtime Database: Using default database after fallback');
  // }
}
export { database };

// Debug Firebase připojení - pouze v development módu a bez citlivých dat
  // Firebase inicializační logy deaktivovány - příliš mnoho výpisů
  // Použij pouze pro skutečné chyby
  // if (import.meta.env.MODE === 'development') {
  //   console.log('🔥 Firebase initialized successfully');
  //   console.log('📁 Project ID:', firebaseConfig.projectId);
  //   console.log('📦 Storage Bucket:', firebaseConfig.storageBucket);
  //   console.log('🗄️ Realtime Database URL:', database.app.options.databaseURL);
  //   console.log('🛡️ App Check:', appCheck ? 'Active' : 'Disabled');
  //   // Nezobrazujeme API klíče ani jiné citlivé údaje
  // }
