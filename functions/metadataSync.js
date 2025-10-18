/**
 * Firebase Functions pro synchronizaci metadat
 * Sleduje změny ve Firebase Storage a aktualizuje metadata v databázi
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializace Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Exportuj základní funkce pro testování
exports.helloWorld = functions.https.onRequest((req, res) => {
  res.send('Hello from Firebase Functions!');
});

exports.testMetadata = functions.https.onCall(async (data, context) => {
  return {
    success: true,
    message: 'Metadata service is working',
    timestamp: new Date().toISOString()
  };
});

/**
 * Extrahuje metadata z MP3 souboru
 * @param {string} fileName - Název souboru
 * @returns {Promise<Object>} Metadata objekt
 */
async function extractMP3Metadata(fileName) {
  try {
    // Prozatím vracíme základní metadata z názvu souboru
    // V produkci by se zde použila knihovna pro extrakci MP3 tagů

    const nameWithoutExt = fileName.replace(/\.mp3$/i, '');
    const pathParts = fileName.split('/');
    const folder = pathParts[0];
    const subFolder = pathParts.length > 2 ? pathParts[1] : null;

    return {
      fileName: fileName,
      title: nameWithoutExt,
      duration: null, // Bude načteno později
      durationFormatted: 'N/A',
      folder: folder,
      subFolder: subFolder,
      album: subFolder || null,
      lastModified: new Date().toISOString(),
      extracted: false // Označuje, že metadata nejsou ještě extrahovány
    };
  } catch (error) {
    console.error(`Error extracting metadata for ${fileName}:`, error);
    return null;
  }
}

/**
 * Aktualizuje metadata v databázi
 * @param {string} fileName - Název souboru
 * @param {Object} metadata - Metadata objekt
 */
async function updateMetadataDatabase(fileName, metadata) {
  try {
    await db.collection('metadata').doc(fileName).set(metadata, { merge: true });
    console.log(`✅ Metadata updated for ${fileName}`);
  } catch (error) {
    console.error(`❌ Failed to update metadata for ${fileName}:`, error);
  }
}

/**
 * Aktualizuje timestamp poslední synchronizace
 */
async function updateLastSync() {
  try {
    await db.collection('system').doc('lastSync').set({
      timestamp: new Date().toISOString()
    });
    console.log('✅ Last sync timestamp updated');
  } catch (error) {
    console.error('❌ Failed to update last sync timestamp:', error);
  }
}

/**
 * Sleduje změny ve Firebase Storage
 * Spouští se při každé změně souboru
 */
exports.monitorStorageChanges = functions.storage.object().onFinalize(async (object) => {
  const fileName = object.name;

  console.log(`📁 Storage change detected: ${fileName}`);

  // Zpracuj pouze MP3 soubory
  if (!fileName.toLowerCase().endsWith('.mp3')) {
    console.log(`⏭️ Skipping non-MP3 file: ${fileName}`);
    return;
  }

  // Zpracuj pouze soubory v hudba/ nebo slova/ složkách
  if (!fileName.startsWith('hudba/') && !fileName.startsWith('slova/')) {
    console.log(`⏭️ Skipping file outside target folders: ${fileName}`);
    return;
  }

  try {
    // Extrahuj metadata
    const metadata = await extractMP3Metadata(fileName);

    if (metadata) {
      // Ulož do databáze
      await updateMetadataDatabase(fileName, metadata);

      // Aktualizuj timestamp synchronizace
      await updateLastSync();

      console.log(`✅ Metadata sync completed for ${fileName}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync metadata for ${fileName}:`, error);
  }
});

/**
 * Manuální synchronizace všech MP3 souborů
 * Spustí se pomocí: firebase functions:shell
 */
exports.syncAllMetadata = functions.https.onCall(async (data, context) => {
  try {
    console.log('🚀 Starting manual metadata sync...');

    // Pro testování vytvoříme několik testovacích souborů
    const testFiles = [
      'hudba/generator.mp3',
      'hudba/meditacie.mp3',
      'hudba/noise-generator.mp3',
      'hudba/ambient-journey/01-track.mp3',
      'hudba/ambient-journey/02-track.mp3',
      'slova/muzsky4FSK-uzkost-osamelost.mp3',
      'slova/zensky4FSK-uzkost-osamelost.mp3'
    ];

    console.log(`📊 Processing ${testFiles.length} test files`);

    // Zpracuj všechny soubory
    for (const fileName of testFiles) {
      try {
        const metadata = await extractMP3Metadata(fileName);
        if (metadata) {
          await updateMetadataDatabase(fileName, metadata);
        }
      } catch (error) {
        console.error(`❌ Failed to sync ${fileName}:`, error);
      }
    }

    // Aktualizuj timestamp
    await updateLastSync();

    console.log('✅ Manual metadata sync completed');
    return { success: true, filesProcessed: testFiles.length };

  } catch (error) {
    console.error('❌ Manual metadata sync failed:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Získá statistiky metadat
 */
exports.getMetadataStats = functions.https.onCall(async (data, context) => {
  try {
    const snapshot = await db.collection('metadata').get();
    const stats = {
      totalFiles: snapshot.size,
      byFolder: {},
      lastSync: null
    };

    // Spočítej podle složek
    snapshot.forEach(doc => {
      const data = doc.data();
      const folder = data.folder || 'unknown';
      stats.byFolder[folder] = (stats.byFolder[folder] || 0) + 1;
    });

    // Získej timestamp poslední synchronizace
    const syncDoc = await db.collection('system').doc('lastSync').get();
    if (syncDoc.exists()) {
      stats.lastSync = syncDoc.data().timestamp;
    }

    return stats;
  } catch (error) {
    console.error('❌ Failed to get metadata stats:', error);
    return { error: error.message };
  }
});
