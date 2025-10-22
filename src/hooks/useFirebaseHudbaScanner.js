import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '@services/firebase';
import { parseAudioFileName } from '@utils/hudbaParser';
import cacheService from '@services/cacheServiceRefactored';
import log from '@services/logger';
import { performanceMonitor } from '@services/performanceMonitor';
import { getComponentConfig } from '@config/performance';
import { fastMetadataService } from '@services/fastMetadataService';

// Pomocná funkce pro načtení délky audio souboru
const getAudioDuration = (audioSrc) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      if (isFinite(duration) && duration > 0) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Ulož duration do cache
        cacheService.setDuration(audioSrc, duration);

        resolve(durationString);
      } else {
        resolve(null);
      }
    });
    audio.addEventListener('error', () => {
      resolve(null);
    });
    audio.src = audioSrc;
  });
};

// Pomocná funkce pro načtení cover obrázku
const getCoverImage = async (folderPath) => {
  try {
    const coverRef = ref(storage, `${folderPath}/cover.jpg`);
    const coverUrl = await getDownloadURL(coverRef);
    return coverUrl;
  } catch (error) {
    // Zkus alternativní názvy
    const alternatives = ['cover.png', 'album.jpg', 'album.png', 'artwork.jpg'];
    for (const altName of alternatives) {
      try {
        const altRef = ref(storage, `${folderPath}/${altName}`);
        const altUrl = await getDownloadURL(altRef);
        return altUrl;
      } catch (altError) {
        continue;
      }
    }
    return null;
  }
};

export const useFirebaseHudbaScanner = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [coverImages, setCoverImages] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCovers, setIsLoadingCovers] = useState(false);
  const [isLoadingDurations, setIsLoadingDurations] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Získej konfiguraci pro tento hook
  const config = getComponentConfig('useFirebaseHudbaScanner');

  // Funkce pro zpracování fast metadat - nejrychlejší načítání
  const processFastMetadata = async (fastMetadata) => {
    log.cache('⚡ Processing fast metadata:', {
      metadataCount: Object.keys(fastMetadata).length,
      files: Object.keys(fastMetadata).slice(0, 5)
    });

    // Filtruj pouze hudba soubory (včetně album souborů)
    const hudbaFiles = Object.values(fastMetadata).filter(metadata =>
      metadata.isHudba && (metadata.type === 'audio' || metadata.type === 'album_track')
    );

    log.firebase(`📊 Found ${hudbaFiles.length} hudba files in fast metadata`);

    // Zpracuj soubory
    const processedFiles = hudbaFiles.map(metadata => {
      const parsed = parseAudioFileName(metadata.fileName);
      return {
        fileName: metadata.fileName,
        downloadURL: metadata.downloadURL,
        fullPath: metadata.fullPath,
        size: metadata.size,
        sizeFormatted: metadata.sizeFormatted,
        duration: metadata.duration,
        durationFormatted: metadata.durationFormatted,
        albumName: parsed?.albumName || 'Unknown Album',
        trackNumber: parsed?.number || 0,
        trackName: parsed?.trackName || 'Unknown Track',
        type: metadata.type,
        isAlbum: metadata.isAlbum,
        folder: 'hudba'
      };
    });

    // Seskupení podle alb
    const albums = {};
    processedFiles.forEach(file => {
      const albumName = file.albumName;
      if (!albums[albumName]) {
        albums[albumName] = {
          name: albumName,
          tracks: [],
          coverImage: null,
          totalDuration: 0
        };
      }
      albums[albumName].tracks.push(file);
      albums[albumName].totalDuration += file.duration || 0;
    });

    // Seřaď tracky v každém albu podle čísla
    Object.values(albums).forEach(album => {
      album.tracks.sort((a, b) => a.trackNumber - b.trackNumber);
    });

    return { processedFiles, albums };
  };

  // Hlavní funkce pro načtení hudebních souborů
  const loadHudbaFiles = async () => {
    const startTime = performance.now();
    setIsLoading(true);
    setError(null);

    try {
      // Zkus nejdřív fast metadata (nejrychlejší)
      if (fastMetadataService.isInitialized) {
        log.cache('⚡ Using fast metadata service for hudba files');
        const fastMetadata = fastMetadataService.getAllMetadata();
        
        if (fastMetadata && Object.keys(fastMetadata).length > 0) {
          const { processedFiles, albums } = await processFastMetadata(fastMetadata);
          
          setAudioFiles(processedFiles);
          setLastUpdated(new Date());
          
          const endTime = performance.now();
          performanceMonitor.recordMetric('hudba_scanner_fast', endTime - startTime);
          
          log.firebase(`✅ Loaded ${processedFiles.length} hudba files from fast metadata in ${Math.round(endTime - startTime)}ms`);
          return;
        }
      }

      // Fallback na standardní načítání
      log.firebase('📁 Loading hudba files from Firebase Storage...');
      
      const hudbaRef = ref(storage, 'hudba');
      const result = await listAll(hudbaRef);
      
      const files = [];
      const albums = {};

      // Zpracuj soubory po částech pro lepší performance
      const chunkSize = config.chunkSize || 10;
      for (let i = 0; i < result.items.length; i += chunkSize) {
        const chunk = result.items.slice(i, i + chunkSize);
        
        const chunkPromises = chunk.map(async (item) => {
          try {
            const downloadURL = await getDownloadURL(item);
            const metadata = await getMetadata(item);
            
            const parsed = parseAudioFileName(item.name);
            if (!parsed) return null;

            const fileData = {
              fileName: item.name,
              downloadURL,
              fullPath: item.fullPath,
              size: metadata.size,
              sizeFormatted: formatFileSize(metadata.size),
              duration: null, // Bude načteno později
              durationFormatted: null,
              albumName: parsed.albumName || 'Unknown Album',
              trackNumber: parsed.number || 0,
              trackName: parsed.trackName || 'Unknown Track',
              type: 'audio',
              isAlbum: false,
              folder: 'hudba'
            };

            // Seskupení podle alb
            const albumName = fileData.albumName;
            if (!albums[albumName]) {
              albums[albumName] = {
                name: albumName,
                tracks: [],
                coverImage: null,
                totalDuration: 0
              };
            }
            albums[albumName].tracks.push(fileData);

            return fileData;
          } catch (error) {
            log.error(`Error loading file ${item.name}:`, error);
            return null;
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        files.push(...chunkResults.filter(Boolean));

        // Yield control pro lepší UX
        if (i % (chunkSize * 3) === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Seřaď tracky v každém albu podle čísla
      Object.values(albums).forEach(album => {
        album.tracks.sort((a, b) => a.trackNumber - b.trackNumber);
      });

      setAudioFiles(files);
      setLastUpdated(new Date());

      const endTime = performance.now();
      performanceMonitor.recordMetric('hudba_scanner_standard', endTime - startTime);
      
      log.firebase(`✅ Loaded ${files.length} hudba files in ${Math.round(endTime - startTime)}ms`);

    } catch (error) {
      log.error('Error loading hudba files:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Načtení cover obrázků
  const loadCoverImages = async () => {
    if (isLoadingCovers) return;
    
    setIsLoadingCovers(true);
    
    try {
      const albums = {};
      audioFiles.forEach(file => {
        const albumName = file.albumName;
        if (!albums[albumName]) {
          albums[albumName] = file.fullPath.split('/').slice(0, -1).join('/');
        }
      });

      const coverPromises = Object.entries(albums).map(async ([albumName, folderPath]) => {
        try {
          const coverUrl = await getCoverImage(folderPath);
          if (coverUrl) {
            setCoverImages(prev => new Map(prev.set(albumName, coverUrl)));
          }
        } catch (error) {
          log.warn(`Failed to load cover for ${albumName}:`, error);
        }
      });

      await Promise.all(coverPromises);
      
    } catch (error) {
      log.error('Error loading cover images:', error);
    } finally {
      setIsLoadingCovers(false);
    }
  };

  // Načtení délek audio souborů
  const loadDurations = async () => {
    if (isLoadingDurations) return;
    
    setIsLoadingDurations(true);
    
    try {
      const filesWithoutDuration = audioFiles.filter(file => !file.duration);
      
      const durationPromises = filesWithoutDuration.map(async (file) => {
        try {
          const duration = await getAudioDuration(file.downloadURL);
          if (duration) {
            setAudioFiles(prev => prev.map(f => 
              f.fileName === file.fileName 
                ? { ...f, durationFormatted: duration, duration: parseDuration(duration) }
                : f
            ));
          }
        } catch (error) {
          log.warn(`Failed to load duration for ${file.fileName}:`, error);
        }
      });

      await Promise.all(durationPromises);
      
    } catch (error) {
      log.error('Error loading durations:', error);
    } finally {
      setIsLoadingDurations(false);
    }
  };

  // Pomocné funkce
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const parseDuration = (durationString) => {
    const parts = durationString.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  // Hlavní useEffect
  useEffect(() => {
    loadHudbaFiles();
  }, []);

  // Načti cover obrázky po načtení souborů
  useEffect(() => {
    if (audioFiles.length > 0 && !isLoading) {
      loadCoverImages();
    }
  }, [audioFiles, isLoading]);

  // Načti délky po načtení souborů
  useEffect(() => {
    if (audioFiles.length > 0 && !isLoading) {
      loadDurations();
    }
  }, [audioFiles, isLoading]);

  // Pomocné funkce pro filtrování
  const getFilesForTopic = (topic) => {
    return audioFiles.filter(file => 
      file.albumName.toLowerCase().includes(topic.toLowerCase())
    );
  };

  const getFileByName = (fileName) => {
    return audioFiles.find(file => file.fileName === fileName);
  };

  const getAlbums = () => {
    const albums = {};
    audioFiles.forEach(file => {
      const albumName = file.albumName;
      if (!albums[albumName]) {
        albums[albumName] = {
          name: albumName,
          tracks: [],
          coverImage: coverImages.get(albumName),
          totalDuration: 0
        };
      }
      albums[albumName].tracks.push(file);
      albums[albumName].totalDuration += file.duration || 0;
    });
    return albums;
  };

  return {
    audioFiles,
    coverImages,
    isLoading,
    isLoadingCovers,
    isLoadingDurations,
    error,
    lastUpdated,
    loadHudbaFiles,
    loadCoverImages,
    loadDurations,
    getFilesForTopic,
    getFileByName,
    getAlbums
  };
};
