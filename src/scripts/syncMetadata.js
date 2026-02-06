

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../services/firebase.js';
import mp3MetadataExtractor from '../services/mp3MetadataExtractor.js';
import { firestoreMetadataService } from '../services/firestoreMetadataService.js';
import log from '../services/logger.js';

class MetadataSyncService {
  constructor() {
    this.functions = getFunctions(app);
    this.syncStorageFunction = httpsCallable(this.functions, 'syncStorage');
    this.getFileStatsFunction = httpsCallable(this.functions, 'getFileStats');
    this.saveScrapedMetadataFunction = httpsCallable(this.functions, 'saveScrapedMetadata');
  }

  async syncMetadata() {
    try {
      log.info('🚀 Starting manual metadata sync...');

      // V development módu použij lokální synchronizaci
      if (import.meta.env.MODE === 'development') {
        log.info('🔧 Development mode: Using local metadata sync...');

        // Simuluj úspěšnou synchronizaci
        const mockResult = {
          success: true,
          filesProcessed: 76,
          totalFiles: 76,
          message: 'Development mode - metadata sync simulated'
        };

        log.success(`✅ Development sync completed: ${mockResult.filesProcessed}/${mockResult.totalFiles} files processed`);
        return mockResult;
      }

      // Spusť synchronizaci na Firebase Functions
      const result = await this.syncStorageFunction();

      if (result.data.success) {
        log.success(`✅ Sync completed: ${result.data.filesProcessed}/${result.data.totalFiles} files processed`);

        // Obnov cache v aplikaci
        await firestoreMetadataService.clearCache();
        await firestoreMetadataService.initialize();

        return result.data;
      } else {
        log.error('❌ Sync failed:', result.data.error);
        throw new Error(result.data.error);
      }
    } catch (error) {
      log.error('❌ Failed to sync metadata:', error);
      throw error;
    }
  }

  async getMetadataStats() {
    try {
      // V development módu použij mock data
      if (import.meta.env.MODE === 'development') {
        log.info('🔧 Development mode: Using mock metadata stats...');

        return {
          totalFiles: 76,
          byFolder: {
            'hudba': 45,
            'meditacie': 31
          },
          lastSync: new Date().toISOString(),
          needsSync: false
        };
      }

      const result = await this.getFileStatsFunction();

      if (result.data.error) {
        throw new Error(result.data.error);
      }

      return result.data;
    } catch (error) {
      log.error('❌ Failed to get metadata stats:', error);
      throw error;
    }
  }

  async extractAndSaveMetadata(fileName, audioUrl) {
    try {
      log.info(`🎵 Extracting metadata for ${fileName}...`);

      // Extrahuj metadata z MP3
      const metadata = await mp3MetadataExtractor.extractMetadata(audioUrl, fileName);

      // Přidej dodatečné informace
      const fullMetadata = {
        ...metadata,
        fileName: fileName,
        folder: this._extractFolder(fileName),
        subFolder: this._extractSubFolder(fileName),
        lastModified: new Date().toISOString(),
        extracted: true
      };

      // Ulož do Firestore přes Firebase Functions
      const result = await this.saveScrapedMetadataFunction({
        fileName: fileName,
        metadata: fullMetadata
      });

      if (result.data.success) {
        log.success(`✅ Metadata saved for ${fileName}`);

        // Aktualizuj cache
        firestoreMetadataService.cache.set(fileName, fullMetadata);

        return fullMetadata;
      } else {
        throw new Error(result.data.error);
      }
    } catch (error) {
      log.error(`❌ Failed to extract and save metadata for ${fileName}:`, error);
      throw error;
    }
  }

  async extractMetadataBatch(files) {
    log.info(`🎵 Extracting metadata for ${files.length} files...`);

    const results = [];
    const batchSize = 3; // Malé batch pro lepší výkon

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      log.debug(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`);

      const batchPromises = batch.map(async (file) => {
        try {
          const metadata = await this.extractAndSaveMetadata(file.fileName, file.downloadURL);
          return { success: true, fileName: file.fileName, metadata };
        } catch (error) {
          log.error(`❌ Failed to process ${file.fileName}:`, error);
          return { success: false, fileName: file.fileName, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Krátká pauza mezi batch
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    log.success(`✅ Metadata extraction completed: ${successCount}/${files.length} files processed successfully`);

    return results;
  }

  _extractFolder(fileName) {
    const parts = fileName.split('/');
    return parts[0] || 'unknown';
  }

  _extractSubFolder(fileName) {
    const parts = fileName.split('/');
    return parts.length > 2 ? parts[1] : null;
  }

  async checkSyncStatus() {
    try {
      const stats = await this.getMetadataStats();

      return {
        totalFiles: stats.totalFiles,
        byFolder: stats.byFolder,
        lastSync: stats.lastSync,
        needsSync: stats.totalFiles === 0
      };
    } catch (error) {
      log.error('❌ Failed to check sync status:', error);
      return {
        totalFiles: 0,
        byFolder: {},
        lastSync: null,
        needsSync: true,
        error: error.message
      };
    }
  }
}

// Singleton instance
const metadataSyncService = new MetadataSyncService();

export default metadataSyncService;
