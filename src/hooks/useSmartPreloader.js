import { useEffect, useRef } from 'react';
import cacheService from '@services/cacheService';

/**
 * Hook pro inteligentní preloading na základě uživatelského chování
 */
export const useSmartPreloader = (currentItem, allItems, type = 'audio') => {
  const preloadTimeoutRef = useRef(null);
  const lastPreloadedRef = useRef(null);

  useEffect(() => {
    if (!currentItem || !allItems || allItems.length === 0) return;

    // Zruš předchozí timeout
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    // Nastav nový timeout pro preloading (po 2 sekundách nečinnosti)
    preloadTimeoutRef.current = setTimeout(async () => {
      try {
        await cacheService.smartPreload(currentItem, allItems);
        lastPreloadedRef.current = currentItem;
      } catch (error) {
        console.warn('Smart preload failed:', error);
      }
    }, 2000);

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [currentItem, allItems, type]);

  // Cleanup na unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);
};

/**
 * Hook pro preloading na základě scroll pozice
 */
export const useScrollPreloader = (items, containerRef, threshold = 3) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !items || items.length === 0) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      // Pokud je uživatel blízko konce, preload další položky
      if (scrollPercentage > 0.8) {
        const visibleStart = Math.floor((scrollTop / scrollHeight) * items.length);
        const visibleEnd = Math.min(visibleStart + threshold * 2, items.length);
        const itemsToPreload = items.slice(visibleStart, visibleEnd);

        if (itemsToPreload.length > 0) {
          cacheService.preloadBatch(itemsToPreload.map(item => ({
            url: item.downloadURL || item.audioSrc,
            fileName: item.fileName || item.title
          })), 'audio').catch(err => {
            console.warn('Scroll preload failed:', err);
          });
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [items, containerRef, threshold]);
};

/**
 * Hook pro preloading na základě hover efektů
 */
export const useHoverPreloader = () => {
  const hoverTimeoutRef = useRef(null);

  const preloadOnHover = (item) => {
    if (!item) return;

    // Zruš předchozí timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Nastav nový timeout - preload až po 1 sekundě hover
    hoverTimeoutRef.current = setTimeout(async () => {
      try {
        // Pro slova screen - použij audioSrc z variant
        if (item.variants && item.variants.length > 0) {
          await cacheService.preloadAudio(item.variants[0].audioSrc, item.title || item.fileName);
        }
        // Pro hudba screen - použij downloadURL
        else if (item.downloadURL) {
          await cacheService.preloadAudio(item.downloadURL, item.fileName);
        }
      } catch (error) {
        console.warn('Hover preload failed:', error);
      }
    }, 1000);
  };

  const cancelHoverPreload = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  return { preloadOnHover, cancelHoverPreload };
};

/**
 * Hook pro batch preloading při inicializaci
 */
export const useInitialPreloader = (items, enabled = true) => {
  useEffect(() => {
    if (!enabled || !items || items.length === 0) return;

    // Agresivnější preloading pro hudbu - preload více položek najednou
    const itemsToPreload = items.slice(0, Math.min(5, items.length)); // Prvních 5 položek

    itemsToPreload.forEach((item, index) => {
      let preloadItem = null;

      // Pro slova screen - použij audioSrc z variants
      if (item.variants && item.variants.length > 0) {
        preloadItem = {
          url: item.variants[0].audioSrc,
          fileName: item.title || item.fileName
        };
      }
      // Pro hudba screen - použij downloadURL
      else if (item.downloadURL || item.audioSrc) {
        preloadItem = {
          url: item.downloadURL || item.audioSrc,
          fileName: item.fileName || item.title
        };
      }

      if (preloadItem) {
        // První položku preload okamžitě, ostatní s malým delay
        const delay = index === 0 ? 0 : index * 1000; // 0s, 1s, 2s, 3s, 4s

        setTimeout(() => {
          cacheService.preloadAudio(preloadItem.url, preloadItem.fileName).catch(err => {
            console.warn(`Preload failed for ${preloadItem.fileName}:`, err);
          });
        }, delay);
      }
    });
  }, [items, enabled]);
};
