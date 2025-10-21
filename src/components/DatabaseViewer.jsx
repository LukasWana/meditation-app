import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, get, child } from 'firebase/database';
import { listAll, getMetadata } from 'firebase/storage';
import { db, realtimeDatabase, storage } from '../config/secure-firebase';
import log from '@services/logger';

/**
 * Database Viewer Component
 * Zobrazuje obsah všech Firebase databází
 */
const DatabaseViewer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    firestore: null,
    realtime: null,
    storage: null
  });
  const [activeTab, setActiveTab] = useState('firestore');

  const loadFirestoreData = async () => {
    try {
      setLoading(true);
      setError(null);

      log.info('🔄 Loading Firestore data...');
      const collections = ['audio-metadata', 'metadata', 'files', 'albums', 'songs'];
      const firestoreData = {};

      for (const collectionName of collections) {
        try {
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(collectionRef);
          const documents = [];
          
          snapshot.forEach((doc) => {
            documents.push({
              id: doc.id,
              ...doc.data()
            });
          });

          if (documents.length > 0) {
            firestoreData[collectionName] = documents;
          }
        } catch (collectionError) {
          log.warn(`Collection ${collectionName} not found or empty:`, collectionError.message);
        }
      }

      log.success(`✅ Loaded ${Object.keys(firestoreData).length} Firestore collections`);
      setData(prev => ({ ...prev, firestore: firestoreData }));
    } catch (error) {
      log.error('Failed to load Firestore data:', error);
      setError(`Firestore error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeData = async () => {
    try {
      setLoading(true);
      setError(null);

      log.info('🔄 Loading Realtime Database data...');
      const realtimeData = {};

      // Načti kořenové uzly
      const rootRef = ref(realtimeDatabase);
      const snapshot = await get(rootRef);
      
      if (snapshot.exists()) {
        const rootData = snapshot.val();
        
        // Projdi všechny kořenové klíče
        for (const [key, value] of Object.entries(rootData)) {
          realtimeData[key] = value;
        }
      }

      log.success(`✅ Loaded ${Object.keys(realtimeData).length} Realtime Database nodes`);
      setData(prev => ({ ...prev, realtime: realtimeData }));
    } catch (error) {
      log.error('Failed to load Realtime Database data:', error);
      setError(`Realtime Database error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageData = async () => {
    try {
      setLoading(true);
      setError(null);

      log.info('🔄 Loading Firebase Storage data...');
      const storageData = {
        files: [],
        folders: {},
        totalSize: 0,
        totalFiles: 0
      };

      // Načti kořenovou složku
      const rootRef = ref(storage);
      const result = await listAll(rootRef);

      // Zpracuj soubory v kořenové složce
      for (const itemRef of result.items) {
        try {
          const metadata = await getMetadata(itemRef);
          storageData.files.push({
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated,
            updated: metadata.updated
          });
          storageData.totalSize += metadata.size;
          storageData.totalFiles++;
        } catch (metaError) {
          log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
        }
      }

      // Zpracuj složky
      for (const folderRef of result.prefixes) {
        try {
          const folderResult = await listAll(folderRef);
          const folderFiles = [];

          for (const itemRef of folderResult.items) {
            try {
              const metadata = await getMetadata(itemRef);
              folderFiles.push({
                name: itemRef.name,
                fullPath: itemRef.fullPath,
                size: metadata.size,
                contentType: metadata.contentType,
                timeCreated: metadata.timeCreated,
                updated: metadata.updated
              });
              storageData.totalSize += metadata.size;
              storageData.totalFiles++;
            } catch (metaError) {
              log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
            }
          }

          storageData.folders[folderRef.name] = {
            files: folderFiles,
            subfolders: folderResult.prefixes.map(p => p.name)
          };
        } catch (folderError) {
          log.warn(`Failed to list folder ${folderRef.name}:`, folderError.message);
        }
      }

      log.success(`✅ Loaded ${storageData.totalFiles} files from Firebase Storage`);
      setData(prev => ({ ...prev, storage: storageData }));
    } catch (error) {
      log.error('Failed to load Firebase Storage data:', error);
      setError(`Storage error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadFirestoreData(),
      loadRealtimeData(),
      loadStorageData()
    ]);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  const renderFirestoreData = () => {
    if (!data.firestore) return <div className="text-gray-500">No Firestore data loaded</div>;

    return (
      <div className="space-y-4">
        {Object.keys(data.firestore).length === 0 ? (
          <div className="text-gray-500">No Firestore collections found</div>
        ) : (
          Object.entries(data.firestore).map(([collectionName, documents]) => (
            <div key={collectionName} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                📁 {collectionName}
                <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {documents.length} documents
                </span>
              </h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {documents.map((doc, index) => (
                  <div key={doc.id || index} className="bg-gray-50 p-3 rounded border">
                    <div className="font-mono text-sm">
                      <strong>ID:</strong> {doc.id}
                    </div>
                    <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
                      {JSON.stringify(doc, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderRealtimeData = () => {
    if (!data.realtime) return <div className="text-gray-500">No Realtime Database data loaded</div>;

    return (
      <div className="space-y-4">
        {Object.keys(data.realtime).length === 0 ? (
          <div className="text-gray-500">No Realtime Database nodes found</div>
        ) : (
          Object.entries(data.realtime).map(([nodeName, nodeData]) => (
            <div key={nodeName} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                🗄️ {nodeName}
                <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                  {typeof nodeData === 'object' ? Object.keys(nodeData).length : 1} items
                </span>
              </h3>
              
              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto max-h-60 overflow-y-auto">
                {JSON.stringify(nodeData, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderStorageData = () => {
    if (!data.storage) return <div className="text-gray-500">No Storage data loaded</div>;

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">📊 Storage Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Total Files:</strong> {data.storage.totalFiles}
            </div>
            <div>
              <strong>Total Size:</strong> {formatBytes(data.storage.totalSize)}
            </div>
          </div>
        </div>

        {/* Root Files */}
        {data.storage.files.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              📄 Root Files
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {data.storage.files.length} files
              </span>
            </h3>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data.storage.files.map((file, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded border">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Name:</strong> {file.name}</div>
                    <div><strong>Size:</strong> {formatBytes(file.size)}</div>
                    <div><strong>Type:</strong> {file.contentType}</div>
                    <div><strong>Created:</strong> {formatDate(file.timeCreated)}</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    <strong>Path:</strong> {file.fullPath}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Folders */}
        {Object.keys(data.storage.folders).length > 0 && (
          Object.entries(data.storage.folders).map(([folderName, folderData]) => (
            <div key={folderName} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                📁 {folderName}
                <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                  {folderData.files.length} files
                </span>
              </h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {folderData.files.map((file, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded border">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>Name:</strong> {file.name}</div>
                      <div><strong>Size:</strong> {formatBytes(file.size)}</div>
                      <div><strong>Type:</strong> {file.contentType}</div>
                      <div><strong>Created:</strong> {formatDate(file.timeCreated)}</div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      <strong>Path:</strong> {file.fullPath}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={loadAllData}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
        >
          {loading ? '🔄 Loading...' : '📊 Load All Data'}
        </button>
        
        <button
          onClick={loadFirestoreData}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
        >
          🔥 Load Firestore
        </button>
        
        <button
          onClick={loadRealtimeData}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
        >
          🗄️ Load Realtime
        </button>
        
        <button
          onClick={loadStorageData}
          disabled={loading}
          className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
        >
          💾 Load Storage
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">❌</span>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('firestore')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'firestore'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔥 Firestore ({data.firestore ? Object.keys(data.firestore).length : 0} collections)
          </button>
          <button
            onClick={() => setActiveTab('realtime')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'realtime'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🗄️ Realtime ({data.realtime ? Object.keys(data.realtime).length : 0} nodes)
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'storage'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💾 Storage ({data.storage ? data.storage.totalFiles : 0} files)
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading database content...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'firestore' && renderFirestoreData()}
            {activeTab === 'realtime' && renderRealtimeData()}
            {activeTab === 'storage' && renderStorageData()}
          </>
        )}
      </div>
    </div>
  );
};

export default DatabaseViewer;
