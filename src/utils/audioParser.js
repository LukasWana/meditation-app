

export const parseAudioFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  // Odstraň .mp3 příponu
  const nameWithoutExt = fileName.replace(/\.mp3$/i, '');

  // Rozděl na části podle pomlčky
  const parts = nameWithoutExt.split('-');
  const prefix = parts[0]; // "muzsky4FSK"
  const topic = parts.slice(1).join('-'); // "uzkost-osamelost"

  // Parsuj prefix: "muzsky4FSK" nebo "muzsky4MSK"
  const match = prefix.match(/^(\w+)(\d+)([A-Z]+)$/);
  if (!match) {
    console.warn(`Nepodařilo se parsovat název souboru: ${fileName}`);
    return null;
  }

  const [, voice, number, codes] = match;

  // Dekóduj kódy
  const targetGender = codes.includes('F') ? 'female' :
                      codes.includes('M') ? 'male' :
                      codes.includes('N') ? 'none' : 'all';

  const language = codes.includes('SK') ? 'sk' :
                   codes.includes('CZ') ? 'cz' :
                   codes.includes('EN') ? 'en' : 'sk';

  // Převeď téma na čitelný formát (uzkost-osamelost -> Uzkost osamelost)
  const readableTopic = topic
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    originalFileName: fileName,
    voice: voice, // "muzsky" nebo "zensky"
    number: parseInt(number), // 4
    codes: codes, // "FSK"
    targetGender: targetGender, // "female", "male", "none", "all"
    language: language, // "sk", "cz", "en"
    topic: topic, // "uzkost-osamelost"
    readableTopic: readableTopic, // "Uzkost osamelost"
    isForUser: (userGender) => {
      // Uživatel nechce být osobní - ukaž vše
      if (userGender === 'none') return true;

      // Uživatel je žena - ukaž soubory pro ženy (4F) + obecné (4N)
      if (userGender === 'female') {
        return codes.includes('F') || codes.includes('N');
      }

      // Uživatel je muž - ukaž soubory pro muže (4M) + obecné (4N)
      if (userGender === 'male') {
        return codes.includes('M') || codes.includes('N');
      }

      // Fallback - ukaž vše
      return true;
    }
  };
};

export const findBestAudioForUser = (audioFiles, userGender, userLanguage = 'sk', topic = null) => {
  if (!audioFiles || audioFiles.length === 0) return null;

  const parsedFiles = audioFiles
    .map(file => ({ file, parsed: parseAudioFileName(file) }))
    .filter(item => item.parsed !== null);

  // Filtruj podle tématu pokud je zadáno
  const filteredFiles = topic
    ? parsedFiles.filter(item => item.parsed.topic.includes(topic))
    : parsedFiles;

  if (filteredFiles.length === 0) return null;

  // Filtruj podle pohlaví uživatele
  const genderFiltered = filteredFiles.filter(item =>
    item.parsed.isForUser(userGender)
  );

  const filesToSearch = genderFiltered.length > 0 ? genderFiltered : filteredFiles;

  // Priorita výběru:
  // 1. Uživatelův hlas + jeho pohlaví + jeho jazyk
  // 2. Uživatelův hlas + obecný obsah + jeho jazyk
  // 3. Jakýkoli hlas + jeho pohlaví + jeho jazyk
  // 4. Uživatelův hlas + jeho pohlaví + jakýkoli jazyk
  // 5. Uživatelův hlas + obecný obsah + jakýkoli jazyk
  // 6. Jakýkoli hlas + obecný obsah + jeho jazyk
  // 7. Jakýkoli hlas + obecný obsah + jakýkoli jazyk

  const userVoice = userGender === 'female' ? 'zensky' :
                   userGender === 'male' ? 'muzsky' : 'auto';

  const priorities = [
    // 1. Uživatelův hlas + jeho pohlaví + jeho jazyk
    (item) => item.parsed.voice === userVoice &&
              item.parsed.targetGender === userGender &&
              item.parsed.language === userLanguage,

    // 2. Uživatelův hlas + obecný obsah + jeho jazyk
    (item) => item.parsed.voice === userVoice &&
              item.parsed.targetGender === 'none' &&
              item.parsed.language === userLanguage,

    // 3. Jakýkoli hlas + jeho pohlaví + jeho jazyk
    (item) => item.parsed.targetGender === userGender &&
              item.parsed.language === userLanguage,

    // 4. Uživatelův hlas + jeho pohlaví + jakýkoli jazyk
    (item) => item.parsed.voice === userVoice &&
              item.parsed.targetGender === userGender,

    // 5. Uživatelův hlas + obecný obsah + jakýkoli jazyk
    (item) => item.parsed.voice === userVoice &&
              item.parsed.targetGender === 'none',

    // 6. Jakýkoli hlas + obecný obsah + jeho jazyk
    (item) => item.parsed.targetGender === 'none' &&
              item.parsed.language === userLanguage,

    // 7. Jakýkoli hlas + obecný obsah + jakýkoli jazyk
    (item) => item.parsed.targetGender === 'none'
  ];

  for (const condition of priorities) {
    const match = filesToSearch.find(condition);
    if (match) return match.file;
  }

  // Fallback - první dostupný soubor
  return filesToSearch[0]?.file || null;
};

export const groupAudioByTopic = (audioFiles) => {
  const grouped = {};

  audioFiles.forEach(fileName => {
    const parsed = parseAudioFileName(fileName);
    if (!parsed) return;

    const topic = parsed.topic;
    if (!grouped[topic]) {
      grouped[topic] = [];
    }

    grouped[topic].push({
      fileName,
      ...parsed
    });
  });

  return grouped;
};

export const getAvailableTopics = (audioFiles) => {
  const topics = new Set();

  audioFiles.forEach(fileName => {
    const parsed = parseAudioFileName(fileName);
    if (parsed && parsed.topic) {
      topics.add(parsed.topic);
    }
  });

  return Array.from(topics);
};
