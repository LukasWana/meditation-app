import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

// Firebase konfigurace
const firebaseConfig = {
  apiKey: "AIzaSyBqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq",
  authDomain: "meditations-audio.firebaseapp.com",
  projectId: "meditations-audio",
  storageBucket: "meditations-audio.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app, 'https://meditations-audio-default-rtdb.europe-west1.firebasedatabase.app');

async function debugRealtimeDB() {
  try {
    console.log('🔍 Debugging Realtime Database...');

    // Zkontroluj root
    const rootRef = ref(database, '/');
    const rootSnapshot = await get(rootRef);
    console.log('📊 Root data keys:', Object.keys(rootSnapshot.val() || {}));

    // Zkontroluj audio-metadata
    const metadataRef = ref(database, 'audio-metadata');
    const metadataSnapshot = await get(metadataRef);

    if (metadataSnapshot.exists()) {
      const data = metadataSnapshot.val();
      console.log('📊 audio-metadata structure:');
      console.log('  - Keys:', Object.keys(data));
      console.log('  - Has files:', !!data.files);
      console.log('  - Files is array:', Array.isArray(data.files));
      console.log('  - Files length:', data.files ? data.files.length : 0);

      if (data.files && Array.isArray(data.files)) {
        console.log('📊 Sample files:');
        data.files.slice(0, 3).forEach((file, i) => {
          console.log(`  ${i + 1}. ${file.fileName || 'No fileName'}`);
          console.log(`     Folder: ${file.folder || 'No folder'}`);
          console.log(`     DisplayName: ${file.displayName || 'No displayName'}`);
        });

        const slovaFiles = data.files.filter(f =>
          f.fileName && f.fileName.includes('slova/')
        );
        console.log(`🎤 Slova files: ${slovaFiles.length}`);
      }
    } else {
      console.log('❌ No data in audio-metadata');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugRealtimeDB();
