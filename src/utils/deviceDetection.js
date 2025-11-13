/**
 * Device Detection Utility
 * Detekce zařízení a optimalizované hodnoty pro WebGL rendering
 */

/**
 * Detekuje, zda je zařízení Android
 * @returns {boolean}
 */
export function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Detekuje, zda je zařízení mobilní (Android, iOS, atd.)
 * @returns {boolean}
 */
export function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Vrací optimalizovaný DPR (Device Pixel Ratio)
 * Na mobilních zařízeních max 1.5x pro lepší výkon
 * @returns {number}
 */
export function getOptimalDPR() {
  if (typeof window === 'undefined') return 1;
  const dpr = window.devicePixelRatio || 1;

  // Na mobilních zařízeních omezíme DPR na max 1.5x
  if (isMobile()) {
    return Math.min(dpr, 1.5);
  }

  return dpr;
}

/**
 * Vrací cílový FPS pro renderování
 * Na mobilních zařízeních 30 FPS, na desktopu 60 FPS
 * @returns {number}
 */
export function getOptimalFPS() {
  if (isMobile()) {
    return 30; // 30 FPS na mobilních zařízeních
  }
  return 60; // 60 FPS na desktopu
}

/**
 * Vrací true, pokud by měl být antialiasing vypnut
 * Antialiasing je vypnut pouze na Androidu
 * @returns {boolean}
 */
export function shouldDisableAntialiasing() {
  return isAndroid();
}

/**
 * Vrací quality multiplier pro shadery
 * Na mobilních zařízeních nižší kvalita (0.3), na desktopu plná kvalita (1.0)
 * @returns {number}
 */
export function getShaderQuality() {
  if (isMobile()) {
    return 0.3; // 30% kvalita na mobilních zařízeních
  }
  return 1.0; // 100% kvalita na desktopu
}

