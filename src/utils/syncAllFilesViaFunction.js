/**
 * Utility pro volání Firebase Function syncAllFiles
 * Synchronizuje všechny soubory (audio i obrázky) a vygeneruje metadata
 *
 * Pro použití z konzole:
 * import { syncAllFilesViaFunction } from './utils/syncAllFilesViaFunction';
 * syncAllFilesViaFunction().then(result => console.log(result));
 *
 * Nebo globálně:
 * window.syncAllFiles = () => import('./utils/syncAllFilesViaFunction').then(m => m.syncAllFilesViaFunction());
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

/**
 * Zavolá Firebase Function syncAllFiles pro synchronizaci všech souborů
 * @param {Function} onProgress - Volitelný callback pro progress (current, total)
 * @returns {Promise<{success: boolean, message?: string, results?: Object, error?: string}>}
 */
export const syncAllFilesViaFunction = async (onProgress = null) => {
  try {
    const app = getApp();
    // Explicitně nastav region pro Firebase Functions
    const functions = getFunctions(app, 'us-central1');
    const syncAllFiles = httpsCallable(functions, 'syncAllFiles');

    console.log('🚀 Calling Firebase Function syncAllFiles...');

    // Zavolej funkci
    const result = await syncAllFiles({});

    const data = result.data;

    if (data.success) {
      console.log('✅ SyncAllFiles completed:', data.message);
      console.log('📊 Results:', data.results);

      if (onProgress) {
        const total = (data.results?.audioFiles || 0) + (data.results?.imageFiles || 0);
        const processed = (data.results?.processedAudio || 0) + (data.results?.processedImages || 0);
        onProgress(processed, total);
      }

      return {
        success: true,
        message: data.message,
        results: data.results
      };
    } else {
      return {
        success: false,
        error: data.error || 'Unknown error'
      };
    }
  } catch (error) {
    console.error('❌ Failed to call syncAllFiles function:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

export default syncAllFilesViaFunction;

