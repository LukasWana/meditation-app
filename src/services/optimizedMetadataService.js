/**
 * Optimalizovaná služba pro metadata
 * Načítá metadata z rychlé databáze místo preloadování MP3 souborů
 */

import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { log } from './logger';

class OptimizedMetadataService {
  constructor() {
    this.localCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minut
    this.lastSync = null;
  }

  /**
   * Načte metadata pro konkrétní soubor
   * @param {string} fileName - Název souboru
   * @returns {Promise<Object|null>} Metadata objekt
   */
  async getMetadata(fileName) {
    try {
      // 1. Zkontroluj lokální cache
      if (this.localCache.has(fileName)) {
        const cached = this.localCache.get(fileName);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          log.debug(`⚡ Using cached metadata for ${fileName}`);
          return cached.data;
        }
      }

      // 2. Načti z Firestore
      log.debug(`📊 Loading metadata from database for ${fileName}`);
      const docRef = doc(db, 'metadata', fileName);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const metadata = docSnap.data();

        // Ulož do lokální cache
        this.localCache.set(fileName, {
          data: metadata,
          timestamp: Date.now()
        });

        // log.debug(`✅ Metadata loaded for ${fileName}:`, metadata);
        return metadata;
      } else {
        log.warn(`⚠️ No metadata found for ${fileName}`);
        return null;
      }
    } catch (error) {
      log.error(`❌ Failed to load metadata for ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Načte metadata pro všechny soubory v složce
   * @param {string} folder - Název složky ('hudba' nebo 'slova')
   * @returns {Promise<Array>} Pole metadata objektů
   */
  async getMetadataForFolder(folder) {
    try {
      log.debug(`📁 Loading metadata for folder: ${folder}`);

      const q = query(
        collection(db, 'metadata'),
        orderBy('folder'),
        orderBy('fileName')
      );

      const querySnapshot = await getDocs(q);
      const metadata = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.folder === folder) {
          metadata.push({
            fileName: doc.id,
            ...data
          });
        }
      });

      log.success(`✅ Loaded ${metadata.length} metadata entries for ${folder}`);
      return metadata;
    } catch (error) {
      log.error(`❌ Failed to load metadata for folder ${folder}:`, error);
      return [];
    }
  }

  /**
   * Načte všechna metadata (pro inicializaci)
   * @returns {Promise<Map>} Mapa fileName -> metadata
   */
  async getAllMetadata() {
    try {
      log.info('🚀 Loading all metadata from database...');

      const querySnapshot = await getDocs(collection(db, 'metadata'));
      const metadataMap = new Map();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        metadataMap.set(doc.id, data);

        // Ulož do lokální cache
        this.localCache.set(doc.id, {
          data,
          timestamp: Date.now()
        });
      });

      log.success(`✅ Loaded ${metadataMap.size} metadata entries from database`);
      return metadataMap;
    } catch (error) {
      log.error('❌ Failed to load all metadata:', error);
      return new Map();
    }
  }

  /**
   * Zkontroluje, jestli jsou metadata aktuální
   * @returns {Promise<boolean>} True pokud jsou aktuální
   */
  async checkMetadataFreshness() {
    try {
      // Zkontroluj timestamp poslední synchronizace
      const syncDoc = await getDoc(doc(db, 'system', 'lastSync'));
      if (syncDoc.exists()) {
        const lastSync = syncDoc.data().timestamp;
        this.lastSync = lastSync;

        // Pokud jsou metadata starší než 1 hodina, označ jako zastaralé
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return lastSync > oneHourAgo;
      }
      return false;
    } catch (error) {
      log.error('❌ Failed to check metadata freshness:', error);
      return false;
    }
  }

  /**
   * Vymaže lokální cache
   */
  clearCache() {
    this.localCache.clear();
    log.debug('🗑️ Local metadata cache cleared');
  }

  /**
   * Vrátí statistiky cache
   */
  getCacheStats() {
    return {
      size: this.localCache.size,
      lastSync: this.lastSync,
      cacheExpiry: this.cacheExpiry
    };
  }
}

const optimizedMetadataService = new OptimizedMetadataService();
export default optimizedMetadataService;

