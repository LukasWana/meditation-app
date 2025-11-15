

import { database } from '../services/firebase';
import { ref, set } from 'firebase/database';

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

// Simulace extrakce metadat (jako v Firebase Functions)
function extractMP3Metadata(fileName) {
  const nameWithoutExt = fileName.replace(/\.mp3$/i, '');
  const pathParts = fileName.split('/');
  const folder = pathParts[0];
  const subFolder = pathParts.length > 2 ? pathParts[1] : null;

  return {
    fileName: fileName,
    title: nameWithoutExt.split('/').pop(),
    duration: Math.floor(Math.random() * 600) + 60, // 1-10 minut
    durationFormatted: `${Math.floor(Math.random() * 10) + 1}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
    folder: folder,
    subFolder: subFolder,
    album: subFolder || null,
    lastModified: new Date().toISOString(),
    extracted: true,
    fileSize: Math.floor(Math.random() * 10000000) + 1000000, // 1-10 MB
    bitrate: '128 kbps',
    format: 'MP3',
    genre: folder === 'hudba' ? 'Meditation Music' : 'Guided Meditation'
  };
}

export async function simulateHudbaTrigger() {
  console.log('🧪 Simulating hudba/ folder trigger...');

  try {
    const fileName = `hudba/simulated-test-${Date.now()}.mp3`;
    console.log(`📁 Simulating file upload: ${fileName}`);

    // Simuluj extrakci metadat
    const metadata = extractMP3Metadata(fileName);
    console.log('📊 Extracted metadata:', metadata);

    // Ulož do Realtime Database (simulace updateRealtimeDatabase)
    const safePath = sanitizePath(fileName);
    const metadataRef = ref(database, `audio-metadata/${safePath}`);

    await set(metadataRef, {
      ...metadata,
      lastUpdated: new Date().toISOString(),
      source: 'simulated-trigger'
    });

    console.log(`✅ Metadata saved to Realtime Database: ${safePath}`);

    return {
      success: true,
      message: `Simulated hudba trigger successful! Created metadata for ${fileName}`,
      fileName: fileName,
      safePath: safePath,
      metadata: metadata
    };

  } catch (error) {
    console.error('❌ Simulated hudba trigger failed:', error);
    return { success: false, error: error.message };
  }
}

export async function simulateSlovaTrigger() {
  console.log('🧪 Simulating slova/ folder trigger...');

  try {
    const fileName = `slova/simulated-test-${Date.now()}.mp3`;
    console.log(`📁 Simulating file upload: ${fileName}`);

    // Simuluj extrakci metadat
    const metadata = extractMP3Metadata(fileName);
    console.log('📊 Extracted metadata:', metadata);

    // Ulož do Realtime Database (simulace updateRealtimeDatabase)
    const safePath = sanitizePath(fileName);
    const metadataRef = ref(database, `audio-metadata/${safePath}`);

    await set(metadataRef, {
      ...metadata,
      lastUpdated: new Date().toISOString(),
      source: 'simulated-trigger'
    });

    console.log(`✅ Metadata saved to Realtime Database: ${safePath}`);

    return {
      success: true,
      message: `Simulated slova trigger successful! Created metadata for ${fileName}`,
      fileName: fileName,
      safePath: safePath,
      metadata: metadata
    };

  } catch (error) {
    console.error('❌ Simulated slova trigger failed:', error);
    return { success: false, error: error.message };
  }
}

export async function simulateMultipleTriggers() {
  console.log('🧪 Simulating multiple triggers...');

  try {
    const testFiles = [
      'hudba/meditation-1.mp3',
      'hudba/meditation-2.mp3',
      'slova/breathing-exercise.mp3',
      'slova/guided-meditation.mp3'
    ];

    const results = [];

    for (const fileName of testFiles) {
      console.log(`📁 Simulating upload: ${fileName}`);

      // Simuluj extrakci metadat
      const metadata = extractMP3Metadata(fileName);

      // Ulož do Realtime Database
      const safePath = sanitizePath(fileName);
      const metadataRef = ref(database, `audio-metadata/${safePath}`);

      await set(metadataRef, {
        ...metadata,
        lastUpdated: new Date().toISOString(),
        source: 'simulated-batch-trigger'
      });

      results.push({
        fileName: fileName,
        safePath: safePath,
        metadata: metadata
      });

      console.log(`✅ Simulated trigger for: ${fileName}`);
    }

    console.log(`📊 Simulated ${results.length} triggers successfully`);

    return {
      success: true,
      message: `Simulated ${results.length} triggers successfully!`,
      results: results
    };

  } catch (error) {
    console.error('❌ Simulated multiple triggers failed:', error);
    return { success: false, error: error.message };
  }
}







