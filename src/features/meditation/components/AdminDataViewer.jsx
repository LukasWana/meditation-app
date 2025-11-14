import React from 'react';
import { motion } from 'framer-motion';
import { Database, BarChart3 } from 'lucide-react';
import DataStorageCharts from '@components/admin/DataStorageCharts';

/**
 * Komponenta pro zobrazení admin dat
 * Zobrazuje status a grafy
 */
const AdminDataViewer = ({
  status,
  setStatus,
  showCharts,
  onToggleCharts,
  isDarkMode
}) => {
  const cardClasses = isDarkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  return (
    <>
      {/* Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-lg border mb-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}
      >
        <div className="flex items-center">
          <Database className="mr-3 text-blue-500" size={20} />
          <span className="font-medium">Status:</span>
          <span className="ml-2">{status || 'Připraveno'}</span>
        </div>
      </motion.div>

      {/* Grafy úložišť dat */}
      {showCharts && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`mt-6 ${cardClasses}`}
        >
          <DataStorageCharts />
        </motion.div>
      )}

      {/* Rychlé akce */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`p-6 rounded-lg border mt-6 ${cardClasses}`}
      >
        <h3 className="text-xl font-semibold mb-4">Rychlé akce</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setStatus('')}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
          >
            🗑️ Vymazat status
          </button>
          <button
            onClick={onToggleCharts}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {showCharts ? 'Skrýt grafy' : 'Zobrazit grafy úložišť'}
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default AdminDataViewer;

