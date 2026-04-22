import { useState, useEffect, useMemo } from 'react';
import { fastMetadataService } from '@services/fastMetadataService';

export const useFirebaseHudbaFilter = () => {
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);

  console.log('🎯 [HUDBA FILTER] useFirebaseHudbaFilter called', {
    isInitialized: fastMetadataService.isInitialized,
    metadataSize: fastMetadataService.metadata?.size || 0,
    isLoading: fastMetadataService.isLoading
  });

  // Sleduj načtení metadata a aktualizuj state
  useEffect(() => {
    console.log('🎯 [HUDBA FILTER] useEffect triggered');

    const updateFiles = () => {
      console.log('🔍 [HUDBA FILTER] updateFiles() called');
      const allFiles = Array.from(fastMetadataService.metadata.values());
      console.log(`📊 [HUDBA FILTER] Total metadata: ${allFiles.length} files`);

      const hudbaFiles = allFiles.filter(file =>
        file.folder === 'hudba' || file.fileName.startsWith('hudba/')
      );

      console.log(`✅ [HUDBA FILTER] Filtered ${hudbaFiles.length} hudba files:`, hudbaFiles.map(f => ({
        fileName: f.fileName,
        type: f.type,
        hasDownloadURL: !!f.downloadURL
      })));

      setAvailableFiles(hudbaFiles);
      setMetadataLoaded(true);
    };

    if (fastMetadataService.isInitialized) {
      console.log('✅ [HUDBA FILTER] Already initialized, updating files directly');
      updateFiles();
    } else {
      console.log('⏳ [HUDBA FILTER] Not initialized, calling initialize()...');
      fastMetadataService.initialize().then(() => {
        console.log('✅ [HUDBA FILTER] Initialization complete, updating files');
        updateFiles();
      }).catch(err => {
        console.error('❌ [HUDBA FILTER] Initialization failed:', err);
      });
    }
  }, []);

  // Sestavení hudebních položek (alba a skladby)
  const hudbaItems = useMemo(() => {
    const items = [];
    const hudbaFiles = availableFiles.filter(file => file.type === 'hudba' || file.fileName.includes('/'));

    // Rozdělení na samostatné skladby a alba
    const standaloneSongs = hudbaFiles.filter(file => {
      const pathParts = file.fileName.split('/');
      return pathParts.length === 2 && pathParts[0] === 'hudba';
    });

    const albumSongs = hudbaFiles.filter(file => {
      const pathParts = file.fileName.split('/');
      return pathParts.length > 2 && pathParts[0] === 'hudba';
    });

    // Zpracování samostatných skladeb
    standaloneSongs.forEach(file => {
      items.push({
        key: `standalone-${file.fileName}`,
        title: file.parsed?.trackName || file.fileName.split('/').pop().replace(/\.[^/.]+$/, ''),
        type: 'song',
        audioSrc: file.downloadURL || file.fileName,
        fileName: file.fileName,
        duration: file.durationFormatted || 'N/A',
        isAvailable: true
      });
    });

    // Zpracování alb
    const albumGroups = new Map();
    albumSongs.forEach(file => {
      const albumName = file.fileName.split('/')[1];
      if (!albumGroups.has(albumName)) albumGroups.set(albumName, []);
      albumGroups.get(albumName).push(file);
    });

    albumGroups.forEach((songs, albumName) => {
      // Seřaď skladby
      songs.sort((a, b) => a.fileName.localeCompare(b.fileName));

      // Odfiltruj pouze audio soubory
      const audioFiles = songs.filter(f => /\.(mp3|ogg|wav|m4a|flac)$/i.test(f.fileName));

      const tracks = audioFiles.map((file, index) => ({
        trackNumber: index + 1,
        trackName: file.parsed?.trackName || file.fileName.split('/').pop().replace(/^\d+[\s\-.]+/, '').replace(/\.[^/.]+$/, '').trim(),
        duration: file.durationFormatted || 'N/A',
        audioSrc: file.downloadURL || file.fileName,
        fileName: file.fileName
      }));

      if (tracks.length > 0) {
        // Zkus najít cover obrázek v téže složce
        const coverFile = songs.find(f => /cover|thumb/i.test(f.fileName) && /\.(jpg|jpeg|png|webp)$/i.test(f.fileName));

        items.push({
          key: `album-${albumName}`,
          title: albumName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          type: 'album',
          topic: albumName,
          tracks,
          coverImage: coverFile?.downloadURL || null
        });
      }
    });

    // Seřaď: alba první, pak skladby
    return items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'album' ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  }, [availableFiles]);

  return {
    hudbaItems,
    availableFiles,
    isLoading: !metadataLoaded,
    error: null,
    refreshAudioFiles: () => fastMetadataService.initialize(),
    getAudioForTopic: (topic) => {
      // Pro hudbu je "topic" název alba nebo složky
      const album = hudbaItems.find(item => item.topic === topic || item.key === `album-${topic}`);
      return album?.tracks[0]?.fileName || null;
    },
    getBestAudio: () => hudbaItems[0]?.fileName || null,
    getAudioInfo: (fileName) => availableFiles.find(f => f.fileName === fileName)?.parsed || null,
    getRecommendedFiles: (limit = 5) => hudbaItems.slice(0, limit)
  };
};
