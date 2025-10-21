/**
 * Unit testy pro estimateDuration funkci
 * Testuje edge cases a bezpečnost
 */

// Mock funkce pro testování
const estimateDuration = (sizeInBytes) => {
  if (!sizeInBytes || sizeInBytes <= 0) return 0;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  return Math.round(sizeInMB * 60); // sekundy
};

describe('estimateDuration', () => {
  test('should return 0 for null input', () => {
    expect(estimateDuration(null)).toBe(0);
  });

  test('should return 0 for undefined input', () => {
    expect(estimateDuration(undefined)).toBe(0);
  });

  test('should return 0 for 0 bytes', () => {
    expect(estimateDuration(0)).toBe(0);
  });

  test('should return 0 for negative bytes', () => {
    expect(estimateDuration(-100)).toBe(0);
  });

  test('should return 0 for empty string', () => {
    expect(estimateDuration('')).toBe(0);
  });

  test('should calculate duration for 1MB file', () => {
    const oneMB = 1024 * 1024;
    expect(estimateDuration(oneMB)).toBe(60); // 1 minuta
  });

  test('should calculate duration for 5MB file', () => {
    const fiveMB = 5 * 1024 * 1024;
    expect(estimateDuration(fiveMB)).toBe(300); // 5 minut
  });

  test('should calculate duration for 10MB file', () => {
    const tenMB = 10 * 1024 * 1024;
    expect(estimateDuration(tenMB)).toBe(600); // 10 minut
  });

  test('should round to nearest second', () => {
    const oneAndHalfMB = 1.5 * 1024 * 1024;
    expect(estimateDuration(oneAndHalfMB)).toBe(90); // 1.5 minuty = 90 sekund
  });

  test('should handle very large files', () => {
    const hundredMB = 100 * 1024 * 1024;
    expect(estimateDuration(hundredMB)).toBe(6000); // 100 minut
  });

  test('should handle decimal input', () => {
    const decimalMB = 2.5 * 1024 * 1024;
    expect(estimateDuration(decimalMB)).toBe(150); // 2.5 minuty = 150 sekund
  });
});

// Test pro extractTitleFromFileName funkci
const extractTitleFromFileName = (fileName) => {
  const nameWithoutExt = fileName.replace(/\.mp3$/i, '');
  const parts = nameWithoutExt.split('/');
  const lastPart = parts[parts.length - 1];

  // Odstraň prefixy jako "muzsky4FSK-", "zensky4MSK-", "zensky4FSK-", "muzsky4MSK-"
  const cleanName = lastPart.replace(/^(muzsky|zensky)\d*[A-Z]+-?/i, '');

  // Nahraď pomlčky mezerami a velkými písmeny
  return cleanName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/[<>]/g, ''); // Remove potential XSS characters
};

describe('extractTitleFromFileName', () => {
  test('should remove male prefix correctly', () => {
    expect(extractTitleFromFileName('muzsky4MSK-uzkost-osamelost.mp3'))
      .toBe('Uzkost Osamelost');
  });

  test('should remove female prefix correctly', () => {
    expect(extractTitleFromFileName('zensky4FSK-stres-prace.mp3'))
      .toBe('Stres Prace');
  });

  test('should handle different number formats', () => {
    expect(extractTitleFromFileName('muzsky1MSK-test.mp3'))
      .toBe('Test');
    expect(extractTitleFromFileName('zensky2FSK-test.mp3'))
      .toBe('Test');
  });

  test('should handle files without prefixes', () => {
    expect(extractTitleFromFileName('normal-file-name.mp3'))
      .toBe('Normal File Name');
  });

  test('should handle files with path', () => {
    expect(extractTitleFromFileName('slova/SK/muzsky4MSK-test.mp3'))
      .toBe('Test');
  });

  test('should remove XSS characters', () => {
    expect(extractTitleFromFileName('muzsky4MSK-test<script>alert("xss")</script>.mp3'))
      .toBe('Testalert("xss")');
  });

  test('should handle empty filename', () => {
    expect(extractTitleFromFileName('')).toBe('');
  });

  test('should handle filename without extension', () => {
    expect(extractTitleFromFileName('muzsky4MSK-test'))
      .toBe('Test');
  });
});

// Test pro compareData funkci (O(n) optimalizace)
const compareData = (storageFiles, dbFiles) => {
  const changes = [];

  // Porovnej počet souborů
  if (storageFiles.length !== dbFiles.length) {
    changes.push(`Počet souborů: Storage ${storageFiles.length} vs DB ${dbFiles.length}`);
  }

  // Porovnej názvy souborů - O(n) optimalizace s Set
  const storageFileNames = new Set(storageFiles.map(f => f.name));
  const dbFileNames = new Set(dbFiles.map(f => f.fileName));

  const newFiles = [...storageFileNames].filter(name => !dbFileNames.has(name));
  const removedFiles = [...dbFileNames].filter(name => !storageFileNames.has(name));

  if (newFiles.length > 0) {
    changes.push(`Nové soubory: ${newFiles.length}`);
  }

  if (removedFiles.length > 0) {
    changes.push(`Odstraněné soubory: ${removedFiles.length}`);
  }

  return {
    hasChanges: changes.length > 0,
    changes
  };
};

describe('compareData', () => {
  test('should detect no changes when files are identical', () => {
    const storageFiles = [
      { name: 'file1.mp3', size: 1000 },
      { name: 'file2.mp3', size: 2000 }
    ];
    const dbFiles = [
      { fileName: 'file1.mp3', size: 1000 },
      { fileName: 'file2.mp3', size: 2000 }
    ];

    const result = compareData(storageFiles, dbFiles);
    expect(result.hasChanges).toBe(false);
    expect(result.changes).toHaveLength(0);
  });

  test('should detect new files', () => {
    const storageFiles = [
      { name: 'file1.mp3', size: 1000 },
      { name: 'file2.mp3', size: 2000 },
      { name: 'file3.mp3', size: 3000 }
    ];
    const dbFiles = [
      { fileName: 'file1.mp3', size: 1000 },
      { fileName: 'file2.mp3', size: 2000 }
    ];

    const result = compareData(storageFiles, dbFiles);
    expect(result.hasChanges).toBe(true);
    expect(result.changes).toContain('Počet souborů: Storage 3 vs DB 2');
    expect(result.changes).toContain('Nové soubory: 1');
  });

  test('should detect removed files', () => {
    const storageFiles = [
      { name: 'file1.mp3', size: 1000 }
    ];
    const dbFiles = [
      { fileName: 'file1.mp3', size: 1000 },
      { fileName: 'file2.mp3', size: 2000 }
    ];

    const result = compareData(storageFiles, dbFiles);
    expect(result.hasChanges).toBe(true);
    expect(result.changes).toContain('Počet souborů: Storage 1 vs DB 2');
    expect(result.changes).toContain('Odstraněné soubory: 1');
  });

  test('should handle empty arrays', () => {
    const result = compareData([], []);
    expect(result.hasChanges).toBe(false);
    expect(result.changes).toHaveLength(0);
  });

  test('should handle large datasets efficiently', () => {
    // Simuluj velké množství dat
    const storageFiles = Array.from({ length: 1000 }, (_, i) => ({
      name: `file${i}.mp3`,
      size: i * 1000
    }));
    const dbFiles = Array.from({ length: 1000 }, (_, i) => ({
      fileName: `file${i}.mp3`,
      size: i * 1000
    }));

    const startTime = performance.now();
    const result = compareData(storageFiles, dbFiles);
    const endTime = performance.now();

    expect(result.hasChanges).toBe(false);
    expect(endTime - startTime).toBeLessThan(100); // Mělo by být rychlé (< 100ms)
  });
});
