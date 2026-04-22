/**
 * Firebase Structure Debug Script
 *
 * Tento skript kontroluje, jaké soubory jsou ve Firebase Storage
 * a jaké metadata jsou k dispozici.
 */

import { initializeApp } from 'firebase/app';
import { getStorage, ref, listAll } from 'firebase/storage';
import { getDatabase, ref as dbRef, get } from 'firebase/database';

// Firebase config - needs to be loaded from secure-firebase.js or environment
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

async function checkFirebaseStructure() {
  console.log('='.repeat(80));
  console.log('FIREBASE STRUCTURE DEBUG');
  console.log('='.repeat(80));

  if (!firebaseConfig.apiKey) {
    console.error('❌ Firebase credentials not found!');
    console.log('💡 Set environment variables or run from within the app');
    return;
  }

  try {
    const app = initializeApp(firebaseConfig, 'debug-app');
    const storage = getStorage(app);
    const database = getDatabase(app);

    // Check Firebase Storage
    console.log('\n📁 Checking Firebase Storage...\n');

    const meditacieRef = ref(storage, 'meditacie');
    const result = await listAll(meditacieRef);

    console.log(`✅ Found ${result.prefixes.length} language folders`);
    console.log(`   Found ${result.items.length} files in root meditacie/ folder`);

    if (result.prefixes.length > 0) {
      console.log('\n📂 Language folders:');
      for (const folderRef of result.prefixes) {
        console.log(`   - ${folderRef.name}`);

        // List files in each language folder
        try {
          const langResult = await listAll(folderRef);
          const audioFiles = langResult.items.filter(item =>
            item.name.toLowerCase().endsWith('.mp3') ||
            item.name.toLowerCase().endsWith('.ogg') ||
            item.name.toLowerCase().endsWith('.oga')
          );

          console.log(`     Files: ${audioFiles.length}`);

          if (audioFiles.length > 0) {
            const samples = audioFiles.slice(0, 3).map(f => f.name);
            console.log(`     Sample: ${samples.join(', ')}${audioFiles.length > 3 ? '...' : ''}`);
          }
        } catch (err) {
          console.log(`     ❌ Error: ${err.message}`);
        }
      }
    }

    // Check Realtime Database metadata
    console.log('\n📊 Checking Realtime Database metadata...\n');

    const metaRef = dbRef(database, 'audio-metadata');
    const snapshot = await get(metaRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('✅ Metadata exists in Realtime Database');

      if (data.files && Array.isArray(data.files)) {
        console.log(`   Total files: ${data.files.length}`);

        // Count by folder
        const byFolder = {};
        const byLanguage = {};

        data.files.forEach(file => {
          if (file.folder) {
            byFolder[file.folder] = (byFolder[file.folder] || 0) + 1;
          }
          if (file.language) {
            byLanguage[file.language] = (byLanguage[file.language] || 0) + 1;
          }
        });

        console.log('\n   By folder:');
        Object.entries(byFolder).forEach(([folder, count]) => {
          console.log(`     ${folder}: ${count}`);
        });

        console.log('\n   By language:');
        Object.entries(byLanguage).forEach(([lang, count]) => {
          console.log(`     ${lang}: ${count}`);
        });

        // Check meditacie files
        const meditacieFiles = data.files.filter(f => f.folder === 'meditacie');
        console.log(`\n   Meditacie files: ${meditacieFiles.length}`);

        if (meditacieFiles.length > 0) {
          console.log('\n   Sample meditacie files:');
          meditacieFiles.slice(0, 10).forEach(file => {
            console.log(`     - ${file.fileName || file.name}`);
            console.log(`       Language: ${file.language || 'NOT SET'}`);
            console.log(`       Folder: ${file.folder}`);
            console.log(`       Type: ${file.type || 'NOT SET'}`);
          });
        } else {
          console.log('\n   ⚠️  WARNING: No meditacie files found in metadata!');
          console.log('   💡 This means:');
          console.log('      1. Files exist in Firebase Storage but were not processed');
          console.log('      2. Metadata generation needs to be run');
          console.log('      3. Or there is a bug in metadata generation');
        }
      } else {
        console.log('⚠️  Unexpected metadata structure');
      }
    } else {
      console.log('❌ No metadata found in Realtime Database');
      console.log('💡 Metadata needs to be generated');
      console.log('   Run the metadata generation script or admin panel');
    }

    await app.delete();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Code:', error.code);
  }

  console.log('\n' + '='.repeat(80));
}

// Run if imported/executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkFirebaseStructure().catch(console.error);
}

export { checkFirebaseStructure };
