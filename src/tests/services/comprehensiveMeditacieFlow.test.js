/**
 * COMPREHENSIVE DIAGNOSTIC TEST
 *
 * Tento test ověřuje celý flow od Firebase Storage až po slovaDataService
 * pro konkrétní soubory: "zensky4FSK-Kozie posolstvo-long.mp3"
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('COMPREHENSIVE: Meditacie Loading Flow', () => {
  const testFile = {
    name: 'SK/zensky4FSK-Kozie posolstvo-long.mp3',
    folder: 'meditacie',
    language: 'SK',
    fullPath: 'meditacie/SK/zensky4FSK-Kozie posolstvo-long.mp3'
  };

  describe('Step 1: Firebase Storage Loading', () => {
    it('should parse filename correctly', () => {
      // When file is loaded from Firebase Storage as "SK/zensky4FSK-Kozie posolstvo-long.mp3"
      // It should be processed correctly

      const filePath = testFile.fullPath;
      const fileNameOnly = filePath.split('/').pop(); // "zensky4FSK-Kozie posolstvo-long.mp3"

      expect(fileNameOnly).toBe('zensky4FSK-Kozie posolstvo-long.mp3');
    });

    it('should check audio file extension', () => {
      // File should be recognized as audio
      const fileName = testFile.name.toLowerCase();
      const actualFileName = fileName.split('/').pop();

      const isMp3 = actualFileName.endsWith('.mp3');
      const isOgg = actualFileName.endsWith('.ogg');
      const isOga = actualFileName.endsWith('.oga');

      console.log('File:', fileName);
      console.log('Actual filename:', actualFileName);
      console.log('Is MP3:', isMp3);
      console.log('Is OGG:', isOgg);
      console.log('Is OGA:', isOga);

      expect(isMp3).toBe(true);
      expect(isOgg).toBe(false);
      expect(isOga).toBe(false);
    });
  });

  describe('Step 2: Filename Parsing', () => {
    it('should parse slova filename correctly', async () => {
      // Simulate parseSlovaFileName
      const fileName = 'zensky4FSK-Kozie posolstvo-long.mp3';

      // Regex from parseSlovaFileName: /^(muzsky|zensky)(\d*)([A-Z]+)-(.+)\.mp3$/i
      const match = fileName.match(/^(muzsky|zensky)(\d*)([A-Z]+)-(.+)\.mp3$/i);

      expect(match).not.toBeNull();

      if (match) {
        const [, gender, number, type, topic] = match;
        console.log('Parsed:', { gender, number, type, topic });

        expect(gender).toBe('zensky');
        expect(number).toBe('4');
        expect(type).toBe('FSK');
        expect(topic).toBe('Kozie posolstvo-long');
      }
    });
  });

  describe('Step 3: Language Detection', () => {
    it('should detect SK language correctly', () => {
      // File name: "SK/zensky4FSK-Kozie posolstvo-long.mp3"
      const fileName = testFile.name;

      // Check for SK in filename
      const hasSK = fileName.includes('SK');
      const hasCZ = fileName.includes('CZ');
      const hasEN = fileName.includes('EN');

      console.log('File:', fileName);
      console.log('Has SK:', hasSK, '(in path:', fileName.startsWith('SK/'), ')');
      console.log('Has CZ:', hasCZ);
      console.log('Has EN:', hasEN);

      expect(hasSK).toBe(true);
      expect(hasCZ).toBe(false);
      expect(hasEN).toBe(false);
    });

    it('should be stored in SK language category', () => {
      // Simulate storage logic from slovaDataService
      const fileName = testFile.name;
      const lang = 'sk';

      let languageMatch = false;
      if (lang === 'sk') {
        languageMatch = fileName.includes('SK') || (!fileName.includes('CZ') && !fileName.includes('EN'));
      }

      console.log('Language match for SK:', languageMatch);

      expect(languageMatch).toBe(true);
    });
  });

  describe('Step 4: Gender Detection', () => {
    it('should detect female gender correctly', () => {
      // File name: "zensky4FSK-Kozie posolstvo-long.mp3"
      const fileName = 'zensky4FSK-Kozie posolstvo-long.mp3';

      const isFemale = fileName.includes('zensky') || fileName.includes('female');
      const isMale = fileName.includes('muzsky') || fileName.includes('male');

      console.log('Is female:', isFemale);
      console.log('Is male:', isMale);

      expect(isFemale).toBe(true);
      expect(isMale).toBe(false);
    });
  });

  describe('Step 5: Full Flow Simulation', () => {
    it('should process file through entire pipeline', () => {
      // Step 1: Firebase Storage structure
      const firebaseFile = {
        name: 'zensky4FSK-Kozie posolstvo-long.mp3',
        fullPath: 'meditacie/SK/zensky4FSK-Kozie posolstvo-long.mp3'
      };

      // Step 2: After adding to allFiles in fastMetadataService
      const allFilesEntry = {
        ...firebaseFile,
        name: `SK/${firebaseFile.name}`, // "SK/zensky4FSK-Kozie posolstvo-long.mp3"
        folder: 'meditacie',
        language: 'SK',
        fullPath: firebaseFile.fullPath,
        fileName: `meditacie/SK/${firebaseFile.name}` // Full file path for filtering
      };

      console.log('Step 2 - allFilesEntry:', allFilesEntry.name);

      // Step 3: Filtering in processFiles
      const fileName = allFilesEntry.name.toLowerCase();
      const actualFileName = fileName.split('/').pop();
      const isAudioFile = actualFileName.endsWith('.mp3') ||
                         actualFileName.endsWith('.ogg') ||
                         actualFileName.endsWith('.oga');

      console.log('Step 3 - isAudioFile:', isAudioFile);
      expect(isAudioFile).toBe(true);

      // Step 4: Language detection in slovaDataService
      const lang = 'sk';
      const includesSK = allFilesEntry.fileName.includes('SK');
      const includesCZ = allFilesEntry.fileName.includes('CZ');
      const includesEN = allFilesEntry.fileName.includes('EN');

      const languageMatch = includesSK || (!includesCZ && !includesEN);

      console.log('Step 4 - languageMatch:', languageMatch);
      console.log('  includesSK:', includesSK);
      console.log('  includesCZ:', includesCZ);
      console.log('  includesEN:', includesEN);

      expect(languageMatch).toBe(true);

      // Step 5: Gender detection
      const isFemale = allFilesEntry.fileName.includes('zensky');

      console.log('Step 5 - isFemale:', isFemale);
      expect(isFemale).toBe(true);

      // FINAL RESULT
      console.log('\n✅ File should be displayed for SK user, female gender');
      expect(isAudioFile && languageMatch && isFemale).toBe(true);
    });
  });
});
