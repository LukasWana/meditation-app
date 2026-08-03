/**
 * Detekce výkonnostní třídy zařízení.
 *
 * Slouží k degradaci GPU-náročných efektů (hlavně backdrop-filter) na
 * slabších Android zařízeních, kde blur compositing výrazně žere baterii.
 *
 * Výsledek se propíše jako třída `low-gpu` na <html>, aby ho mohlo použít
 * čisté CSS bez re-renderu Reactu.
 */

let cachedIsLowEnd = null;

/**
 * Zařízení považujeme za slabé, pokud hlásí méně než 4 GB RAM nebo má
 * zapnutý úsporný režim dat. `deviceMemory` je Chrome-only (tedy i Android
 * WebView) — když chybí (iOS/Safari), degradaci nezapínáme, aby se vzhled
 * neměnil na zařízeních, kde nemáme důkaz o slabém HW.
 */
export function isLowEndDevice() {
  if (cachedIsLowEnd !== null) {
    return cachedIsLowEnd;
  }

  if (typeof navigator === 'undefined') {
    cachedIsLowEnd = false;
    return cachedIsLowEnd;
  }

  const deviceMemory = navigator.deviceMemory;
  const saveData = navigator.connection?.saveData === true;

  cachedIsLowEnd = (typeof deviceMemory === 'number' && deviceMemory < 4) || saveData;
  return cachedIsLowEnd;
}

/**
 * Nastaví třídu `low-gpu` na <html>. Volat co nejdřív (před prvním renderem),
 * ať se blur nikdy nestihne vykreslit.
 */
export function applyDeviceTier() {
  if (typeof document === 'undefined') {
    return false;
  }

  const lowEnd = isLowEndDevice();
  document.documentElement.classList.toggle('low-gpu', lowEnd);
  return lowEnd;
}

/** Pouze pro testy. */
export function _resetDeviceTier() {
  cachedIsLowEnd = null;
}
