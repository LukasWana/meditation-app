/**
 * realtimeMetadataService – Compatibility wrapper
 *
 * The original standalone service was consolidated into fastMetadataService
 * during Phase 2. This thin wrapper re-exposes the API that 13+ consumers
 * still import so that everything keeps working without a risky mass-rename.
 */

import { fastMetadataService } from './fastMetadataService';
import { ref, get, onValue, off } from 'firebase/database';
import { database } from '@config/secure-firebase';
import log from './logger';

class RealtimeMetadataService {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Sanitize a file path for use as a Realtime Database key.
   */
  sanitizePath(path) {
    return path
      .replace(/\./g, '_DOT_')
      .replace(/#/g, '_HASH_')
      .replace(/\$/g, '_DOLLAR_')
      .replace(/\[/g, '_LBRACKET_')
      .replace(/\]/g, '_RBRACKET_')
      .replace(/\//g, '_SLASH_')
      .replace(/\\/g, '_BACKSLASH_');
  }

  /**
   * Return all metadata.  Prefers the fast in-memory cache from
   * fastMetadataService; falls back to Realtime Database when available.
   */
  async getAllMetadata() {
    // 1. Try in-memory cache first (fast)
    if (fastMetadataService.metadata && fastMetadataService.metadata.size > 0) {
      return Object.fromEntries(fastMetadataService.metadata);
    }

    // 2. FIX: Initialize fastMetadataService if not already initialized
    // This ensures metadata is loaded from Firebase Storage into memory
    if (fastMetadataService.metadata.size === 0 && !fastMetadataService.isLoading) {
      log.debug('realtimeMetadataService: Initializing fastMetadataService...');
      await fastMetadataService.getAllMetadata();
    }

    // 3. Return metadata now that it's loaded
    if (fastMetadataService.metadata && fastMetadataService.metadata.size > 0) {
      return Object.fromEntries(fastMetadataService.metadata);
    }

    // 4. Try Realtime DB as final fallback
    try {
      if (!database) return {};
      const metaRef = ref(database, 'audio-metadata');
      const snapshot = await get(metaRef);
      if (snapshot.exists()) {
        const raw = snapshot.val();
        // Normalize: RTDB may store as object or array with nested items
        if (raw && raw.files && Array.isArray(raw.files)) {
          const result = {};
          raw.files.forEach(file => {
            if (file && file.fileName) {
              result[file.fileName] = file;
            }
          });
          return result;
        }
        return raw || {};
      }
    } catch (error) {
      log.warn('realtimeMetadataService.getAllMetadata – RTDB fallback failed:', error);
    }

    return {};
  }

  /**
   * Get metadata for a single file by its ID / path.
   */
  async getFileMetadata(fileId) {
    if (!fileId) return null;

    // Try fastMetadataService first
    const meta = fastMetadataService.getMetadata(fileId);
    if (meta) return meta;

    // Try key variations
    const variations = [
      fileId,
      `dychanie/${fileId}`,
      `hudba/${fileId}`,
      `meditacie/${fileId}`,
    ];

    for (const key of variations) {
      const m = fastMetadataService.getMetadata(key);
      if (m) return m;
    }

    // Try Realtime DB
    try {
      if (!database) return null;
      const safePath = this.sanitizePath(fileId);
      const fileRef = ref(database, `audio-metadata/${safePath}`);
      const snapshot = await get(fileRef);
      if (snapshot.exists()) {
        return snapshot.val();
      }
    } catch (_error) {
      // Silently fall through
    }

    return null;
  }

  /**
   * Get metadata for a specific folder.
   */
  async getFolderMetadata(folder) {
    const all = await this.getAllMetadata();
    return Object.values(all).filter(
      file => file.folder === folder || (file.fileName && file.fileName.startsWith(`${folder}/`))
    );
  }

  /**
   * Get aggregated metadata statistics.
   */
  async getMetadataStats() {
    const all = await this.getAllMetadata();
    const values = Object.values(all);
    return {
      totalFiles: values.length,
      meditacieFiles: values.filter(f => f.folder === 'meditacie').length,
      hudbaFiles: values.filter(f => f.folder === 'hudba').length,
      dychanieFiles: values.filter(f => f.folder === 'dychanie').length,
    };
  }

  /**
   * Watch Realtime Database for metadata changes.
   */
  watchMetadata(callback) {
    try {
      if (!database) return () => { };
      const metaRef = ref(database, 'audio-metadata');

      const listener = onValue(metaRef, (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val());
        } else {
          callback(null);
        }
      }, (error) => {
        log.error('realtimeMetadataService.watchMetadata error:', error);
      });

      const unsubscribe = () => {
        off(metaRef, 'value', listener);
      };

      this.listeners.set('audio-metadata', unsubscribe);
      return unsubscribe;
    } catch (error) {
      log.error('realtimeMetadataService.watchMetadata failed:', error);
      return () => { };
    }
  }

  /**
   * Stop all active listeners.
   */
  stopAllListeners() {
    this.listeners.forEach((unsubscribe) => {
      try { unsubscribe(); } catch (_e) { /* ignore */ }
    });
    this.listeners.clear();
  }

  /**
   * Delegate to fastMetadataService.normalizeWaveformData.
   */
  normalizeWaveformData(data) {
    return fastMetadataService.normalizeWaveformData(data);
  }
}

// Singleton
export const realtimeMetadataService = new RealtimeMetadataService();
export default realtimeMetadataService;
