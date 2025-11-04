

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

        // Debug: zobraz strukturu dat
        log.debug('🔍 Realtime Database data structure:', {
          hasFiles: !!data.files,
          hasMetadata: !!data.metadata,
          filesIsArray: Array.isArray(data.files),
          filesLength: data.files ? data.files.length : 0,
          dataKeys: Object.keys(data),
          sampleData: data.files ? data.files.slice(0, 2) : Object.keys(data).slice(0, 2)
        });

        // Pokud jsou data ve struktuře { metadata: {...}, files: [...] }, extrahuj files
        if (data.files && Array.isArray(data.files)) {
          log.debug(`✅ All metadata loaded from Realtime Database: ${data.files.length} files`);
          // Převeď array na object s fileName jako klíč
          const metadataObject = {};
          data.files.forEach(file => {
            if (file.fileName) {
              metadataObject[file.fileName] = file;
            }
          });
          log.debug(`✅ Converted to object: ${Object.keys(metadataObject).length} files`);

          // Debug: zobraz ukázku převedených dat
          const sampleKeys = Object.keys(metadataObject).slice(0, 3);
          log.debug('🔍 Sample converted data:', sampleKeys.map(key => ({
            key: key,
            fileName: metadataObject[key].fileName,
            folder: metadataObject[key].folder,
            displayName: metadataObject[key].displayName
          })));

          // Debug: zobraz slova soubory
          const slovaFiles = Object.values(metadataObject).filter(file =>
            file.fileName && file.fileName.includes('slova/')
          );
          log.debug(`🎤 Slova files in Realtime Database: ${slovaFiles.length}`);
          log.debug('🎤 Sample slova files from DB:', slovaFiles.slice(0, 3).map(f => ({
            fileName: f.fileName,
            folder: f.folder,
            hasDownloadURL: !!(f.downloadURL || f.audioSrc)
          })));

          return metadataObject;
        } else {
          // Pokud jsou data už ve správné struktuře (sanitizované klíče)
          log.debug(`✅ All metadata loaded from Realtime Database: ${Object.keys(data).length} files`);

          // Převeď objekt s sanitizovanými klíči na objekt s fileName jako klíč
          // Klíče jsou sanitizované (např. dychanie_SLASH_prana-breath_SLASH_bg80_DOT_ogg)
          // ale uvnitř je fileName normální (např. dychanie/prana-breath/bg80.ogg)
          const metadataObject = {};
          Object.entries(data).forEach(([sanitizedKey, fileData]) => {
            // Pokud má fileData fileName, použij ho jako klíč
            if (fileData && fileData.fileName) {
              metadataObject[fileData.fileName] = fileData;
            } else {
              // Pokud nemá fileName, použij sanitizovaný klíč (pro zpětnou kompatibilitu)
              metadataObject[sanitizedKey] = fileData;
            }
          });

          log.debug(`✅ Converted sanitized keys to fileName keys: ${Object.keys(metadataObject).length} files`);

          // Debug: zobraz slova soubory i pro druhou strukturu
          const slovaFiles = Object.values(metadataObject).filter(file =>
            file.fileName && file.fileName.includes('slova/')
          );
          log.debug(`🎤 Slova files in Realtime Database: ${slovaFiles.length}`);
          log.debug('🎤 Sample slova files from DB:', slovaFiles.slice(0, 3).map(f => ({
            fileName: f.fileName,
            folder: f.folder,
            hasDownloadURL: !!(f.downloadURL || f.audioSrc),
            hasWaveformData: !!(f.waveformData)
          })));

          // Debug: zobraz dychanie soubory s waveformy
          const dychanieFiles = Object.values(metadataObject).filter(file =>
            file.fileName && file.fileName.includes('dychanie/')
          );
          log.debug(`🫁 Dychanie files in Realtime Database: ${dychanieFiles.length}`);
          const filesWithWaveform = dychanieFiles.filter(f => f.waveformData);
          log.debug(`🌊 Dychanie files with waveform: ${filesWithWaveform.length}/${dychanieFiles.length}`);
          if (filesWithWaveform.length > 0) {
            log.debug('🌊 Sample dychanie files with waveform:', filesWithWaveform.slice(0, 3).map(f => ({
              fileName: f.fileName,
              hasWaveformData: !!f.waveformData,
              waveformSamples: f.waveformData?.length || 0
            })));
          }
          if (dychanieFiles.length > filesWithWaveform.length) {
            const filesWithoutWaveform = dychanieFiles.filter(f => !f.waveformData);
            log.debug('⚠️ Dychanie files without waveform:', filesWithoutWaveform.slice(0, 3).map(f => ({
              fileName: f.fileName,
              hasWaveformData: !!f.waveformData
            })));
          }

          return metadataObject;
        }
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
