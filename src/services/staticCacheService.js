

import log from './logger';

class StaticCacheService {
  constructor() {
    this.cache = null;
    this.isLoaded = false;
    this.loadPromise = null;
    this.cacheUrl = '/audio-metadata-cache.json';
  }

  async loadCache() {
    if (this.isLoaded) {
      return this.cache;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadCacheFromFile();
    return this.loadPromise;
  }

  async _loadCacheFromFile() {
    try {
      log.cache('🔄 Načítám statickou cache...');

      const response = await fetch(this.cacheUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const cacheData = await response.json();

      // Validace cache struktury
      if (!this._validateCacheStructure(cacheData)) {
        throw new Error('Neplatná struktura cache');
      }

      this.cache = cacheData;
      this.isLoaded = true;

      log.cache('✅ Statická cache úspěšně načtena');
      log.cache(`📊 Celkem skladeb: ${cacheData.totalSongs}`);
      log.cache(`🎵 Hudba: ${cacheData.categories.hudba.count}`);
      log.cache(`🗣️ Slova: ${cacheData.categories.slova.count}`);

      return this.cache;

    } catch (error) {
      log.cache('❌ Chyba při načítání statické cache:', error);
      log.cache('🔄 Fallback na dynamické načítání');

      // Fallback na prázdnou cache
      this.cache = this._createEmptyCache();
      this.isLoaded = true;

      return this.cache;
    }
  }

  _createEmptyCache() {
    return {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      totalSongs: 0,
      categories: {
        hudba: {
          count: 0,
          songs: []
        },
        slova: {
          count: 0,
          songs: []
        }
      },
      searchIndex: {
        byTitle: {},
        byCategory: {},
        byAlbum: {},
        byTag: {}
      }
    };
  }

  _validateCacheStructure(cacheData) {
    return (
      cacheData &&
      typeof cacheData === 'object' &&
      cacheData.categories &&
      cacheData.categories.hudba &&
      cacheData.categories.slova &&
      Array.isArray(cacheData.categories.hudba.songs) &&
      Array.isArray(cacheData.categories.slova.songs)
    );
  }

  getSongsByCategory(category) {
    if (!this.isLoaded) {
      log.cache('⚠️ Cache není načtena, vracím prázdný seznam');
      return [];
    }

    const categoryData = this.cache.categories[category];
    if (!categoryData) {
      log.cache(`⚠️ Kategorie ${category} neexistuje`);
      return [];
    }

    return categoryData.songs || [];
  }

  getSongById(songId) {
    if (!this.isLoaded) {
      return null;
    }

    // Hledej ve všech kategoriích
    for (const category of Object.values(this.cache.categories)) {
      const song = category.songs.find(s => s.id === songId);
      if (song) {
        return song;
      }
    }

    return null;
  }

  searchSongs(query, category = null) {
    if (!this.isLoaded) {
      return [];
    }

    const searchQuery = query.toLowerCase().trim();
    if (!searchQuery) {
      return [];
    }

    const results = [];
    const categories = category ? [category] : Object.keys(this.cache.categories);

    for (const cat of categories) {
      const songs = this.cache.categories[cat].songs || [];

      for (const song of songs) {
        if (song.title.toLowerCase().includes(searchQuery)) {
          results.push({
            ...song,
            category: cat
          });
        }
      }
    }

    return results;
  }

  getSongsByAlbum(albumName, category = null) {
    if (!this.isLoaded) {
      return [];
    }

    const results = [];
    const categories = category ? [category] : Object.keys(this.cache.categories);

    for (const cat of categories) {
      const songs = this.cache.categories[cat].songs || [];

      for (const song of songs) {
        if (song.album === albumName) {
          results.push({
            ...song,
            category: cat
          });
        }
      }
    }

    return results;
  }

  getSongsByTag(tag, category = null) {
    if (!this.isLoaded) {
      return [];
    }

    const results = [];
    const categories = category ? [category] : Object.keys(this.cache.categories);

    for (const cat of categories) {
      const songs = this.cache.categories[cat].songs || [];

      for (const song of songs) {
        if (song.tags && song.tags.includes(tag)) {
          results.push({
            ...song,
            category: cat
          });
        }
      }
    }

    return results;
  }

  getAllTags() {
    if (!this.isLoaded) {
      return [];
    }

    const tags = new Set();

    for (const category of Object.values(this.cache.categories)) {
      for (const song of category.songs || []) {
        if (song.tags) {
          song.tags.forEach(tag => tags.add(tag));
        }
      }
    }

    return Array.from(tags).sort();
  }

  getAllAlbums() {
    if (!this.isLoaded) {
      return [];
    }

    const albums = new Set();

    for (const category of Object.values(this.cache.categories)) {
      for (const song of category.songs || []) {
        if (song.album) {
          albums.add(song.album);
        }
      }
    }

    return Array.from(albums).sort();
  }

  getCacheStats() {
    if (!this.isLoaded) {
      return {
        isLoaded: false,
        totalSongs: 0,
        categories: {},
        generatedAt: null,
        version: null
      };
    }

    return {
      isLoaded: true,
      totalSongs: this.cache.totalSongs,
      categories: {
        hudba: this.cache.categories.hudba.count,
        slova: this.cache.categories.slova.count
      },
      generatedAt: this.cache.generatedAt,
      version: this.cache.version
    };
  }

  isCacheLoaded() {
    return this.isLoaded;
  }

  async reloadCache() {
    this.isLoaded = false;
    this.loadPromise = null;
    return this.loadCache();
  }
}

// Singleton instance
const staticCacheService = new StaticCacheService();

export default staticCacheService;
