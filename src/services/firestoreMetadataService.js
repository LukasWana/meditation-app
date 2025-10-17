import { collection, doc, getDoc, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

class FirestoreMetadataService {
  constructor() {
    this.collectionName = 'audio-metadata';
    this.cache = new Map();
    this.localStorageKey = 'audio-metadata-cache';
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hodin
  }

  /**
   * Načte metadata ze localStorage (offline cache)
   */
  loadFromLocalCache() {
    try {
      const cached = localStorage.getItem(this.localStorageKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Zkontroluj, jestli cache není starší než 24 hodin
        if (now - timestamp < this.cacheExpiry) {
          console.log('Loading metadata from local cache');
          this.cache = new Map(Object.entries(data));
          return true;
        } else {
          console.log('Local cache expired, clearing');
          localStorage.removeItem(this.localStorageKey);
        }
      }
    } catch (error) {
      console.warn('Failed to load from local cache:', error);
    }
    return false;
  }

  /**
   * Uloží metadata do localStorage (offline cache)
   */
  saveToLocalCache() {
    try {
      const data = Object.fromEntries(this.cache);
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(cacheData));
      console.log('Metadata saved to local cache');
    } catch (error) {
      console.warn('Failed to save to local cache:', error);
    }
  }

  /**
   * Načte všechna metadata z Firestore
   */
  async loadAllMetadata() {
    try {
      console.log('Loading metadata from Firestore...');

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

      console.log(`Loaded ${Object.keys(metadata).length} metadata records from Firestore`);

      // Ulož do localStorage pro offline použití
      this.saveToLocalCache();

      return metadata;
    } catch (error) {
      console.error('Failed to load metadata from Firestore:', error);

      // Fallback na local cache
      if (this.loadFromLocalCache()) {
        return Object.fromEntries(this.cache);
      }

      throw error;
    }
  }

  /**
   * Načte metadata pro konkrétní soubor
   */
  async getMetadata(fileName) {
    // Nejdříve zkontroluj memory cache
    if (this.cache.has(fileName)) {
      return this.cache.get(fileName);
    }

    // Zkontroluj localStorage cache
    if (this.loadFromLocalCache() && this.cache.has(fileName)) {
      return this.cache.get(fileName);
    }

    try {
      // Načti z Firestore
      const docRef = doc(db, this.collectionName, fileName);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const metadata = docSnap.data();
        this.cache.set(fileName, metadata);
        return metadata;
      } else {
        console.warn(`No metadata found for ${fileName}`);
        return null;
      }
    } catch (error) {
      console.error(`Failed to get metadata for ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Uloží metadata do Firestore
   */
  async saveMetadata(fileName, metadata) {
    try {
      const docRef = doc(db, this.collectionName, fileName);
      const metadataDoc = {
        fileName,
        ...metadata,
        updated: new Date().toISOString()
      };

      await setDoc(docRef, metadataDoc);

      // Aktualizuj cache
      this.cache.set(fileName, metadataDoc);

      console.log(`Metadata saved for ${fileName}`);
      return metadataDoc;
    } catch (error) {
      console.error(`Failed to save metadata for ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Batch uložení metadat
   */
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

  /**
   * Vyčistí cache
   */
  clearCache() {
    this.cache.clear();
    localStorage.removeItem(this.localStorageKey);
    console.log('Metadata cache cleared');
  }

  /**
   * Získá všechny metadata z cache (bez síťového requestu)
   */
  getAllFromCache() {
    return Object.fromEntries(this.cache);
  }

  /**
   * Zkontroluje, jestli máme metadata v cache
   */
  hasInCache(fileName) {
    return this.cache.has(fileName);
  }

  /**
   * Inicializace - načte cache při startu
   */
  async initialize() {
    console.log('Initializing FirestoreMetadataService...');

    // Nejdříve zkus načíst z localStorage
    if (this.loadFromLocalCache()) {
      console.log('Metadata loaded from local cache');
      return;
    }

    // Pokud není v localStorage, načti z Firestore
    try {
      await this.loadAllMetadata();
    } catch (error) {
      console.warn('Failed to initialize metadata service:', error);
    }
  }
}

// Singleton instance
export const firestoreMetadataService = new FirestoreMetadataService();
export default firestoreMetadataService;
