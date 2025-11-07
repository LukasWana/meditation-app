import { useState, useEffect, useMemo } from 'react';
import { meditaceDataService } from '@services/meditaceDataService';
import log from '@services/logger';

export const useRealtimeMeditaceFilter = (userGender, userLanguage = 'sk') => {
  console.log(`🔍 useRealtimeMeditaceFilter called with: userGender=${userGender}, userLanguage=${userLanguage}`);
  console.log(`🔍 Gender type: ${typeof userGender}, value: "${userGender}"`);

  const [meditaceItems, setMeditaceItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    byLanguage: {},
    byGender: {},
    totalDuration: 0
  });

  // Načti předpřipravená data meditací
  useEffect(() => {
    console.log(`🔍 useRealtimeMeditaceFilter useEffect triggered with: userGender=${userGender}, userLanguage=${userLanguage}`);
    console.log('🔍 useEffect is running...');

    const loadMeditaceData = async () => {
      try {
        console.log('🔍 Starting loadMeditaceData function...');
        setIsLoading(true);
        setError(null);

        log.info('🚀 Loading meditace data from meditaceDataService...');
        log.info(`🔍 Parameters: userGender=${userGender}, userLanguage=${userLanguage}`);

        // Zkontroluj, jestli je meditaceDataService inicializovaný
        console.log('🔍 Checking if meditaceDataService is initialized...');
        console.log('🔍 meditaceDataService.isInitialized:', meditaceDataService.isInitialized);
        if (!meditaceDataService.isInitialized) {
          console.log('⚠️ MeditaceDataService not initialized, trying to initialize...');
          await meditaceDataService.initialize();
          console.log('🔍 After initialization - meditaceDataService.isInitialized:', meditaceDataService.isInitialized);
        }

        // Získej předpřipravená data z meditaceDataService
        const meditaceData = meditaceDataService.getMeditaceData(userGender, userLanguage);
        const stats = meditaceDataService.getStats(userGender, userLanguage);

        console.log(`✅ Meditace data loaded: ${meditaceData.length} items`);
        log.success(`✅ Meditace data loaded: ${meditaceData.length} items`);

        setMeditaceItems(meditaceData);
        setStats(stats);

        log.success(`✅ Meditace filter completed: ${meditaceData.length} items for language: ${userLanguage}, gender: ${userGender}`);

      } catch (err) {
        console.error('❌ Failed to load meditace data:', err);
        log.error('❌ Failed to load meditace data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    console.log('🔍 About to call loadMeditaceData...');
    loadMeditaceData();
  }, [userGender, userLanguage]);

  // Filtruj podle tématu
  const getItemsByTopic = useMemo(() => {
    const grouped = {};
    meditaceItems.forEach(item => {
      if (!grouped[item.topic]) {
        grouped[item.topic] = [];
      }
      grouped[item.topic].push(item);
    });
    return grouped;
  }, [meditaceItems]);

  // Získej dostupná témata
  const availableTopics = useMemo(() => {
    return Object.keys(getItemsByTopic).sort();
  }, [getItemsByTopic]);

  return {
    meditaceItems,
    isLoading,
    error,
    stats,
    getItemsByTopic,
    availableTopics,
    // Pro kompatibilitu s původním hookem
    troubleItems: meditaceItems,
    audioFiles: meditaceItems
  };
};