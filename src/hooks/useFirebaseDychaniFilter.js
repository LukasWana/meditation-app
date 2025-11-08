import { useMemo } from 'react';
import { useFirebaseDychanieScanner } from '@hooks/useFirebaseDychanieScanner';
import fastMetadataService from '@services/fastMetadataService';

export const useFirebaseDychanieFilter = () => {
  const {
    availableFiles,
    stats,
    isLoading,
    error,
    refreshCDN,
    getFileByName
  } = useFirebaseDychanieScanner();

  // Filtruj soubory a vytvoř položky pro zobrazení
  const dychanieItems = useMemo(() => {
    const items = [];

    // Filtruj pouze dychanie soubory
    const dychanieFiles = availableFiles.filter(file => file.type === 'dychanie' && file.isAvailable);

    // Zpracuj soubory jako jednotlivé položky
    dychanieFiles.forEach(file => {
      const fileNameOnly = file.fileNameOnly || file.fileName.split('/').pop();
      const name = fileNameOnly.replace(/\.(ogg|oga|mp3)$/i, '');

      items.push({
        key: `dychanie-${file.fileName}`,
        title: name,
        type: 'sound',
        audioSrc: file.downloadURL,
        fileName: file.fileName,
        duration: file.duration || 'N/A',
        isAvailable: file.isAvailable
      });
    });

    return items;
  }, [availableFiles]);

  return {
    // Data
    dychanieItems,
    stats,

    // State
    isLoading,
    error,

    // Actions
    refreshAudioFiles: refreshCDN,

    // Getters
    getFileByName
  };
};

