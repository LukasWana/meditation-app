import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Heading } from '@components/ui/Heading';

const DataStorageCharts = () => {
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Barvy pro grafy
  const colors = {
    firestore: '#4285f4',
    realtime: '#34a853',
    storage: '#ea4335',
    localStorage: '#ff9800',
    memory: '#9c27b0',
    static: '#00bcd4'
  };

  // Načti data ze všech úložišť
  const loadStorageData = async () => {
    setLoading(true);
    try {
      // Import služeb dynamicky
      const { fastMetadataService } = await import('@services/fastMetadataService');
      const cacheService = (await import('@services/cacheServiceRefactored')).default;

      const data = {
        firestore: { status: 'unknown', count: 0, size: 0, lastUpdate: null },
        realtime: { status: 'unknown', count: 0, size: 0, lastUpdate: null },
        storage: { status: 'unknown', count: 0, size: 0, lastUpdate: null },
        localStorage: { status: 'unknown', count: 0, size: 0, lastUpdate: null },
        memory: { status: 'unknown', count: 0, size: 0, lastUpdate: null },
        static: { status: 'unknown', count: 0, size: 0, lastUpdate: null }
      };

      // Test Fast Metadata Service (Hlavní sjednocená služba)
      try {
        await fastMetadataService.initialize();
        const fastData = fastMetadataService.getAllMetadata();
        const fastDataArray = Object.values(fastData);

        data.storage = {
          status: 'available',
          count: fastDataArray.length,
          size: JSON.stringify(fastData).length,
          lastUpdate: new Date().toISOString()
        };

        // Extrahuj statistiky podle zdrojů pokud jsou dostupné v metadatech
        const stats = fastMetadataService.getStats();
        if (stats) {
          data.static = {
            status: 'available',
            count: stats.totalFiles || 0,
            size: 0, // Odhad
            lastUpdate: new Date().toISOString()
          };
        }
      } catch (error) {
        data.storage.status = 'error';
        console.warn('Fast metadata service error:', error);
      }

      // Test Memory Cache
      try {
        const memoryData = cacheService.getAllMetadata();
        data.memory = {
          status: 'available',
          count: Object.keys(memoryData).length,
          size: JSON.stringify(memoryData).length,
          lastUpdate: new Date().toISOString()
        };
      } catch (error) {
        data.memory.status = 'error';
        console.warn('Memory cache error:', error);
      }

      // Test LocalStorage
      try {
        const localStorageData = localStorage.getItem('meditation-app-cache');
        data.localStorage = {
          status: localStorageData ? 'available' : 'empty',
          count: localStorageData ? JSON.parse(localStorageData).length || 0 : 0,
          size: localStorageData ? localStorageData.length : 0,
          lastUpdate: new Date().toISOString()
        };
      } catch (error) {
        data.localStorage.status = 'error';
        console.warn('LocalStorage error:', error);
      }

      setStorageData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorageData();
  }, []);

  // Připrav data pro grafy
  const prepareChartData = () => {
    if (!storageData) return { barData: [], pieData: [], statusData: [] };

    const barData = Object.entries(storageData).map(([key, value]) => ({
      name: key,
      count: value.count,
      size: Math.round(value.size / 1024), // KB
      status: value.status
    }));

    const pieData = Object.entries(storageData)
      .filter(([_, value]) => value.count > 0)
      .map(([key, value]) => ({
        name: key,
        value: value.count,
        color: colors[key] || '#666'
      }));

    const statusData = Object.entries(storageData).map(([key, value]) => ({
      name: key,
      available: value.status === 'available' ? 1 : 0,
      error: value.status === 'error' ? 1 : 0,
      empty: value.status === 'empty' ? 1 : 0
    }));

    return { barData, pieData, statusData };
  };

  const { barData, pieData, statusData } = prepareChartData();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'empty': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Dostupné';
      case 'error': return 'Chyba';
      case 'empty': return 'Prázdné';
      default: return 'Neznámé';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Načítání dat z úložišť...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-6 h-6 text-blue-500" />
          <Heading level={2} className="font-bold text-gray-800">Analýza úložišť dat</Heading>
        </div>
        <button
          onClick={loadStorageData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Obnovit</span>
        </button>
      </div>

      {/* Status přehled */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {storageData && Object.entries(storageData).map(([key, value]) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-4 shadow-sm border"
          >
            <div className="flex items-center justify-between mb-2">
              <Heading level={3} className="font-semibold text-gray-700 capitalize">{key}</Heading>
              {getStatusIcon(value.status)}
            </div>
            <div className="text-sm text-gray-600">
              <div>Status: {getStatusText(value.status)}</div>
              <div>Počet: {value.count}</div>
              <div>Velikost: {Math.round(value.size / 1024)} KB</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grafy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart - počet souborů */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-6 shadow-sm border"
        >
          <Heading level={3} className="font-semibold mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Počet souborů podle úložiště
          </Heading>
          <div className="space-y-3">
            {barData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-24 text-sm font-medium capitalize">{item.name}</div>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.min(100, (item.count / Math.max(1, ...barData.map(d => d.count))) * 100)}%` }}
                    >
                      <span className="text-white text-xs font-medium">{item.count}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pie chart - rozložení dat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-6 shadow-sm border"
        >
          <Heading level={3} className="font-semibold mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Rozložení dat
          </Heading>
          <div className="space-y-3">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div
                  className="w-4 h-4 rounded mr-3"
                  style={{ backgroundColor: item.color }}
                ></div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="capitalize">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Area chart - velikost dat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-6 shadow-sm border"
        >
          <Heading level={3} className="font-semibold mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Velikost dat (KB)
          </Heading>
          <div className="space-y-3">
            {barData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-24 text-sm font-medium capitalize">{item.name}</div>
                <div className="flex-1 mx-3">
                  <div className="bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.min(100, (item.size / Math.max(1, ...barData.map(d => d.size))) * 100)}%` }}
                    >
                      <span className="text-white text-xs font-medium">{item.size} KB</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Status chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-6 shadow-sm border"
        >
          <Heading level={3} className="font-semibold mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Status úložišť
          </Heading>
          <div className="space-y-3">
            {statusData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-24 text-sm font-medium capitalize">{item.name}</div>
                <div className="flex-1 mx-3">
                  <div className="flex space-x-2">
                    {item.available > 0 && (
                      <div className="bg-green-500 text-white px-2 py-1 rounded text-xs">Dostupné</div>
                    )}
                    {item.error > 0 && (
                      <div className="bg-red-500 text-white px-2 py-1 rounded text-xs">Chyba</div>
                    )}
                    {item.empty > 0 && (
                      <div className="bg-yellow-500 text-white px-2 py-1 rounded text-xs">Prázdné</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Poslední aktualizace */}
      {lastUpdate && (
        <div className="text-sm text-gray-500 text-center">
          Poslední aktualizace: {lastUpdate.toLocaleString('cs-CZ')}
        </div>
      )}
    </div>
  );
};

export default DataStorageCharts;
