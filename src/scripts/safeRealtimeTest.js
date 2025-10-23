

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

export async function safeRealtimeTest() {
  console.log('🧪 Safe Realtime Database Test...');
  console.log('🗄️ Database URL:', database.app.options.databaseURL);

  try {
    // Test 1: Uložení dat s bezpečnou cestou
    const originalPath = 'audio-metadata/hudba_sample-track.mp3';
    const safePath = sanitizePath(originalPath);

    console.log('📤 Original path:', originalPath);
    console.log('📤 Safe path:', safePath);

    const testRef = ref(database, safePath);
    const testData = {
      fileName: 'hudba/sample-track.mp3',
      title: 'Sample Track',
      duration: 180,
      category: 'hudba',
      timestamp: new Date().toISOString()
    };

    await set(testRef, testData);
    console.log('✅ Data saved successfully with safe path');

    // Test 2: Načtení dat
    const snapshot = await get(testRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('✅ Data loaded successfully');
      console.log('📊 Data:', data);

      return { success: true, data, safePath };
    } else {
      console.log('❌ No data found');
      return { success: false, error: 'No data found' };
    }

  } catch (error) {
    console.error('❌ Safe test failed:', error);
    return { success: false, error: error.message };
  }
}







