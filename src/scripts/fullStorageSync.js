

import { storage } from '../services/firebase';
import { database } from '../services/firebase';
import { ref, listAll, getMetadata } from 'firebase/storage';
import { ref as dbRef, set } from 'firebase/database';
import log from '../services/logger';

// Sanitizace cesty pro Realtime Database
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

// Extrakce metadat ze souboru (stejně jako v Firebase Functions)
function extractMP3Metadata(fileName, fileMetadata) {
  const nameWithoutExt = fileName.replace(/\.mp3$/i, '');
  const pathParts = fileName.split('/');
  const folder = pathParts[0];
  const subFolder = pathParts.length > 2 ? pathParts[1] : null;

  return {
    fileName: fileName,
    title: nameWithoutExt.split('/').pop(),
    duration: null, // Bude načteno později z MP3
    durationFormatted: 'N/A',
    folder: folder,
    subFolder: subFolder,
    album: subFolder || null,
    lastModified: fileMetadata.updated || fileMetadata.timeCreated,
    extracted: false, // Označuje, že metadata nejsou ještě extrahovány
    // Informace ze Storage
    fileSize: fileMetadata.size,
    contentType: fileMetadata.contentType,
    md5Hash: fileMetadata.md5Hash,
    customMetadata: fileMetadata.customMetadata || {},
    // Dodatečné informace
    bitrate: 'Unknown',
    format: 'MP3',
    genre: folder === 'hudba' ? 'Meditation Music' : folder === 'slova' ? 'Guided Meditation' : 'Audio'
  };
}

// Načte všechny soubory ze Storage rekurzivně
async function getAllStorageFiles(storageRef, allFiles = []) {
  try {
    const result = await listAll(storageRef);

    // Přidej soubory z aktuální úrovně
    for (const fileRef of result.items) {
      try {
        const metadata = await getMetadata(fileRef);
        allFiles.push({
          ref: fileRef,
          metadata: metadata,
          fullPath: fileRef.fullPath
        });
      } catch (error) {
        console.warn(`⚠️ Failed to get metadata for ${fileRef.fullPath}:`, error.message);
      }
    }

    // Rekurzivně projdi všechny složky
    for (const folderRef of result.prefixes) {
      await getAllStorageFiles(folderRef, allFiles);
    }

    return allFiles;
  } catch (error) {
    console.error('❌ Failed to list storage files:', error);
    throw error;
  }
}

// Hlavní funkce pro kompletní synchronizaci
export async function fullStorageSync() {
  console.log('🔄 Starting full Firebase Storage sync...');
  log.info('Starting full Firebase Storage sync');

  const syncResults = {
    totalFiles: 0,
    mp3Files: 0,
    processedFiles: 0,
    skippedFiles: 0,
    errors: [],
    processedMetadata: []
  };

  try {
    // Načti všechny soubory ze Storage
    console.log('📁 Scanning Firebase Storage...');
    const storageRef = ref(storage);
    const allFiles = await getAllStorageFiles(storageRef);

    syncResults.totalFiles = allFiles.length;
    console.log(`📊 Found ${allFiles.length} files in Storage`);

    // Filtruj pouze MP3 soubory
    const mp3Files = allFiles.filter(file =>
      file.fullPath.toLowerCase().endsWith('.mp3')
    );
    syncResults.mp3Files = mp3Files.length;
    console.log(`🎵 Found ${mp3Files.length} MP3 files`);

    // Zpracuj každý MP3 soubor
    for (const file of mp3Files) {
      try {
        console.log(`📄 Processing: ${file.fullPath}`);

        // Extrahuj metadata
        const metadata = extractMP3Metadata(file.fullPath, file.metadata);

        // Ulož do Realtime Database
        const safePath = sanitizePath(file.fullPath);
        const metadataRef = dbRef(database, `audio-metadata/${safePath}`);

        await set(metadataRef, {
          ...metadata,
          lastUpdated: new Date().toISOString(),
          source: 'full-storage-sync'
        });

        syncResults.processedFiles++;
        syncResults.processedMetadata.push({
          originalPath: file.fullPath,
          safePath: safePath,
          metadata: metadata
        });

        console.log(`✅ Processed: ${file.fullPath} -> ${safePath}`);

      } catch (error) {
        console.error(`❌ Failed to process ${file.fullPath}:`, error);
        syncResults.errors.push({
          file: file.fullPath,
          error: error.message
        });
      }
    }

    // Spočítej přeskočené soubory
    syncResults.skippedFiles = mp3Files.length - syncResults.processedFiles;

    console.log('\n📊 Sync Results:');
    console.log(`   Total files in Storage: ${syncResults.totalFiles}`);
    console.log(`   MP3 files found: ${syncResults.mp3Files}`);
    console.log(`   Files processed: ${syncResults.processedFiles}`);
    console.log(`   Files skipped: ${syncResults.skippedFiles}`);
    console.log(`   Errors: ${syncResults.errors.length}`);

    if (syncResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      syncResults.errors.forEach(error => {
        console.log(`   ${error.file}: ${error.error}`);
      });
    }

    log.success(`Full storage sync completed: ${syncResults.processedFiles}/${syncResults.mp3Files} MP3 files processed`);

    return {
      success: true,
      message: `Successfully synced ${syncResults.processedFiles} MP3 files from Storage to Realtime Database`,
      results: syncResults
    };

  } catch (error) {
    console.error('❌ Full storage sync failed:', error);
    log.error('Full storage sync failed:', error);
    return {
      success: false,
      error: error.message,
      results: syncResults
    };
  }
}

// Funkce pro synchronizaci pouze konkrétní složky
export async function syncFolder(folderName) {
  console.log(`🔄 Syncing folder: ${folderName}...`);
  log.info(`Syncing folder: ${folderName}`);

  try {
    const folderRef = ref(storage, folderName);
    const allFiles = await getAllStorageFiles(folderRef);

    const mp3Files = allFiles.filter(file =>
      file.fullPath.toLowerCase().endsWith('.mp3')
    );

    console.log(`📊 Found ${mp3Files.length} MP3 files in ${folderName}/`);

    const syncResults = {
      folder: folderName,
      totalFiles: allFiles.length,
      mp3Files: mp3Files.length,
      processedFiles: 0,
      errors: []
    };

    for (const file of mp3Files) {
      try {
        const metadata = extractMP3Metadata(file.fullPath, file.metadata);
        const safePath = sanitizePath(file.fullPath);
        const metadataRef = dbRef(database, `audio-metadata/${safePath}`);

        await set(metadataRef, {
          ...metadata,
          lastUpdated: new Date().toISOString(),
          source: 'folder-sync'
        });

        syncResults.processedFiles++;
        console.log(`✅ Synced: ${file.fullPath}`);

      } catch (error) {
        console.error(`❌ Failed to sync ${file.fullPath}:`, error);
        syncResults.errors.push({
          file: file.fullPath,
          error: error.message
        });
      }
    }

    console.log(`📊 Folder sync completed: ${syncResults.processedFiles}/${syncResults.mp3Files} files processed`);

    return {
      success: true,
      message: `Successfully synced ${syncResults.processedFiles} files from ${folderName}/ folder`,
      results: syncResults
    };

  } catch (error) {
    console.error(`❌ Folder sync failed for ${folderName}:`, error);
    return { success: false, error: error.message };
  }
}
