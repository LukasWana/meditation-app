import { log } from './logger';
import mp3MetadataExtractor from './mp3MetadataExtractor';
import { storage } from './firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

/**
 * Globální preloader pro načítání metadata všech audio souborů
 */
class GlobalMetadataPreloader {
  constructor() {
    this.isInitialized = false;
    this.isLoading = false;
    this.metadata = new Map(); // fileName -> metadata
    this.loadingPromise = null;
  }

  /**
   * Inicializuje preloader a načte metadata pro všechny audio soubory
   * @param {boolean} forceReload - Vynutí nové načtení i když už je inicializováno
   * @returns {Promise<boolean>} Úspěch inicializace
   */
  async initialize(forceReload = false) {
    if (this.isInitialized && !forceReload) {
      log.debug('🔄 Global metadata preloader already initialized');
      return true;
    }

    if (this.isLoading) {
      log.debug('⏳ Global metadata preloader already loading, waiting...');
      return await this.loadingPromise;
    }

    this.isLoading = true;
    this.loadingPromise = this._loadAllMetadata();

    try {
      const success = await this.loadingPromise;
      this.isInitialized = true;
      return success;
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  /**
   * Vnitřní metoda pro načítání všech metadata
   * @private
   */
  async _loadAllMetadata() {
    try {
      log.info('🚀 Starting global metadata preloading...');

      // Načti všechny audio soubory z Firebase Storage
      const allAudioFiles = await this._scanAllAudioFiles();
      log.info(`📊 Found ${allAudioFiles.length} audio files to process`);

      if (allAudioFiles.length === 0) {
        log.warn('⚠️ No audio files found');
        return false;
      }

      // Načti metadata pro všechny soubory
      const metadataResults = await mp3MetadataExtractor.loadMetadataBatch(allAudioFiles, 2);

      // Ulož metadata do mapy
      metadataResults.forEach((metadata, index) => {
        const file = allAudioFiles[index];
        if (file && metadata) {
          this.metadata.set(file.fileName, {
            ...metadata,
            downloadURL: file.downloadURL,
            folder: file.folder,
            subFolder: file.subFolder
          });
        }
      });

      log.success(`✅ Global metadata preloading completed: ${this.metadata.size} files processed`);
      return true;

    } catch (error) {
      log.error('❌ Global metadata preloading failed:', error);
      return false;
    }
  }

  /**
   * Skenuje všechny audio soubory v Firebase Storage
   * @private
   */
  async _scanAllAudioFiles() {
    const audioFiles = [];

    try {
      // Načti soubory ze slova složky
      const slovaFiles = await this._scanFolder('slova');
      audioFiles.push(...slovaFiles);

      // Načti soubory z hudba složky
      const hudbaFiles = await this._scanFolder('hudba');
      audioFiles.push(...hudbaFiles);

      log.debug(`📁 Scanned folders: slova (${slovaFiles.length}), hudba (${hudbaFiles.length})`);

    } catch (error) {
      log.error('❌ Failed to scan audio files:', error);
    }

    return audioFiles;
  }

  /**
   * Skenuje konkrétní složku v Firebase Storage
   * @private
   */
  async _scanFolder(folderName) {
    const files = [];

    try {
      const folderRef = ref(storage, folderName);
      const result = await listAll(folderRef);

      // Zpracuj soubory přímo ve složce
      for (const item of result.items) {
        if (item.name.endsWith('.mp3')) {
          try {
            const downloadURL = await getDownloadURL(item);
            files.push({
              fileName: `${folderName}/${item.name}`,
              downloadURL,
              folder: folderName,
              subFolder: null
            });
          } catch (error) {
            log.warn(`⚠️ Failed to get download URL for ${item.name}:`, error.message);
          }
        }
      }

      // Zpracuj podsložky
      for (const prefix of result.prefixes) {
        const subFolderFiles = await this._scanSubFolder(folderName, prefix.name);
        files.push(...subFolderFiles);
      }

    } catch (error) {
      log.error(`❌ Failed to scan folder ${folderName}:`, error);
    }

    return files;
  }

  /**
   * Skenuje podsložku
   * @private
   */
  async _scanSubFolder(folderName, subFolderName) {
    const files = [];

    try {
      const subFolderRef = ref(storage, `${folderName}/${subFolderName}`);
      const result = await listAll(subFolderRef);

      for (const item of result.items) {
        if (item.name.endsWith('.mp3')) {
          try {
            const downloadURL = await getDownloadURL(item);
            files.push({
              fileName: `${folderName}/${subFolderName}/${item.name}`,
              downloadURL,
              folder: folderName,
              subFolder: subFolderName
            });
          } catch (error) {
            log.warn(`⚠️ Failed to get download URL for ${subFolderName}/${item.name}:`, error.message);
          }
        }
      }

    } catch (error) {
      log.error(`❌ Failed to scan subfolder ${folderName}/${subFolderName}:`, error);
    }

    return files;
  }

  /**
   * Získá metadata pro konkrétní soubor
   * @param {string} fileName - Název souboru
   * @returns {Object|null} Metadata nebo null
   */
  getMetadata(fileName) {
    return this.metadata.get(fileName) || null;
  }

  /**
   * Získá metadata pro všechny soubory ve složce
   * @param {string} folder - Název složky (slova/hudba)
   * @returns {Array} Pole metadata objektů
   */
  getMetadataByFolder(folder) {
    const results = [];
    for (const [fileName, metadata] of this.metadata) {
      if (metadata.folder === folder) {
        results.push({ fileName, ...metadata });
      }
    }
    return results;
  }

  /**
   * Získá metadata pro soubory v podsložce
   * @param {string} folder - Název složky
   * @param {string} subFolder - Název podsložky
   * @returns {Array} Pole metadata objektů
   */
  getMetadataBySubFolder(folder, subFolder) {
    const results = [];
    for (const [fileName, metadata] of this.metadata) {
      if (metadata.folder === folder && metadata.subFolder === subFolder) {
        results.push({ fileName, ...metadata });
      }
    }
    return results;
  }

  /**
   * Zkontroluje, jestli je preloader inicializován
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && !this.isLoading;
  }

  /**
   * Zkontroluje, jestli se právě načítá
   * @returns {boolean}
   */
  isLoading() {
    return this.isLoading;
  }

  /**
   * Získá statistiky
   * @returns {Object}
   */
  getStats() {
    const slovaFiles = this.getMetadataByFolder('slova');
    const hudbaFiles = this.getMetadataByFolder('hudba');
    const loadedFiles = Array.from(this.metadata.values()).filter(m => m.loaded).length;

    return {
      totalFiles: this.metadata.size,
      loadedFiles,
      slovaFiles: slovaFiles.length,
      hudbaFiles: hudbaFiles.length,
      isInitialized: this.isInitialized,
      isLoading: this.isLoading
    };
  }

  /**
   * Vymaže všechna metadata
   */
  clear() {
    this.metadata.clear();
    this.isInitialized = false;
    this.isLoading = false;
    this.loadingPromise = null;
    mp3MetadataExtractor.clearCache();
    log.info('🧹 Global metadata preloader cleared');
  }
}

// Singleton instance
const globalMetadataPreloader = new GlobalMetadataPreloader();

export default globalMetadataPreloader;
