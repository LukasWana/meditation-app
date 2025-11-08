

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

        // ✅ OPRAVA: Normalizuj waveform data - může být objekt místo pole
        if (data && data.waveformData) {
          data.waveformData = this.normalizeWaveformData(data.waveformData);
        }

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
              // ✅ OPRAVA: Normalizuj waveform data - může být objekt místo pole
              if (file.waveformData) {
                file.waveformData = this.normalizeWaveformData(file.waveformData);
              }
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

          // Debug: zobraz meditace soubory
          const meditaceFiles = Object.values(metadataObject).filter(file =>
            file.fileName && (file.fileName.includes('meditace/') || file.fileName.includes('meditacie/'))
          );
          log.debug(`🧘 Meditace files v Realtime Database: ${meditaceFiles.length}`);
          log.debug('🧘 Sample meditace files from DB:', meditaceFiles.slice(0, 3).map(f => ({
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
              // ✅ OPRAVA: Normalizuj waveform data - může být objekt místo pole
              if (fileData.waveformData) {
                fileData.waveformData = this.normalizeWaveformData(fileData.waveformData);
              }
              metadataObject[fileData.fileName] = fileData;
            } else {
              // Pokud nemá fileName, použij sanitizovaný klíč (pro zpětnou kompatibilitu)
              metadataObject[sanitizedKey] = fileData;
            }
          });

          log.debug(`✅ Converted sanitized keys to fileName keys: ${Object.keys(metadataObject).length} files`);

          // Debug: zobraz meditace soubory i pro druhou strukturu
          const meditaceFiles = Object.values(metadataObject).filter(file =>
            file.fileName && (file.fileName.includes('meditace/') || file.fileName.includes('meditacie/'))
          );
          log.debug(`🧘 Meditace files v Realtime Database: ${meditaceFiles.length}`);
          log.debug('🧘 Sample meditace files from DB:', meditaceFiles.slice(0, 3).map(f => ({
            fileName: f.fileName,
            folder: f.folder,
            hasDownloadURL: !!(f.downloadURL || f.audioSrc),
            hasWaveformData: !!(f.waveformData)
          })));

          // Debug: zobraz dychani soubory s waveformy
          const dychaniFiles = Object.values(metadataObject).filter(file =>
            file.fileName && (file.fileName.includes('dychani/') || file.fileName.includes('dychanie/'))
          );
          log.debug(`🫁 Dychani files v Realtime Database: ${dychaniFiles.length}`);
          const filesWithWaveform = dychaniFiles.filter(f => f.waveformData);
          log.debug(`🌊 Dychani files with waveform: ${filesWithWaveform.length}/${dychaniFiles.length}`);
          if (filesWithWaveform.length > 0) {
            log.debug('🌊 Sample dychani files with waveform:', filesWithWaveform.slice(0, 3).map(f => ({
              fileName: f.fileName,
              hasWaveformData: !!f.waveformData,
              waveformSamples: f.waveformData?.length || 0
            })));
          }
          if (dychaniFiles.length > filesWithWaveform.length) {
            const filesWithoutWaveform = dychaniFiles.filter(f => !f.waveformData);
            log.debug('⚠️ Dychani files without waveform:', filesWithoutWaveform.slice(0, 3).map(f => ({
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

  /**
   * Normalizuje waveform data - pokud jsou uložena jako objekt {0: val, 1: val, ...},
   * převede je na pole. Realtime Database někdy ukládá pole jako objekty s numerickými klíči.
   * @param {any} waveformData - Waveform data (může být array, object, nebo base64 string)
   * @returns {Array<number>|null} - Pole amplitud nebo null
   */
  normalizeWaveformData(waveformData) {
    if (!waveformData) {
      return null;
    }

    // Pokud je to pole, vrať jak je
    if (Array.isArray(waveformData)) {
      return waveformData;
    }

    // Pokud je to objekt s numerickými klíči, převeď na pole
    if (typeof waveformData === 'object' && waveformData !== null) {
      const keys = Object.keys(waveformData);
      // Zkontroluj, zda jsou všechny klíče čísla
      const allNumericKeys = keys.every(key => /^\d+$/.test(key));

      if (allNumericKeys) {
        // Seřaď klíče numericky a vrať jako pole
        const sortedKeys = keys.map(k => parseInt(k, 10)).sort((a, b) => a - b);
        return sortedKeys.map(k => waveformData[k.toString()]);
      }

      // Pokud to není objekt s numerickými klíči, vrať null
      return null;
    }

    // Pokud je to base64 string (pokud by se v budoucnu používalo base64 kódování)
    if (typeof waveformData === 'string' && waveformData.length > 100) {
      try {
        // Zkus dekódovat base64
        return this.decodeWaveformFromBase64(waveformData);
      } catch (error) {
        // Pokud to není base64, vrať null
        return null;
      }
    }

    return null;
  }

  /**
   * Dekóduje base64 string zpět na waveform pole
   * @param {string} base64String - Base64 kódovaný string
   * @returns {Array<number>} - Pole amplitud (0-32768)
   */
  decodeWaveformFromBase64(base64String) {
    try {
      // Dekóduj base64 na Uint8Array
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Konvertuj na Int16Array (každé 2 byty = 1 číslo)
      const int16Array = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);

      // Konvertuj na pole čísel
      return Array.from(int16Array);
    } catch (error) {
      console.error('❌ Failed to decode base64 waveform:', error);
      return null;
    }
  }
}

// Exportuj singleton instanci
export const realtimeMetadataService = new RealtimeMetadataService();
export default realtimeMetadataService;
