import { useState, useEffect, useMemo } from 'react';
import { slovaDataService } from '@services/slovaDataService';
import log from '@services/logger';

export const useRealtimeMeditationFilter = (userGender, userLanguage = 'sk') => {
  console.log(`🔍 useRealtimeMeditationFilter called with: userGender=${userGender}, userLanguage=${userLanguage}`);
  console.log(`🔍 Gender type: ${typeof userGender}, value: "${userGender}"`);

  const [meditationItems, setMeditationItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    byLanguage: {},
    byGender: {},
    totalDuration: 0
  });

  // Načti předpřipravená meditace data
  useEffect(() => {
    console.log(`🔍 useRealtimeMeditationFilter useEffect triggered with: userGender=${userGender}, userLanguage=${userLanguage}`);
    console.log('🔍 useEffect is running...');

    const loadMeditationData = async () => {
      try {
        console.log('🔍 Starting loadMeditationData function...');
        setIsLoading(true);
        setError(null);

        log.info('🚀 Loading meditation data from slovaDataService...');
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
        const meditationData = slovaDataService.getSlovaData(userGender, userLanguage);
        const stats = slovaDataService.getStats(userGender, userLanguage);

        console.log(`✅ Meditation data loaded: ${meditationData.length} items`);
        log.success(`✅ Meditation data loaded: ${meditationData.length} items`);

        setMeditationItems(meditationData);
        setStats(stats);

        log.success(`✅ Meditation filter completed: ${meditationData.length} items for language: ${userLanguage}, gender: ${userGender}`);

      } catch (err) {
        console.error('❌ Failed to load meditation data:', err);
        log.error('❌ Failed to load meditation data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    console.log('🔍 About to call loadMeditationData...');
    loadMeditationData();
  }, [userGender, userLanguage]);

  // Filtruj podle tématu
  const getItemsByTopic = useMemo(() => {
    const grouped = {};
    meditationItems.forEach(item => {
      if (!grouped[item.topic]) {
        grouped[item.topic] = [];
      }
      grouped[item.topic].push(item);
    });
    return grouped;
  }, [meditationItems]);

  // Získej dostupná témata
  const availableTopics = useMemo(() => {
    return Object.keys(getItemsByTopic).sort();
  }, [getItemsByTopic]);

  return {
    meditationItems,
    isLoading,
    error,
    stats,
    getItemsByTopic,
    availableTopics,
    // Pro kompatibilitu s původním hookem
    troubleItems: meditationItems,
    audioFiles: meditationItems,
    // Pro zpětnou kompatibilitu
    slovaItems: meditationItems
  };
};
