import { useState, useEffect } from 'react';
import { onVisibilityChange, isPageVisible } from '@services/visibilityManager';

/**
 * usePageVisible - sleduje document.visibilityState přes centrální visibilityManager
 * (deduplikuje 5+ addEventListener('visibilitychange') na jeden globální)
 *
 * @returns {boolean} isVisible
 */
export function usePageVisible() {
  const [isVisibleState, setIsVisible] = useState(isPageVisible());

  useEffect(() => {
    const unsubscribe = onVisibilityChange((hidden) => {
      setIsVisible(!hidden);
    });
    return unsubscribe;
  }, []);

  return isVisibleState;
}

export default usePageVisible;
