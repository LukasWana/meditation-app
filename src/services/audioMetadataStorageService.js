import { ref, set, get, push, update, remove } from 'firebase/database';
import { realtimeDatabase } from '../config/secure-firebase';
import log from './logger';

/**
 * Audio Metadata Storage Service
 * Ukládá metadata audio souborů do Firebase Realtime Database
 */
class AudioMetadataStorageService {
  constructor() {
    this.db = realtimeDatabase;
    this.metadataRef = ref(this.db, 'audio_metadata');
    this.statsRef = ref(this.db, 'audio_stats');
  }

  /**
   * Uloží metadata jednoho audio souboru
   * @param {Object} fileData - Data souboru
   * @param {string} fileData.name - Název souboru
   * @param {string} fileData.fullPath - Cesta k souboru
   * @param {number} fileData.size - Velikost souboru
   * @param {string} fileData.contentType - MIME typ
   * @param {number} fileData.duration - Délka v sekundách
   * @param {string} fileData.durationFormatted - Formátovaná délka
   * @param {string} fileData.durationDetailed - Detailní délka
   * @param {string} fileData.folder - Složka
   * @param {string} fileData.category - Kategorie (slova/hudba)
   * @param {string} fileData.language - Jazyk (pro slova)
   * @param {string} fileData.downloadURL - Download URL
   */
  async saveFileMetadata(fileData) {
    try {
      const fileKey = this.generateFileKey(fileData.fullPath);
      const fileRef = ref(this.db, `audio_metadata/${fileKey}`);

      const metadata = {
        name: fileData.name,
        fullPath: fileData.fullPath,
        size: fileData.size || 0,
        contentType: fileData.contentType,
        duration: fileData.duration || 0,
        durationFormatted: fileData.durationFormatted || 'N/A',
        durationDetailed: fileData.durationDetailed || 'N/A',
        folder: fileData.folder,
        category: fileData.category,
        language: fileData.language || null,
        downloadURL: fileData.downloadURL,
        lastUpdated: new Date().toISOString(),
        timestamp: Date.now()
      };

      await set(fileRef, metadata);
      log.success(`✅ Saved metadata for ${fileData.name}`);

      return { success: true, fileKey };
    } catch (error) {
      log.error(`❌ Failed to save metadata for ${fileData.name}:`, error);
      throw error;
    }
  }

  /**
   * Uloží metadata více souborů najednou
   * @param {Array} filesData - Pole dat souborů
   */
  async saveBatchMetadata(filesData) {
    try {
      log.info(`🔄 Saving metadata for ${filesData.length} files to Realtime Database...`);

      const results = [];
      const batch = {};
      const stats = {
        slova: { files: 0, totalDuration: 0, totalSize: 0 },
        hudba: { files: 0, totalDuration: 0, totalSize: 0 },
        total: { files: 0, totalDuration: 0, totalSize: 0 }
      };

      for (const fileData of filesData) {
        try {
          const fileKey = this.generateFileKey(fileData.fullPath);
          const metadata = {
            name: fileData.name,
            fullPath: fileData.fullPath,
            size: fileData.size || 0,
            contentType: fileData.contentType,
            duration: fileData.duration || 0,
            durationFormatted: fileData.durationFormatted || 'N/A',
            durationDetailed: fileData.durationDetailed || 'N/A',
            folder: fileData.folder,
            category: fileData.category,
            language: fileData.language || null,
            downloadURL: fileData.downloadURL,
            lastUpdated: new Date().toISOString(),
            timestamp: Date.now()
          };

          batch[fileKey] = metadata;

          // Aktualizuj statistiky
          const category = fileData.category || 'unknown';
          if (stats[category]) {
            stats[category].files++;
            stats[category].totalDuration += fileData.duration || 0;
            stats[category].totalSize += fileData.size || 0;
          }

          stats.total.files++;
          stats.total.totalDuration += fileData.duration || 0;
          stats.total.totalSize += fileData.size || 0;

          results.push({ success: true, fileKey, fileName: fileData.name });
        } catch (error) {
          log.warn(`⚠️ Failed to prepare metadata for ${fileData.name}:`, error.message);
          results.push({ success: false, fileName: fileData.name, error: error.message });
        }
      }

      // Ulož všechna metadata najednou
      if (Object.keys(batch).length > 0) {
        await set(this.metadataRef, batch);
      }

      // Ulož statistiky
      await set(this.statsRef, {
        ...stats,
        lastUpdated: new Date().toISOString(),
        timestamp: Date.now()
      });

      const successCount = results.filter(r => r.success).length;
      log.success(`✅ Saved metadata for ${successCount}/${filesData.length} files to Realtime Database`);

      return {
        success: true,
        results,
        stats,
        savedCount: successCount,
        totalCount: filesData.length
      };
    } catch (error) {
      log.error('❌ Failed to save batch metadata:', error);
      throw error;
    }
  }

  /**
   * Načte metadata ze všech souborů z Realtime Database
   */
  async loadAllMetadata() {
    try {
      log.info('🔄 Loading audio metadata from Realtime Database...');

      const snapshot = await get(this.metadataRef);

      if (snapshot.exists()) {
        const metadata = snapshot.val();
        const files = Object.values(metadata);

        log.success(`✅ Loaded ${files.length} files metadata from Realtime Database`);
        return { success: true, files, metadata };
      } else {
        log.info('📭 No metadata found in Realtime Database');
        return { success: true, files: [], metadata: {} };
      }
    } catch (error) {
      log.error('❌ Failed to load metadata from Realtime Database:', error);
      throw error;
    }
  }

  /**
   * Načte statistiky z Realtime Database
   */
  async loadStats() {
    try {
      const snapshot = await get(this.statsRef);

      if (snapshot.exists()) {
        const stats = snapshot.val();
        log.success('✅ Loaded audio stats from Realtime Database');
        return { success: true, stats };
      } else {
        log.info('📭 No stats found in Realtime Database');
        return { success: true, stats: null };
      }
    } catch (error) {
      log.error('❌ Failed to load stats from Realtime Database:', error);
      throw error;
    }
  }

  /**
   * Smaže metadata konkrétního souboru
   * @param {string} filePath - Cesta k souboru
   */
  async deleteFileMetadata(filePath) {
    try {
      const fileKey = this.generateFileKey(filePath);
      const fileRef = ref(this.db, `audio_metadata/${fileKey}`);

      await remove(fileRef);
      log.success(`✅ Deleted metadata for ${filePath}`);

      return { success: true };
    } catch (error) {
      log.error(`❌ Failed to delete metadata for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Smaže všechna metadata
   */
  async clearAllMetadata() {
    try {
      await set(this.metadataRef, null);
      await set(this.statsRef, null);

      log.success('✅ Cleared all audio metadata from Realtime Database');
      return { success: true };
    } catch (error) {
      log.error('❌ Failed to clear metadata:', error);
      throw error;
    }
  }

  /**
   * Vygeneruje klíč pro soubor na základě cesty
   * @param {string} filePath - Cesta k souboru
   * @returns {string} - Bezpečný klíč
   */
  generateFileKey(filePath) {
    // Nahraď problematické znaky pro Firebase klíče
    return filePath
      .replace(/[.#$[\]]/g, '_')
      .replace(/\//g, '_')
      .replace(/\./g, '_');
  }

  /**
   * Aktualizuje pouze délku souboru
   * @param {string} filePath - Cesta k souboru
   * @param {number} duration - Nová délka
   */
  async updateFileDuration(filePath, duration) {
    try {
      const fileKey = this.generateFileKey(filePath);
      const fileRef = ref(this.db, `audio_metadata/${fileKey}`);

      const updates = {
        duration: duration,
        durationFormatted: this.formatDuration(duration),
        durationDetailed: this.formatDurationDetailed(duration),
        lastUpdated: new Date().toISOString()
      };

      await update(fileRef, updates);
      log.success(`✅ Updated duration for ${filePath}: ${duration}s`);

      return { success: true };
    } catch (error) {
      log.error(`❌ Failed to update duration for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Formátuje délku v sekundách
   * @param {number} seconds - Délka v sekundách
   * @returns {string} - Formátovaná délka
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return 'N/A';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Formátuje délku detailně
   * @param {number} seconds - Délka v sekundách
   * @returns {string} - Detailní formát
   */
  formatDurationDetailed(seconds) {
    if (!seconds || seconds === 0) return 'N/A';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let result = '';
    if (hours > 0) {
      result += `${hours}h `;
    }
    if (minutes > 0) {
      result += `${minutes}m `;
    }
    result += `${remainingSeconds}s`;

    return result.trim();
  }
}

// Exportuj singleton instanci
const audioMetadataStorageService = new AudioMetadataStorageService();
export default audioMetadataStorageService;
