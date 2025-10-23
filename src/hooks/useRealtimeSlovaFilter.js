import { useState, useEffect, useMemo } from 'react';
import { slovaDataService } from '@services/slovaDataService';
import log from '@services/logger';

export const useRealtimeSlovaFilter = (userGender, userLanguage = 'sk') => {
  console.log(`🔍 useRealtimeSlovaFilter called with: userGender=${userGender}, userLanguage=${userLanguage}`);
  console.log(`🔍 Gender type: ${typeof userGender}, value: "${userGender}"`);

  const [slovaItems, setSlovaItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    byLanguage: {},
    byGender: {},
    totalDuration: 0
  });

  // Načti předpřipravená slova data
  useEffect(() => {
    console.log(`🔍 useRealtimeSlovaFilter useEffect triggered with: userGender=${userGender}, userLanguage=${userLanguage}`);
    console.log('🔍 useEffect is running...');

    const loadSlovaData = async () => {
      try {
        console.log('🔍 Starting loadSlovaData function...');
        setIsLoading(true);
        setError(null);

        log.info('🚀 Loading slova data from slovaDataService...');
        log.info(`🔍 Parameters: userGender=${userGender}, userLanguage=${userLanguage}`);

        // Zkontroluj, jestli je slovaDataService inicializovaný
        console.log('🔍 Checking if slovaDataService is initialized...');
        console.log('🔍 slovaDataService.isInitialized:', slovaDataService.isInitialized);
        if (!slovaDataService.isInitialized) {
          console.log('⚠️ SlovaDataService not initialized, trying to initialize...');
          await slovaDataService.initialize();
          console.log('🔍 After initialization - slovaDataService.isInitialized:', slovaDataService.isInitialized);
        }

        // Získej předpřipravená data z slovaDataService
        const slovaData = slovaDataService.getSlovaData(userGender, userLanguage);
        const stats = slovaDataService.getStats(userGender, userLanguage);

        console.log(`✅ Slova data loaded: ${slovaData.length} items`);
        log.success(`✅ Slova data loaded: ${slovaData.length} items`);

        setSlovaItems(slovaData);
        setStats(stats);

        log.success(`✅ Slova filter completed: ${slovaData.length} items for language: ${userLanguage}, gender: ${userGender}`);

      } catch (err) {
        console.error('❌ Failed to load slova data:', err);
        log.error('❌ Failed to load slova data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    console.log('🔍 About to call loadSlovaData...');
    loadSlovaData();
  }, [userGender, userLanguage]);

  // Filtruj podle tématu
  const getItemsByTopic = useMemo(() => {
    const grouped = {};
    slovaItems.forEach(item => {
      if (!grouped[item.topic]) {
        grouped[item.topic] = [];
      }
      grouped[item.topic].push(item);
    });
    return grouped;
  }, [slovaItems]);

  // Získej dostupná témata
  const availableTopics = useMemo(() => {
    return Object.keys(getItemsByTopic).sort();
  }, [getItemsByTopic]);

  return {
    slovaItems,
    isLoading,
    error,
    stats,
    getItemsByTopic,
    availableTopics,
    // Pro kompatibilitu s původním hookem
    troubleItems: slovaItems,
    audioFiles: slovaItems
  };
};