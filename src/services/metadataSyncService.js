

import { fastMetadataService } from './fastMetadataService';
import { mp3MetadataExtractor } from './mp3MetadataExtractor';
import { ref, listAll, getMetadata } from 'firebase/storage';
import { storage } from '@config/secure-firebase';
import log from './logger';

class MetadataSyncService {
  constructor() {
    this.isInitialized = false;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncInterval = 24 * 60 * 60 * 1000; // 24 hodin
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      log.info('🔄 Initializing metadata sync service...');

      // Nejdříve inicializuj FastMetadataService
      await fastMetadataService.initialize();

      // Zkontroluj, jestli potřebujeme synchronizaci
      const needsSync = await this.checkIfSyncNeeded();

      if (needsSync) {
        log.info('📡 Metadata sync needed, starting background sync...');
        // Spusť synchronizaci v pozadí
        this.syncMetadataInBackground();
      } else {
        log.success('✅ Metadata is up to date, no sync needed');
      }

      this.isInitialized = true;
    } catch (error) {
      log.error('Failed to initialize metadata sync service:', error);
      throw error;
    }
  }

  async checkIfSyncNeeded() {
    try {
      // Zkontroluj, jestli máme metadata v cache FastMetadataService
      const cachedCount = fastMetadataService.cache.size;

      if (cachedCount === 0) {
        log.info('No cached metadata found in FastMetadataService, sync needed');
        return true;
      }

      // Zkontroluj, jestli je cache starší než sync interval
      const lastSync = this.lastSyncTime || 0;
      const now = Date.now();

      if (now - lastSync > this.syncInterval) {
        log.info('Cache is older than sync interval, sync needed');
        return true;
      }

      // Zkontroluj, jestli se změnily soubory v Firebase Storage
      const hasChanges = await this.checkForStorageChanges();

      if (hasChanges) {
        log.info('Storage changes detected, sync needed');
        return true;
      }

      return false;
    } catch (error) {
      log.warn('Failed to check sync status, assuming sync needed:', error);
      return true;
    }
  }

  async checkForStorageChanges() {
    try {
      // Načti seznam souborů z Firebase Storage
      const listRef = ref(storage, '');
      const result = await listAll(listRef);

      // Získej všechny MP3 soubory
      const mp3Files = [];

      // Přidej soubory z root složky
      result.items.forEach(item => {
        if (item.name.toLowerCase().endsWith('.mp3')) {
          mp3Files.push(item.name);
        }
      });

      // Přidej soubory z podsložek
      for (const folderRef of result.prefixes) {
        try {
          const folderResult = await listAll(folderRef);
          folderResult.items.forEach(item => {
            if (item.name.toLowerCase().endsWith('.mp3')) {
              mp3Files.push(`${folderRef.name}/${item.name}`);
            }
          });

          // Zkontroluj podsložky (např. hudba/ambient-journey/)
          for (const subFolderRef of folderResult.prefixes) {
            try {
              const subFolderResult = await listAll(subFolderRef);
              subFolderResult.items.forEach(item => {
                if (item.name.toLowerCase().endsWith('.mp3')) {
                  mp3Files.push(`${subFolderRef.name}/${item.name}`);
                }
              });
            } catch (subErr) {
              log.warn(`Failed to check subfolder ${subFolderRef.name}:`, subErr);
            }
          }
        } catch (err) {
          log.warn(`Failed to check folder ${folderRef.name}:`, err);
        }
      }

      // Porovnej s cached metadaty z FastMetadataService
      const cachedFiles = Array.from(fastMetadataService.cache.keys());

      // Zkontroluj, jestli se počet souborů změnil
      if (mp3Files.length !== cachedFiles.length) {
        log.info(`File count changed: ${cachedFiles.length} -> ${mp3Files.length}`);
        return true;
      }

      // Zkontroluj, jestli se změnily názvy souborů
      const newFiles = mp3Files.filter(file => !cachedFiles.includes(file));
      if (newFiles.length > 0) {
        log.info(`New files detected: ${newFiles.length}`);
        return true;
      }

      return false;
    } catch (error) {
      log.warn('Failed to check for storage changes:', error);
      return true; // V případě chyby předpokládej, že je potřeba sync
    }
  }

  async syncMetadataInBackground() {
    if (this.syncInProgress) {
      log.warn('Sync already in progress');
      return;
    }

    this.syncInProgress = true;

    try {
      // Spusť sync s nízkou prioritou
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          this.performSync();
        }, { timeout: 5000 });
      } else {
        setTimeout(() => this.performSync(), 1000);
      }
    } catch (error) {
      log.error('Failed to start background sync:', error);
      this.syncInProgress = false;
    }
  }

  async performSync() {
    try {
      log.info('🔄 Starting metadata synchronization...');

      // Načti všechny MP3 soubory z Firebase Storage
      const mp3Files = await this.getAllMP3Files();
      log.info(`Found ${mp3Files.length} MP3 files to process`);

      if (mp3Files.length === 0) {
        log.warn('No MP3 files found, skipping sync');
        return;
      }

      // Extrahuj metadata z MP3 souborů
      const extractionResult = await mp3MetadataExtractor.extractBatchMetadata(
        mp3Files,
        (progress) => {
          log.debug(`Extraction progress: ${progress.current}/${progress.total} - ${progress.fileName}`);
        }
      );

      log.info(`Metadata extraction completed: ${extractionResult.successCount} successful, ${extractionResult.errorCount} failed`);

      // Ulož metadata (pro diagnostiku a fallback)
      if (extractionResult.results.length > 0) {
        await this.saveMetadataLocally(extractionResult.results);
        log.success(`✅ ${extractionResult.results.length} metadata records processed and cached locally`);
      }

      // Ulož čas poslední synchronizace
      this.lastSyncTime = Date.now();

      log.success('🎉 Metadata synchronization completed successfully');

    } catch (error) {
      log.error('Metadata synchronization failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async getAllMP3Files() {
    const mp3Files = [];

    try {
      const listRef = ref(storage, '');
      const result = await listAll(listRef);

      // Přidej soubory z root složky
      result.items.forEach(item => {
        if (item.name.toLowerCase().endsWith('.mp3')) {
          mp3Files.push(item.name);
        }
      });

      // Přidej soubory z podsložek
      for (const folderRef of result.prefixes) {
        try {
          const folderResult = await listAll(folderRef);
          folderResult.items.forEach(item => {
            if (item.name.toLowerCase().endsWith('.mp3')) {
              mp3Files.push(`${folderRef.name}/${item.name}`);
            }
          });

          // Zkontroluj podsložky
          for (const subFolderRef of folderResult.prefixes) {
            try {
              const subFolderResult = await listAll(subFolderRef);
              subFolderResult.items.forEach(item => {
                if (item.name.toLowerCase().endsWith('.mp3')) {
                  mp3Files.push(`${subFolderRef.name}/${item.name}`);
                }
              });
            } catch (subErr) {
              log.warn(`Failed to check subfolder ${subFolderRef.name}:`, subErr);
            }
          }
        } catch (err) {
          log.warn(`Failed to check folder ${folderRef.name}:`, err);
        }
      }

      return mp3Files;
    } catch (error) {
      log.error('Failed to get MP3 files from storage:', error);
      return [];
    }
  }

  async saveMetadataLocally(metadataArray) {
    try {
      // Přidej Firebase Storage metadata (velikost, čas vytvoření)
      const enrichedMetadata = await Promise.all(
        metadataArray.map(async (metadata) => {
          try {
            const fileRef = ref(storage, metadata.fileName);
            const storageMetadata = await getMetadata(fileRef);

            return {
              ...metadata,
              size: storageMetadata.size,
              timeCreated: storageMetadata.timeCreated,
              contentType: storageMetadata.contentType
            };
          } catch (error) {
            log.warn(`Failed to get storage metadata for ${metadata.fileName}:`, error);
            return metadata;
          }
        })
      );

      // Ulož do FastMetadataService cache (v reálné aplikaci by se to mohlo poslat na server)
      enrichedMetadata.forEach(meta => {
        fastMetadataService.cache.set(meta.fileName, meta);
      });

    } catch (error) {
      log.error('Failed to save metadata locally:', error);
      throw error;
    }
  }

  getMetadata(fileName) {
    return fastMetadataService.getMetadata(fileName);
  }

  getAllMetadata() {
    return fastMetadataService.getAllMetadata();
  }

  async forceSync() {
    log.info('🔄 Forcing metadata synchronization...');
    this.lastSyncTime = null;
    await this.performSync();
  }

  getSyncStatus() {
    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      needsSync: this.lastSyncTime === null || (Date.now() - this.lastSyncTime) > this.syncInterval
    };
  }
}

// Singleton instance
export const metadataSyncService = new MetadataSyncService();
export default metadataSyncService;
