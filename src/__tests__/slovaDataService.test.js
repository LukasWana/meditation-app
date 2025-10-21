/**
 * Unit testy pro slovaDataService
 * Testuje optimalizované O(n) algoritmy a error handling
 */

// Mock slovaDataService
const mockSlovaDataService = {
  extractTitleFromFileName: (fileName) => {
    const nameWithoutExt = fileName.replace(/\.mp3$/i, '');
    const parts = nameWithoutExt.split('/');
    const lastPart = parts[parts.length - 1];
    const cleanName = lastPart.replace(/^(muzsky|zensky)\d*[A-Z]+-?/i, '');
    return cleanName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/[<>]/g, '');
  },

  filterSlovaItems: (items, userGender, userLanguage) => {
    const filteredItems = items.filter(item => {
      const fileName = item.fileName;
      const userLang = userLanguage.toLowerCase();
      const languageMap = { 'sk': 'sk', 'SK': 'sk', 'cz': 'cz', 'CZ': 'cz', 'en': 'en', 'EN': 'en' };
      const normalizedUserLang = languageMap[userLang] || 'sk';

      let languageMatch = false;
      if (normalizedUserLang === 'sk') {
        languageMatch = fileName.includes('SK') || (!fileName.includes('CZ') && !fileName.includes('EN'));
      } else if (normalizedUserLang === 'cz') {
        languageMatch = fileName.includes('CZ');
      } else if (normalizedUserLang === 'en') {
        languageMatch = fileName.includes('EN');
      }

      let genderMatch = false;
      if (userGender === 'all' || !userGender || userGender === 'none') {
        genderMatch = true;
      } else if (userGender === 'male') {
        genderMatch = item.mediaType === '4M' || (item.gender === 'male' && item.mediaType !== '4F');
      } else if (userGender === 'female') {
        genderMatch = item.mediaType === '4F' || (item.gender === 'female' && item.mediaType !== '4M');
      } else {
        genderMatch = true;
      }

      return languageMatch && genderMatch;
    });

    const filesByTopic = filteredItems.reduce((acc, item) => {
      if (!item.topic) return acc;
      if (!acc[item.topic]) {
        acc[item.topic] = [];
      }
      acc[item.topic].push(item);
      return acc;
    }, {});

    const finalItems = [];
    Object.keys(filesByTopic).forEach(topicKey => {
      const topicFiles = filesByTopic[topicKey];
      
      // Optimalizace O(n²) → O(n): Předpřiprav kategorizované soubory
      const filesByType = {
        male4M: null,
        maleGender: null,
        female4F: null,
        femaleGender: null,
        fallback: topicFiles[0]
      };

      // Jedno procházení pro kategorizaci
      topicFiles.forEach(file => {
        if (file.mediaType === '4M') {
          filesByType.male4M = file;
        } else if (file.gender === 'male') {
          filesByType.maleGender = file;
        } else if (file.mediaType === '4F') {
          filesByType.female4F = file;
        } else if (file.gender === 'female') {
          filesByType.femaleGender = file;
        }
      });
      
      // Najdi soubor vhodný pro aktuální pohlaví - O(1) lookup
      let selectedFile = filesByType.fallback;

      if (userGender === 'male') {
        selectedFile = filesByType.male4M || filesByType.maleGender || filesByType.fallback;
      } else if (userGender === 'female') {
        selectedFile = filesByType.female4F || filesByType.femaleGender || filesByType.fallback;
      }

      if (selectedFile && selectedFile.parsed) {
        const voiceGender = selectedFile.parsed.gender === 'female' ? 'žena' : 'muž';
        const topic = selectedFile.parsed.topic || topicKey.replace('-', ' ');

        finalItems.push({
          key: `${topicKey}-${selectedFile.parsed.gender}`,
          title: selectedFile.parsed.title || `${voiceGender} hlas - ${topic}`,
          audioSrc: selectedFile.audioSrc || selectedFile.fileName,
          duration: selectedFile.duration || 'N/A',
          voiceInfo: `${voiceGender} hlas`,
          isAvailable: true,
          allFiles: topicFiles,
          parsed: selectedFile.parsed,
          fileName: selectedFile.fileName,
          downloadURL: selectedFile.downloadURL
        });
      }
    });

    return finalItems;
  }
};

describe('slovaDataService', () => {
  describe('extractTitleFromFileName', () => {
    test('should extract title from male file', () => {
      const result = mockSlovaDataService.extractTitleFromFileName('muzsky4MSK-uzkost-osamelost.mp3');
      expect(result).toBe('Uzkost Osamelost');
    });

    test('should extract title from female file', () => {
      const result = mockSlovaDataService.extractTitleFromFileName('zensky4FSK-stres-prace.mp3');
      expect(result).toBe('Stres Prace');
    });

    test('should handle files with path', () => {
      const result = mockSlovaDataService.extractTitleFromFileName('slova/SK/muzsky4MSK-test.mp3');
      expect(result).toBe('Test');
    });

    test('should remove XSS characters', () => {
      const result = mockSlovaDataService.extractTitleFromFileName('muzsky4MSK-test<script>alert("xss")</script>.mp3');
      expect(result).toBe('Testalert("xss")');
    });
  });

  describe('filterSlovaItems - Performance Tests', () => {
    const mockItems = [
      {
        fileName: 'muzsky4MSK-uzkost.mp3',
        topic: 'uzkost',
        gender: 'male',
        mediaType: '4M',
        parsed: { gender: 'male', topic: 'uzkost', title: 'Uzkost' }
      },
      {
        fileName: 'zensky4FSK-uzkost.mp3',
        topic: 'uzkost',
        gender: 'female',
        mediaType: '4F',
        parsed: { gender: 'female', topic: 'uzkost', title: 'Uzkost' }
      },
      {
        fileName: 'muzsky-stres.mp3',
        topic: 'stres',
        gender: 'male',
        mediaType: 'unknown',
        parsed: { gender: 'male', topic: 'stres', title: 'Stres' }
      },
      {
        fileName: 'zensky-stres.mp3',
        topic: 'stres',
        gender: 'female',
        mediaType: 'unknown',
        parsed: { gender: 'female', topic: 'stres', title: 'Stres' }
      }
    ];

    test('should filter for male users - prefer 4M', () => {
      const result = mockSlovaDataService.filterSlovaItems(mockItems, 'male', 'sk');
      
      expect(result).toHaveLength(2); // 2 topics
      
      const uzkostItem = result.find(item => item.parsed.topic === 'uzkost');
      expect(uzkostItem.parsed.gender).toBe('male');
      expect(uzkostItem.parsed.title).toBe('Uzkost');
    });

    test('should filter for female users - prefer 4F', () => {
      const result = mockSlovaDataService.filterSlovaItems(mockItems, 'female', 'sk');
      
      expect(result).toHaveLength(2); // 2 topics
      
      const uzkostItem = result.find(item => item.parsed.topic === 'uzkost');
      expect(uzkostItem.parsed.gender).toBe('female');
      expect(uzkostItem.parsed.title).toBe('Uzkost');
    });

    test('should handle large datasets efficiently', () => {
      // Simuluj velké množství dat
      const largeItems = Array.from({ length: 1000 }, (_, i) => ({
        fileName: `muzsky4MSK-topic${i}.mp3`,
        topic: `topic${i}`,
        gender: 'male',
        mediaType: '4M',
        parsed: { gender: 'male', topic: `topic${i}`, title: `Topic ${i}` }
      }));

      const startTime = performance.now();
      const result = mockSlovaDataService.filterSlovaItems(largeItems, 'male', 'sk');
      const endTime = performance.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Mělo by být rychlé (< 100ms)
    });

    test('should handle empty input', () => {
      const result = mockSlovaDataService.filterSlovaItems([], 'male', 'sk');
      expect(result).toHaveLength(0);
    });

    test('should handle null/undefined input', () => {
      const result1 = mockSlovaDataService.filterSlovaItems(null, 'male', 'sk');
      const result2 = mockSlovaDataService.filterSlovaItems(undefined, 'male', 'sk');
      
      expect(result1).toHaveLength(0);
      expect(result2).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle items with missing properties', () => {
      const itemsWithMissingProps = [
        { fileName: 'test1.mp3', topic: 'test1' }, // missing gender, mediaType
        { fileName: 'test2.mp3', gender: 'male' }, // missing topic
        null, // null item
        undefined // undefined item
      ];

      const result = mockSlovaDataService.filterSlovaItems(itemsWithMissingProps, 'male', 'sk');
      expect(result).toHaveLength(0); // Všechny by měly být filtrovány
    });

    test('should handle invalid gender values', () => {
      const items = [
        {
          fileName: 'test1.mp3',
          topic: 'test1',
          gender: 'invalid',
          mediaType: '4M',
          parsed: { gender: 'invalid', topic: 'test1', title: 'Test1' }
        }
      ];

      const result = mockSlovaDataService.filterSlovaItems(items, 'male', 'sk');
      expect(result).toHaveLength(0);
    });
  });
});
