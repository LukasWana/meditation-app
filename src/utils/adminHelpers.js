// Pomocné funkce pro extrakci informací ze jména souboru
export const extractDisplayName = (fileName) => {
  // Podporuje MP3, OGG, OGA formáty
  const nameWithoutExt = fileName.replace(/\.(mp3|ogg|oga)$/i, '');
  const parts = nameWithoutExt.split('/');
  const lastPart = parts[parts.length - 1];

  // Odstraň prefixy jako "muzsky4FSK-", "zensky4MSK-", "zensky4FSK-", "muzsky4MSK-"
  const cleanName = lastPart.replace(/^(muzsky|zensky)\d*[A-Z]+-?/i, '');

  // Nahraď pomlčky mezerami a velkými písmeny
  return cleanName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const extractSubFolder = (fullPath) => {
  const parts = fullPath.split('/');
  return parts.length > 2 ? parts[1] : null;
};

export const extractGender = (fileName) => {
  if (fileName.includes('muzsky') || fileName.includes('MSK')) return 'male';
  if (fileName.includes('zensky') || fileName.includes('FSK')) return 'female';
  return null;
};

export const extractTopic = (fileName) => {
  // Extrahuj téma ze jména souboru (podporuje MP3, OGG, OGA formáty)
  const match = fileName.match(/-([^-]+)\.(mp3|ogg|oga)$/i);
  return match ? match[1] : null;
};

export const extractType = (fileName) => {
  if (fileName.includes('MSK')) return 'MSK';
  if (fileName.includes('FSK')) return 'FSK';
  return null;
};

// Odhad délky z velikosti souboru
// Pro MP3: přibližně 1MB = 1 minuta
// Pro OGG: přibližně 0.5MB = 1 minuta (OGG má lepší kompresi)
export const estimateDurationFromSize = (sizeInBytes, contentType = 'audio/mpeg') => {
  if (sizeInBytes <= 0) {
    // Pokud nemáme velikost, použij výchozí odhad (5 minut)
    return 300; // 5 minut
  }
  const sizeInMB = sizeInBytes / (1024 * 1024);

  // Pro OGG použij jiný přepočet (lepší komprese)
  const isOgg = contentType === 'audio/ogg';
  const mbPerMinute = isOgg ? 0.5 : 1.0; // OGG má lepší kompresi

  return Math.round(sizeInMB * 60 / mbPerMinute); // sekundy
};

// Formátování délky
export const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Detailní formátování délky
export const formatDurationDetailed = (seconds) => {
  if (!seconds || seconds <= 0) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
};
