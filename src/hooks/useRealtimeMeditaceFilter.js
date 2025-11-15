import { useState, useEffect, useMemo } from 'react';
import { meditaceDataService } from '@services/meditaceDataService';
import log from '@services/logger';

export const useRealtimeMeditaceFilter = (userGender, userLanguage = 'sk') => {
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
    const loadMeditaceData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        log.info('🚀 Loading meditace data from meditaceDataService...');
        log.info(`🔍 Parameters: userGender=${userGender}, userLanguage=${userLanguage}`);

        // POČKEJ na inicializaci meditaceDataService před pokusem o načtení dat
        try {
          log.debug('⏳ Waiting for meditaceDataService initialization...');
          const initialized = await meditaceDataService.waitForInitialization(10000);
          if (!initialized) {
            log.warn('⚠️ MeditaceDataService initialization timeout, trying anyway...');
          } else {
            log.debug('✅ MeditaceDataService is ready');
          }
        } catch (err) {
          log.debug('MeditaceDataService wait error:', err);
        }

        // Zkontroluj, jestli je meditaceDataService inicializovaný
        if (!meditaceDataService.isInitialized) {
          log.warn('⚠️ MeditaceDataService not initialized, attempting initialization...');
          await meditaceDataService.initialize();
        }

        // Získej předpřipravená data z meditaceDataService
        const meditaceData = meditaceDataService.getMeditaceData(userGender, userLanguage);
        const stats = meditaceDataService.getStats(userGender, userLanguage);

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