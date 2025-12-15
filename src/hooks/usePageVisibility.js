import { useEffect } from 'react';

/**
 * Hook pro detekci změn visibility stránky (focus/blur)
 *
 * @param {Function} callback - Funkce volaná při změně visibility, přijímá boolean (true = stránka je skrytá)
 * @returns {void}
 */
export const usePageVisibility = (callback) => {
  useEffect(() => {
    if (typeof callback !== 'function') {
      return;
    }

    const handleVisibilityChange = () => {
      callback(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [callback]);
};

