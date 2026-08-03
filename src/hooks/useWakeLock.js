import { useEffect, useRef, useCallback } from 'react';
import { onVisibilityChange } from '@services/visibilityManager';

/**
 * useWakeLock - Screen Wake Lock API hook
 * Používá centrální visibilityManager místo vlastního listeneru (dedup vorchein).
 * 
 * Zabraňuje uspání obrazovky během meditace/dechových cvičení.
 * Automaticky re-acquire při návratu z pozadí (visibilitychange).
 * 
 * Použití:
 *   const { request, release, isActive, isSupported } = useWakeLock();
 *   // nebo auto-pattern:
 *   useWakeLock(isPlaying); // drží wake lock dokud je isPlaying true
 */
export function useWakeLock(active = false) {
  const sentinelRef = useRef(null);
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const request = useCallback(async () => {
    if (!isSupported) {
      console.debug('[WakeLock] Not supported on this device');
      return null;
    }

    try {
      // Uvolni existující wake lock pokud existuje
      if (sentinelRef.current) {
        await sentinelRef.current.release().catch(() => {});
      }

      sentinelRef.current = await navigator.wakeLock.request('screen');
      
      sentinelRef.current.addEventListener('release', () => {
        console.debug('[WakeLock] Released');
      });

      console.debug('[WakeLock] Acquired');
      return sentinelRef.current;
    } catch (err) {
      console.warn('[WakeLock] Failed to acquire:', err.message);
      return null;
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release();
        sentinelRef.current = null;
        console.debug('[WakeLock] Released manually');
      } catch (err) {
        console.warn('[WakeLock] Failed to release:', err.message);
      }
    }
  }, []);

  // Auto-request/release podle `active` parametru
  useEffect(() => {
    if (!isSupported) return;

    if (active) {
      request();
    } else {
      release();
    }

    return () => {
      // Cleanup při unmount nebo změně active na false
      if (!active && sentinelRef.current) {
        release();
      }
    };
  }, [active, isSupported, request, release]);

  // Re-acquire wake lock při návratu z pozadí (OS ho může uvolnit) - přes centrální manager
  useEffect(() => {
    if (!isSupported || !active) return;

    const handleVisibilityChange = async (hidden) => {
      if (!hidden && active && !sentinelRef.current) {
        console.debug('[WakeLock] Re-acquiring after visibility change');
        await request();
      }
    };

    return onVisibilityChange(handleVisibilityChange);
  }, [active, isSupported, request]);

  return {
    request,
    release,
    isActive: !!sentinelRef.current,
    isSupported
  };
}

export default useWakeLock;
