

export const parseHudbaFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  try {
    // Starý formát 00--00--00--00- se už nepoužívá
    // Pro jednoduché názvy souborů (generator.mp3, meditacie.mp3, atd.)
    const nameWithoutExt = fileName.replace(/\.mp3$/i, '');

    return {
      originalFileName: fileName,
      name: nameWithoutExt,
      type: 'simple',
      isHudba: true,
      isAlbum: false,
      trackName: nameWithoutExt,
      albumName: null
    };

  } catch (error) {
    console.error(`Chyba při parsování hudebního souboru ${fileName}:`, error);
    return null;
  }
};

export const parseAlbumFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  try {
    // Nový formát: "Album Name - Track Number Track Name.mp3"
    const match = fileName.match(/^(.+?)\s*-\s*(\d+)\s+(.+?)\.mp3$/i);

    if (match) {
      const [, albumName, trackNumber, trackName] = match;
      // Debug log deaktivován - příliš mnoho výpisů (voláno pro každý soubor)
      // const DEBUG_HUDBA_PARSER = false;
      // if (DEBUG_HUDBA_PARSER) {
      //   console.log(`🎵 Parsed album file: ${fileName} -> Album: "${albumName.trim()}", Track: ${trackNumber}, Name: "${trackName.trim()}"`);
      // }

      return {
        originalFileName: fileName,
        albumName: albumName.trim(),
        trackNumber: parseInt(trackNumber, 10),
        trackName: trackName.trim(),
        type: 'album',
        isAlbum: true,
        isHudba: true
      };
    }

    return null;

  } catch (error) {
    console.error(`Chyba při parsování album souboru ${fileName}:`, error);
    return null;
  }
};

export const parseSlovaFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  try {
    // Extrahuj pouze název souboru bez cesty
    const fileNameOnly = fileName.split('/').pop();

    // Regex pro slova soubory: muzsky4FSK-uzkost-osamelost.mp3
    const match = fileNameOnly.match(/^(muzsky|zensky)(\d+)([A-Z]+)-(.+)\.mp3$/i);

    if (!match) {
      return null;
    }

    const [, gender, number, type, topic] = match;

    return {
      originalFileName: fileName,
      gender: gender === 'muzsky' ? 'male' : 'female',
      number: parseInt(number),
      type,
      topic: topic.replace(/-/g, ' '),
      title: topic.replace(/-/g, ' '), // Čistý název bez pohlaví
      isHudba: false,
      isAlbum: false,
      trackName: topic.replace(/-/g, ' '), // Čistý název bez pohlaví
      albumName: topic.replace(/-/g, ' '),
      // Metoda pro filtrování podle pohlaví uživatele
      isForUser: (userGender) => {
        // Pokud uživatel nemá nastavené pohlaví, zobraz všechny soubory
        if (!userGender || userGender === 'none') return true;

        // Pro muže: zobraz soubory s mužským hlasem (muzsky)
        // Pro ženy: zobraz soubory se ženským hlasem (zensky)
        const fileGender = gender === 'muzsky' ? 'male' : 'female';
        return fileGender === userGender;
      }
    };
  } catch (error) {
    console.warn(`Chyba při parsování slova souboru: ${fileName}`, error);
    return null;
  }
};

export const parseAudioFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  // Nejdřív zkusíme slova formát (pro mluvené slovo)
  const slovaResult = parseSlovaFileName(fileName);
  if (slovaResult) {
    return slovaResult;
  }

  // Pak zkusíme album formát (pro soubory ze složek)
  const albumResult = parseAlbumFileName(fileName);
  if (albumResult) {
    return albumResult;
  }

  // Pak zkusíme původní hudební formát
  const hudbaResult = parseHudbaFileName(fileName);
  if (hudbaResult) {
    return hudbaResult;
  }

  // Zkusíme album formát: "Album Name - Track Number Track Name.mp3"
  // Např: "Ambient Journey - 02 Haluly.mp3"
  const albumMatch = fileName.match(/^(.+?)\s*-\s*(\d+)\s+(.+?)\.mp3$/i);
  if (albumMatch) {
    const [, albumName, trackNumber, trackName] = albumMatch;
      // Debug log deaktivován - příliš mnoho výpisů
      // if (DEBUG_HUDBA_PARSER) {
      //   console.log(`🎵 Parsed album track: ${fileName} -> Album: "${albumName.trim()}", Track: ${trackNumber}, Name: "${trackName.trim()}"`);
      // }
    return {
      originalFileName: fileName,
      name: trackName.trim(),
      type: 'album_track',
      isHudba: true,
      isAlbum: true,
      trackName: trackName.trim(),
      albumName: albumName.trim(),
      trackNumber: parseInt(trackNumber, 10)
    };
  }

  // Pro jednoduché názvy souborů (generator.mp3, meditacie.mp3, atd.)
  // Vytvoříme základní parsed objekt
  const nameWithoutExt = fileName.replace(/\.mp3$/i, '');

  return {
    originalFileName: fileName,
    name: nameWithoutExt,
    type: 'simple', // Označíme jako jednoduchý soubor
    isHudba: false, // Bude se určovat podle složky
    isAlbum: false,
    trackName: nameWithoutExt,
    albumName: nameWithoutExt
  };
};

export default parseHudbaFileName;
