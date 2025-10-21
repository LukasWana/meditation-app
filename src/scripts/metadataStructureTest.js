

import { database } from '../services/firebase';
import { ref, set, get } from 'firebase/database';

// Sanitizace cesty
function sanitizePath(path) {
  return path
    .replace(/\./g, '_DOT_')      // . -> _DOT_
    .replace(/#/g, '_HASH_')      // # -> _HASH_
    .replace(/\$/g, '_DOLLAR_')   // $ -> _DOLLAR_
    .replace(/\[/g, '_LBRACKET_') // [ -> _LBRACKET_
    .replace(/\]/g, '_RBRACKET_') // ] -> _RBRACKET_
    .replace(/\//g, '_SLASH_')    // / -> _SLASH_
    .replace(/\\/g, '_BACKSLASH_'); // \ -> _BACKSLASH_
}

export async function testMetadataStructure() {
  console.log('🧪 Testing Metadata Structure...');
  console.log('🗄️ Database URL:', database.app.options.databaseURL);

  try {
    // Vytvoř ukázková metadata
    const sampleFiles = [
      'hudba/meditation-track-1.mp3',
      'hudba/meditation-track-2.mp3',
      'slova/guided-meditation.mp3',
      'slova/breathing-exercise.mp3'
    ];

    console.log('📝 Creating sample metadata structure...');

    for (const fileName of sampleFiles) {
      // Vytvoř metadata podle struktury z Firebase Functions
      const metadata = {
        fileName: fileName,
        title: fileName.replace(/\.mp3$/i, '').split('/').pop(),
        duration: Math.floor(Math.random() * 600) + 60, // 1-10 minut
        durationFormatted: `${Math.floor(Math.random() * 10) + 1}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        folder: fileName.split('/')[0],
        subFolder: fileName.split('/').length > 2 ? fileName.split('/')[1] : null,
        album: fileName.split('/').length > 2 ? fileName.split('/')[1] : null,
        lastModified: new Date().toISOString(),
        extracted: true,
        // Dodatečné informace
        fileSize: Math.floor(Math.random() * 10000000) + 1000000, // 1-10 MB
        bitrate: '128 kbps',
        format: 'MP3',
        genre: fileName.startsWith('hudba') ? 'Meditation Music' : 'Guided Meditation'
      };

      // Sanitizuj cestu a ulož
      const safePath = sanitizePath(fileName);
      const metadataRef = ref(database, `audio-metadata/${safePath}`);

      await set(metadataRef, {
        ...metadata,
        lastUpdated: new Date().toISOString(),
        source: 'test-data'
      });

      console.log(`✅ Saved metadata for: ${fileName}`);
      console.log(`   Safe path: ${safePath}`);
      console.log(`   Metadata:`, metadata);
      console.log('   ---');
    }

    // Načti a zobraz všechna metadata
    console.log('📥 Loading all metadata...');
    const allMetadataRef = ref(database, 'audio-metadata');
    const snapshot = await get(allMetadataRef);

    if (snapshot.exists()) {
      const allData = snapshot.val();
      console.log('📊 All metadata loaded:');
      console.log('   Structure:', Object.keys(allData));
      console.log('   Total files:', Object.keys(allData).length);

      // Zobraz detaily pro každý soubor
      Object.entries(allData).forEach(([safePath, metadata]) => {
        console.log(`\n📁 File: ${safePath}`);
        console.log(`   Original name: ${metadata.fileName}`);
        console.log(`   Title: ${metadata.title}`);
        console.log(`   Duration: ${metadata.durationFormatted}`);
        console.log(`   Folder: ${metadata.folder}`);
        console.log(`   Size: ${Math.round(metadata.fileSize / 1024 / 1024 * 100) / 100} MB`);
        console.log(`   Last updated: ${metadata.lastUpdated}`);
      });

      return { success: true, data: allData, structure: Object.keys(allData) };
    } else {
      console.log('📭 No metadata found');
      return { success: false, error: 'No metadata found' };
    }

  } catch (error) {
    console.error('❌ Metadata structure test failed:', error);
    return { success: false, error: error.message };
  }
}



