/**
 * Parser pro hudební soubory s formátem: 00--00--00--79-mediatacie-002.mp3
 * Formát: XX--XX--XX--XX-name-YYY.mp3
 * kde XX--XX--XX--XX je číslování, name je název, YYY je verze (volitelná)
 */

export const parseHudbaFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  try {
    // Regex pro hudební soubory: 00--00--00--79-mediatacie-002.mp3
    // Číslování: XX--XX--XX--XX
    // Název: mediatacie (může obsahovat pomlčky)
    // Verze: -002 (volitelná)
    const match = fileName.match(/^(\d{2}--\d{2}--\d{2}--\d{2})-([^.]+?)(?:-(\d{3}))?\.mp3$/i);

    if (!match) {
      console.warn(`Nepodařilo se parsovat název souboru: ${fileName}`);
      return null;
    }

    const [, numbering, name, version] = match;

    return {
      originalFileName: fileName,
      numbering,
      name,
      version: version || '001', // Výchozí verze je 001
      fullNumbering: numbering,
      type: 'hudba',
      isHudba: true
    };

  } catch (error) {
    console.error(`Chyba při parsování hudebního souboru ${fileName}:`, error);
    return null;
  }
};

/**
 * Parser pro album soubory s formátem: 00--00--00--00- - Ambient Journey - 01 Zhooliox.mp3
 * Formát: XX--XX--XX--XX- - Album Name - Track Number Track Name.mp3
 * kde XX--XX--XX--XX je číslování, Album Name je název alba, Track Number je číslo skladby, Track Name je název skladby
 */
export const parseAlbumFileName = (fileName) => {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }


  try {
    // Regex pro album soubory: 00--00--00--00- - Ambient Journey - 01 Zhooliox.mp3
    // Číslování: XX--XX--XX--XX-
    // Název alba: Ambient Journey (může obsahovat mezery a pomlčky)
    // Číslo skladby: 01
    // Název skladby: Zhooliox
    const match = fileName.match(/^(\d{2}--\d{2}--\d{2}--\d{2})- - (.+?) - (\d{2}) (.+)\.mp3$/i);

    if (!match) {
      // Zkusíme alternativní formát bez pomlček kolem názvu alba
      const altMatch = fileName.match(/^(\d{2}--\d{2}--\d{2}--\d{2})- (.+?) - (\d{2}) (.+)\.mp3$/i);

      if (altMatch) {
        const [, numbering, albumName, trackNumber, trackName] = altMatch;
        return {
          originalFileName: fileName,
          numbering: numbering,
          albumName: albumName.trim(),
          trackNumber: parseInt(trackNumber, 10),
          trackName: trackName.trim(),
          fullNumbering: numbering,
          type: 'album',
          isAlbum: true
        };
      }

      return null;
    }

    const [, numbering, albumName, trackNumber, trackName] = match;

    return {
      originalFileName: fileName,
      numbering,
      albumName: albumName.trim(),
      trackNumber: parseInt(trackNumber, 10),
      trackName: trackName.trim(),
      fullNumbering: numbering,
      type: 'album',
      isAlbum: true
    };

  } catch (error) {
    console.error(`Chyba při parsování album souboru ${fileName}:`, error);
    return null;
  }
};

/**
 * Univerzální parser - zkusí oba formáty
 */
export const parseAudioFileName = (fileName) => {
  // Nejdřív zkusíme původní hudební formát (častější)
  const hudbaResult = parseHudbaFileName(fileName);
  if (hudbaResult) {
    return hudbaResult;
  }

  // Pak zkusíme album formát
  const albumResult = parseAlbumFileName(fileName);
  if (albumResult) {
    return albumResult;
  }
  return null;
};

export default parseHudbaFileName;
