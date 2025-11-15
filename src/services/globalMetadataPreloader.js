import log from './logger';
import mp3MetadataExtractor from './mp3MetadataExtractor';
import { storage, app } from './firebase';
import { ref, listAll, getDownloadURL, getStorage } from 'firebase/storage';

class GlobalMetadataPreloader {
  constructor() {
    this.isInitialized = false;
    this.isLoading = false;
    this.metadata = new Map(); // fileName -> metadata
    this.loadingPromise = null;
  }

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

      // Načti metadata pro všechny soubory s optimalizovaným batch processing
      // Zvýšený batch size pro lepší výkon (3-5 paralelních requestů)
      const metadataResults = await mp3MetadataExtractor.loadMetadataBatch(allAudioFiles, 5);

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

  async _scanAllAudioFiles() {
    const audioFiles = [];

    try {
      // Načti soubory z meditacie složky (včetně jazykových podsložek)
      const meditaceFiles = await this._scanFolder('meditacie');
      audioFiles.push(...meditaceFiles);

      // Načti soubory z jazykových podsložek meditacie/
      const languageFolders = ['CZ', 'SK', 'EN'];
      for (const lang of languageFolders) {
        try {
          const langFiles = await this._scanFolder(`meditacie/${lang}`);
          audioFiles.push(...langFiles);
          log.debug(`📁 Scanned meditacie/${lang}: ${langFiles.length} files`);
        } catch (langError) {
          log.warn(`⚠️ Could not scan meditacie/${lang}:`, langError.message);
        }
      }

      // Načti soubory z hudba složky
      const hudbaFiles = await this._scanFolder('hudba');
      audioFiles.push(...hudbaFiles);

      log.debug(`📁 Scanned folders: meditacie (${meditaceFiles.length}), jazykové podsložky, hudba (${hudbaFiles.length})`);

    } catch (error) {
      log.error('❌ Failed to scan audio files:', error);
    }

    return audioFiles;
  }

  async _scanFolder(folderName) {
    const files = [];

    try {
      // Získej storage instance - použij importovaný nebo vytvoř nový
      let storageInstance = storage;

      // Pokud storage není inicializován, zkus ho získat z app
      if (!storageInstance) {
        if (!app) {
          log.error(`❌ Firebase app is not initialized. Cannot scan folder: ${folderName}`);
          return files;
        }
        try {
          storageInstance = getStorage(app);
          if (!storageInstance) {
            log.error(`❌ Failed to get storage instance from app. Cannot scan folder: ${folderName}`);
            return files;
          }
        } catch (error) {
          log.error(`❌ Failed to get storage instance:`, error);
          return files;
        }
      }

      // Ověř, že storage instance má potřebné metody
      if (typeof storageInstance !== 'object' || !storageInstance._delegate) {
        log.error(`❌ Storage instance is invalid. Cannot scan folder: ${folderName}`);
        return files;
      }

      const folderRef = ref(storageInstance, folderName);
      if (!folderRef) {
        log.error(`❌ Failed to create reference for folder: ${folderName}`);
        return files;
      }

      const result = await listAll(folderRef);

      if (!result) {
        log.error(`❌ listAll returned null/undefined for folder: ${folderName}`);
        return files;
      }

      // Zpracuj soubory přímo ve složce
      if (result.items && Array.isArray(result.items)) {
        for (const item of result.items) {
          if (item && item.name && item.name.endsWith('.mp3')) {
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
      }

      // Zpracuj podsložky
      if (result.prefixes && Array.isArray(result.prefixes)) {
        for (const prefix of result.prefixes) {
          if (prefix && prefix.name) {
            try {
              const subFolderFiles = await this._scanSubFolder(folderName, prefix.name);
              files.push(...subFolderFiles);
            } catch (error) {
              log.warn(`⚠️ Failed to scan subfolder ${folderName}/${prefix.name}:`, error.message);
            }
          }
        }
      }

    } catch (error) {
      log.error(`❌ Failed to scan folder ${folderName}:`, error);
    }

    return files;
  }

  async _scanSubFolder(folderName, subFolderName) {
    const files = [];

    try {
      // Získej storage instance - použij importovaný nebo vytvoř nový
      let storageInstance = storage;

      // Pokud storage není inicializován, zkus ho získat z app
      if (!storageInstance) {
        if (!app) {
          log.error(`❌ Firebase app is not initialized. Cannot scan subfolder: ${folderName}/${subFolderName}`);
          return files;
        }
        try {
          storageInstance = getStorage(app);
          if (!storageInstance) {
            log.error(`❌ Failed to get storage instance from app. Cannot scan subfolder: ${folderName}/${subFolderName}`);
            return files;
          }
        } catch (error) {
          log.error(`❌ Failed to get storage instance:`, error);
          return files;
        }
      }

      // Ověř, že storage instance má potřebné metody
      if (typeof storageInstance !== 'object' || !storageInstance._delegate) {
        log.error(`❌ Storage instance is invalid. Cannot scan subfolder: ${folderName}/${subFolderName}`);
        return files;
      }

      const subFolderRef = ref(storageInstance, `${folderName}/${subFolderName}`);
      if (!subFolderRef) {
        log.error(`❌ Failed to create reference for subfolder: ${folderName}/${subFolderName}`);
        return files;
      }

      const result = await listAll(subFolderRef);

      if (!result) {
        log.error(`❌ listAll returned null/undefined for subfolder: ${folderName}/${subFolderName}`);
        return files;
      }

      if (result.items && Array.isArray(result.items)) {
        for (const item of result.items) {
          if (item && item.name && item.name.endsWith('.mp3')) {
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
      }

    } catch (error) {
      log.error(`❌ Failed to scan subfolder ${folderName}/${subFolderName}:`, error);
    }

    return files;
  }

  getMetadata(fileName) {
    return this.metadata.get(fileName) || null;
  }

  getMetadataByFolder(folder) {
    const results = [];
    for (const [fileName, metadata] of this.metadata) {
      if (metadata.folder === folder) {
        results.push({ fileName, ...metadata });
      }
    }
    return results;
  }

  getMetadataBySubFolder(folder, subFolder) {
    const results = [];
    for (const [fileName, metadata] of this.metadata) {
      if (metadata.folder === folder && metadata.subFolder === subFolder) {
        results.push({ fileName, ...metadata });
      }
    }
    return results;
  }

  isReady() {
    return this.isInitialized && !this.isLoading;
  }

  isLoading() {
    return this.isLoading;
  }

  getStats() {
    const meditaceFiles = this.getMetadataByFolder('meditace');
    const hudbaFiles = this.getMetadataByFolder('hudba');
    const loadedFiles = Array.from(this.metadata.values()).filter(m => m.loaded).length;

    return {
      totalFiles: this.metadata.size,
      loadedFiles,
      meditaceFiles: meditaceFiles.length,
      hudbaFiles: hudbaFiles.length,
      isInitialized: this.isInitialized,
      isLoading: this.isLoading
    };
  }

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
