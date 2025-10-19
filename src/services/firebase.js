import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
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

const app = initializeApp(firebaseConfig);

// Inicializace Firebase App Check pro ochranu proti abuse
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
} else {
  if (import.meta.env.MODE === 'development') {
    console.warn('⚠️ VITE_RECAPTCHA_SITE_KEY není nastaven - App Check není aktivní');
    console.warn('   Pro produkci doporučujeme nastavit reCAPTCHA v3');
  }
}

export const storage = getStorage(app);
export const db = getFirestore(app);

// Debug Firebase připojení - pouze v development módu a bez citlivých dat
if (import.meta.env.MODE === 'development') {
  console.log('🔥 Firebase initialized successfully');
  console.log('📁 Project ID:', firebaseConfig.projectId);
  console.log('📦 Storage Bucket:', firebaseConfig.storageBucket);
  console.log('🛡️ App Check:', appCheck ? 'Active' : 'Disabled');
  // Nezobrazujeme API klíče ani jiné citlivé údaje
}
