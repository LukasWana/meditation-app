/**
 * Firebase Functions pro synchronizaci metadat
 * Sleduje změny ve Firebase Storage a aktualizuje metadata v databázi
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Inicializace Firebase Admin pouze pokud ještě není inicializován
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const rtdb = admin.database();

// Exportuj základní funkce pro testování
exports.helloWorld = functions.https.onRequest((req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  res.send('Hello from Firebase Functions!');
});

exports.testMetadata = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '128MB'
  })
  .https
  .onCall(async (data, context) => {
    return {
      success: true,
      message: 'Metadata service is working',
      timestamp: new Date().toISOString()
    };
  });

/**
 * Extrahuje metadata z audio souboru (MP3, OGG, OGA)
 * @param {string} fileName - Název souboru
 * @returns {Promise<Object>} Metadata objekt
 */
async function extractAudioMetadata(fileName) {
  try {
    // Prozatím vracíme základní metadata z názvu souboru
    // V produkci by se zde použila knihovna pro extrakci audio tagů (MP3, OGG)

    // Podporuje MP3, OGG, OGA formáty
    const nameWithoutExt = fileName.replace(/\.(mp3|ogg|oga)$/i, '');
    const pathParts = fileName.split('/');
    const folder = pathParts[0];
    const subFolder = pathParts.length > 2 ? pathParts[1] : null;

    // Urči contentType podle přípony
    const fileNameLower = fileName.toLowerCase();
    let contentType = 'audio/mpeg'; // default pro MP3
    if (fileNameLower.endsWith('.ogg') || fileNameLower.endsWith('.oga')) {
      contentType = 'audio/ogg';
    }

    return {
      fileName: fileName,
      title: nameWithoutExt,
      duration: null, // Bude načteno později
      durationFormatted: 'N/A',
      folder: folder,
      subFolder: subFolder,
      album: subFolder || null,
      contentType: contentType,
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
    // Uložit do Firestore
    await db.collection('metadata').doc(fileName).set(metadata, { merge: true });
    console.log(`✅ Metadata updated in Firestore for ${fileName}`);

    // Uložit také do Realtime Database pro rychlý přístup
    await updateRealtimeDatabase(fileName, metadata);

  } catch (error) {
    console.error(`❌ Failed to update metadata for ${fileName}:`, error);
  }
}

/**
 * Aktualizuje metadata v Realtime Database
 * @param {string} fileName - Název souboru
 * @param {Object} metadata - Metadata objekt
 */
async function updateRealtimeDatabase(fileName, metadata) {
  try {
    // Sanitizuj cestu pro Realtime Database
    const safePath = sanitizePath(fileName);

    const rtdbRef = rtdb.ref(`audio-metadata/${safePath}`);
    await rtdbRef.set({
      ...metadata,
      lastUpdated: new Date().toISOString(),
      source: 'firebase-storage'
    });

    console.log(`✅ Metadata updated in Realtime Database for ${safePath}`);
  } catch (error) {
    console.error(`❌ Failed to update metadata in Realtime Database for ${fileName}:`, error);
  }
}

/**
 * Sanitizuje cestu pro Realtime Database
 * @param {string} path - Původní cesta
 * @returns {string} - Bezpečná cesta
 */
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
exports.onFileUpload = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  })
  .storage
  .object()
  .onFinalize(async (object) => {
    const fileName = object.name;

    console.log(`📁 Storage change detected: ${fileName}`);

    // Zpracuj pouze audio soubory (MP3, OGG, OGA)
    const fileNameLower = fileName.toLowerCase();
    const isAudioFile = fileNameLower.endsWith('.mp3') ||
                       fileNameLower.endsWith('.ogg') ||
                       fileNameLower.endsWith('.oga');

    if (!isAudioFile) {
      console.log(`⏭️ Skipping non-audio file: ${fileName}`);
      return null;
    }

    // Zpracuj pouze soubory v hudba/, slova/ nebo dychanie/ složkách
    const isInTargetFolder = fileName.startsWith('hudba/') ||
                             fileName.startsWith('slova/') ||
                             fileName.startsWith('dychanie/');

    if (!isInTargetFolder) {
      console.log(`⏭️ Skipping file outside target folders: ${fileName}`);
      return null;
    }

    try {
      // Extrahuj metadata (funguje pro MP3 i OGG)
      const metadata = await extractAudioMetadata(fileName);

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

    return null;
  });

/**
 * Manuální synchronizace všech MP3 souborů
 */
exports.syncStorage = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
  })
  .https
  .onCall(async (data, context) => {
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

      let processedCount = 0;

      // Zpracuj soubory postupně
      for (const fileName of testFiles) {
        try {
          const metadata = await extractAudioMetadata(fileName);
          if (metadata) {
            await updateMetadataDatabase(fileName, metadata);
            processedCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to sync ${fileName}:`, error);
        }
      }

      // Aktualizuj timestamp
      await updateLastSync();

      console.log('✅ Manual metadata sync completed');
      return {
        success: true,
        filesProcessed: processedCount,
        totalFiles: testFiles.length
      };

    } catch (error) {
      console.error('❌ Manual metadata sync failed:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * Získá statistiky metadat
 */
exports.getFileStats = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '128MB'
  })
  .https
  .onCall(async (data, context) => {
    try {
      const snapshot = await db.collection('audio-metadata').limit(1000).get();
      const stats = {
        totalFiles: snapshot.size,
        byFolder: {},
        lastSync: null
      };

      // Spočítej podle složek
      const folderCounts = {};
      snapshot.forEach(doc => {
        const docData = doc.data();
        const folder = docData.folder || 'unknown';
        folderCounts[folder] = (folderCounts[folder] || 0) + 1;
      });

      stats.byFolder = folderCounts;

      // Získej timestamp poslední synchronizace
      try {
        const syncDoc = await db.collection('system').doc('lastSync').get();
        if (syncDoc.exists()) {
          stats.lastSync = syncDoc.data().timestamp;
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch last sync timestamp:', error);
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get metadata stats:', error);
      return { error: error.message };
    }
  });

/**
 * Uloží metadata do databáze
 */
exports.saveScrapedMetadata = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB'
  })
  .https
  .onCall(async (data, context) => {
    try {
      const { fileName, metadata } = data || {};

      if (!fileName || !metadata) {
        return { error: 'fileName and metadata are required' };
      }

      await updateMetadataDatabase(fileName, metadata);

      return {
        success: true,
        message: `Metadata saved for ${fileName}`
      };

    } catch (error) {
      console.error('❌ Failed to save metadata:', error);
      return { error: error.message };
    }
  });

/**
 * Vyčistí stará metadata
 */
exports.cleanupMetadata = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  })
  .https
  .onCall(async (data, context) => {
    try {
      console.log('🧹 Starting metadata cleanup...');

      // Najdi dokumenty starší než 30 dní
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const snapshot = await db.collection('audio-metadata')
        .where('lastModified', '<', thirtyDaysAgo.toISOString())
        .get();

      let deletedCount = 0;
      const batch = db.batch();

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      if (deletedCount > 0) {
        await batch.commit();
      }

      console.log(`✅ Cleaned up ${deletedCount} old metadata records`);

      return {
        success: true,
        deletedCount
      };

    } catch (error) {
      console.error('❌ Failed to cleanup metadata:', error);
      return { error: error.message };
    }
  });
