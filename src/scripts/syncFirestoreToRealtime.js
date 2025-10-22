import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db as firestoreDb } from '../services/firebase.js';
import { database } from '../services/firebase.js';

// Funkce pro sanitizaci cesty pro Realtime Database
function sanitizePath(path) {
  return path
    .replace(/\./g, '_DOT_')
    .replace(/\//g, '_SLASH_')
    .replace(/#/g, '_HASH_')
    .replace(/\$/g, '_DOLLAR_')
    .replace(/\[/g, '_LBRACKET_')
    .replace(/\]/g, '_RBRACKET_');
}

// Hlavní funkce pro synchronizaci
export async function syncFirestoreToRealtime() {
  try {
    console.log('🔄 Starting Firestore to Realtime Database sync...');

    // Načti všechna metadata z Firestore
    const metadataCollection = collection(firestoreDb, 'audio-metadata');
    const q = query(metadataCollection, orderBy('fileName'));
    const querySnapshot = await getDocs(q);

    console.log(`📊 Found ${querySnapshot.size} documents in Firestore`);

    const metadataArray = [];
    const metadataObject = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      metadataArray.push(data);
      metadataObject[data.fileName] = data;
    });

    // Zobraz slova soubory
    const slovaFiles = metadataArray.filter(file =>
      file.fileName && file.fileName.includes('slova/')
    );
    console.log(`🎤 Found ${slovaFiles.length} slova files in Firestore`);

    if (slovaFiles.length > 0) {
      console.log('🎤 Sample slova files:');
      slovaFiles.slice(0, 3).forEach(file => {
        console.log(`   - ${file.fileName}`);
        console.log(`     Title: ${file.title || 'N/A'}`);
        console.log(`     Duration: ${file.duration || 'N/A'}`);
        console.log(`     Folder: ${file.folder || 'N/A'}`);
      });
    }

    // Ulož do Realtime Database ve formátu array
    const realtimeRef = ref(database, 'audio-metadata');
    await set(realtimeRef, {
      files: metadataArray,
      lastSync: new Date().toISOString(),
      totalFiles: metadataArray.length,
      slovaFiles: slovaFiles.length
    });

    console.log('✅ Successfully synced Firestore to Realtime Database');
    console.log(`📊 Synced ${metadataArray.length} total files`);
    console.log(`🎤 Synced ${slovaFiles.length} slova files`);

    return {
      success: true,
      totalFiles: metadataArray.length,
      slovaFiles: slovaFiles.length,
      message: 'Sync completed successfully'
    };

  } catch (error) {
    console.error('❌ Failed to sync Firestore to Realtime Database:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Spusť synchronizaci pokud je skript volán přímo
if (import.meta.url === `file://${process.argv[1]}`) {
  syncFirestoreToRealtime()
    .then(result => {
      if (result.success) {
        console.log('🎉 Sync completed successfully!');
        process.exit(0);
      } else {
        console.error('💥 Sync failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}
