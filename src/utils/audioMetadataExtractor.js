/**
 * Audio Metadata Extractor
 * Extrahuje metadata z MP3 souborů včetně délky
 */

/**
 * Získá délku MP3 souboru z URL s CORS podporou
 * @param {string} audioUrl - URL MP3 souboru
 * @returns {Promise<number>} - Délka v sekundách
 */
export const getAudioDuration = (audioUrl) => {
  return new Promise((resolve, reject) => {
    // Kontrola platnosti URL
    if (!audioUrl || typeof audioUrl !== 'string') {
      console.warn('Invalid audio URL:', audioUrl);
      resolve(0);
      return;
    }

    const audio = new Audio();
    let resolved = false;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('canplaythrough', onCanPlayThrough);
      audio.removeEventListener('error', onError);
      audio.src = '';
      audio.load(); // Reset audio element
    };

    const checkDuration = () => {
      // Zkontroluj, zda máme validní duration
      const duration = audio.duration;
      if (isFinite(duration) && duration > 0 && !isNaN(duration)) {
        const roundedDuration = Math.round(duration);
        if (roundedDuration > 0) {
          return roundedDuration;
        }
      }
      return null;
    };

    const resolveWithDuration = (source) => {
      if (resolved) return;
      const duration = checkDuration();
      if (duration !== null) {
        resolved = true;
        cleanup();
        console.log(`✅ Duration loaded from ${source}: ${duration}s for`, audioUrl);
        resolve(duration);
        return true;
      }
      return false;
    };

    const onLoadedMetadata = () => {
      // Počkej chvíli a pak zkontroluj duration
      setTimeout(() => {
        if (!resolved && audio.readyState >= 1) { // HAVE_METADATA
          resolveWithDuration('loadedmetadata');
        }
      }, 500); // 500ms delay pro zajištění načtení metadat
    };

    const onDurationChange = () => {
      resolveWithDuration('durationchange');
    };

    const onCanPlayThrough = () => {
      resolveWithDuration('canplaythrough');
    };

    const onError = (e) => {
      if (resolved) return;
      resolved = true;
      cleanup();

      const errorMessage = e.target?.error?.message || e.message || 'Unknown audio loading error';
      console.warn('Failed to load audio metadata:', errorMessage, 'URL:', audioUrl);
      resolve(0); // Return 0 if failed to load
    };

    // Přidej všechny event listeners
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('canplaythrough', onCanPlayThrough);
    audio.addEventListener('error', onError);

    // Set timeout to prevent hanging (zvýšeno na 15s kvůli větším souborům)
    timeoutId = setTimeout(() => {
      if (resolved) return;

      // Před timeout zkontroluj ještě jednou duration
      const duration = checkDuration();
      if (duration !== null) {
        resolved = true;
        cleanup();
        console.log(`✅ Duration loaded before timeout: ${duration}s for`, audioUrl);
        resolve(duration);
        return;
      }

      resolved = true;
      cleanup();
      console.warn('Audio metadata loading timeout for URL:', audioUrl);
      resolve(0);
    }, 15000); // 15 second timeout

    try {
      // Nastav preload na metadata (bez crossOrigin - jako v přehrávači)
      audio.preload = 'metadata';

      // Pro Firebase Storage URL nepoužívej crossOrigin - podobně jako v přehrávači
      audio.src = audioUrl;

      // Explicitně spusť načítání
      audio.load();

      // Pokud už máme duration, použij ji okamžitě
      setTimeout(() => {
        if (!resolved) {
          const duration = checkDuration();
          if (duration !== null) {
            clearTimeout(timeoutId);
            resolveWithDuration('immediate');
          }
        }
      }, 100);

    } catch (error) {
      clearTimeout(timeoutId);
      if (resolved) return;
      resolved = true;
      cleanup();
      console.warn('Error setting audio source:', error.message, 'URL:', audioUrl);
      resolve(0);
    }
  });
};

/**
 * Alternativní metoda pro načítání audio metadat s fetch API
 * @param {string} audioUrl - URL MP3 souboru
 * @returns {Promise<number>} - Délka v sekundách
 */
export const getAudioDurationWithFetch = async (audioUrl) => {
  try {
    // Try to fetch audio file with CORS headers
    const response = await fetch(audioUrl, {
      method: 'HEAD', // Only get headers, not the full file
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      console.warn('Failed to fetch audio headers:', response.status, audioUrl);
      return 0;
    }

    // Try to get duration from Content-Length and estimate
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      // Rough estimation: MP3 ~128kbps = 16KB/s
      const estimatedDuration = Math.round(parseInt(contentLength) / 16000);
      if (estimatedDuration > 0) {
        console.log('Estimated audio duration:', estimatedDuration, 'seconds for', audioUrl);
        return estimatedDuration;
      }
    }

    return 0;
  } catch (error) {
    console.warn('Failed to fetch audio with fetch API:', error.message, audioUrl);
    return 0;
  }
};

/**
 * Formátuje délku v sekundách do čitelného formátu
 * @param {number} seconds - Délka v sekundách
 * @returns {string} - Formátovaná délka (např. "3:45")
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return 'N/A';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Formátuje délku v sekundách do detailního formátu
 * @param {number} seconds - Délka v sekundách
 * @returns {string} - Detailní formát (např. "3 min 45 sec")
 */
export const formatDurationDetailed = (seconds) => {
  if (!seconds || seconds === 0) return 'N/A';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  let result = '';
  if (hours > 0) {
    result += `${hours}h `;
  }
  if (minutes > 0) {
    result += `${minutes}m `;
  }
  result += `${remainingSeconds}s`;

  return result.trim();
};

/**
 * Extrahuje metadata z MP3 souboru
 * @param {string} audioUrl - URL MP3 souboru
 * @param {Object} options - Volitelné možnosti
 * @param {boolean} options.useFetchFallback - Použít fetch API jako fallback (default: false kvůli CORS problémům)
 * @returns {Promise<Object>} - Metadata objekt
 */
export const extractAudioMetadata = async (audioUrl, options = {}) => {
  const { useFetchFallback = false } = options;

  try {
    // Try primary method first (HTML5 Audio API)
    let duration = await getAudioDuration(audioUrl);

    // If primary method failed and fetch fallback is enabled, try alternative method
    // NOTE: fetch API má CORS problémy s Firebase Storage, takže defaultně zakázáno
    if (duration === 0 && useFetchFallback && audioUrl.includes('firebasestorage.googleapis.com')) {
      console.log('Primary method failed, trying alternative method for:', audioUrl);
      try {
        duration = await getAudioDurationWithFetch(audioUrl);
      } catch (fetchError) {
        // Ignoruj fetch errors - CORS problémy jsou očekávané
        console.warn('Fetch fallback failed (expected CORS issue):', fetchError.message);
      }
    }

    return {
      duration: duration,
      durationFormatted: formatDuration(duration),
      durationDetailed: formatDurationDetailed(duration),
      isValid: duration > 0
    };
  } catch (error) {
    const errorMessage = error.message || error.toString() || 'Unknown error';
    console.warn('Failed to extract audio metadata:', errorMessage, 'URL:', audioUrl);
    return {
      duration: 0,
      durationFormatted: 'N/A',
      durationDetailed: 'N/A',
      isValid: false
    };
  }
};

/**
 * Batch extrakce metadat pro více souborů
 * @param {Array} audioUrls - Pole URL MP3 souborů
 * @returns {Promise<Array>} - Pole metadata objektů
 */
export const extractBatchAudioMetadata = async (audioUrls) => {
  const results = [];

  for (const url of audioUrls) {
    try {
      const metadata = await extractAudioMetadata(url);
      results.push({
        url,
        ...metadata
      });
    } catch (error) {
      const errorMessage = error.message || error.toString() || 'Unknown error';
      console.warn(`Failed to extract metadata for ${url}:`, errorMessage);
      results.push({
        url,
        duration: 0,
        durationFormatted: 'N/A',
        durationDetailed: 'N/A',
        isValid: false
      });
    }
  }

  return results;
};

export default {
  getAudioDuration,
  getAudioDurationWithFetch,
  formatDuration,
  formatDurationDetailed,
  extractAudioMetadata,
  extractBatchAudioMetadata
};
