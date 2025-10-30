import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Server, Activity, HardDrive, Wifi, WifiOff, CheckCircle, XCircle, Clock } from 'lucide-react';
import { storage, db, database } from '@services/firebase';
import { ref as storageRef, list, getMetadata } from 'firebase/storage';
import { ref as dbRef, get } from 'firebase/database';
import { collection, getDocs, limit, query } from 'firebase/firestore';

const FirebaseMonitoring = () => {
  const [monitoring, setMonitoring] = useState({
    storage: { status: 'testing', online: false, error: null, files: 0, totalSize: 0 },
    realtime: { status: 'testing', online: false, error: null, records: 0, lastSync: null },
    firestore: { status: 'testing', online: false, error: null, documents: 0 },
    app: { url: window.location.origin, environment: import.meta.env.MODE, uptime: 0 }
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    runAllTests();

    // Uptime counter
    const startTime = Date.now();
    const uptimeInterval = setInterval(() => {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      setMonitoring(prev => ({
        ...prev,
        app: { ...prev.app, uptime }
      }));
    }, 1000);

    return () => clearInterval(uptimeInterval);
  }, []);

  const runAllTests = async () => {
    setIsLoading(true);

    await Promise.all([
      testFirebaseStorage(),
      testRealtimeDatabase(),
      testFirestore()
    ]);

    setIsLoading(false);
  };

  // Test Firebase Storage
  const testFirebaseStorage = async () => {
    try {
      console.log('🔍 Testing Firebase Storage...');

      const rootRef = storageRef(storage, '');
      const result = await list(rootRef, { maxResults: 1 });

      // Spočítej všechny soubory a velikost (sample)
      let totalFiles = 0;
      let totalSize = 0;

      try {
        // Zkus načíst kompletní seznam z hudba a slova složek
        const hudbaRef = storageRef(storage, 'hudba');
        const slovaRef = storageRef(storage, 'slova');

        const [hudbaList, slovaList] = await Promise.all([
          list(hudbaRef).catch(() => ({ items: [] })),
          list(slovaRef).catch(() => ({ items: [] }))
        ]);

        totalFiles = hudbaList.items.length + slovaList.items.length;

        // Sample size z prvních 5 souborů
        const sampleFiles = [...hudbaList.items, ...slovaList.items].slice(0, 5);
        const sampleSizes = await Promise.all(
          sampleFiles.map(item =>
            getMetadata(item)
              .then(meta => meta.size)
              .catch(() => 0)
          )
        );

        const avgSize = sampleSizes.reduce((a, b) => a + b, 0) / sampleSizes.length;
        totalSize = avgSize * totalFiles; // Odhad

      } catch (countError) {
        console.warn('Could not count files:', countError);
      }

      setMonitoring(prev => ({
        ...prev,
        storage: {
          status: 'online',
          online: true,
          error: null,
          files: totalFiles,
          totalSize
        }
      }));

      console.log('✅ Firebase Storage: ONLINE');
    } catch (error) {
      console.error('❌ Firebase Storage test failed:', error);
      setMonitoring(prev => ({
        ...prev,
        storage: {
          status: 'offline',
          online: false,
          error: error.message,
          files: 0,
          totalSize: 0
        }
      }));
    }
  };

  // Test Realtime Database
  const testRealtimeDatabase = async () => {
    try {
      console.log('🔍 Testing Realtime Database...');

      const metadataRef = dbRef(database, 'audio-metadata');
      const snapshot = await get(metadataRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const records = data.files ? data.files.length : 0;
        const lastSync = data.lastSync || null;

        setMonitoring(prev => ({
          ...prev,
          realtime: {
            status: 'online',
            online: true,
            error: null,
            records,
            lastSync
          }
        }));

        console.log('✅ Realtime Database: ONLINE');
      } else {
        setMonitoring(prev => ({
          ...prev,
          realtime: {
            status: 'online',
            online: true,
            error: null,
            records: 0,
            lastSync: null
          }
        }));
      }
    } catch (error) {
      console.error('❌ Realtime Database test failed:', error);
      setMonitoring(prev => ({
        ...prev,
        realtime: {
          status: 'offline',
          online: false,
          error: error.message,
          records: 0,
          lastSync: null
        }
      }));
    }
  };

  // Test Firestore
  const testFirestore = async () => {
    try {
      console.log('🔍 Testing Firestore...');

      const metadataCollection = collection(db, 'audio-metadata');
      const q = query(metadataCollection, limit(1));
      const snapshot = await getDocs(q);

      // Spočítej všechny dokumenty (může být pomalé pro velké kolekce)
      const allSnapshot = await getDocs(collection(db, 'audio-metadata'));
      const documents = allSnapshot.size;

      setMonitoring(prev => ({
        ...prev,
        firestore: {
          status: 'online',
          online: true,
          error: null,
          documents
        }
      }));

      console.log('✅ Firestore: ONLINE');
    } catch (error) {
      console.error('❌ Firestore test failed:', error);
      setMonitoring(prev => ({
        ...prev,
        firestore: {
          status: 'offline',
          online: false,
          error: error.message,
          documents: 0
        }
      }));
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatLastSync = (isoString) => {
    if (!isoString) return 'Never';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const StatusBadge = ({ online }) => (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {online ? (
        <>
          <CheckCircle className="w-3 h-3 mr-1" />
          Online
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3 mr-1" />
          Offline
        </>
      )}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Firebase Monitoring</h2>
        <button
          onClick={runAllTests}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          {isLoading ? 'Testing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Firebase Services Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Firebase Storage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-white rounded-lg border border-gray-200"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <HardDrive className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="font-semibold">Storage</h3>
            </div>
            <StatusBadge online={monitoring.storage.online} />
          </div>

          {monitoring.storage.online ? (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Files:</span>
                <span className="font-medium">{monitoring.storage.files}</span>
              </div>
              <div className="flex justify-between">
                <span>Size:</span>
                <span className="font-medium">{formatBytes(monitoring.storage.totalSize)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-600">{monitoring.storage.error}</p>
          )}
        </motion.div>

        {/* Realtime Database */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-white rounded-lg border border-gray-200"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Database className="w-5 h-5 text-green-500 mr-2" />
              <h3 className="font-semibold">Realtime DB</h3>
            </div>
            <StatusBadge online={monitoring.realtime.online} />
          </div>

          {monitoring.realtime.online ? (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Records:</span>
                <span className="font-medium">{monitoring.realtime.records}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Sync:</span>
                <span className="font-medium">{formatLastSync(monitoring.realtime.lastSync)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-600">{monitoring.realtime.error}</p>
          )}
        </motion.div>

        {/* Firestore */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-white rounded-lg border border-gray-200"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Server className="w-5 h-5 text-purple-500 mr-2" />
              <h3 className="font-semibold">Firestore</h3>
            </div>
            <StatusBadge online={monitoring.firestore.online} />
          </div>

          {monitoring.firestore.online ? (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Documents:</span>
                <span className="font-medium">{monitoring.firestore.documents}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-600">{monitoring.firestore.error}</p>
          )}
        </motion.div>
      </div>

      {/* App Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 bg-white rounded-lg border border-gray-200"
      >
        <div className="flex items-center mb-3">
          <Activity className="w-5 h-5 text-orange-500 mr-2" />
          <h3 className="font-semibold">Application Status</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">URL:</span>
            <p className="font-medium break-all">{monitoring.app.url}</p>
          </div>
          <div>
            <span className="text-gray-600">Environment:</span>
            <p className="font-medium">
              <span className={`inline-block px-2 py-1 rounded text-xs ${
                monitoring.app.environment === 'production'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {monitoring.app.environment}
              </span>
            </p>
          </div>
          <div>
            <span className="text-gray-600">Uptime:</span>
            <p className="font-medium flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {formatUptime(monitoring.app.uptime)}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Project:</span>
            <p className="font-medium">meditations-audio</p>
          </div>
        </div>
      </motion.div>

      {/* Connection Status Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {monitoring.storage.online && monitoring.realtime.online && monitoring.firestore.online ? (
              <>
                <Wifi className="w-6 h-6 text-green-500 mr-3" />
                <div>
                  <h3 className="font-semibold text-green-800">All Systems Operational</h3>
                  <p className="text-sm text-green-600">Firebase services are running normally</p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-6 h-6 text-red-500 mr-3" />
                <div>
                  <h3 className="font-semibold text-red-800">Service Disruption</h3>
                  <p className="text-sm text-red-600">Some Firebase services are offline</p>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FirebaseMonitoring;
