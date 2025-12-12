import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  limitToLast
} from 'firebase/database';
import { database } from '@config/secure-firebase';
import log from './logger';

class RealtimeDatabaseService {
  constructor() {
    this.database = database;
    this.listeners = new Map(); // Pro sledování změn
    this.isAvailable = true; // Realtime Database je nyní dostupná!
  }

  sanitizePath(path) {
    // Nahraď zakázané znaky
    return path
      .replace(/\./g, '_DOT_')      // . -> _DOT_
      .replace(/#/g, '_HASH_')      // # -> _HASH_
      .replace(/\$/g, '_DOLLAR_')   // $ -> _DOLLAR_
      .replace(/\[/g, '_LBRACKET_') // [ -> _LBRACKET_
      .replace(/\]/g, '_RBRACKET_') // ] -> _RBRACKET_
      .replace(/\//g, '_SLASH_')    // / -> _SLASH_
      .replace(/\\/g, '_BACKSLASH_'); // \ -> _BACKSLASH_
  }

  async setData(path, data) {
    try {
      // Sanitizuj cestu pro Realtime Database
      const safePath = this.sanitizePath(path);
      const dataRef = ref(this.database, safePath);
      await set(dataRef, {
        ...data,
        lastUpdated: new Date().toISOString()
      });

      log.debug(`✅ Data saved to Realtime Database: ${safePath}`);
    } catch (error) {
      log.error(`❌ Failed to save data to ${path}:`, error);
      throw error;
    }
  }

  async getData(path) {
    try {
      // Sanitizuj cestu pro Realtime Database
      const safePath = this.sanitizePath(path);
      const dataRef = ref(this.database, safePath);
      const snapshot = await get(dataRef);

      if (snapshot.exists()) {
        log.debug(`✅ Data loaded from Realtime Database: ${safePath}`);
        return snapshot.val();
      } else {
        log.debug(`ℹ️ No data found at path: ${safePath}`);
        return null;
      }
    } catch (error) {
      log.error(`❌ Failed to load data from ${path}:`, error);
      throw error;
    }
  }

  async pushData(path, data) {
    try {
      // Sanitizuj cestu pro Realtime Database
      const safePath = this.sanitizePath(path);
      const dataRef = ref(this.database, safePath);
      const newRef = push(dataRef, {
        ...data,
        createdAt: new Date().toISOString()
      });

      log.debug(`✅ New record pushed to ${safePath}: ${newRef.key}`);
      return newRef.key;
    } catch (error) {
      log.error(`❌ Failed to push data to ${path}:`, error);
      throw error;
    }
  }

  async updateData(path, updates) {
    try {
      // Sanitizuj cestu pro Realtime Database
      const safePath = this.sanitizePath(path);
      const dataRef = ref(this.database, safePath);
      await update(dataRef, {
        ...updates,
        lastUpdated: new Date().toISOString()
      });

      log.debug(`✅ Data updated at ${safePath}`);
    } catch (error) {
      log.error(`❌ Failed to update data at ${path}:`, error);
      throw error;
    }
  }

  async deleteData(path) {
    try {
      // Sanitizuj cestu pro Realtime Database
      const safePath = this.sanitizePath(path);
      const dataRef = ref(this.database, safePath);
      await remove(dataRef);

      log.debug(`✅ Data deleted from ${safePath}`);
    } catch (error) {
      log.error(`❌ Failed to delete data from ${path}:`, error);
      throw error;
    }
  }

  watchData(path, callback) {
    try {
      const dataRef = ref(this.database, path);

      const listener = onValue(dataRef, (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val());
        } else {
          callback(null);
        }
      }, (error) => {
        log.error(`❌ Database listener error for ${path}:`, error);
        callback(null);
      });

      // Ulož listener pro pozdější odstranění
      this.listeners.set(path, listener);

      // Vrať funkci pro zastavení sledování
      return () => this.stopWatching(path);
    } catch (error) {
      log.error(`❌ Failed to start watching ${path}:`, error);
      throw error;
    }
  }

  stopWatching(path) {
    const listener = this.listeners.get(path);
    if (listener) {
      off(ref(this.database, path), 'value', listener);
      this.listeners.delete(path);
      log.debug(`🛑 Stopped watching ${path}`);
    }
  }

  stopAllWatching() {
    this.listeners.forEach((listener, path) => {
      off(ref(this.database, path), 'value', listener);
    });
    this.listeners.clear();
    log.debug('🛑 Stopped all database listeners');
  }

  async searchData(path, childKey, value, limit = 100) {
    try {
      const dataRef = ref(this.database, path);
      const searchQuery = query(
        dataRef,
        orderByChild(childKey),
        equalTo(value),
        limitToLast(limit)
      );

      const snapshot = await get(searchQuery);
      const results = [];

      snapshot.forEach((childSnapshot) => {
        results.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      log.debug(`🔍 Search completed: ${results.length} results found`);
      return results;
    } catch (error) {
      log.error(`❌ Search failed for ${path}:`, error);
      throw error;
    }
  }

  async saveAudioMetadata(fileName, metadata) {
    const path = `audio-metadata/${fileName.replace(/\//g, '_')}`;
    await this.setData(path, {
      fileName,
      ...metadata,
      type: 'audio'
    });
  }

  async getAudioMetadata(fileName) {
    const path = `audio-metadata/${fileName.replace(/\//g, '_')}`;
    return await this.getData(path);
  }

  async saveUserSettings(userId, settings) {
    const path = `users/${userId}/settings`;
    await this.setData(path, settings);
  }

  async getUserSettings(userId) {
    const path = `users/${userId}/settings`;
    return await this.getData(path);
  }

  async saveAppStats(stats) {
    const path = 'system/stats';
    await this.setData(path, stats);
  }

  async getAppStats() {
    const path = 'system/stats';
    return await this.getData(path);
  }

  getConnectionInfo() {
    return {
      connected: this.database ? true : false,
      listeners: this.listeners.size,
      databaseUrl: this.database?.app?.options?.databaseURL || 'Not available'
    };
  }
}

// Singleton instance
const realtimeDatabaseService = new RealtimeDatabaseService();

export default realtimeDatabaseService;
