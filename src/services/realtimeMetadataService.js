

import { database } from './firebase';
import { ref, get, onValue, off } from 'firebase/database';
import log from './logger';

class RealtimeMetadataService {
  constructor() {
    this.database = database;
    this.listeners = new Map();
  }

  sanitizePath(path) {
    return path
      .replace(/\./g, '_DOT_')      // . -> _DOT_
      .replace(/#/g, '_HASH_')      // # -> _HASH_
      .replace(/\$/g, '_DOLLAR_')   // $ -> _DOLLAR_
      .replace(/\[/g, '_LBRACKET_') // [ -> _LBRACKET_
      .replace(/\]/g, '_RBRACKET_') // ] -> _RBRACKET_
      .replace(/\//g, '_SLASH_')    // / -> _SLASH_
      .replace(/\\/g, '_BACKSLASH_'); // \ -> _BACKSLASH_
  }

  async getFileMetadata(filePath) {
    try {
      const safePath = this.sanitizePath(filePath);
      const metadataRef = ref(this.database, `audio-metadata/${safePath}`);
      const snapshot = await get(metadataRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        log.debug(`✅ Metadata loaded from Realtime Database: ${safePath}`);
        return data;
      } else {
        log.debug(`📭 No metadata found for: ${filePath}`);
        return null;
      }
    } catch (error) {
      log.error(`❌ Failed to load metadata for ${filePath}:`, error);
      return null;
    }
  }

  async getAllMetadata() {
    try {
      const metadataRef = ref(this.database, 'audio-metadata');
      const snapshot = await get(metadataRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        log.debug(`✅ All metadata loaded from Realtime Database: ${Object.keys(data).length} files`);
        return data;
      } else {
        log.debug('📭 No metadata found in Realtime Database');
        return {};
      }
    } catch (error) {
      log.error('❌ Failed to load all metadata:', error);

      // Pokud je to connection error, zkus fallback
      if (error.code === 'unavailable' || error.message.includes('CONNECTION_REFUSED')) {
        log.warn('⚠️ Realtime Database unavailable, returning empty data');
        return {};
      }

      return {};
    }
  }

  async getFolderMetadata(folder) {
    try {
      const allMetadata = await this.getAllMetadata();
      const folderMetadata = {};

      // Filtruj metadata podle složky
      Object.entries(allMetadata).forEach(([safePath, metadata]) => {
        if (metadata.folder === folder) {
          folderMetadata[safePath] = metadata;
        }
      });

      log.debug(`✅ Folder metadata loaded: ${folder} (${Object.keys(folderMetadata).length} files)`);
      return folderMetadata;
    } catch (error) {
      log.error(`❌ Failed to load folder metadata for ${folder}:`, error);
      return {};
    }
  }

  watchMetadata(callback) {
    try {
      const metadataRef = ref(this.database, 'audio-metadata');

      const listener = onValue(metadataRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          log.debug('📡 Real-time metadata update received');
          callback(data);
        } else {
          log.debug('📡 Real-time metadata update: no data');
          callback({});
        }
      }, (error) => {
        log.error('❌ Real-time metadata listener error:', error);
      });

      // Ulož listener pro cleanup
      this.listeners.set('metadata', listener);

      // Vrať cleanup funkci
      return () => {
        off(metadataRef, 'value', listener);
        this.listeners.delete('metadata');
        log.debug('✅ Stopped watching metadata');
      };
    } catch (error) {
      log.error('❌ Failed to watch metadata:', error);
      throw error;
    }
  }

  watchFileMetadata(filePath, callback) {
    try {
      const safePath = this.sanitizePath(filePath);
      const metadataRef = ref(this.database, `audio-metadata/${safePath}`);

      const listener = onValue(metadataRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          log.debug(`📡 Real-time file metadata update: ${filePath}`);
          callback(data);
        } else {
          log.debug(`📡 Real-time file metadata update: no data for ${filePath}`);
          callback(null);
        }
      }, (error) => {
        log.error(`❌ Real-time file metadata listener error for ${filePath}:`, error);
      });

      // Ulož listener pro cleanup
      this.listeners.set(`file-${filePath}`, listener);

      // Vrať cleanup funkci
      return () => {
        off(metadataRef, 'value', listener);
        this.listeners.delete(`file-${filePath}`);
        log.debug(`✅ Stopped watching file metadata: ${filePath}`);
      };
    } catch (error) {
      log.error(`❌ Failed to watch file metadata for ${filePath}:`, error);
      throw error;
    }
  }

  stopAllListeners() {
    this.listeners.forEach((listener, key) => {
      try {
        off(listener);
        log.debug(`✅ Stopped listener: ${key}`);
      } catch (error) {
        log.error(`❌ Failed to stop listener ${key}:`, error);
      }
    });
    this.listeners.clear();
    log.debug('✅ All listeners stopped');
  }

  async getMetadataStats() {
    try {
      const allMetadata = await this.getAllMetadata();
      const stats = {
        totalFiles: Object.keys(allMetadata).length,
        byFolder: {},
        lastUpdated: null
      };

      // Počítej soubory podle složek
      Object.values(allMetadata).forEach(metadata => {
        const folder = metadata.folder || 'unknown';
        stats.byFolder[folder] = (stats.byFolder[folder] || 0) + 1;

        // Najdi nejnovější aktualizaci
        if (metadata.lastUpdated) {
          if (!stats.lastUpdated || metadata.lastUpdated > stats.lastUpdated) {
            stats.lastUpdated = metadata.lastUpdated;
          }
        }
      });

      log.debug(`✅ Metadata stats: ${stats.totalFiles} files, ${Object.keys(stats.byFolder).length} folders`);
      return stats;
    } catch (error) {
      log.error('❌ Failed to get metadata stats:', error);
      return {
        totalFiles: 0,
        byFolder: {},
        lastUpdated: null
      };
    }
  }
}

// Exportuj singleton instanci
export const realtimeMetadataService = new RealtimeMetadataService();
export default realtimeMetadataService;
