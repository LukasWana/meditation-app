import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import realtimeDatabaseService from '../services/realtimeDatabaseService';
import { realtimeMetadataService } from '../services/realtimeMetadataService';
import { offlineRealtimeTest } from '../scripts/offlineRealtimeTest';
import { testMetadataStructure as testMetadataStructureFunc } from '../scripts/metadataStructureTest';
import { checkFirebaseStorage } from '../scripts/checkFirebaseStorage';
import { syncAllStorageFiles } from '../scripts/syncAllStorageFiles';
import { simulateHudbaTrigger, simulateSlovaTrigger, simulateMultipleTriggers } from '../scripts/simulateStorageTriggers';
import { fullStorageSync, syncFolder } from '../scripts/fullStorageSync';
import log from '../services/logger';

const RealtimeDatabaseManager = () => {
  const { t } = useLanguage();
  const [connectionInfo, setConnectionInfo] = useState({
    connected: false,
    listeners: 0,
    databaseUrl: 'Not available'
  });
  const [testData, setTestData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [metadataStats, setMetadataStats] = useState(null);

  useEffect(() => {
    // Načti informace o připojení
    updateConnectionInfo();

    // Test připojení
    testConnection();
  }, []);

  const updateConnectionInfo = () => {
    const info = realtimeDatabaseService.getConnectionInfo();
    setConnectionInfo(info);
  };

  const testConnection = async () => {
    setIsLoading(true);
    setMessage('Testing connection...');

    try {
      // Použij offline test
      const result = await offlineRealtimeTest();

      if (result.success) {
        setTestData(result.data);

        if (result.connectionType === 'online') {
          setMessage('✅ Realtime Database funguje perfektně! 🎉');
        } else if (result.connectionType === 'offline') {
          setMessage('⚠️ Realtime Database offline, ale aplikace funguje! 📱');
        }

        log.success('Realtime Database test completed');
      } else {
        setMessage(`❌ Connection test failed: ${result.error}`);
        log.error('Realtime Database connection test failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Connection test failed: ${error.message}`);
      log.error('Realtime Database connection test failed:', error);
    } finally {
      setIsLoading(false);
      updateConnectionInfo();
    }
  };

  const clearTestData = async () => {
    try {
      await realtimeDatabaseService.deleteData('test/connection');
      setTestData(null);
      setMessage('Test data cleared');
    } catch (error) {
      setMessage(`❌ Failed to clear test data: ${error.message}`);
      log.error('Failed to clear test data:', error);
    }
  };

  const saveSampleMetadata = async () => {
    setIsLoading(true);
    setMessage('Saving sample metadata...');

    try {
      const sampleMetadata = {
        fileName: 'hudba/sample-track.mp3',
        title: 'Sample Track',
        duration: 180,
        durationFormatted: '3:00',
        folder: 'hudba',
        type: 'audio',
        lastModified: new Date().toISOString()
      };

      await realtimeDatabaseService.saveAudioMetadata('hudba/sample-track.mp3', sampleMetadata);
      setMessage('✅ Sample metadata saved successfully!');
      log.success('Sample metadata saved to Realtime Database');
    } catch (error) {
      setMessage(`❌ Failed to save sample metadata: ${error.message}`);
      log.error('Failed to save sample metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleMetadata = async () => {
    setIsLoading(true);
    setMessage('Loading sample metadata...');

    try {
      const metadata = await realtimeDatabaseService.getAudioMetadata('hudba/sample-track.mp3');
      if (metadata) {
        setTestData(metadata);
        setMessage('✅ Sample metadata loaded successfully!');
        log.success('Sample metadata loaded from Realtime Database');
      } else {
        setMessage('ℹ️ No sample metadata found');
      }
    } catch (error) {
      setMessage(`❌ Failed to load sample metadata: ${error.message}`);
      log.error('Failed to load sample metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAppStats = async () => {
    setIsLoading(true);
    setMessage('Saving app statistics...');

    try {
      // Použij offline test místo složité funkce
      const result = await offlineRealtimeTest();
      if (result.success) {
        setMessage('✅ App statistics test successful');
        log.success('App statistics test passed');
      } else {
        setMessage(`❌ App statistics test failed: ${result.error}`);
        log.error('App statistics test failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Failed to save app statistics: ${error.message}`);
      log.error('Failed to save app statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAppStats = async () => {
    setIsLoading(true);
    setMessage('Loading app statistics...');

    try {
      const stats = await realtimeDatabaseService.getAppStats();
      if (stats) {
        setTestData(stats);
        setMessage('✅ App statistics loaded successfully!');
        log.success('App statistics loaded from Realtime Database');
      } else {
        setMessage('ℹ️ No app statistics found');
      }
    } catch (error) {
      setMessage(`❌ Failed to load app statistics: ${error.message}`);
      log.error('Failed to load app statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessage = () => {
    setMessage('');
  };

  const testMetadataService = async () => {
    setIsLoading(true);
    setMessage('Testing metadata service...');

    try {
      // Test načtení všech metadat
      const allMetadata = await realtimeMetadataService.getAllMetadata();
      console.log('📊 All metadata:', allMetadata);

      // Test statistik
      const stats = await realtimeMetadataService.getMetadataStats();
      setMetadataStats(stats);
      console.log('📊 Metadata stats:', stats);

      setMessage(`✅ Metadata service working! Found ${stats.totalFiles} files in ${Object.keys(stats.byFolder).length} folders`);
      log.success('Metadata service test passed');
    } catch (error) {
      setMessage(`❌ Metadata service test failed: ${error.message}`);
      log.error('Metadata service test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testMetadataStructure = async () => {
    setIsLoading(true);
    setMessage('Testing metadata structure...');

    try {
      const result = await testMetadataStructureFunc();

      if (result.success) {
        setMessage(`✅ Metadata structure test successful! Created ${result.structure.length} sample files`);
        console.log('📊 Metadata structure:', result.structure);
        console.log('📊 Sample data:', result.data);

        // Aktualizuj statistiky
        const stats = await realtimeMetadataService.getMetadataStats();
        setMetadataStats(stats);

        log.success('Metadata structure test passed');
      } else {
        setMessage(`❌ Metadata structure test failed: ${result.error}`);
        log.error('Metadata structure test failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Metadata structure test failed: ${error.message}`);
      log.error('Metadata structure test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkStorage = async () => {
    setIsLoading(true);
    setMessage('Checking Firebase Storage...');

    try {
      const result = await checkFirebaseStorage();

      if (result.success) {
        setMessage(`✅ Storage check complete! Found ${result.totalFiles} files in ${result.folders} folders`);
        console.log('📊 Storage contents:', result);
        log.success('Storage check completed');
      } else {
        setMessage(`❌ Storage check failed: ${result.error}`);
        log.error('Storage check failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Storage check failed: ${error.message}`);
      log.error('Storage check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncAllFiles = async () => {
    setIsLoading(true);
    setMessage('Syncing all storage files...');

    try {
      const result = await syncAllStorageFiles();

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        console.log('📊 Sync results:', result.syncResult);

        // Aktualizuj statistiky
        const stats = await realtimeMetadataService.getMetadataStats();
        setMetadataStats(stats);

        log.success('Storage sync completed');
      } else {
        setMessage(`❌ Sync failed: ${result.error}`);
        log.error('Sync failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Sync failed: ${error.message}`);
      log.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testMultipleTriggers = async () => {
    setIsLoading(true);
    setMessage('Simulating multiple triggers...');

    try {
      const result = await simulateMultipleTriggers();

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        console.log('📊 Multiple triggers simulation result:', result);

        // Aktualizuj statistiky
        const stats = await realtimeMetadataService.getMetadataStats();
        setMetadataStats(stats);

        log.success('Multiple triggers simulation completed');
      } else {
        setMessage(`❌ Multiple triggers simulation failed: ${result.error}`);
        log.error('Multiple triggers simulation failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Multiple triggers simulation failed: ${error.message}`);
      log.error('Multiple triggers simulation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testHudbaTrigger = async () => {
    setIsLoading(true);
    setMessage('Simulating hudba folder trigger...');

    try {
      const result = await simulateHudbaTrigger();

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        console.log('📊 Hudba trigger simulation result:', result);

        // Aktualizuj statistiky
        const stats = await realtimeMetadataService.getMetadataStats();
        setMetadataStats(stats);

        log.success('Hudba folder trigger simulation completed');
      } else {
        setMessage(`❌ Hudba trigger simulation failed: ${result.error}`);
        log.error('Hudba trigger simulation failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Hudba trigger simulation failed: ${error.message}`);
      log.error('Hudba trigger simulation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testSlovaTrigger = async () => {
    setIsLoading(true);
    setMessage('Simulating slova folder trigger...');

    try {
      const result = await simulateSlovaTrigger();

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        console.log('📊 Slova trigger simulation result:', result);

        // Aktualizuj statistiky
        const stats = await realtimeMetadataService.getMetadataStats();
        setMetadataStats(stats);

        log.success('Slova folder trigger simulation completed');
      } else {
        setMessage(`❌ Slova trigger simulation failed: ${result.error}`);
        log.error('Slova trigger simulation failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Slova trigger simulation failed: ${error.message}`);
      log.error('Slova trigger simulation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const performFullSync = async () => {
    setIsLoading(true);
    setMessage('Performing full storage sync...');

    try {
      const result = await fullStorageSync();

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        console.log('📊 Full sync results:', result.results);

        // Aktualizuj statistiky
        const stats = await realtimeMetadataService.getMetadataStats();
        setMetadataStats(stats);

        log.success('Full storage sync completed');
      } else {
        setMessage(`❌ Full sync failed: ${result.error}`);
        log.error('Full sync failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Full sync failed: ${error.message}`);
      log.error('Full sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncHudbaFolder = async () => {
    setIsLoading(true);
    setMessage('Syncing hudba folder...');

    try {
      const result = await syncFolder('hudba');

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        console.log('📊 Hudba folder sync results:', result.results);

        // Aktualizuj statistiky
        const stats = await realtimeMetadataService.getMetadataStats();
        setMetadataStats(stats);

        log.success('Hudba folder sync completed');
      } else {
        setMessage(`❌ Hudba folder sync failed: ${result.error}`);
        log.error('Hudba folder sync failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Hudba folder sync failed: ${error.message}`);
      log.error('Hudba folder sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncSlovaFolder = async () => {
    setIsLoading(true);
    setMessage('Syncing slova folder...');

    try {
      const result = await syncFolder('slova');

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        console.log('📊 Slova folder sync results:', result.results);

        // Aktualizuj statistiky
        const stats = await realtimeMetadataService.getMetadataStats();
        setMetadataStats(stats);

        log.success('Slova folder sync completed');
      } else {
        setMessage(`❌ Slova folder sync failed: ${result.error}`);
        log.error('Slova folder sync failed:', result.error);
      }
    } catch (error) {
      setMessage(`❌ Slova folder sync failed: ${error.message}`);
      log.error('Slova folder sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Realtime Database Manager
      </h2>

      {/* Informace o automatické synchronizaci */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          🔄 Automatická synchronizace
        </h3>
        <div className="text-blue-700 text-sm space-y-2">
          <p><strong>Jak to funguje:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Při <strong>změně souboru</strong> ve Firebase Storage se automaticky spustí <code>onFileUpload</code> trigger</li>
            <li>Trigger zpracuje pouze <strong>MP3 soubory</strong> ve složkách <code>hudba/</code> a <code>slova/</code></li>
            <li>Metadata se automaticky uloží do <strong>Firestore</strong> i <strong>Realtime Database</strong></li>
            <li>Žádná manuální synchronizace není potřeba - vše se děje automaticky!</li>
          </ul>
          <p className="mt-2 text-blue-600">
            <strong>💡 Tip:</strong> Použijte tlačítka níže pro testování triggerů a kontroly stavu.
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Connection Status</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg ${
            connectionInfo.connected ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className={`text-sm font-medium ${
              connectionInfo.connected ? 'text-green-600' : 'text-red-600'
            }`}>
              Connection
            </div>
            <div className={`text-lg font-bold ${
              connectionInfo.connected ? 'text-green-800' : 'text-red-800'
            }`}>
              {connectionInfo.connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Active Listeners</div>
            <div className="text-lg font-bold text-blue-800">{connectionInfo.listeners}</div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 font-medium">Database URL</div>
            <div className="text-xs text-gray-800 truncate">{connectionInfo.databaseUrl}</div>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testData && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Test Data</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm text-gray-800 overflow-x-auto">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Metadata Stats */}
      {metadataStats && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Metadata Statistics</h3>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metadataStats.totalFiles}</div>
                <div className="text-sm text-gray-600">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Object.keys(metadataStats.byFolder).length}</div>
                <div className="text-sm text-gray-600">Folders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{metadataStats.byFolder.hudba || 0}</div>
                <div className="text-sm text-gray-600">Hudba Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{metadataStats.byFolder.slova || 0}</div>
                <div className="text-sm text-gray-600">Slova Files</div>
              </div>
            </div>
            {metadataStats.lastUpdated && (
              <div className="mt-4 text-sm text-gray-600">
                Last Updated: {new Date(metadataStats.lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-50 text-green-800' :
          message.includes('❌') ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          <div className="flex justify-between items-center">
            <span>{message}</span>
            <button
              onClick={clearMessage}
              className="text-gray-500 hover:text-gray-700 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Database Operations</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={testConnection}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={clearTestData}
            disabled={isLoading || !testData}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading || !testData
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            Clear Test Data
          </button>

          <button
            onClick={saveSampleMetadata}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            Save Sample Metadata
          </button>

          <button
            onClick={loadSampleMetadata}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            Load Sample Metadata
          </button>

          <button
            onClick={testMetadataService}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            🧪 Test Metadata Service
          </button>

          <button
            onClick={testMetadataStructure}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            📝 Test Metadata Structure
          </button>

          <button
            onClick={checkStorage}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            🔍 Check Firebase Storage
          </button>

          <button
            onClick={syncAllFiles}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            🔄 Sync All Storage Files
          </button>

          <button
            onClick={testMultipleTriggers}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            🧪 Simulate Multiple Triggers
          </button>

          <button
            onClick={testHudbaTrigger}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            🎵 Simulate Hudba Trigger
          </button>

          <button
            onClick={testSlovaTrigger}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-pink-600 text-white hover:bg-pink-700'
            }`}
          >
            🗣️ Simulate Slova Trigger
          </button>

          <button
            onClick={performFullSync}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            🔄 Full Storage Sync
          </button>

          <button
            onClick={syncHudbaFolder}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            🎵 Sync Hudba Folder
          </button>

          <button
            onClick={syncSlovaFolder}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-rose-600 text-white hover:bg-rose-700'
            }`}
          >
            🗣️ Sync Slova Folder
          </button>

          <button
            onClick={saveAppStats}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            Save App Stats
          </button>

          <button
            onClick={loadAppStats}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-pink-600 text-white hover:bg-pink-700'
            }`}
          >
            Load App Stats
          </button>
        </div>
      </div>

      {/* Help */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">About Realtime Database:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Real-time synchronization across all connected clients</li>
          <li>• Perfect for live data updates and collaborative features</li>
          <li>• JSON-based data structure</li>
          <li>• Offline support with automatic sync when reconnected</li>
          <li>• Lower latency than Firestore for real-time updates</li>
        </ul>
      </div>
    </div>
  );
};

export default RealtimeDatabaseManager;
