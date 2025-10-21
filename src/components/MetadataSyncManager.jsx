import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import metadataSyncService from '../scripts/syncMetadata';
import log from '../services/logger';

const MetadataSyncManager = () => {
  const { t } = useLanguage();
  const [syncStatus, setSyncStatus] = useState({
    totalFiles: 0,
    byFolder: {},
    lastSync: null,
    needsSync: false,
    loading: false
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');

  // Načti stav synchronizace při načtení komponenty
  useEffect(() => {
    checkSyncStatus();
  }, []);

  const checkSyncStatus = async () => {
    setSyncStatus(prev => ({ ...prev, loading: true }));

    try {
      const status = await metadataSyncService.checkSyncStatus();
      setSyncStatus(prev => ({ ...prev, ...status, loading: false }));
    } catch (error) {
      log.error('Failed to check sync status:', error);
      setSyncStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const handleSyncMetadata = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('Starting metadata sync...');

    try {
      // Spusť synchronizaci
      const result = await metadataSyncService.syncMetadata();

      setSyncProgress(100);
      setSyncMessage(`✅ Sync completed: ${result.filesProcessed}/${result.totalFiles} files processed`);

      // Obnov stav
      await checkSyncStatus();

    } catch (error) {
      log.error('Failed to sync metadata:', error);
      setSyncMessage(`❌ Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);

      // Vymaž zprávu po 5 sekundách
      setTimeout(() => {
        setSyncMessage('');
        setSyncProgress(0);
      }, 5000);
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    return date.toLocaleString('cs-CZ');
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Metadata Synchronization Manager
      </h2>

      {/* Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Current Status</h3>

        {syncStatus.loading ? (
          <div className="text-blue-600">Loading status...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Files</div>
              <div className="text-2xl font-bold text-blue-800">{syncStatus.totalFiles}</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Last Sync</div>
              <div className="text-sm text-green-800">{formatLastSync(syncStatus.lastSync)}</div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-yellow-600 font-medium">Status</div>
              <div className="text-sm text-yellow-800">
                {syncStatus.needsSync ? 'Needs Sync' : 'Up to Date'}
              </div>
            </div>
          </div>
        )}

        {syncStatus.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800">Error: {syncStatus.error}</div>
          </div>
        )}
      </div>

      {/* Folder Statistics */}
      {Object.keys(syncStatus.byFolder).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Files by Folder</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(syncStatus.byFolder).map(([folder, count]) => (
              <div key={folder} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{folder}</span>
                  <span className="text-blue-600 font-bold">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync Progress */}
      {(isSyncing || syncMessage) && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Sync Progress</h3>

          {isSyncing && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              ></div>
            </div>
          )}

          {syncMessage && (
            <div className={`p-3 rounded-lg ${
              syncMessage.includes('✅') ? 'bg-green-50 text-green-800' :
              syncMessage.includes('❌') ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {syncMessage}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleSyncMetadata}
          disabled={isSyncing}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isSyncing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSyncing ? 'Syncing...' : 'Sync Metadata'}
        </button>

        <button
          onClick={checkSyncStatus}
          disabled={syncStatus.loading}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          Refresh Status
        </button>
      </div>

      {/* Help */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">How it works:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Metadata are automatically extracted from MP3 files in Firebase Storage</li>
          <li>• Duration, title, and folder information are stored in Firestore</li>
          <li>• The sync process runs automatically when files are uploaded</li>
          <li>• Manual sync can be triggered if needed</li>
        </ul>
      </div>
    </div>
  );
};

export default MetadataSyncManager;
