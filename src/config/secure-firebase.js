/**
 * Secure Firebase Configuration — Lazy Initialization
 *
 * Firebase SDK se načítá až na první použití přes dynamic import,
 * aby se ~200 kB gzip nepřidalo do initial bundle.
 *
 * Všechny exporty jsou `let` — začínají jako null a po `await ensureFirebase()`
 * se naplní. Importéry musí volat `await ensureFirebase()` před prvním použitím.
 */

export let app = null;
export let auth = null;
export let db = null;
export let storage = null;
export let database = null;
export let realtimeDatabase = null;
export let appCheck = null;

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

const _initPromise = (async () => {
  const [
    firebaseAppModule,
    firebaseAuthModule,
    firebaseFirestoreModule,
    firebaseStorageModule,
    firebaseDatabaseModule,
  ] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
    import('firebase/storage'),
    import('firebase/database'),
  ]);

  const config = validateFirebaseConfig();

  app = firebaseAppModule.initializeApp(config);
  auth = firebaseAuthModule.getAuth(app);
  db = firebaseFirestoreModule.getFirestore(app);

  try {
    storage = firebaseStorageModule.getStorage(app);
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Storage:', error.message);
    try {
      storage = firebaseStorageModule.getStorage(app);
    } catch (retryError) {
      console.error('❌ Firebase Storage retry failed:', retryError.message);
      storage = null;
    }
  }

  try {
    database = firebaseDatabaseModule.getDatabase(app, 'https://meditations-audio-default-rtdb.europe-west1.firebasedatabase.app');
  } catch (error) {
    console.error('❌ Failed to initialize Realtime Database:', error.message);
    database = firebaseDatabaseModule.getDatabase(app);
  }
  realtimeDatabase = database;

  if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    try {
      const { initializeAppCheck, ReCaptchaV3Provider } = firebaseAppModule;
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (error) {
      console.warn('⚠️ Firebase App Check initialization failed:', error.message);
    }
  }

  console.log('🔥 Firebase initialized successfully (lazy)');
  console.log('📊 Services available:', {
    auth: !!auth,
    firestore: !!db,
    storage: !!storage,
    database: !!database,
    appCheck: !!appCheck,
    mode: import.meta.env.MODE
  });

  return { app, auth, db, storage, database, realtimeDatabase, appCheck };
})();

export const ensureFirebase = () => _initPromise;

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
        await ensureFirebase();
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
        await ensureFirebase();
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
        await ensureFirebase();
        const { ref, getDownloadURL } = await import('firebase/storage');
        const fileRef = ref(storage, path);
        return await getDownloadURL(fileRef);
      },
      null
    );
  }
};