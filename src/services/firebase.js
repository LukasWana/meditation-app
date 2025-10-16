import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Zde vložte vaši Firebase konfiguraci z Firebase Console
  apiKey: "your-api-key",
  authDomain: "meditations-audio.firebaseapp.com",
  projectId: "meditations-audio",
  storageBucket: "meditations-audio.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
