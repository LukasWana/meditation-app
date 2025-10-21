/**
 * Audio Metadata Extractor
 * Extrahuje metadata z MP3 souborů včetně délky
 */

/**
 * Získá délku MP3 souboru z URL
 * @param {string} audioUrl - URL MP3 souboru
 * @returns {Promise<number>} - Délka v sekundách
 */
export const getAudioDuration = (audioUrl) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();

    audio.addEventListener('loadedmetadata', () => {
      const duration = Math.round(audio.duration);
      resolve(duration);
    });

    audio.addEventListener('error', (e) => {
      console.warn('Failed to load audio metadata:', e);
      resolve(0); // Return 0 if failed to load
    });

    // Set timeout to prevent hanging
    setTimeout(() => {
      resolve(0);
    }, 10000); // 10 second timeout

    audio.src = audioUrl;
    audio.load();
  });
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
 * @returns {Promise<Object>} - Metadata objekt
 */
export const extractAudioMetadata = async (audioUrl) => {
  try {
    const duration = await getAudioDuration(audioUrl);

    return {
      duration: duration,
      durationFormatted: formatDuration(duration),
      durationDetailed: formatDurationDetailed(duration),
      isValid: duration > 0
    };
  } catch (error) {
    console.warn('Failed to extract audio metadata:', error);
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
      console.warn(`Failed to extract metadata for ${url}:`, error);
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
  formatDuration,
  formatDurationDetailed,
  extractAudioMetadata,
  extractBatchAudioMetadata
};
