/**
 * Správa spojení k Realtime Database podle viditelnosti stránky.
 *
 * Firebase RTDB drží jeden WebSocket pro celou aplikaci a udržuje ho naživu
 * keepalive pingy i tehdy, když na něm nevisí žádný listener. Samotné
 * odhlášení listenerů tedy baterii neušetří — spojení je potřeba explicitně
 * uspat přes goOffline() a po návratu obnovit přes goOnline().
 *
 * Uspáváme se zpožděním: krátké přepnutí do jiné aplikace (nebo stažení
 * notifikační lišty) by jinak vyvolalo zbytečný cyklus disconnect/reconnect,
 * který stojí víc energie než ponechání spojení běžet.
 */

import { goOffline, goOnline } from 'firebase/database';
import { database, ensureFirebase } from '@config/secure-firebase';
import { onVisibilityChange, isPageHidden } from './visibilityManager';
import log from './logger';

// Jak dlouho po skrytí stránky počkat, než spojení uspíme
const OFFLINE_DELAY_MS = 30000;

let unsubscribeVisibility = null;
let offlineTimer = null;
let isOffline = false;

function clearOfflineTimer() {
  if (offlineTimer) {
    clearTimeout(offlineTimer);
    offlineTimer = null;
  }
}

function goOfflineNow() {
  offlineTimer = null;

  // Mezitím se stránka mohla vrátit do popředí
  if (!database || isOffline || !isPageHidden()) {
    return;
  }

  try {
    goOffline(database);
    isOffline = true;
    log.debug('🔌 RTDB spojení uspáno (stránka na pozadí)');
  } catch (error) {
    log.warn('⚠️ Nepodařilo se uspat RTDB spojení:', error);
  }
}

function handleVisibility(hidden) {
  if (hidden) {
    if (!isOffline && !offlineTimer) {
      offlineTimer = setTimeout(goOfflineNow, OFFLINE_DELAY_MS);
    }
    return;
  }

  clearOfflineTimer();

  if (isOffline && database) {
    try {
      goOnline(database);
      isOffline = false;
      log.debug('🔌 RTDB spojení obnoveno');
    } catch (error) {
      log.warn('⚠️ Nepodařilo se obnovit RTDB spojení:', error);
      // Nech isOffline = true, ať to zkusí znovu při dalším návratu
    }
  }
}

/**
 * Spustí správu spojení. Vrací cleanup funkci.
 * Opakované volání je bezpečné — druhé a další volání nic nedělá.
 */
export async function initRtdbConnectionManager() {
  await ensureFirebase();
  if (unsubscribeVisibility) {
    return stopRtdbConnectionManager;
  }

  if (!database) {
    log.debug('RTDB connection manager: database není k dispozici, přeskakuji');
    return () => { };
  }

  unsubscribeVisibility = onVisibilityChange(handleVisibility);
  return stopRtdbConnectionManager;
}

export function stopRtdbConnectionManager() {
  clearOfflineTimer();

  if (unsubscribeVisibility) {
    unsubscribeVisibility();
    unsubscribeVisibility = null;
  }

  // Aplikace končí s živým spojením, ať navazující kód nečeká na data
  if (isOffline && database) {
    try {
      goOnline(database);
    } catch (_error) {
      /* ignore */
    }
    isOffline = false;
  }
}

/** Pouze pro testy / diagnostiku. */
export function isRtdbOffline() {
  return isOffline;
}
