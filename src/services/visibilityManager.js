/**
 * Centralizovaný visibility manager - jediný document visibilitychange listener pro celou appku.
 * Místo ~5 addEventListener('visibilitychange') registrovaných v různých hooks/services,
 * všechny subscribují zde. Business logika: Safari/iOS může mít zpoždění, udržujeme lightweight.
 *
 * Použití:
 *   import { onVisibilityChange, isPageHidden } from '@services/visibilityManager';
 *   const unsub = onVisibilityChange((hidden) => { ... });
 *   // cleanup: unsub()
 */

const listeners = new Set();
let isInitialized = false;

function handleVisibilityChange() {
  const hidden = document.hidden;
  listeners.forEach(cb => {
    try {
      cb(hidden);
    } catch (err) {
      console.error('[VisibilityManager] listener error:', err);
    }
  });
}

export function onVisibilityChange(callback) {
  listeners.add(callback);

  if (!isInitialized && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    isInitialized = true;
  }

  return () => {
    listeners.delete(callback);
  };
}

export function isPageHidden() {
  return typeof document !== 'undefined' ? document.hidden : false;
}

export function isPageVisible() {
  return !isPageHidden();
}

// Cleanup (pro testy / HMR)
export function _resetVisibilityManager() {
  listeners.clear();
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
  isInitialized = false;
}
