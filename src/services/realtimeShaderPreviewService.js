import { database } from './firebase';
import { ref, get, onValue, off, set, update, remove } from 'firebase/database';
import log from './logger';

const CACHE_TTL_MS = 120 * 1000; // 2 min

class RealtimeShaderPreviewService {
  constructor() {
    this.database = database;
    this.cache = new Map();
    this.listeners = new Map();
    this.allListener = null;
  }

  getRef(shaderKey) {
    return ref(this.database, `shader-previews/${shaderKey}`);
  }

  getAllRef() {
    return ref(this.database, 'shader-previews');
  }

  getCacheEntry(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  setCacheEntry(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  clearCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  async fetch(shaderKey, options = {}) {
    const force = options.force === true;
    if (!force) {
      const cached = this.getCacheEntry(shaderKey);
      if (cached) {
        log.cache('hit', `shader-preview:${shaderKey}`, true);
        return cached;
      }
    }

    try {
      const snapshot = await get(this.getRef(shaderKey));
      if (snapshot.exists()) {
        const value = snapshot.val();
        this.setCacheEntry(shaderKey, value);
        log.cache('get', `shader-preview:${shaderKey}`, false);
        return value;
      }
      log.cache('miss', `shader-preview:${shaderKey}`, false);
      return null;
    } catch (error) {
      log.error(`RealtimeShaderPreviewService: fetch(${shaderKey}) selhalo`, error);
      return null;
    }
  }

  async fetchAll(options = {}) {
    const force = options.force === true;
    const cacheKey = '__ALL__';

    if (!force) {
      const cached = this.getCacheEntry(cacheKey);
      if (cached) {
        log.cache('hit', 'shader-preview:all', true);
        return cached;
      }
    }

    try {
      const snapshot = await get(this.getAllRef());
      const value = snapshot.exists() ? snapshot.val() : {};
      this.setCacheEntry(cacheKey, value);
      Object.entries(value || {}).forEach(([shaderKey, shaderValue]) => {
        this.setCacheEntry(shaderKey, shaderValue);
      });
      log.cache('get', 'shader-preview:all', false);
      return value;
    } catch (error) {
      log.error('RealtimeShaderPreviewService: fetchAll selhalo', error);
      return {};
    }
  }

  subscribe(shaderKey, callback) {
    const listenerRef = this.getRef(shaderKey);
    const handler = (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : null;
      this.setCacheEntry(shaderKey, data);
      callback(data);
    };

    onValue(listenerRef, handler);
    this.listeners.set(shaderKey, { ref: listenerRef, handler });

    return () => {
      const listener = this.listeners.get(shaderKey);
      if (listener) {
        off(listener.ref, 'value', listener.handler);
        this.listeners.delete(shaderKey);
      }
    };
  }

  subscribeAll(callback) {
    if (this.allListener) {
      return this.allListener.unsubscribe;
    }

    const listenerRef = this.getAllRef();
    const handler = (snapshot) => {
      const data = snapshot.exists() ? snapshot.val() : {};
      this.setCacheEntry('__ALL__', data);
      Object.entries(data || {}).forEach(([shaderKey, value]) => {
        this.setCacheEntry(shaderKey, value);
      });
      callback(data);
    };

    onValue(listenerRef, handler);
    const unsubscribe = () => {
      off(listenerRef, 'value', handler);
      this.allListener = null;
    };

    this.allListener = { ref: listenerRef, handler, unsubscribe };
    return unsubscribe;
  }

  async upsert(shaderKey, data) {
    try {
      await set(this.getRef(shaderKey), data);
      this.setCacheEntry(shaderKey, data);
      this.clearCache('__ALL__');
      log.firebase('set', `shader-previews/${shaderKey}`);
    } catch (error) {
      log.error(`RealtimeShaderPreviewService: upsert(${shaderKey}) selhalo`, error);
      throw error;
    }
  }

  async update(shaderKey, data) {
    try {
      await update(this.getRef(shaderKey), data);
      const cached = this.getCacheEntry(shaderKey) || {};
      this.setCacheEntry(shaderKey, { ...cached, ...data });
      this.clearCache('__ALL__');
      log.firebase('update', `shader-previews/${shaderKey}`);
    } catch (error) {
      log.error(`RealtimeShaderPreviewService: update(${shaderKey}) selhalo`, error);
      throw error;
    }
  }

  async delete(shaderKey) {
    try {
      await remove(this.getRef(shaderKey));
      this.clearCache(shaderKey);
      this.clearCache('__ALL__');
      log.firebase('delete', `shader-previews/${shaderKey}`);
    } catch (error) {
      log.error(`RealtimeShaderPreviewService: delete(${shaderKey}) selhalo`, error);
      throw error;
    }
  }

  async markStatus(shaderKey, status, extra = {}) {
    await this.update(shaderKey, {
      status,
      ...extra
    });
  }

  async requestRegeneration(shaderKeys, metadata = {}) {
    const now = new Date().toISOString();
    const updates = shaderKeys.map((shaderKey) => this.update(shaderKey, {
      status: 'queued',
      requestedAt: now,
      generationSource: 'manual-trigger',
      ...metadata
    }));

    try {
      await Promise.all(updates);
      log.info(`RealtimeShaderPreviewService: regeneration queue (${shaderKeys.length})`);
    } catch (error) {
      log.error('RealtimeShaderPreviewService: requestRegeneration selhalo', error);
      throw error;
    }
  }
}

export const realtimeShaderPreviewService = new RealtimeShaderPreviewService();

