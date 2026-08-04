/**
 * Test: Language Filtering Bug in SlovaDataService
 *
 * Root Cause: slovaDataService.filterSlovaItems() checks for language
 * markers in fileName (e.g., fileName.includes('SK')), but FastMetadataService
 * sets fileName as "LANG/file.mp3" format (e.g., "CZ/meditacia.mp3").
 *
 * This causes incorrect filtering:
 * - SK user + "CZ/meditacia.mp3" → filtered out (has "CZ" in name)
 * - SK user + "SK/meditacia.mp3" → shown (has "SK" in name)
 * - But SK user should NOT see CZ files! The logic is backwards!
 */

import { slovaDataService } from '@services/slovaDataService';

describe('slovaDataService - Language Filtering Bug', () => {
  beforeEach(() => {
    // Reset service state
    slovaDataService.isInitialized = false;
    slovaDataService.slovaData = {
      sk: { male: [], female: [], all: [] },
      cz: { male: [], female: [], all: [] },
      en: { male: [], female: [], all: [] }
    };
  });

  const testFiles = [
    {
      fileName: 'SK/uzkost-zen.mp3',
      folder: 'meditacie',
      language: 'SK',
      gender: 'female',
      topic: 'Úzkosť',
      parsed: { gender: 'female', topic: 'Úzkosť', title: 'Úzkosť' }
    },
    {
      fileName: 'SK/strach-muz.mp3',
      folder: 'meditacie',
      language: 'SK',
      gender: 'male',
      topic: 'Strach',
      parsed: { gender: 'male', topic: 'Strach', title: 'Strach' }
    },
    {
      fileName: 'CZ/strach-muz.mp3',
      folder: 'meditacie',
      language: 'CZ',
      gender: 'male',
      topic: 'Strach',
      parsed: { gender: 'male', topic: 'Strach', title: 'Strach' }
    },
    {
      fileName: 'CZ/uzkost-zen.mp3',
      folder: 'meditacie',
      language: 'CZ',
      gender: 'female',
      topic: 'Úzkosť',
      parsed: { gender: 'female', topic: 'Úzkosť', title: 'Úzkosť' }
    },
    {
      fileName: 'EN/stress-woman.mp3',
      folder: 'meditacie',
      language: 'EN',
      gender: 'female',
      topic: 'Stress',
      parsed: { gender: 'female', topic: 'Stress', title: 'Stress' }
    },
    {
      fileName: 'EN/anxiety-man.mp3',
      folder: 'meditacie',
      language: 'EN',
      gender: 'male',
      topic: 'Anxiety',
      parsed: { gender: 'male', topic: 'Anxiety', title: 'Anxiety' }
    }
  ];

  describe('Current buggy behavior', () => {
    test('SK user should see SK files, NOT CZ/EN files', () => {
      const filtered = slovaDataService.filterSlovaItems(testFiles, 'all', 'sk');

      console.log('SK user filtered files:', filtered.map(f => ({
        fileName: f.fileName,
        language: f.language
      })));

      // BUG: Current implementation checks fileName.includes('SK')
      // For "CZ/strah-muz", this returns false (no "SK" in name)
      // But then checks !fileName.includes('CZ') which is ALSO false (has "CZ")
      // So CZ files are CORRECTLY filtered out for SK users

      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(f => {
        // Should only have SK files
        expect(f.fileName).toMatch(/^SK\//);
      });
    });

    test('CZ user should see CZ files, NOT SK/EN files', () => {
      const filtered = slovaDataService.filterSlovaItems(testFiles, 'all', 'cz');

      console.log('CZ user filtered files:', filtered.map(f => ({
        fileName: f.fileName,
        language: f.language
      })));

      // BUG: fileName.includes('CZ') matches "CZ/strah-muz" ✓
      // But also matches "CZ" in other contexts if they exist

      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(f => {
        expect(f.fileName).toMatch(/^CZ\//);
      });
    });

    test('Language property is set but not used for filtering', () => {
      // Demonstrate that files have language property
      testFiles.forEach(f => {
        expect(f.language).toBeDefined();
        expect(['SK', 'CZ', 'EN']).toContain(f.language);
      });

      // But filtering ignores it and uses fileName instead
      const skFiltered = slovaDataService.filterSlovaItems(testFiles, 'all', 'sk');
      const czFiltered = slovaDataService.filterSlovaItems(testFiles, 'all', 'cz');

      // Files with language='CZ' should be filtered out for SK users
      const czFilesForSkUser = skFiltered.filter(f => f.language === 'CZ');
      expect(czFilesForSkUser.length).toBe(0); // This passes, but why?

      // Let's check what's actually happening
      console.log('SK user got files:', skFiltered.map(f => ({
        fileName: f.fileName,
        language: f.language
      })));
    });
  });

  describe('Expected correct behavior', () => {
    test('Should use language property instead of fileName', () => {
      // This is how the filtering SHOULD work
      const filterByLanguage = (items, userLanguage) => {
        const langMap = { 'sk': 'SK', 'cz': 'CZ', 'en': 'EN' };
        const targetLang = langMap[userLanguage.toLowerCase()] || 'SK';

        return items.filter(item => {
          // Use language property, not fileName
          return item.language === targetLang;
        });
      };

      const skFiles = filterByLanguage(testFiles, 'sk');
      expect(skFiles.length).toBe(2);
      expect(skFiles.every(f => f.language === 'SK')).toBe(true);

      const czFiles = filterByLanguage(testFiles, 'cz');
      expect(czFiles.length).toBe(2);
      expect(czFiles.every(f => f.language === 'CZ')).toBe(true);

      const enFiles = filterByLanguage(testFiles, 'en');
      expect(enFiles.length).toBe(2);
      expect(enFiles.every(f => f.language === 'EN')).toBe(true);
    });
  });
});
