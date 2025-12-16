/**
 * Utility funkce pro výpočet aktuální fáze dýchání z uplynulého času
 *
 * @param {number} elapsedSeconds - Uplynulý čas od začátku dýchání v sekundách
 * @param {number} breathInDuration - Délka nádechu v sekundách
 * @param {number} breathOutDuration - Délka výdechu v sekundách
 * @returns {Object} { phase: 'in' | 'out', phaseProgress: number, cycleProgress: number }
 */
export const phaseAtTime = (elapsedSeconds, breathInDuration, breathOutDuration) => {
  if (elapsedSeconds < 0 || breathInDuration <= 0 || breathOutDuration <= 0) {
    return { phase: 'in', phaseProgress: 0, cycleProgress: 0 };
  }

  const cycleDuration = breathInDuration + breathOutDuration;
  const cycleTime = elapsedSeconds % cycleDuration;

  let phase, phaseProgress, cycleProgress;

  if (cycleTime < breathInDuration) {
    // Jsme v nádechu
    phase = 'in';
    phaseProgress = cycleTime / breathInDuration;
    cycleProgress = cycleTime / cycleDuration;
  } else {
    // Jsme ve výdechu
    phase = 'out';
    const outTime = cycleTime - breathInDuration;
    phaseProgress = outTime / breathOutDuration;
    cycleProgress = cycleTime / cycleDuration;
  }

  return { phase, phaseProgress, cycleProgress };
};

/**
 * Vypočítá čas další hranice fáze (kdy se přepne z in na out nebo naopak)
 *
 * @param {number} elapsedSeconds - Aktuální uplynulý čas
 * @param {number} breathInDuration - Délka nádechu
 * @param {number} breathOutDuration - Délka výdechu
 * @returns {number} Čas další hranice v sekundách od začátku
 */
export const nextPhaseBoundary = (elapsedSeconds, breathInDuration, breathOutDuration) => {
  const cycleDuration = breathInDuration + breathOutDuration;
  const cycleTime = elapsedSeconds % cycleDuration;

  if (cycleTime < breathInDuration) {
    // Jsme v nádechu, další hranice je konec nádechu
    const currentCycleStart = Math.floor(elapsedSeconds / cycleDuration) * cycleDuration;
    return currentCycleStart + breathInDuration;
  } else {
    // Jsme ve výdechu, další hranice je konec výdechu (začátek dalšího cyklu)
    const currentCycleStart = Math.floor(elapsedSeconds / cycleDuration) * cycleDuration;
    return currentCycleStart + cycleDuration;
  }
};

/**
 * Vypočítá všechny hranice fází v daném časovém rozsahu
 *
 * @param {number} startTime - Začátek rozsahu v sekundách
 * @param {number} endTime - Konec rozsahu v sekundách
 * @param {number} breathInDuration - Délka nádechu
 * @param {number} breathOutDuration - Délka výdechu
 * @returns {Array<{time: number, phase: 'in' | 'out'}>} Seznam hranic s fázemi
 */
export const phaseBoundariesInRange = (startTime, endTime, breathInDuration, breathOutDuration) => {
  const cycleDuration = breathInDuration + breathOutDuration;
  const boundaries = [];

  // Najdi první hranici >= startTime
  const firstCycleStart = Math.floor(startTime / cycleDuration) * cycleDuration;
  let currentTime = firstCycleStart;

  while (currentTime <= endTime) {
    // Hranice na konci nádechu (začátek výdechu)
    const inOutBoundary = currentTime + breathInDuration;
    if (inOutBoundary >= startTime && inOutBoundary <= endTime) {
      boundaries.push({ time: inOutBoundary, phase: 'out' });
    }

    // Hranice na konci výdechu (začátek dalšího nádechu)
    const outInBoundary = currentTime + cycleDuration;
    if (outInBoundary >= startTime && outInBoundary <= endTime) {
      boundaries.push({ time: outInBoundary, phase: 'in' });
    }

    currentTime += cycleDuration;
  }

  return boundaries.sort((a, b) => a.time - b.time);
};

