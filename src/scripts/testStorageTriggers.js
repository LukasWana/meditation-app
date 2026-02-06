

import { storage } from '../services/firebase';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import log from '../services/logger';

export async function testStorageTriggers() {
  console.log('🧪 Testing Firebase Storage Triggers...');

  try {
    // Vytvoř testovací soubor
    const testFileName = `test/trigger-test-${Date.now()}.mp3`;
    const testFileRef = ref(storage, testFileName);

    // Vytvoř fake MP3 data (minimální MP3 header)
    const fakeMP3Data = new Uint8Array([
      0xFF, 0xFB, 0x90, 0x00, // MP3 header
      0x00, 0x00, 0x00, 0x00, // Fake data
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ]);

    console.log(`📤 Uploading test file: ${testFileName}`);

    // Upload souboru - toto by mělo spustit onFileUpload trigger
    await uploadBytes(testFileRef, fakeMP3Data, {
      contentType: 'audio/mpeg',
      customMetadata: {
        test: 'true',
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Test file uploaded successfully');
    console.log('🔄 Trigger should have fired - check Firebase Functions logs');

    // Počkej chvíli a pak soubor smaž
    console.log('⏳ Waiting 5 seconds before cleanup...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️ Cleaning up test file...');
    await deleteObject(testFileRef);
    console.log('✅ Test file deleted');

    return {
      success: true,
      message: 'Storage trigger test completed - check Firebase Functions logs for trigger execution',
      testFile: testFileName
    };

  } catch (error) {
    console.error('❌ Storage trigger test failed:', error);
    log.error('Storage trigger test failed:', error);
    return { success: false, error: error.message };
  }
}

export async function testHudbaFolderTrigger() {
  console.log('🧪 Testing hudba/ folder trigger...');

  try {
    // Vytvoř testovací soubor v hudba/ složce
    const testFileName = `hudba/trigger-test-${Date.now()}.mp3`;
    const testFileRef = ref(storage, testFileName);

    // Vytvoř fake MP3 data
    const fakeMP3Data = new Uint8Array([
      0xFF, 0xFB, 0x90, 0x00, // MP3 header
      0x00, 0x00, 0x00, 0x00, // Fake data
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ]);

    console.log(`📤 Uploading test file to hudba folder: ${testFileName}`);

    await uploadBytes(testFileRef, fakeMP3Data, {
      contentType: 'audio/mpeg',
      customMetadata: {
        test: 'hudba-trigger',
        timestamp: new Date().toISOString(),
        folder: 'hudba'
      }
    });

    console.log('✅ Test file uploaded to hudba folder');
    console.log('🔄 onFileUpload trigger should have fired');
    console.log('📊 Metadata should be created in Firestore and Realtime Database');

    // Počkej a smaž
    await new Promise(resolve => setTimeout(resolve, 3000));
    await deleteObject(testFileRef);
    console.log('✅ Test file cleaned up');

    return {
      success: true,
      message: 'Hudba folder trigger test completed',
      testFile: testFileName
    };

  } catch (error) {
    console.error('❌ Hudba folder trigger test failed:', error);
    return { success: false, error: error.message };
  }
}

export async function testSlovaFolderTrigger() {
  console.log('🧪 Testing meditacie/ folder trigger...');

  try {
    // Vytvoř testovací soubor v meditacie/ složce
    const testFileName = `meditacie/trigger-test-${Date.now()}.mp3`;
    const testFileRef = ref(storage, testFileName);

    // Vytvoř fake MP3 data
    const fakeMP3Data = new Uint8Array([
      0xFF, 0xFB, 0x90, 0x00, // MP3 header
      0x00, 0x00, 0x00, 0x00, // Fake data
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ]);

    console.log(`📤 Uploading test file to meditacie folder: ${testFileName}`);

    await uploadBytes(testFileRef, fakeMP3Data, {
      contentType: 'audio/mpeg',
      customMetadata: {
        test: 'meditacie-trigger',
        timestamp: new Date().toISOString(),
        folder: 'meditacie'
      }
    });

    console.log('✅ Test file uploaded to meditacie folder');
    console.log('🔄 onFileUpload trigger should have fired');
    console.log('📊 Metadata should be created in Firestore and Realtime Database');

    // Počkej a smaž
    await new Promise(resolve => setTimeout(resolve, 3000));
    await deleteObject(testFileRef);
    console.log('✅ Test file cleaned up');

    return {
      success: true,
      message: 'Meditacie folder trigger test completed',
      testFile: testFileName
    };

  } catch (error) {
    console.error('❌ Meditacie folder trigger test failed:', error);
    return { success: false, error: error.message };
  }
}







