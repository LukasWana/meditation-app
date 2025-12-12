/**
 * Utility pro generování waveformy pro audio soubory
 * Používá se v admin panelu pro předgenerování waveformy
 */

import { generateWaveformFromUrl } from './waveformGenerator';
import { realtimeMetadataService } from '@services/realtimeMetadataService';
import { database } from '@config/secure-firebase';
import { ref, set } from 'firebase/database';

/**
 * Vygeneruje waveformu pro jeden soubor a uloží ji do databáze
 * @param {string} fileName - Název souboru (cesta)
 * @param {number} samples - Počet vzorků pro waveformu (default: 150)
 * @returns {Promise<{success: boolean, waveformData?: Array<number>, error?: string}>}
 */
export const generateWaveformForFile = async (fileName, samples = 150) => {
  try {
    // Načti metadata souboru
    const metadata = await realtimeMetadataService.getFileMetadata(fileName);

    if (!metadata) {
      return { success: false, error: 'Metadata not found' };
    }

    const downloadURL = metadata.downloadURL || metadata.audioSrc;
    if (!downloadURL) {
      return { success: false, error: 'Download URL not found' };
    }

    // Vygeneruj waveformu
    console.log(`🔄 Generating waveform for ${fileName}...`);
    const waveformData = await generateWaveformFromUrl(downloadURL, samples);

    // Ulož waveformu do databáze
    const safePath = realtimeMetadataService.sanitizePath(fileName);
    const metadataRef = ref(database, `audio-metadata/${safePath}`);

    // Aktualizuj metadata s waveformou
    await set(metadataRef, {
      ...metadata,
      waveformData: waveformData,
      waveformGenerated: new Date().toISOString(),
      waveformSamples: samples
    });

    console.log(`✅ Waveform generated and saved for ${fileName}`);
    return { success: true, waveformData };
  } catch (error) {
    console.error(`❌ Failed to generate waveform for ${fileName}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Vygeneruje waveformy pro všechny soubory v dané složce
 * @param {string} folder - Složka (např. 'dychanie', 'hudba', 'slova')
 * @param {number} samples - Počet vzorků pro waveformu (default: 150)
 * @param {Function} onProgress - Callback pro progress (current, total)
 * @returns {Promise<{success: boolean, processed: number, failed: number, errors: Array}>}
 */
export const generateWaveformsForFolder = async (folder, samples = 150, onProgress = null) => {
  try {
    // Načti všechny soubory ze složky
    const allMetadata = await realtimeMetadataService.getAllMetadata();

    // Filtruj soubory podle složky
    const folderFiles = Object.entries(allMetadata)
      .filter(([_, metadata]) => {
        const fileFolder = metadata.folder || metadata.fileName?.split('/')[0];
        return fileFolder === folder;
      })
      .map(([path, metadata]) => ({
        fileName: metadata.fileName || path,
        metadata
      }));

    console.log(`📁 Found ${folderFiles.length} files in folder ${folder}`);

    let processed = 0;
    let failed = 0;
    const errors = [];

    // Zpracuj soubory postupně
    for (let i = 0; i < folderFiles.length; i++) {
      const file = folderFiles[i];

      try {
        const result = await generateWaveformForFile(file.fileName, samples);

        if (result.success) {
          processed++;
        } else {
          failed++;
          errors.push({ fileName: file.fileName, error: result.error });
        }
      } catch (error) {
        failed++;
        errors.push({ fileName: file.fileName, error: error.message });
      }

      // Zavolej progress callback
      if (onProgress) {
        onProgress(i + 1, folderFiles.length);
      }
    }

    console.log(`✅ Waveform generation completed: ${processed} success, ${failed} failed`);
    return { success: true, processed, failed, errors };
  } catch (error) {
    console.error(`❌ Failed to generate waveforms for folder ${folder}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Vygeneruje waveformy pro všechny audio soubory
 * @param {number} samples - Počet vzorků pro waveformu (default: 150)
 * @param {Function} onProgress - Callback pro progress (current, total, folder)
 * @returns {Promise<{success: boolean, results: Object}>}
 */
export const generateWaveformsForAllFiles = async (samples = 150, onProgress = null) => {
  try {
    const folders = ['dychanie', 'hudba', 'slova'];
    const results = {};

    for (const folder of folders) {
      console.log(`📁 Processing folder: ${folder}`);

      const result = await generateWaveformsForFolder(
        folder,
        samples,
        (current, total) => {
          if (onProgress) {
            onProgress(current, total, folder);
          }
        }
      );

      results[folder] = result;
    }

    return { success: true, results };
  } catch (error) {
    console.error(`❌ Failed to generate waveforms:`, error);
    return { success: false, error: error.message };
  }
};

export default {
  generateWaveformForFile,
  generateWaveformsForFolder,
  generateWaveformsForAllFiles
};



