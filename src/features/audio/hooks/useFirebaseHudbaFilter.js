import { useMemo } from 'react';
import { useFirebaseHudbaScanner } from '@hooks/useFirebaseHudbaScanner';
import fastMetadataService from '@services/fastMetadataService';

const DEBUG_COVER_LOGS = false;

// Funkce pro výpočet celkového času alba
const calculateTotalDuration = (tracks) => {
  let totalSeconds = 0;
  let validDurations = 0;

  tracks.forEach(track => {
    const duration = track.duration;
    if (duration && duration !== 'N/A') {
      // Parse duration string like "5:30" to seconds
      const parts = duration.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0]);
        const seconds = parseInt(parts[1]);
        if (!isNaN(minutes) && !isNaN(seconds)) {
          totalSeconds += minutes * 60 + seconds;
          validDurations++;
        }
      }
    }
  });

  if (validDurations === 0) {
    return 'N/A';
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const useFirebaseHudbaFilter = () => {
  const {
    availableFiles,
    filesByTopic,
    availableTopics,
    stats,
    coverImages,
    isLoading,
    isLoadingCovers,
    isLoadingDurations,
    error,
    refreshCDN,
    getFilesForTopic,
    getFileByName
  } = useFirebaseHudbaScanner();

  // Filtruj soubory podle témat a vyber nejvyšší verzi pro každé téma
  const hudbaItems = useMemo(() => {
    // console.log('🔄 useFirebaseHudbaFilter useMemo triggered');
    // console.log('📊 availableFiles:', availableFiles?.length || 0);
    // console.log('📊 coverImages:', coverImages);
    const items = [];
    const albums = new Map(); // Pro skupování album skladeb

    // Filtruj pouze hudební soubory (ze složky hudba/)
    const hudbaFiles = availableFiles.filter(file => file.type === 'hudba' && file.isAvailable);
    // console.log(`📊 Processing ${hudbaFiles.length} hudba files:`, hudbaFiles.map(f => ({
    //   fileName: f.fileName,
    //   type: f.type,
    //   isAlbum: f.isAlbum,
    //   albumName: f.albumName,
    //   parsed: f.parsed
    // })));

    // Rozděl soubory na samostatné skladby a alba podle struktury složek
    const standaloneSongs = hudbaFiles.filter(file => {
      // Samostatné skladby: přímo ve složce hudba/ (např. hudba/song.mp3)
      const isStandalone = file.fileName.startsWith('hudba/') && !file.fileName.substring(6).includes('/');
      // console.log(`🔍 Standalone song check: ${file.fileName}, isStandalone: ${isStandalone}`);
      return isStandalone;
    });

    const albumSongs = hudbaFiles.filter(file => {
      // Album skladby: v podsložce hudba/ (např. hudba/ambient-journey/song.mp3)
      const isAlbumSong = file.fileName.startsWith('hudba/') && file.fileName.substring(6).includes('/');
      // console.log(`🔍 Album song check: ${file.fileName}, isAlbumSong: ${isAlbumSong}, parsed:`, file.parsed);
      return isAlbumSong;
    });

    // console.log(`📊 File classification: ${standaloneSongs.length} standalone, ${albumSongs.length} album songs`);

    // Zpracuj samostatné skladby jako jednotlivé položky
    standaloneSongs.forEach(file => {
      const parsed = file.parsed;

      // Získej skutečnou délku z fastMetadataService
      const actualDuration = file.duration || 'N/A';

      items.push({
        key: `standalone-${file.fileName}`,
        title: parsed.trackName || parsed.name || file.fileNameOnly,
        type: 'song',
        audioSrc: file.downloadURL,
        fileName: file.fileName,
        duration: actualDuration,
        isAvailable: file.isAvailable
      });
    });

    // Zpracuj album skladby - seskupuj podle podsložky
    const albumGroups = new Map();
    albumSongs.forEach(file => {
      // Extrahuj název podsložky (např. "ambient-journey" z "hudba/ambient-journey/song.mp3")
      const pathParts = file.fileName.split('/');
      const albumName = pathParts[1]; // Druhá část cesty je název alba
      // console.log(`🔍 Album processing: ${file.fileName}, pathParts: [${pathParts.join(', ')}], albumName: ${albumName}, parsed:`, file.parsed);

      if (!albumGroups.has(albumName)) {
        albumGroups.set(albumName, []);
        // console.log(`📁 Created new album group: ${albumName}`);
      }
      albumGroups.get(albumName).push(file);
      // console.log(`📄 Added file to album ${albumName}: ${file.fileName}`);
    });

    // console.log(`📊 Album groups after processing:`, Array.from(albumGroups.entries()).map(([name, songs]) => ({
    //   name,
    //   songCount: songs.length,
    //   songs: songs.map(s => s.fileName)
    // })));

    // Vytvoř alba z seskupených skladeb
    // console.log(`📊 Album groups:`, Array.from(albumGroups.keys()));
    albumGroups.forEach((songs, albumName) => {
      // console.log(`🎵 Creating album: ${albumName} with ${songs.length} tracks`);
      // console.log(`📄 Album songs:`, songs.map(s => s.fileName));

      // Seřaď skladby podle názvu souboru
      songs.sort((a, b) => a.fileName.localeCompare(b.fileName));

      // Najdi cover obrázek pro album
      let coverImageUrl = null;
      if (coverImages instanceof Map) {
        coverImageUrl = coverImages.get(albumName) || null;
        if (DEBUG_COVER_LOGS) {
        if (!coverImageUrl) {
          console.log(`⚠️ Cover image not found for album: ${albumName}`);
          console.log(`📊 Available cover images:`, Array.from(coverImages.keys()));
        } else {
          console.log(`✅ Cover image found for album: ${albumName}`);
          }
        }
      } else {
        coverImageUrl = coverImages[albumName] || null;
        if (DEBUG_COVER_LOGS && !coverImageUrl) {
          console.log(`⚠️ Cover image not found for album: ${albumName}`);
          console.log(`📊 Available cover images:`, Object.keys(coverImages));
        }
      }
      // console.log(`🖼️ Cover image for ${albumName}:`, coverImageUrl);

      // Funkce pro vyčištění názvu skladby - odstraní číslo skladby
      const cleanTrackName = (trackName) => {
        if (!trackName) return trackName;

        // Odstraň číslo skladby z názvu (např. "01 - Název skladby" -> "Název skladby")
        // Podporuje různé formáty: "01 - Název", "1. Název", "01 Název", atd.
        return trackName.replace(/^\d+[\s\-\.]*/, '').trim();
      };

      // Vytvoř tracks pro album
      const tracks = songs.map(file => {
        // Získej skutečnou délku z fastMetadataService
        const actualDuration = file.duration || 'N/A';

        // Získej název skladby a vyčisti ho od čísla
        const rawTrackName = file.parsed.trackName || file.parsed.name || file.fileNameOnly;
        const cleanName = cleanTrackName(rawTrackName);

        return {
          trackNumber: songs.indexOf(file) + 1,
          trackName: cleanName,
          duration: actualDuration,
          audioSrc: file.downloadURL,
          fileName: file.fileName,
          originalFileName: file.parsed.originalFileName
        };
      });

      // Převeď albumName na čitelný formát (např. "ambient-journey" → "Ambient Journey")
      const readableAlbumName = albumName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const albumItem = {
        key: `album-${albumName}`,
        title: readableAlbumName, // Použij čitelný název (např. "Ambient Journey")
        type: 'album',
        topic: albumName,
        tracks: tracks,
        coverImage: coverImageUrl
      };

      // console.log(`✅ Album created:`, albumItem);
      items.push(albumItem);
    });

    // console.log(`📊 Items before sorting:`, items.map(item => ({
    //   key: item.key,
    //   title: item.title,
    //   type: item.type,
    //   tracks: item.tracks?.length || 'N/A'
    // })));

    // Seřaď podle číslování
    const sortedItems = items.sort((a, b) => {
      if (a.type === 'album' && b.type === 'song') {
        return -1; // Alba první
      }
      if (a.type === 'song' && b.type === 'album') {
        return 1; // Samostatné skladby po albách
      }
      return a.title.localeCompare(b.title);
    });

    // console.log(`📊 Final items:`, sortedItems.map(item => ({
    //   key: item.key,
    //   title: item.title,
    //   type: item.type,
    //   tracks: item.tracks?.length || 'N/A'
    // })));

    return sortedItems;

  }, [availableFiles, filesByTopic, availableTopics]);

  return {
    // Data
    hudbaItems,
    availableFiles,
    filesByTopic,
    availableTopics,
    stats,

    // State
    isLoading,
    isLoadingCovers,
    isLoadingDurations,
    error,

    // Actions
    refreshAudioFiles: refreshCDN,

    // Getters
    getAudioForTopic: (topic) => {
      const topicFiles = filesByTopic[topic] || [];
      const bestFile = topicFiles
        .filter(file => file.parsed && file.isAvailable)
        .sort((a, b) => parseInt(b.parsed.version) - parseInt(a.parsed.version))[0];
      return bestFile?.fileName || null;
    },
    getBestAudio: () => {
      return hudbaItems[0]?.fileName || null;
    },
    getFilesForTopic,
    getAudioInfo: (fileName) => {
      const file = getFileByName(fileName);
      return file?.parsed || null;
    },
    getRecommendedFiles: (limit = 5) => {
      return hudbaItems.slice(0, limit);
    }
  };
};
