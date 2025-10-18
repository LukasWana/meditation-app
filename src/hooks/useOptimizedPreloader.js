import { useState, useEffect } from 'react';
import { firestoreMetadataService } from '@services/firestoreMetadataService';
import { staticMetadataService } from '@services/staticMetadataService';
import { log } from '@services/logger';

/**
 * Optimalizovaný preloader pro metadata
 * Načítá metadata z Firestore v pozadí pro rychlý přístup
 */
export const useOptimizedPreloader = () => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadError, setPreloadError] = useState(null);

  useEffect(() => {
    const preloadMetadata = async () => {
      try {
        setIsPreloading(true);
        setPreloadError(null);

        log.info('🚀 Starting optimized metadata preloading...');
        const startTime = performance.now();

        // Načti metadata s fallback mechanismem
        try {
          await firestoreMetadataService.initialize();
          log.success('✅ Firestore metadata preloaded');
        } catch (firestoreError) {
          log.warn('⚠️ Firestore failed, using static metadata:', firestoreError.message);
          await staticMetadataService.loadMetadata();
          log.success('✅ Static metadata preloaded');
        }

        const endTime = performance.now();
        const loadTime = endTime - startTime;

        log.success(`⚡ Metadata preloaded in ${loadTime.toFixed(2)}ms`);
        setPreloadProgress(100);

      } catch (error) {
        log.error('❌ Metadata preloading failed:', error);
        setPreloadError(error.message);
      } finally {
        setIsPreloading(false);
      }
    };

    // Spusť preloading s malým zpožděním, aby neblokoval UI
    const timeoutId = setTimeout(preloadMetadata, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return {
    isPreloading,
    preloadProgress,
    preloadError
  };
};
