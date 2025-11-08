import { useMemo } from 'react';
import { useFirebaseDychaniScanner } from '@hooks/useFirebaseDychaniScanner';

export const useFirebaseDychaniFilter = () => {
  const {
    availableFiles,
    stats,
    isLoading,
    error,
    refreshCDN,
    getFileByName
  } = useFirebaseDychaniScanner();

  // Filtruj soubory a vytvoř položky pro zobrazení
  const dychaniItems = useMemo(() => {
    const items = [];

    // Filtruj pouze dychani soubory (včetně legacy typu)
    const dychaniFiles = availableFiles.filter(file => {
      const type = (file.type || '').toLowerCase();
      return (type === 'dychani' || type === 'dychanie') && file.isAvailable;
    });

    // Zpracuj soubory jako jednotlivé položky
    dychaniFiles.forEach(file => {
      const fileNameOnly = file.fileNameOnly || file.fileName.split('/').pop();
      const name = fileNameOnly.replace(/\.(ogg|oga|mp3)$/i, '');

      items.push({
        key: `dychani-${file.fileName}`,
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
    dychaniItems,
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

