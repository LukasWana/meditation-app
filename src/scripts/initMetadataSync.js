/**
 * Script pro inicializaci synchronizace metadat s Firestore
 * Spustí extrakci metadat z MP3 souborů a uloží je do Firestore
 */

import { metadataSyncService } from '@services/metadataSyncService';
import { log } from '@services/logger';

/**
 * Inicializuje synchronizaci metadat
 */
export const initMetadataSync = async () => {
  try {
    log.info('🚀 Starting metadata synchronization initialization...');

    // Inicializuj metadata sync service
    await metadataSyncService.initialize();

    // Zkontroluj stav synchronizace
    const syncStatus = metadataSyncService.getSyncStatus();
    log.info('📊 Sync status:', syncStatus);

    if (syncStatus.needsSync) {
      log.info('🔄 Sync needed, starting synchronization...');

      // Vynutí synchronizaci
      await metadataSyncService.forceSync();

      log.success('✅ Metadata synchronization completed successfully');
    } else {
      log.success('✅ Metadata is already up to date');
    }

    // Zobraz statistiky
    const allMetadata = metadataSyncService.getAllMetadata();
    const hudbaFiles = Object.values(allMetadata).filter(m => m.fileName.startsWith('hudba/'));
    const slovaFiles = Object.values(allMetadata).filter(m => m.fileName.startsWith('slova/'));

    log.info('📈 Metadata statistics:', {
      total: Object.keys(allMetadata).length,
      hudba: hudbaFiles.length,
      slova: slovaFiles.length,
      withDuration: Object.values(allMetadata).filter(m => m.duration && m.duration !== 'N/A').length
    });

    return {
      success: true,
      totalFiles: Object.keys(allMetadata).length,
      hudbaFiles: hudbaFiles.length,
      slovaFiles: slovaFiles.length
    };

  } catch (error) {
    log.error('❌ Metadata synchronization failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Spustí inicializaci (použij v konzoli nebo jako samostatný script)
 */
if (typeof window !== 'undefined') {
  // Browser environment
  window.initMetadataSync = initMetadataSync;
  console.log('Metadata sync script loaded. Use initMetadataSync() to start synchronization.');
} else {
  // Node.js environment
  initMetadataSync().then(result => {
    console.log('Metadata sync result:', result);
    process.exit(result.success ? 0 : 1);
  });
}
