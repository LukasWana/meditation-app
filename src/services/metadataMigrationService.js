/**
 * Služba pro migraci z preloadování na databázové metadata
 * Postupně nahradí globalMetadataPreloader a fastMetadataService
 */

import optimizedMetadataService from './optimizedMetadataService';
import { log } from './logger';

class MetadataMigrationService {
  constructor() {
    this.isMigrated = false;
    this.fallbackMode = false;
  }

  /**
   * Inicializuje službu a zkontroluje dostupnost databázových metadat
   */
  async initialize() {
    try {
      log.info('🔄 Initializing metadata migration service...');

      // Zkontroluj, jestli jsou metadata v databázi aktuální
      const isFresh = await optimizedMetadataService.checkMetadataFreshness();

      if (isFresh) {
        log.success('✅ Database metadata is fresh, using optimized service');
        this.isMigrated = true;
        this.fallbackMode = false;
      } else {
        log.warn('⚠️ Database metadata is stale, falling back to preloading');
        this.isMigrated = false;
        this.fallbackMode = true;
      }

      return this.isMigrated;
    } catch (error) {
      log.error('❌ Failed to initialize metadata migration service:', error);
      this.fallbackMode = true;
      return false;
    }
  }

  /**
   * Načte metadata pro soubor (optimalizovaná verze)
   * @param {string} fileName - Název souboru
   * @returns {Promise<Object|null>} Metadata objekt
   */
  async getMetadata(fileName) {
    if (this.isMigrated) {
      // Použij optimalizovanou službu
      return await optimizedMetadataService.getMetadata(fileName);
    } else {
      // Fallback na starý systém
      log.debug(`🔄 Using fallback metadata loading for ${fileName}`);
      return await this.getFallbackMetadata(fileName);
    }
  }

  /**
   * Načte metadata pro složku (optimalizovaná verze)
   * @param {string} folder - Název složky
   * @returns {Promise<Array>} Pole metadata objektů
   */
  async getMetadataForFolder(folder) {
    if (this.isMigrated) {
      return await optimizedMetadataService.getMetadataForFolder(folder);
    } else {
      log.debug(`🔄 Using fallback metadata loading for folder ${folder}`);
      return await this.getFallbackMetadataForFolder(folder);
    }
  }

  /**
   * Fallback metoda pro načítání metadat (starý systém)
   * @private
   */
  async getFallbackMetadata(fileName) {
    // Zde by se použil starý globalMetadataPreloader
    // Prozatím vracíme null
    log.warn(`⚠️ Fallback metadata loading not implemented for ${fileName}`);
    return null;
  }

  /**
   * Fallback metoda pro načítání metadat složky (starý systém)
   * @private
   */
  async getFallbackMetadataForFolder(folder) {
    // Zde by se použil starý fastMetadataService
    // Prozatím vracíme prázdné pole
    log.warn(`⚠️ Fallback metadata loading not implemented for folder ${folder}`);
    return [];
  }

  /**
   * Vynutí migraci na optimalizovanou službu
   */
  async forceMigration() {
    try {
      log.info('🔄 Forcing migration to optimized metadata service...');

      // Vymaž cache
      optimizedMetadataService.clearCache();

      // Znovu zkontroluj dostupnost
      const isFresh = await optimizedMetadataService.checkMetadataFreshness();

      if (isFresh) {
        this.isMigrated = true;
        this.fallbackMode = false;
        log.success('✅ Migration to optimized service successful');
        return true;
      } else {
        log.warn('⚠️ Migration failed, database metadata not available');
        return false;
      }
    } catch (error) {
      log.error('❌ Migration failed:', error);
      return false;
    }
  }

  /**
   * Vrátí stav migrace
   */
  getMigrationStatus() {
    return {
      isMigrated: this.isMigrated,
      fallbackMode: this.fallbackMode,
      cacheStats: optimizedMetadataService.getCacheStats()
    };
  }
}

const metadataMigrationService = new MetadataMigrationService();
export default metadataMigrationService;

