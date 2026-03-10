import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Database, BarChart3 } from 'lucide-react';
import uiDataService from '@services/uiDataService';

export const QuickActions = ({
  checkStatus,
  setStatus,
  showCharts,
  setShowCharts,
  setLoading,
  loading,
  isDarkMode
}) => {
  const cardClasses = isDarkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={`p-6 rounded-lg border mt-6 ${cardClasses}`}
    >
      <h3 className="text-xl font-semibold mb-4">Rychlé akce</h3>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={checkStatus}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          🔍 Zkontrolovat status
        </button>
        <button
          onClick={() => setStatus('')}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
        >
          🗑️ Vymazat status
        </button>
        <button
          onClick={() => setShowCharts(!showCharts)}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          {showCharts ? 'Skrýt grafy' : 'Zobrazit grafy úložišť'}
        </button>
        <button
          onClick={async () => {
            setLoading(true);
            setStatus('🔄 Aktualizuji překlady v Firebase...');
            try {
              await uiDataService.updateTranslationsFromContext();
              setStatus('✅ Překlady úspěšně aktualizovány v Firebase!');
            } catch (error) {
              setStatus(`❌ Chyba při aktualizaci překladů: ${error.message}`);
              console.error('❌ Update translations failed:', error);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center disabled:bg-gray-400"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Database className="w-4 h-4 mr-2" />
          )}
          Aktualizovat překlady v Firebase
        </button>
      </div>
    </motion.div>
  );
};
