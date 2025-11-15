import { collection, doc, getDoc, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { BaseMetadataService } from './metadata/BaseMetadataService.js';
import log from './logger';

class FirestoreMetadataService extends BaseMetadataService {
  constructor() {
    super({
      localStorageKey: 'audio-metadata-cache',
      cacheExpiry: 24 * 60 * 60 * 1000 // 24 hodin
    });
    this.collectionName = 'audio-metadata';
  }

  async loadAllMetadata() {
    if (this.isLoading) {
      return Object.fromEntries(this.cache);
    }

    this.isLoading = true;

    try {
      log.info('Loading metadata from Firestore...');

      const metadataCollection = collection(db, this.collectionName);
      const q = query(metadataCollection, orderBy('fileName'));
      const querySnapshot = await getDocs(q);

      const metadata = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        metadata[data.fileName] = {
          fileName: data.fileName,
          size: data.size,
          contentType: data.contentType,
          duration: data.duration,
          estimatedDuration: data.estimatedDuration,
          timeCreated: data.timeCreated,
          updated: data.updated,
          downloadURL: data.downloadURL,
          type: data.type || 'audio'
        };

        // Přidej do memory cache
        this.cache.set(data.fileName, metadata[data.fileName]);
      });

      log.success(`Loaded ${Object.keys(metadata).length} metadata records from Firestore`);

      // Ulož do localStorage pro offline použití
      this.saveToLocalCache();

      return metadata;
    } catch (error) {
      log.error('Failed to load metadata from Firestore:', error);

      // Fallback na local cache
      if (this.loadFromLocalCache()) {
        return Object.fromEntries(this.cache);
      }

      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async getMetadata(fileName) {
    // Zkus cache (memory + localStorage)
    const cached = this.getCachedMetadata(fileName);
    if (cached) {
      return cached;
    }

    try {
      // Načti z Firestore - nahraď lomítka v názvu souboru
      const safeFileName = fileName.replace(/\//g, '_');
      const docRef = doc(db, this.collectionName, safeFileName);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const metadata = docSnap.data();
        this.setCachedMetadata(fileName, metadata);
        return metadata;
      } else {
        log.warn(`No metadata found for ${fileName}`);
        return null;
      }
    } catch (error) {
      log.error(`Failed to get metadata for ${fileName}:`, error);
      return null;
    }
  }

  async saveMetadata(fileName, metadata) {
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

      // Aktualizuj cache
      this.setCachedMetadata(fileName, metadataDoc);

      log.debug(`Metadata saved for ${fileName}`);
      return metadataDoc;
    } catch (error) {
      console.error(`Failed to save metadata for ${fileName}:`, error);
      throw error;
    }
  }

  async saveBatchMetadata(metadataArray) {
    try {
      console.log(`Saving batch of ${metadataArray.length} metadata records...`);

      const promises = metadataArray.map(({ fileName, metadata }) =>
        this.saveMetadata(fileName, metadata)
      );

      await Promise.all(promises);

      // Ulož do localStorage po batch operaci
      this.saveToLocalCache();

      console.log('Batch metadata save completed');
    } catch (error) {
      console.error('Batch metadata save failed:', error);
      throw error;
    }
  }

  clearCache() {
    super.clearCache();
  }

  getAllFromCache() {
    return Object.fromEntries(this.cache);
  }

  hasInCache(fileName) {
    return this.cache.has(fileName);
  }

  async initialize() {
    if (this.isInitialized) return;
    if (this.isLoading) return;

    log.info('Initializing FirestoreMetadataService...');

    // Nejdříve zkus načíst z localStorage
    if (this.loadFromLocalCache()) {
      this.isInitialized = true;
      log.debug('Metadata loaded from local cache');
      return;
    }

    // Pokud není v localStorage, načti z Firestore
    try {
      await this.loadAllMetadata();
      this.isInitialized = true;
    } catch (error) {
      log.warn('Failed to initialize metadata service:', error);
    }
  }
}

// Singleton instance
export const firestoreMetadataService = new FirestoreMetadataService();
export default firestoreMetadataService;
