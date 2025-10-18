import React, { useState, useEffect } from 'react';
import { testCachePerformance, clearCache, getCacheInfo } from '@utils/cacheTest';

const CacheTestComponent = () => {
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);

  useEffect(() => {
    // Načti cache info při mount
    setCacheInfo(getCacheInfo());
  }, []);

  const runPerformanceTest = async () => {
    setIsLoading(true);
    try {
      const results = await testCachePerformance();
      setTestResults(results);
      setCacheInfo(getCacheInfo()); // Aktualizuj cache info
    } catch (error) {
      console.error('Cache test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    clearCache();
    setCacheInfo(getCacheInfo());
    setTestResults(null);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🧪 Cache Performance Test</h2>

      {/* Cache Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">📊 Cache Information</h3>
        {cacheInfo ? (
          <div className="space-y-2 text-sm">
            <div><strong>Cache Key:</strong> {cacheInfo.cacheKey}</div>
            <div><strong>Last Update:</strong> {cacheInfo.lastUpdate ? new Date(cacheInfo.lastUpdate).toLocaleString() : 'N/A'}</div>
            <div><strong>Is Loading:</strong> {cacheInfo.isLoading ? 'Yes' : 'No'}</div>
            <div><strong>Is Valid:</strong> {cacheInfo.isValid ? 'Yes' : 'No'}</div>
          </div>
        ) : (
          <div>Loading cache info...</div>
        )}
      </div>

      {/* Test Controls */}
      <div className="mb-6 space-x-4">
        <button
          onClick={runPerformanceTest}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Run Performance Test'}
        </button>

        <button
          onClick={handleClearCache}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear Cache
        </button>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-800">✅ Test Results</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Load Time:</strong> {testResults.loadTime.toFixed(2)}ms</div>
            <div><strong>Total Time:</strong> {testResults.totalTime.toFixed(2)}ms</div>
            <div><strong>Records Loaded:</strong> {testResults.recordCount}</div>
            <div><strong>Cache Valid:</strong> {testResults.isValid ? 'Yes' : 'No'}</div>
          </div>

          {testResults.loadTime < 50 && (
            <div className="mt-3 p-2 bg-green-100 text-green-800 rounded">
              ⚡ Excellent! Cache is very fast ({testResults.loadTime.toFixed(2)}ms)
            </div>
          )}

          {testResults.loadTime >= 50 && testResults.loadTime < 200 && (
            <div className="mt-3 p-2 bg-yellow-100 text-yellow-800 rounded">
              ⚠️ Good performance ({testResults.loadTime.toFixed(2)}ms)
            </div>
          )}

          {testResults.loadTime >= 200 && (
            <div className="mt-3 p-2 bg-red-100 text-red-800 rounded">
              ❌ Slow performance ({testResults.loadTime.toFixed(2)}ms) - consider optimization
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">💡 Instructions</h3>
        <ul className="text-sm space-y-1 text-blue-700">
          <li>• <strong>Run Performance Test:</strong> Measures cache loading speed</li>
          <li>• <strong>Clear Cache:</strong> Removes all cached data (will reload from Firebase)</li>
          <li>• <strong>Cache Info:</strong> Shows current cache status and validity</li>
          <li>• <strong>Good performance:</strong> &lt; 50ms, <strong>Acceptable:</strong> 50-200ms, <strong>Slow:</strong> &gt; 200ms</li>
        </ul>
      </div>
    </div>
  );
};

export default CacheTestComponent;

