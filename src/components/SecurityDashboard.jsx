import React, { useState, useEffect } from 'react';
import securityMonitor from '../services/securityMonitor';

/**
 * Security Dashboard - zobrazuje bezpečnostní statistiky
 * Pouze pro development a admin účely
 */
const SecurityDashboard = () => {
  const [stats, setStats] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Aktualizovat statistiky každých 30 sekund
    const interval = setInterval(() => {
      setStats(securityMonitor.getSecurityStats());
    }, 30000);

    // Načíst počáteční statistiky
    setStats(securityMonitor.getSecurityStats());

    return () => clearInterval(interval);
  }, []);

  // Zobrazit pouze v development módu
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  const getSeverityColor = (severity) => {
    const colors = {
      info: 'text-blue-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
      critical: 'text-red-800 font-bold'
    };
    return colors[severity] || 'text-gray-600';
  };

  const getSeverityEmoji = (severity) => {
    const emojis = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    return emojis[severity] || '📝';
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors z-50"
        title="Security Dashboard"
      >
        🔒
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">🔒 Security Dashboard</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {stats ? (
        <div className="space-y-3">
          {/* Celkové statistiky */}
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-semibold text-gray-700 mb-2">📊 Posledních 24 hodin</h4>
            <div className="text-2xl font-bold text-blue-600">{stats.total} událostí</div>
          </div>

          {/* Rozdělení podle závažnosti */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">⚠️ Podle závažnosti</h4>
            <div className="space-y-1">
              {Object.entries(stats.bySeverity).map(([severity, count]) => (
                <div key={severity} className="flex justify-between items-center">
                  <span className={`${getSeverityColor(severity)} flex items-center`}>
                    {getSeverityEmoji(severity)} {severity}
                  </span>
                  <span className="font-mono text-sm">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top události */}
          {Object.keys(stats.byEvent).length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">🔥 Nejčastější události</h4>
              <div className="space-y-1">
                {Object.entries(stats.byEvent)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([event, count]) => (
                    <div key={event} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 truncate">{event}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Akce */}
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={() => {
                const logs = securityMonitor.exportLogs();
                console.log('📋 Security Logs Export:', logs);
                alert('Logy exportovány do konzole');
              }}
              className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              📋 Exportovat logy
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          Načítání statistik...
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400 text-center">
        Development Mode Only
      </div>
    </div>
  );
};

export default SecurityDashboard;
