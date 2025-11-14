import React from 'react';
import { motion } from 'framer-motion';
import { Database, BarChart3 } from 'lucide-react';
import DataStorageCharts from '@components/admin/DataStorageCharts';
import { useTheme } from '@hooks/useTheme';

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
  const theme = useTheme();
  const cardBg = isDarkMode ? theme.colors.gray[800] : theme.colors.white;
  const cardBorder = isDarkMode ? theme.colors.gray[700] : theme.colors.gray[200];
  const cardText = isDarkMode ? theme.colors.white : theme.colors.gray[900];

  return (
    <>
      {/* Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-lg border mb-6"
        style={{
          backgroundColor: isDarkMode ? theme.colors.gray[800] : theme.colors.blue[50],
          borderColor: isDarkMode ? theme.colors.gray[700] : theme.colors.blue[200],
          borderRadius: theme.borderRadius.lg
        }}
      >
        <div className="flex items-center">
          <Database className="mr-3" size={20} style={{ color: theme.colors.blue[500] }} />
          <span className="font-medium" style={{ fontWeight: theme.typography.fontWeight.medium }}>Status:</span>
          <span className="ml-2">{status || 'Připraveno'}</span>
        </div>
      </motion.div>

      {/* Grafy úložišť dat */}
      {showCharts && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 p-6 rounded-lg border"
          style={{
            backgroundColor: cardBg,
            borderColor: cardBorder,
            color: cardText,
            borderRadius: theme.borderRadius.lg
          }}
        >
          <DataStorageCharts />
        </motion.div>
      )}

      {/* Rychlé akce */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-lg border mt-6"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
          color: cardText,
          borderRadius: theme.borderRadius.lg
        }}
      >
        <h3
          className="mb-4"
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold
          }}
        >
          Rychlé akce
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setStatus('')}
            className="px-4 py-2 text-white rounded-lg transition-colors"
            style={{
              backgroundColor: theme.colors.yellow[500],
              borderRadius: theme.borderRadius.lg
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.yellow[600];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.yellow[500];
            }}
          >
            🗑️ Vymazat status
          </button>
          <button
            onClick={onToggleCharts}
            className="px-4 py-2 text-white rounded-lg transition-colors flex items-center"
            style={{
              backgroundColor: theme.colors.purple?.[500] || '#9333ea',
              borderRadius: theme.borderRadius.lg
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.purple?.[600] || '#7e22ce';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.purple?.[500] || '#9333ea';
            }}
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

