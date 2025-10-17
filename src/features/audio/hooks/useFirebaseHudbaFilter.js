import { useMemo } from 'react';
import { useFirebaseHudbaScanner } from '@hooks/useFirebaseHudbaScanner';

export const useFirebaseHudbaFilter = () => {
  const {
    availableFiles,
    filesByTopic,
    availableTopics,
    stats,
    isLoading,
    error,
    refreshCDN,
    getFilesForTopic,
    getFileByName
  } = useFirebaseHudbaScanner();

  // Filtruj soubory podle témat a vyber nejvyšší verzi pro každé téma
  const hudbaItems = useMemo(() => {
    const items = [];
    const albums = new Map(); // Pro skupování album skladeb

    availableTopics.forEach(topic => {
      const topicFiles = filesByTopic[topic];
      if (!topicFiles || topicFiles.length === 0) return;

      // Filtruj pouze dostupné soubory
      const availableFiles = topicFiles.filter(file => file.parsed && file.isAvailable);

      // Rozděl soubory podle typu
      const albumFiles = availableFiles.filter(file => file.parsed.isAlbum);
      const hudbaFiles = availableFiles.filter(file => file.parsed.isHudba);

      // Zpracuj album soubory
      albumFiles.forEach(file => {
        const parsed = file.parsed;
        const albumKey = `${topic}-${parsed.albumName}`;

        if (!albums.has(albumKey)) {
          // Pokusíme se najít cover obrázek pro album
          const coverImageName = `${parsed.numbering}- - ${parsed.albumName} - cover.jpg`;
          const coverImageUrl = `https://firebasestorage.googleapis.com/v0/b/meditations-audio.appspot.com/o/${encodeURIComponent(coverImageName)}?alt=media`;

          albums.set(albumKey, {
            key: albumKey,
            title: parsed.albumName,
            type: 'album',
            topic,
            tracks: [],
            coverImage: coverImageUrl
          });
        }

        const album = albums.get(albumKey);
        album.tracks.push({
          trackNumber: parsed.trackNumber,
          trackName: parsed.trackName,
          duration: file.duration || 'N/A',
          audioSrc: file.downloadURL,
          fileName: file.fileName,
          originalFileName: parsed.originalFileName
        });
      });

      // Zpracuj soubory ze složek jako alba (pokud nejsou už album soubory)
      if (albumFiles.length === 0 && hudbaFiles.length > 0) {
        // Zkontroluj, jestli jsou všechny soubory ze stejné složky
        const folderFiles = hudbaFiles.filter(file => file.fileName.includes('/'));
        if (folderFiles.length === hudbaFiles.length && folderFiles.length > 0) {
          // Všechny soubory jsou ze složky - vytvoř album
          const firstFile = folderFiles[0];
          const folderName = firstFile.fileName.split('/')[0];
          const albumKey = `${topic}-${folderName}`;

          if (!albums.has(albumKey)) {
            // Pokusíme se najít cover obrázek pro album
            const coverImageName = `${folderName}/cover.jpg`;
            const coverImageUrl = `https://firebasestorage.googleapis.com/v0/b/meditations-audio.appspot.com/o/${encodeURIComponent(coverImageName)}?alt=media`;

            albums.set(albumKey, {
              key: albumKey,
              title: folderName.replace(/-/g, ' '), // ambient-journey -> ambient journey
              type: 'album',
              topic,
              tracks: [],
              coverImage: coverImageUrl
            });
          }

          const album = albums.get(albumKey);
          folderFiles.forEach((file, index) => {
            const parsed = file.parsed;
            album.tracks.push({
              trackNumber: index + 1,
              trackName: parsed.name,
              duration: file.duration || 'N/A',
              audioSrc: file.downloadURL,
              fileName: file.fileName,
              originalFileName: parsed.originalFileName
            });
          });
        }
      }

      // Zpracuj původní hudební soubory (pouze ty, které nejsou ze složek)
      const rootHudbaFiles = hudbaFiles.filter(file => !file.fileName.includes('/'));
      if (rootHudbaFiles.length > 0) {
        // Seřaď soubory podle verze (nejvyšší verze první)
        const sortedFiles = rootHudbaFiles.sort((a, b) => {
          const versionA = parseInt(a.parsed.version);
          const versionB = parseInt(b.parsed.version);
          return versionB - versionA; // Sestupně - nejvyšší verze první
        });

        const bestFile = sortedFiles[0];
        const parsed = bestFile.parsed;

        items.push({
          key: `${topic}-${parsed.version}`,
          title: parsed.name,
          duration: bestFile.duration || 'N/A',
          audioSrc: bestFile.downloadURL,
          fullNumbering: parsed.fullNumbering,
          version: parsed.version,
          topic,
          fileName: bestFile.fileName,
          type: 'hudba'
        });
      }
    });

    // Přidej alba do výsledků
    albums.forEach(album => {
      // Seřaď skladby podle trackNumber
      album.tracks.sort((a, b) => a.trackNumber - b.trackNumber);

      items.push(album);
    });

    // Seřaď podle číslování
    return items.sort((a, b) => {
      if (a.type === 'album' && b.type === 'hudba') {
        return -1; // Alba první
      }
      if (a.type === 'hudba' && b.type === 'album') {
        return 1; // Hudební soubory po albách
      }
      return a.title.localeCompare(b.title);
    });

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
