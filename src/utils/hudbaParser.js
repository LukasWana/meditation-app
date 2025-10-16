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

export default parseHudbaFileName;
