import React, { useState } from 'react';
import cacheService from '@services/cacheServiceRefactored';
import log from '@services/logger';

const DurationPersistenceTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  // Testovací data
  const testData = [
    { audioSrc: 'https://example.com/song1.mp3', expectedDuration: 180 },
    { audioSrc: 'https://example.com/song2.mp3', expectedDuration: 240 },
    { audioSrc: 'https://example.com/song3.mp3', expectedDuration: 300 }
  ];

  const runPersistenceTest = () => {
    const results = [];

    // Test 1: Uložení duration do cache
    testData.forEach((item, index) => {
      cacheService.setDuration(item.audioSrc, item.expectedDuration);
      const retrieved = cacheService.getDuration(item.audioSrc);

      results.push({
        test: `Test ${index + 1}: Uložení a načtení duration`,
        audioSrc: item.audioSrc,
        expected: item.expectedDuration,
        actual: retrieved,
        success: retrieved === item.expectedDuration,
        timestamp: new Date().toLocaleTimeString()
      });
    });

    // Test 2: Kontrola localStorage persistence
    const localStorageKey = 'cache_audio';
    const storedData = localStorage.getItem(localStorageKey);
    const hasStoredData = storedData && storedData !== '{}';

    results.push({
      test: 'Test localStorage persistence',
      audioSrc: 'N/A',
      expected: 'Data v localStorage',
      actual: hasStoredData ? 'Data nalezena' : 'Data nenalezena',
      success: hasStoredData,
      timestamp: new Date().toLocaleTimeString()
    });

    // Test 3: Simulace reload stránky
    const beforeReload = cacheService.getDuration(testData[0].audioSrc);
    results.push({
      test: 'Test před reload',
      audioSrc: testData[0].audioSrc,
      expected: testData[0].expectedDuration,
      actual: beforeReload,
      success: beforeReload === testData[0].expectedDuration,
      timestamp: new Date().toLocaleTimeString()
    });

    setTestResults(results);
    log.debug('Duration persistence test results:', results);
  };

  const clearCache = () => {
    cacheService.clear();
    setTestResults([]);
    log.debug('Cache cleared');
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50"
      >
        Test Duration Cache
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Duration Cache Test</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={runPersistenceTest}
          className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm"
        >
          Spustit Test
        </button>
        <button
          onClick={clearCache}
          className="w-full bg-red-500 text-white px-3 py-2 rounded text-sm"
        >
          Vymazat Cache
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="max-h-64 overflow-y-auto">
          <h4 className="font-medium mb-2">Výsledky testů:</h4>
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-2 rounded text-xs mb-1 ${
                result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              <div className="font-medium">{result.test}</div>
              <div>Očekáváno: {result.expected}</div>
              <div>Skutečné: {result.actual}</div>
              <div className="text-gray-500">{result.timestamp}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DurationPersistenceTest;
