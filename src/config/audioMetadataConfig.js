/**
 * Konfigurace pro automatizaci synchronizace audio metadat
 * Definuje podporované formáty, složky a pravidla pro zpracování
 */

export const AUDIO_METADATA_CONFIG = {
  // Podporované audio formáty
  supportedFormats: {
    mp3: {
      extensions: ['.mp3'],
      contentType: 'audio/mpeg',
      extractor: 'ffprobe' // nebo 'jsmediatags' pro MP3 tagy
    },
    ogg: {
      extensions: ['.ogg', '.oga'],
      contentType: 'audio/ogg',
      extractor: 'ffprobe'
    }
  },

  // Složky a jejich konfigurace
  folders: {
    hudba: {
      path: 'hudba',
      formats: ['mp3'],
      recursive: true, // Načítat i podsložky
      metadataExtraction: true,
      enabled: true
    },
    slova: {
      path: 'slova',
      formats: ['mp3'],
      recursive: true,
      metadataExtraction: true,
      enabled: true,
      // Speciální metadata pro slova soubory
      extractSpecialMetadata: true,
      specialFields: ['gender', 'topic', 'type']
    },
    dychanie: {
      path: 'dychanie',
      formats: ['ogg', 'mp3'], // Primárně OGG, ale podporuje i MP3 jako fallback
      recursive: true,
      metadataExtraction: true,
      enabled: true
    }
  },

  // Automatická synchronizace
  autoSync: {
    enabled: true,
    trigger: 'storage.onFinalize', // Firebase Storage trigger
    delay: 2000, // Zpoždění před zpracováním (ms)
    retry: {
      enabled: true,
      maxRetries: 3,
      retryDelay: 5000 // 5 sekund
    }
  },

  // Cache konfigurace
  cache: {
    enabled: true,
    ttl: 24 * 60 * 60 * 1000, // 24 hodin
    strategy: 'lru' // Least Recently Used
  },

  // Validace
  validation: {
    minFileSize: 1024, // 1KB minimum
    maxFileSize: 100 * 1024 * 1024, // 100MB maximum
    requiredFields: ['fileName', 'folder', 'downloadURL']
  }
};

/**
 * Zkontroluje, jestli je soubor podporovaný
 */
export function isSupportedFile(fileName) {
  const fileNameLower = fileName.toLowerCase();

  // Zkontroluj formát
  const isSupportedFormat = Object.values(AUDIO_METADATA_CONFIG.supportedFormats).some(
    format => format.extensions.some(ext => fileNameLower.endsWith(ext))
  );

  if (!isSupportedFormat) {
    return false;
  }

  // Zkontroluj složku
  const isInSupportedFolder = Object.values(AUDIO_METADATA_CONFIG.folders).some(
    folder => folder.enabled && fileName.startsWith(`${folder.path}/`)
  );

  return isInSupportedFolder;
}

/**
 * Získá konfiguraci pro složku
 */
export function getFolderConfig(fileName) {
  for (const [key, config] of Object.entries(AUDIO_METADATA_CONFIG.folders)) {
    if (fileName.startsWith(`${config.path}/`)) {
      return config;
    }
  }
  return null;
}

/**
 * Získá konfiguraci pro formát
 */
export function getFormatConfig(fileName) {
  const fileNameLower = fileName.toLowerCase();

  for (const [key, config] of Object.entries(AUDIO_METADATA_CONFIG.supportedFormats)) {
    if (config.extensions.some(ext => fileNameLower.endsWith(ext))) {
      return config;
    }
  }
  return null;
}

export default AUDIO_METADATA_CONFIG;

