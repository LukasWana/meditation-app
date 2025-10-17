/**
 * Služba pro sběr dat z UI aplikace a vytvoření strukturovaného JSON
 */

import { staticMetadataService } from './staticMetadataService';
import cacheService from './cacheService';

class UIDataCollector {
  constructor() {
    this.collectedData = {
      metadata: {},
      slova: [],
      hudba: [],
      albums: [],
      lastUpdated: null
    };
  }

  /**
   * Načte všechna data z UI aplikace a vytvoří strukturovaný JSON
   */
  async collectAllUIData() {
    try {
      console.log('🔄 Collecting all UI data...');

      // 1. Načti metadata ze statické služby
      await staticMetadataService.initialize();
      const allMetadata = staticMetadataService.getAllFromCache();

      this.collectedData.metadata = allMetadata;
      console.log(`✅ Collected ${Object.keys(allMetadata).length} metadata records`);

      // 2. Načti slova data z cache
      const slovaData = this.extractSlovaData(allMetadata);
      this.collectedData.slova = slovaData;
      console.log(`✅ Collected ${slovaData.length} slova items`);

      // 3. Načti hudba data z cache
      const hudbaData = this.extractHudbaData(allMetadata);
      this.collectedData.hudba = hudbaData;
      console.log(`✅ Collected ${hudbaData.length} hudba items`);

      // 4. Vytvoř alba z hudba dat
      const albums = this.createAlbumsFromHudba(hudbaData);
      this.collectedData.albums = albums;
      console.log(`✅ Created ${albums.length} albums`);

      this.collectedData.lastUpdated = new Date();

      console.log('🎉 All UI data collected successfully');
      return this.collectedData;

    } catch (error) {
      console.error('Failed to collect UI data:', error);
      throw error;
    }
  }

  /**
   * Extrahuje slova data z metadat
   */
  extractSlovaData(metadata) {
    const slovaItems = [];

    Object.entries(metadata).forEach(([fileName, data]) => {
      // Filtruj pouze slova soubory (muzsky/zensky prefix)
      if (fileName.startsWith('muzsky') || fileName.startsWith('zensky')) {
        const parsed = this.parseSlovaFileName(fileName);
        if (parsed) {
          slovaItems.push({
            fileName,
            title: parsed.title,
            gender: parsed.gender,
            topic: parsed.topic,
            duration: this.getRealDuration(data) || data.duration || data.estimatedDuration || 'N/A',
            audioSrc: data.downloadURL || '',
            isAvailable: true,
            parsed
          });
        }
      }
    });

    return slovaItems;
  }

  /**
   * Extrahuje hudba data z metadat
   */
  extractHudbaData(metadata) {
    const hudbaItems = [];

    Object.entries(metadata).forEach(([fileName, data]) => {
      // Filtruj pouze hudba soubory (00--00--00--00- prefix)
      if (fileName.startsWith('00--00--00--00-')) {
        const parsed = this.parseHudbaFileName(fileName);
        if (parsed) {
          hudbaItems.push({
            fileName,
            title: parsed.title,
            album: parsed.album,
            trackNumber: parsed.trackNumber,
            duration: this.getRealDuration(data) || data.duration || data.estimatedDuration || 'N/A',
            audioSrc: data.downloadURL || '',
            coverImage: parsed.coverImage || '',
            isAvailable: true,
            parsed
          });
        }
      }
    });

    return hudbaItems;
  }

  /**
   * Vytvoří alba z hudba dat
   */
  createAlbumsFromHudba(hudbaItems) {
    const albumsMap = new Map();

    hudbaItems.forEach(item => {
      const albumName = item.album || 'Unknown Album';

      if (!albumsMap.has(albumName)) {
        albumsMap.set(albumName, {
          name: albumName,
          coverImage: item.coverImage || '',
          tracks: [],
          totalDuration: 'N/A'
        });
      }

      albumsMap.get(albumName).tracks.push(item);
    });

    // Vypočti celkovou délku pro každé album
    albumsMap.forEach(album => {
      const durations = album.tracks
        .map(track => track.duration)
        .filter(duration => duration && duration !== 'N/A');

      if (durations.length > 0) {
        album.totalDuration = this.calculateTotalDuration(durations);
      }
    });

    return Array.from(albumsMap.values());
  }

  /**
   * Parsuje název slova souboru
   */
  parseSlovaFileName(fileName) {
    // Formát: muzsky4FSK-uzkost-osamelost.mp3
    const match = fileName.match(/^(muzsky|zensky)(\d+)([A-Z]+)-(.+)\.mp3$/);
    if (!match) return null;

    const [, gender, number, type, topic] = match;

    return {
      gender: gender === 'muzsky' ? 'male' : 'female',
      number: parseInt(number),
      type,
      topic: topic.replace(/-/g, ' '),
      title: `${gender === 'muzsky' ? 'Mužský' : 'Ženský'} hlas - ${topic.replace(/-/g, ' ')}`
    };
  }

  /**
   * Parsuje název hudba souboru
   */
  parseHudbaFileName(fileName) {
    // Formát: 00--00--00--00- - Ambient Journey - 01 Zhooliox.mp3
    const match = fileName.match(/^00--00--00--00-\s*-\s*(.+?)\s*-\s*(\d+)\s+(.+)\.mp3$/);
    if (!match) return null;

    const [, album, trackNumber, title] = match;

    return {
      album: album.trim(),
      trackNumber: parseInt(trackNumber),
      title: title.trim(),
      coverImage: `ambient-journey/${album.replace(/\s+/g, ' ')} - cover.jpg`
    };
  }

  /**
   * Vypočítá celkovou délku z pole délek
   */
  calculateTotalDuration(durations) {
    let totalSeconds = 0;

    durations.forEach(duration => {
      if (typeof duration === 'string' && duration.includes(':')) {
        const [minutes, seconds] = duration.split(':').map(Number);
        totalSeconds += minutes * 60 + seconds;
      }
    });

    if (totalSeconds === 0) return 'N/A';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Uloží strukturovaná data do localStorage
   */
  saveStructuredData() {
    try {
      const dataToSave = {
        ...this.collectedData,
        version: '1.0.0',
        generatedAt: new Date().toISOString()
      };

      localStorage.setItem('ui_structured_data', JSON.stringify(dataToSave));
      console.log('💾 Structured data saved to localStorage');

      return dataToSave;
    } catch (error) {
      console.error('Failed to save structured data:', error);
      throw error;
    }
  }

  /**
   * Načte strukturovaná data z localStorage
   */
  loadStructuredData() {
    try {
      const savedData = localStorage.getItem('ui_structured_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        this.collectedData = parsed;
        console.log('📁 Structured data loaded from localStorage');
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Failed to load structured data:', error);
      return null;
    }
  }

  /**
   * Získá skutečnou délku z cache (z přehrávače)
   */
  getRealDuration(data) {
    if (data.downloadURL) {
      const realDuration = cacheService.getDuration(data.downloadURL);
      if (realDuration && realDuration > 0) {
        const minutes = Math.floor(realDuration / 60);
        const seconds = Math.floor(realDuration % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    return null;
  }

  /**
   * Získá aktuální strukturovaná data
   */
  getStructuredData() {
    return this.collectedData;
  }
}

// Singleton instance
export const uiDataCollector = new UIDataCollector();
export default uiDataCollector;
