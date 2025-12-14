

import { ref, listAll, getMetadata, getDownloadURL } from 'firebase/storage';
import { storage } from '@config/secure-firebase';
import { parseAudioFileName } from '@utils/audioParser';
import { parseAudioFileName as parseHudbaFileName } from '@utils/hudbaParser';
import cacheService from './cacheServiceRefactored';

class FirebaseMetadataCollector {
  constructor() {
    this.collectedMetadata = {
      slova: new Map(),
      hudba: new Map(),
      albums: new Map(),
      lastUpdated: null
    };
  }

  async collectAllFirebaseMetadata() {
    try {
      console.log('🔄 Collecting metadata from Firebase Storage...');

      // 1. Načti všechny soubory z Firebase Storage
      const allFiles = await this.scanFirebaseStorage();
      console.log(`📁 Found ${allFiles.length} files in Firebase Storage`);

      // 2. Filtruj pouze MP3 soubory
      const mp3Files = allFiles.filter(file =>
        file.name.toLowerCase().endsWith('.mp3')
      );
      console.log(`🎵 Found ${mp3Files.length} MP3 files`);

      // 3. Načti metadata pro každý MP3 soubor
      const metadataPromises = mp3Files.map(file =>
        this.collectFileMetadata(file)
      );

      const metadataResults = await Promise.allSettled(metadataPromises);

      // 4. Roztřiď metadata podle typu
      this.categorizeMetadata(metadataResults);

      // 5. Vytvoř alba z hudba dat
      this.createAlbumsFromHudba();

      this.collectedMetadata.lastUpdated = new Date();

      console.log('🎉 Firebase metadata collection completed');
      console.log(`📊 Collected: ${this.collectedMetadata.slova.size} slova, ${this.collectedMetadata.hudba.size} hudba, ${this.collectedMetadata.albums.size} albums`);

      return this.collectedMetadata;

    } catch (error) {
      console.error('Failed to collect Firebase metadata:', error);
      throw error;
    }
  }

  async scanFirebaseStorage() {
    try {
      const listRef = ref(storage, '');
      const result = await listAll(listRef);

      // Získej všechny soubory včetně podsložek
      const allFiles = [...result.items];

      // Prohledej podsložky
      for (const folderRef of result.prefixes) {
        try {
          const folderResult = await listAll(folderRef);
          // Přidej soubory z podsložky s prefixem složky
          folderResult.items.forEach(item => {
            allFiles.push({
              ...item,
              name: `${folderRef.name}/${item.name}` // Přidej cestu složky k názvu
            });
          });
        } catch (err) {
          console.warn(`Nelze prohledat složku ${folderRef.name}:`, err.message);
        }
      }

      return allFiles;
    } catch (error) {
      console.error('Failed to scan Firebase Storage:', error);
      throw error;
    }
  }

  async collectFileMetadata(file) {
    try {
      // Vytvoř správnou Firebase Storage reference
      const fileRef = ref(storage, file.name);

      // 1. Načti Firebase metadata
      const firebaseMetadata = await getMetadata(fileRef);

      // 2. Načti download URL
      const downloadURL = await getDownloadURL(fileRef);

      // 3. Vytvoř základní metadata objekt
      const metadata = {
        fileName: file.name,
        size: firebaseMetadata.size,
        contentType: firebaseMetadata.contentType,
        timeCreated: firebaseMetadata.timeCreated,
        updated: firebaseMetadata.updated,
        downloadURL,
        // Odhad délky na základě velikosti souboru (přibližně 128kbps)
        duration: this.estimateDuration(firebaseMetadata.size),
        estimatedDuration: this.estimateDuration(firebaseMetadata.size)
      };

      // 4. Pokud je název součástí metadat, použij ho
      if (firebaseMetadata.customMetadata && firebaseMetadata.customMetadata.title) {
        metadata.title = firebaseMetadata.customMetadata.title;
        metadata.album = firebaseMetadata.customMetadata.album;
        metadata.artist = firebaseMetadata.customMetadata.artist;
        metadata.duration = firebaseMetadata.customMetadata.duration;
        metadata.type = firebaseMetadata.customMetadata.type; // 'slova' nebo 'hudba'
      }

      // 5. Pokud není název v metadatech, parsuj název souboru
      if (!metadata.type) {
        const parsed = this.parseFileName(file.name);
        if (parsed) {
          metadata.type = parsed.type;
          metadata.title = parsed.title;
          metadata.album = parsed.album;
          metadata.artist = parsed.artist;
          metadata.gender = parsed.gender;
          metadata.topic = parsed.topic;
          metadata.trackNumber = parsed.trackNumber;
        }
      }

      return {
        success: true,
        metadata
      };

    } catch (error) {
      console.warn(`Failed to collect metadata for ${file.name}:`, error.message);
      return {
        success: false,
        fileName: file.name,
        error: error.message
      };
    }
  }

  parseFileName(fileName) {
    // Zkus slova parser (muzsky/zensky prefix)
    if (fileName.startsWith('muzsky') || fileName.startsWith('zensky')) {
      try {
        const parsed = parseAudioFileName(fileName);
        if (parsed) {
          return {
            type: 'slova',
            title: parsed.title,
            gender: parsed.gender,
            topic: parsed.topic,
            artist: parsed.gender === 'male' ? 'Mužský hlas' : 'Ženský hlas'
          };
        }
      } catch (err) {
        console.warn(`Failed to parse slova file ${fileName}:`, err.message);
      }
    }

    // Zkus hudba parser (00--00--00--00- prefix)
    if (fileName.startsWith('00--00--00--00-')) {
      try {
        const parsed = parseHudbaFileName(fileName);
        if (parsed) {
          return {
            type: 'hudba',
            title: parsed.title,
            album: parsed.album,
            trackNumber: parsed.trackNumber,
            artist: 'Ambient Artist'
          };
        }
      } catch (err) {
        console.warn(`Failed to parse hudba file ${fileName}:`, err.message);
      }
    }

    return null;
  }

  categorizeMetadata(metadataResults) {
    metadataResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        const metadata = result.value.metadata;

        if (metadata.type === 'slova') {
          this.collectedMetadata.slova.set(metadata.fileName, metadata);
        } else if (metadata.type === 'hudba') {
          this.collectedMetadata.hudba.set(metadata.fileName, metadata);
        }
      }
    });
  }

  createAlbumsFromHudba() {
    const albumsMap = new Map();

    this.collectedMetadata.hudba.forEach((metadata, _fileName) => {
      const albumName = metadata.album || 'Unknown Album';

      if (!albumsMap.has(albumName)) {
        albumsMap.set(albumName, {
          name: albumName,
          coverImage: this.getCoverImagePath(albumName),
          tracks: [],
          totalDuration: 'N/A'
        });
      }

      albumsMap.get(albumName).tracks.push(metadata);
    });

    // Seřaď tracky podle trackNumber
    albumsMap.forEach(album => {
      album.tracks.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

      // Vypočti celkovou délku
      const durations = album.tracks
        .map(track => track.duration || track.estimatedDuration)
        .filter(duration => duration && duration !== 'N/A');

      if (durations.length > 0) {
        album.totalDuration = this.calculateTotalDuration(durations);
      }
    });

    this.collectedMetadata.albums = albumsMap;
  }

  getCoverImagePath(albumName) {
    // Předpokládáme, že cover obrázky jsou ve složce s názvem alba
    const folderName = albumName.toLowerCase().replace(/\s+/g, '-');
    return `${folderName}/${albumName} - cover.jpg`;
  }

  estimateDuration(fileSizeBytes) {
    // Předpokládáme 128kbps bitrate pro MP3
    const bitrateKbps = 128;
    const bitrateBps = bitrateKbps * 1000 / 8; // Převod na bajty za sekundu
    const durationSeconds = fileSizeBytes / bitrateBps;

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

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

  saveToCache() {
    try {
      // Ulož slova metadata
      this.collectedMetadata.slova.forEach((metadata, fileName) => {
        cacheService.setMetadata(fileName, metadata);
      });

      // Ulož hudba metadata
      this.collectedMetadata.hudba.forEach((metadata, fileName) => {
        cacheService.setMetadata(fileName, metadata);
      });

      // Ulož alba metadata
      this.collectedMetadata.albums.forEach((album, albumName) => {
        cacheService.set(`album_${albumName}`, album);
      });

      console.log('💾 Firebase metadata saved to cache');
    } catch (error) {
      console.error('Failed to save metadata to cache:', error);
      throw error;
    }
  }

  saveToLocalStorage() {
    try {
      const dataToSave = {
        slova: Object.fromEntries(this.collectedMetadata.slova),
        hudba: Object.fromEntries(this.collectedMetadata.hudba),
        albums: Object.fromEntries(this.collectedMetadata.albums),
        lastUpdated: this.collectedMetadata.lastUpdated,
        source: 'firebase',
        version: '1.0.0'
      };

      localStorage.setItem('firebase_metadata', JSON.stringify(dataToSave));
      console.log('💾 Firebase metadata saved to localStorage');

      return dataToSave;
    } catch (error) {
      console.error('Failed to save metadata to localStorage:', error);
      throw error;
    }
  }

  loadFromLocalStorage() {
    try {
      const savedData = localStorage.getItem('firebase_metadata');
      if (savedData) {
        const parsed = JSON.parse(savedData);

        this.collectedMetadata.slova = new Map(Object.entries(parsed.slova || {}));
        this.collectedMetadata.hudba = new Map(Object.entries(parsed.hudba || {}));
        this.collectedMetadata.albums = new Map(Object.entries(parsed.albums || {}));
        this.collectedMetadata.lastUpdated = parsed.lastUpdated;

        console.log('📁 Firebase metadata loaded from localStorage');
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Failed to load metadata from localStorage:', error);
      return null;
    }
  }

  getMetadata() {
    return this.collectedMetadata;
  }
}

// Singleton instance
export const firebaseMetadataCollector = new FirebaseMetadataCollector();
export default firebaseMetadataCollector;
