import { useState, useEffect, useMemo } from 'react';
import { fastMetadataService } from '@services/fastMetadataService';

export const useFirebaseDychanieFilter = () => {
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);

  // Sleduj načtení metadata a aktualizuj state
  useEffect(() => {
    const updateFiles = () => {
      const allFiles = Array.from(fastMetadataService.metadata.values());
      const dychanieFiles = allFiles.filter(file =>
        file.folder === 'dychanie' || file.fileName.startsWith('dychanie/')
      );
      setAvailableFiles(dychanieFiles);
      setMetadataLoaded(true);
    };

    if (fastMetadataService.isInitialized) {
      updateFiles();
    } else {
      fastMetadataService.initialize().then(updateFiles);
    }
  }, []);

  // Filtruj soubory a vytvoř položky pro zobrazení
  const dychanieItems = useMemo(() => {
    const items = [];

    // Filtruj pouze dychanie soubory (typu 'dychanie')
    const dychanieFiles = availableFiles.filter(file => file.type === 'dychanie');

    // Zpracuj soubory jako jednotlivé položky
    dychanieFiles.forEach(file => {
      const fileNameOnly = file.fileName.split('/').pop();
      const name = fileNameOnly.replace(/\.(ogg|oga|mp3)$/i, '');

      items.push({
        key: `dychanie-${file.fileName}`,
        title: name,
        type: 'sound',
        audioSrc: file.downloadURL || file.fileName,
        fileName: file.fileName,
        duration: file.durationFormatted || 'N/A',
        isAvailable: true
      });
    });

    return items;
  }, [availableFiles]);

  return {
    dychanieItems,
    stats: {
      count: dychanieItems.length,
      lastUpdated: new Date().toISOString()
    },
    isLoading: !metadataLoaded,
    error: null,
    refreshAudioFiles: () => fastMetadataService.initialize(),
    getFileByName: (name) => availableFiles.find(f => f.fileName === name || f.fileName.includes(name))
  };
};

