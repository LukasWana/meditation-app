const MEDITACE_ROOTS = ['meditacie'];

const SUPPORTED_MEDITACE_LANGUAGES = ['CZ', 'SK', 'EN'];

const isMeditaceFilePath = (path = '') => {
  if (typeof path !== 'string') {
    return false;
  }
  const lower = path.toLowerCase();
  return lower.startsWith('meditace/') || lower.startsWith('meditacie/');
};

const normalizeMeditaceFolder = (folder = '') => {
  if (!folder) {
    return folder;
  }
  const lower = folder.toLowerCase();
  if (lower === 'meditacie') {
    return 'meditace';
  }
  return folder;
};

const extractMeditaceLanguage = (path = '') => {
  if (!path) {
    return 'CZ';
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) {
    return 'CZ';
  }

  const rootIndex = segments.findIndex(segment => {
    const lower = segment.toLowerCase();
    return lower === 'meditace' || lower === 'meditacie';
  });

  if (rootIndex >= 0 && rootIndex + 1 < segments.length) {
    const candidate = segments[rootIndex + 1].toUpperCase();
    if (SUPPORTED_MEDITACE_LANGUAGES.includes(candidate)) {
      return candidate;
    }
  }

  return 'CZ';
};

export {
  MEDITACE_ROOTS,
  SUPPORTED_MEDITACE_LANGUAGES,
  isMeditaceFilePath,
  normalizeMeditaceFolder,
  extractMeditaceLanguage
};

