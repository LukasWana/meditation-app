/**
 * LocalStorage Encryption Utility
 * Šifruje a dešifruje citlivá data v localStorage
 */

/**
 * Simple encryption/decryption using Web Crypto API
 */
class LocalStorageEncryption {
  constructor() {
    this.key = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Inicializuje encryption klíč
   */
  async initialize() {
    if (this.isInitialized) return;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._generateKey();
    this.key = await this.initializationPromise;
    this.isInitialized = true;

    return this.key;
  }

  /**
   * Generuje encryption klíč
   */
  async _generateKey() {
    try {
      // Zkus načíst existující klíč z sessionStorage
      const existingKey = sessionStorage.getItem('encryption-key');
      if (existingKey) {
        return await crypto.subtle.importKey(
          'raw',
          new Uint8Array(JSON.parse(existingKey)),
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
      }

      // Generuj nový klíč
      const key = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );

      // Exportuj klíč a ulož do sessionStorage
      const exportedKey = await crypto.subtle.exportKey('raw', key);
      sessionStorage.setItem('encryption-key', JSON.stringify(Array.from(new Uint8Array(exportedKey))));

      return key;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  /**
   * Šifruje data
   * @param {string} data - Data k šifrování
   * @returns {Promise<string>} - Šifrovaná data
   */
  async encrypt(data) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Generuj random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Šifruj data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.key,
        dataBuffer
      );

      // Kombinuj IV a šifrovaná data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Konvertuj na base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Dešifruje data
   * @param {string} encryptedData - Šifrovaná data
   * @returns {Promise<string>} - Dešifrovaná data
   */
  async decrypt(encryptedData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Konvertuj z base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      // Extrahuj IV a šifrovaná data
      const iv = combined.slice(0, 12);
      const encryptedBuffer = combined.slice(12);

      // Dešifruj data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.key,
        encryptedBuffer
      );

      // Konvertuj na string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Bezpečně uloží data do localStorage
   * @param {string} key - Klíč
   * @param {any} data - Data
   */
  async setItem(key, data) {
    try {
      const jsonData = JSON.stringify(data);
      const encryptedData = await this.encrypt(jsonData);
      localStorage.setItem(key, encryptedData);
    } catch (error) {
      console.error('Failed to save encrypted data:', error);
      // Fallback na nešifrované uložení
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  /**
   * Bezpečně načte data z localStorage
   * @param {string} key - Klíč
   * @returns {any} - Data
   */
  async getItem(key) {
    try {
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) return null;

      // Zkus dešifrovat
      const decryptedData = await this.decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Failed to load encrypted data:', error);
      // Fallback na nešifrované načtení
      try {
        const fallbackData = localStorage.getItem(key);
        return fallbackData ? JSON.parse(fallbackData) : null;
      } catch (fallbackError) {
        console.error('Fallback loading also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Odstraní data z localStorage
   * @param {string} key - Klíč
   */
  removeItem(key) {
    localStorage.removeItem(key);
  }

  /**
   * Vyčistí všechny šifrované data
   */
  clear() {
    // Najdi všechny šifrované klíče (začínají s 'encrypted_')
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('encrypted_')) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Singleton instance
const localStorageEncryption = new LocalStorageEncryption();

/**
 * Bezpečný localStorage wrapper
 */
export const secureLocalStorage = {
  /**
   * Uloží data s šifrováním
   * @param {string} key - Klíč
   * @param {any} data - Data
   */
  async setItem(key, data) {
    return localStorageEncryption.setItem(`encrypted_${key}`, data);
  },

  /**
   * Načte data s dešifrováním
   * @param {string} key - Klíč
   * @returns {any} - Data
   */
  async getItem(key) {
    return localStorageEncryption.getItem(`encrypted_${key}`);
  },

  /**
   * Odstraní data
   * @param {string} key - Klíč
   */
  removeItem(key) {
    localStorageEncryption.removeItem(`encrypted_${key}`);
  },

  /**
   * Vyčistí všechna šifrovaná data
   */
  clear() {
    localStorageEncryption.clear();
  },

  /**
   * Inicializuje encryption
   */
  async initialize() {
    return localStorageEncryption.initialize();
  }
};

/**
 * Fallback localStorage wrapper pro případy, kdy encryption není dostupná
 */
export const fallbackLocalStorage = {
  setItem(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  getItem(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  },

  removeItem(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  }
};

/**
 * Smart localStorage wrapper - automaticky volí mezi secure a fallback
 */
export const smartLocalStorage = {
  async setItem(key, data, options = {}) {
    const { forceSecure = true, sensitive = false } = options;

    // Pro citlivá data vždy použij šifrování
    if (sensitive || forceSecure) {
      try {
        await secureLocalStorage.setItem(key, data);
      } catch (error) {
        console.warn('Secure storage failed, falling back to regular storage:', error);
        fallbackLocalStorage.setItem(key, data);
      }
    } else {
      fallbackLocalStorage.setItem(key, data);
    }
  },

  async getItem(key, options = {}) {
    const { forceSecure = true, sensitive = false } = options;

    if (sensitive || forceSecure) {
      try {
        const result = await secureLocalStorage.getItem(key);
        if (result !== null) return result;
      } catch (error) {
        console.warn('Secure storage failed, trying fallback:', error);
      }
    }

    return fallbackLocalStorage.getItem(key);
  },

  removeItem(key) {
    secureLocalStorage.removeItem(key);
    fallbackLocalStorage.removeItem(key);
  },

  clear() {
    secureLocalStorage.clear();
    fallbackLocalStorage.clear();
  },

  async initialize() {
    try {
      await secureLocalStorage.initialize();
      return true;
    } catch (error) {
      console.warn('Failed to initialize secure storage:', error);
      return false;
    }
  }
};

export default smartLocalStorage;


