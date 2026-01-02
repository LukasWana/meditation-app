import { collection, doc, getDoc, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@config/secure-firebase';
import log from './logger';

class UnifiedMetadataService {
  constructor() {
    this.collectionName = 'audio-metadata';
    this.cache = new Map();
    this.localStorageKey = 'unified-metadata-cache';
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hodin

    // Monitoring
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      firestoreHits: 0,
      mp3Extractions: 0,
      errors: 0,
      lastUpdate: null
    };

    this.isInitialized = false;
    this.isLoading = false;
  }

  async getMetadata(fileName) {
    try {
      // 1. Zkus memory cache
      if (this.cache.has(fileName)) {
        this.metrics.cacheHits++;
        log.debug(`✅ Memory cache hit for ${fileName}`);
        return this.cache.get(fileName);
      }

      // 2. Zkus localStorage cache
      if (this.loadFromLocalCache() && this.cache.has(fileName)) {
        this.metrics.cacheHits++;
        log.debug(`✅ LocalStorage cache hit for ${fileName}`);
        return this.cache.get(fileName);
      }

      // 3. Zkus Firestore
      const firestoreMetadata = await this.getFromFirestore(fileName);
      if (firestoreMetadata) {
        this.metrics.firestoreHits++;
        this.cache.set(fileName, firestoreMetadata);
        log.debug(`✅ Firestore hit for ${fileName}`);
        return firestoreMetadata;
      }

      // 4. Extrahuj z MP3 (lazy loading)
      const mp3Metadata = await this.extractMP3MetadataLazy(fileName);
      if (mp3Metadata) {
        this.metrics.mp3Extractions++;
        this.cache.set(fileName, mp3Metadata);
        // Nepokoušej se ukládat do Firestore - pouze čti
        log.debug(`✅ MP3 extraction for ${fileName}`);
        return mp3Metadata;
      }

      this.metrics.cacheMisses++;
      log.warn(`❌ No metadata found for ${fileName}`);
      return null;

    } catch (error) {
      this.metrics.errors++;
      log.error(`❌ Error getting metadata for ${fileName}:`, error);
      return null;
    }
  }

  async getFromFirestore(fileName) {
    try {
      // Nahraď lomítka v názvu souboru, aby vytvořil platný document ID
      const safeFileName = fileName.replace(/\//g, '_');
      const docRef = doc(db, this.collectionName, safeFileName);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      log.warn(`Failed to get from Firestore: ${fileName}`, error);
      return null;
    }
  }

  async saveToFirestore(fileName, metadata) {
    try {
      // Nahraď lomítka v názvu souboru, aby vytvořil platný document ID
      const safeFileName = fileName.replace(/\//g, '_');
      const docRef = doc(db, this.collectionName, safeFileName);
      const metadataDoc = {
        fileName, // Původní název souboru s lomítky
        ...metadata,
        updated: new Date().toISOString()
      };

      await setDoc(docRef, metadataDoc);
      log.debug(`✅ Saved to Firestore: ${fileName}`);
    } catch (error) {
      log.warn(`Failed to save to Firestore: ${fileName}`, error);
    }
  }

  async extractMP3MetadataLazy(fileName) {
    return new Promise((resolve) => {
      // Najdi download URL
      this.getDownloadURL(fileName).then(downloadURL => {
        if (!downloadURL) {
          resolve(null);
          return;
        }

        const audio = new Audio();
        const timeout = setTimeout(() => {
          audio.remove();
          log.warn(`⏰ Timeout extracting metadata for ${fileName}`);
          resolve(this.createBasicMetadata(fileName, downloadURL));
        }, 5000); // Zkráceno na 5 sekund

        const handleLoadedMetadata = () => {
          clearTimeout(timeout);
          audio.remove();

          const metadata = {
            fileName,
            downloadURL,
            duration: audio.duration || null,
            durationFormatted: this.formatDuration(audio.duration),
            title: this.extractTitleFromFileName(fileName),
            folder: this.extractFolder(fileName),
            subFolder: this.extractSubFolder(fileName),
            type: this.extractType(fileName),
            size: null, // Bude načteno později
            contentType: 'audio/mpeg',
            extracted: true,
            lastModified: new Date().toISOString()
          };

          resolve(metadata);
        };

        const handleError = () => {
          clearTimeout(timeout);
          audio.remove();
          log.warn(`❌ Failed to extract metadata for ${fileName}`);
          resolve(this.createBasicMetadata(fileName, downloadURL));
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('error', handleError);
        audio.src = downloadURL;
        audio.preload = 'metadata';
      }).catch(() => {
        resolve(null);
      });
    });
  }

  createBasicMetadata(fileName, downloadURL) {
    return {
      fileName,
      downloadURL,
      duration: null,
      durationFormatted: 'N/A',
      title: this.extractTitleFromFileName(fileName),
      folder: this.extractFolder(fileName),
      subFolder: this.extractSubFolder(fileName),
      type: this.extractType(fileName),
      size: null,
      contentType: 'audio/mpeg',
      extracted: false,
      lastModified: new Date().toISOString()
    };
  }

  async getDownloadURL(fileName) {
    try {
      const fileRef = ref(storage, fileName);
      return await getDownloadURL(fileRef);
    } catch (error) {
      log.warn(`Failed to get download URL for ${fileName}:`, error);
      return null;
    }
  }

  extractTitleFromFileName(fileName) {
    const nameWithoutExt = fileName.replace(/\.mp3$/i, '');

    // Pro slova: odstran prefixy
    if (nameWithoutExt.includes('4FSK-')) {
      return nameWithoutExt.replace(/^(zensky|muzsky)4FSK-/, '');
    }

    return nameWithoutExt;
  }

  extractFolder(fileName) {
    const pathParts = fileName.split('/');
    return pathParts[0] || 'unknown';
  }

  extractSubFolder(fileName) {
    const pathParts = fileName.split('/');
    return pathParts.length > 2 ? pathParts[1] : null;
  }

  extractType(fileName) {
    if (fileName.startsWith('hudba/')) return 'hudba';
    if (fileName.startsWith('meditacie/')) return 'meditacie';
    if (fileName.startsWith('slova/')) return 'meditacie'; // Zpětná kompatibilita - mapuj na meditacie
    return 'unknown';
  }

  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  loadFromLocalCache() {
    try {
      const cached = localStorage.getItem(this.localStorageKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        if (now - timestamp < this.cacheExpiry) {
          this.cache = new Map(Object.entries(data));
          log.debug('✅ Loaded from localStorage cache');
          return true;
        } else {
          localStorage.removeItem(this.localStorageKey);
        }
      }
    } catch (error) {
      log.warn('Failed to load from localStorage:', error);
    }
    return false;
  }

  saveToLocalCache() {
    try {
      const data = Object.fromEntries(this.cache);
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(cacheData));
      log.debug('✅ Saved to localStorage cache');
    } catch (error) {
      log.warn('Failed to save to localStorage:', error);
    }
  }

  async initialize(forceReload = false) {
    if (this.isInitialized && !forceReload) return;
    if (this.isLoading) return;

    if (forceReload) {
      this.cache.clear();
      this.isInitialized = false;
      localStorage.removeItem(this.localStorageKey);
    }

    this.isLoading = true;
    log.info('🚀 Initializing UnifiedMetadataService...');

    try {
      // Nejdříve zkus načíst z localStorage
      if (!forceReload && this.loadFromLocalCache()) {
        this.isInitialized = true;
        this.isLoading = false;
        log.info('✅ Initialized from localStorage cache');
        return;
      }

      // Pokud není v localStorage, načti základní metadata z Firestore
      await this.loadBasicMetadataFromFirestore();

      this.isInitialized = true;
      this.isLoading = false;
      this.metrics.lastUpdate = new Date();
      log.info('✅ UnifiedMetadataService initialized');

    } catch (error) {
      this.isLoading = false;
      log.error('❌ Failed to initialize UnifiedMetadataService:', error);
    }
  }

  async loadBasicMetadataFromFirestore() {
    try {
      const metadataCollection = collection(db, this.collectionName);
      const q = query(metadataCollection, orderBy('fileName'));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        this.cache.set(data.fileName, data);
      });

      log.info(`✅ Loaded ${this.cache.size} metadata records from Firestore`);
      this.saveToLocalCache();

    } catch (error) {
      log.warn('Failed to load from Firestore, using empty cache:', error);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      isInitialized: this.isInitialized,
      isLoading: this.isLoading
    };
  }

  clearCache() {
    this.cache.clear();
    localStorage.removeItem(this.localStorageKey);
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      firestoreHits: 0,
      mp3Extractions: 0,
      errors: 0,
      lastUpdate: null
    };
    log.info('🧹 UnifiedMetadataService cache cleared');
  }

  isReady() {
    return this.isInitialized && !this.isLoading;
  }

  getCachedMetadata(fileName) {
    return this.cache.get(fileName) || null;
  }
}

// Singleton instance
const unifiedMetadataService = new UnifiedMetadataService();

export default unifiedMetadataService;
