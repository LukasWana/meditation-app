import React, { useState, useEffect } from 'react';
import errorHandler from '@utils/error-handler';
import cacheServiceRefactored from '@services/cacheServiceRefactored';
import { onVisibilityChange } from '@services/visibilityManager';
import log from '@services/logger';

/**
 * Monitoring Dashboard Component
 * Zobrazuje real-time metriky a statistiky aplikace
 */
const MonitoringDashboard = ({ isVisible = false, onClose }) => {
  const [stats, setStats] = useState({
    errors: null,
    cache: null,
    performance: null
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    let intervalId = null;

    const updateStats = () => {
      setStats({
        errors: errorHandler.getStats(),
        cache: cacheServiceRefactored.getStats(),
        performance: getPerformanceStats()
      });
    };

    const startPolling = () => {
      updateStats();
      intervalId = setInterval(updateStats, 10000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = (hidden) => {
      if (hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    startPolling();
    const unsubscribeVisibility = onVisibilityChange(handleVisibilityChange);

    return () => {
      stopPolling();
      unsubscribeVisibility();
    };
  }, [isVisible]);

  const getPerformanceStats = () => {
    if (typeof performance === 'undefined') return null;

    const memory = performance.memory;
    const timing = performance.timing;

    return {
      memory: memory ? {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      timing: timing ? {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart
      } : null
    };
  };

  const getHealthStatus = () => {
    const { errors, cache } = stats;

    if (!errors || !cache) return 'unknown';

    // Determine health based on error rate and cache performance
    const totalErrors = errors.totalErrors;
    const cacheHitRate = cache.total.hitRate || 0;

    if (totalErrors > 10 || cacheHitRate < 50) return 'critical';
    if (totalErrors > 5 || cacheHitRate < 70) return 'warning';
    if (totalErrors > 0 || cacheHitRate < 90) return 'good';
    return 'excellent';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent': return '✅';
      case 'good': return '🟢';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`bg-white rounded-lg shadow-lg border transition-all duration-300 ${isExpanded ? 'w-96 h-96' : 'w-64 h-16'
        }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center space-x-2">
            <span className="text-lg">📊</span>
            <span className="font-semibold text-gray-800">Monitoring</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getHealthStatus())}`}>
              {getStatusIcon(getHealthStatus())} {getHealthStatus()}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '📉' : '📈'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded"
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-3 space-y-4 max-h-80 overflow-y-auto">
            {/* Error Statistics */}
            {stats.errors && (
              <div className="bg-red-50 rounded-lg p-3">
                <h3 className="font-semibold text-red-800 mb-2">🚨 Error Statistics</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Errors:</span>
                    <span className="font-medium">{stats.errors.totalErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Session ID:</span>
                    <span className="font-mono text-xs">{stats.errors.sessionId?.slice(-8)}</span>
                  </div>
                  {Object.entries(stats.errors.errorTypes).length > 0 && (
                    <div>
                      <span className="text-xs text-red-600">Error Types:</span>
                      <div className="mt-1 space-y-1">
                        {Object.entries(stats.errors.errorTypes).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-xs">
                            <span>{type}:</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cache Statistics */}
            {stats.cache && (
              <div className="bg-blue-50 rounded-lg p-3">
                <h3 className="font-semibold text-blue-800 mb-2">💾 Cache Statistics</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Size:</span>
                    <span className="font-medium">{stats.cache.total.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hit Rate:</span>
                    <span className="font-medium">{stats.cache.total.hitRate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Hits:</span>
                    <span className="font-medium">{stats.cache.total.hits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Misses:</span>
                    <span className="font-medium">{stats.cache.total.misses}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Statistics */}
            {stats.performance && (
              <div className="bg-green-50 rounded-lg p-3">
                <h3 className="font-semibold text-green-800 mb-2">⚡ Performance</h3>
                <div className="space-y-1 text-sm">
                  {stats.performance.memory && (
                    <div>
                      <span className="text-xs text-green-600">Memory Usage:</span>
                      <div className="mt-1 space-y-1">
                        <div className="flex justify-between">
                          <span>Used:</span>
                          <span>{stats.performance.memory.used}MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span>{stats.performance.memory.total}MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Limit:</span>
                          <span>{stats.performance.memory.limit}MB</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {stats.performance.timing && (
                    <div className="mt-2">
                      <span className="text-xs text-green-600">Load Times:</span>
                      <div className="mt-1 space-y-1">
                        <div className="flex justify-between">
                          <span>Page Load:</span>
                          <span>{stats.performance.timing.loadTime}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>DOM Ready:</span>
                          <span>{stats.performance.timing.domContentLoaded}ms</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  errorHandler.flushErrors();
                  log.info('Manual error flush triggered');
                }}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs py-1 px-2 rounded"
              >
                Flush Errors
              </button>
              <button
                onClick={() => {
                  cacheServiceRefactored.clear();
                  log.info('Manual cache clear triggered');
                }}
                className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs py-1 px-2 rounded"
              >
                Clear Cache
              </button>
            </div>
          </div>
        )}

        {/* Collapsed Summary */}
        {!isExpanded && stats.errors && (
          <div className="p-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Errors: {stats.errors.totalErrors}</span>
              <span>Cache: {stats.cache?.total.hitRate || 0}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringDashboard;


