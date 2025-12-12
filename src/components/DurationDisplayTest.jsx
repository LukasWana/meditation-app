import React, { useState } from 'react';

const DurationDisplayTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  // Testovací data
  const testItems = [
    { title: 'Test Song 1', audioSrc: 'https://example.com/song1.mp3', duration: '3:45' },
    { title: 'Test Song 2', audioSrc: 'https://example.com/song2.mp3', duration: 'N/A' },
    { title: 'Test Song 3', audioSrc: null, duration: '2:30' }
  ];

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 'N/A') return 'N/A';

    // Pokud už je string ve formátu MM:SS, vrať ho
    if (typeof seconds === 'string' && seconds.includes(':')) {
      return seconds;
    }

    // Pokud je to číslo (sekundy), převeď na MM:SS
    if (typeof seconds === 'number' && seconds > 0) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    return 'N/A';
  };

  const getDisplayDuration = (item) => {
    console.log(`🎵 Test - Getting duration for ${item.title}:`, {
      audioSrc: item.audioSrc,
      metadataDuration: item.duration
    });

    // 1. Fallback na původní duration z metadata
    if (item.duration && item.duration !== 'N/A') {
      console.log(`🎵 Test - Using metadata duration for ${item.title}: ${item.duration}`);
      return item.duration;
    }

    // 2. Konečný fallback
    console.log(`🎵 Test - No duration found for ${item.title}, using N/A`);
    return 'N/A';
  };

  const runTest = () => {
    const results = testItems.map((item, _index) => {
      const displayDuration = getDisplayDuration(item);
      const formattedDuration = formatDuration(displayDuration);

      return {
        title: item.title,
        metadataDuration: item.duration,
        displayDuration: displayDuration,
        formattedDuration: formattedDuration,
        success: formattedDuration !== 'N/A' || item.duration === 'N/A'
      };
    });

    setTestResults(results);
    console.log('Duration display test results:', results);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50"
      >
        Test Duration Display
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Duration Display Test</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <button
        onClick={runTest}
        className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm mb-4"
      >
        Spustit Test
      </button>

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
              <div className="font-medium">{result.title}</div>
              <div>Metadata: {result.metadataDuration}</div>
              <div>Display: {result.displayDuration}</div>
              <div>Formatted: {result.formattedDuration}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DurationDisplayTest;
