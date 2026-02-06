/**
 * Utility pro generování waveformy pomocí Firebase Function
 * Volá server-side funkci, která nemá CORS problémy
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

/**
 * Vygeneruje waveformu pro jeden soubor pomocí Firebase Function
 * @param {string} fileName - Název souboru (cesta)
 * @param {number} samples - Počet vzorků pro waveformu (default: 150)
 * @returns {Promise<{success: boolean, waveformData?: Array<number>, error?: string}>}
 */
export const generateWaveformViaFunction = async (fileName, samples = 150) => {
  try {
    const app = getApp();
    const functions = getFunctions(app);
    const generateWaveform = httpsCallable(functions, 'generateWaveform');

    console.log(`🌊 Calling Firebase Function to generate waveform for ${fileName}...`);

    const result = await generateWaveform({
      fileName: fileName,
      samples: samples
    });

    const data = result.data;

    if (data.success && data.waveformData) {
      console.log(`✅ Waveform generated via Function for ${fileName} (${data.samples} samples)`);
      return {
        success: true,
        waveformData: data.waveformData
      };
    } else {
      return {
        success: false,
        error: data.error || 'Unknown error'
      };
    }
  } catch (error) {
    console.error(`❌ Failed to generate waveform via Function for ${fileName}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Vygeneruje waveformy pro všechny soubory v dané složce pomocí Firebase Function
 * @param {string} folder - Složka (např. 'dychanie', 'hudba', 'meditacie')
 * @param {number} samples - Počet vzorků pro waveformu (default: 150)
 * @param {Function} onProgress - Callback pro progress (current, total)
 * @returns {Promise<{success: boolean, processed: number, failed: number, errors: Array}>}
 */
export const generateWaveformsForFolderViaFunction = async (folder, samples = 150, onProgress = null) => {
  try {
    const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
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
        const result = await generateWaveformViaFunction(file.fileName, samples);

        if (result.success) {
          // Waveform je už uložená v databázi pomocí Firebase Function
          // Nemusíme ji ukládat znovu
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

export default {
  generateWaveformViaFunction,
  generateWaveformsForFolderViaFunction
};
