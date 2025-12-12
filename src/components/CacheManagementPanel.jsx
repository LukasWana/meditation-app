import React, { useState, useEffect } from 'react';
import { ref, get, child } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';
import { realtimeDatabase, auth } from '../config/secure-firebase';
import { extractAudioMetadata } from '../utils/audioMetadataExtractor';
import audioMetadataStorageService from '../services/audioMetadataStorageService';
import log from '@services/logger';

const CacheManagementPanel = () => {
  const [user, loading, error] = useAuthState(auth);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheError, setCacheError] = useState(null);
  const [cacheData, setCacheData] = useState({
    audio_metadata: null,
    audio_stats: null,
    totalFiles: 0,
    totalSize: 0,
    totalDuration: 0
  });
  const [scanningFiles, setScanningFiles] = useState(false);
  const [creatingCache, setCreatingCache] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

  // Načtení všech cache dat při mount a po autentifikaci
  useEffect(() => {
    if (user && !loading) {
      loadAllCacheData();
    }
  }, [user, loading]);

  const loadAllCacheData = async () => {
    if (!user) {
      setCacheError('User not authenticated');
      return;
    }

    try {
      setCacheLoading(true);
      setCacheError(null);
      log.info('🔄 Loading all cache data from Realtime Database...');

      const dbRef = ref(realtimeDatabase);

      // Načti audio_metadata
      const audioMetadataSnapshot = await get(child(dbRef, 'audio_metadata'));
      const audioMetadata = audioMetadataSnapshot.exists() ? audioMetadataSnapshot.val() : null;

      // Načti audio_stats
      const audioStatsSnapshot = await get(child(dbRef, 'audio_stats'));
      const audioStats = audioStatsSnapshot.exists() ? audioStatsSnapshot.val() : null;

      // Vypočti statistiky
      let totalFiles = 0;
      let totalSize = 0;
      let totalDuration = 0;

      if (audioMetadata) {
        Object.values(audioMetadata).forEach(file => {
          if (file && typeof file === 'object') {
            totalFiles++;
            if (file.size) totalSize += file.size;
            if (file.duration) totalDuration += file.duration;
          }
        });
      }

      setCacheData({
        audio_metadata: audioMetadata,
        audio_stats: audioStats,
        totalFiles,
        totalSize,
        totalDuration
      });

      log.success(`✅ Loaded cache data: ${totalFiles} files, ${formatBytes(totalSize)}, ${formatDuration(totalDuration)}`);
    } catch (error) {
      log.error('Failed to load cache data:', error);
      setCacheError(`Error loading cache: ${error.message}`);
    } finally {
      setCacheLoading(false);
    }
  };

  const scanAndCreateCache = async () => {
    if (creatingCache || !user) return;

    try {
      setCreatingCache(true);
      setScanningFiles(true);
      setCacheError(null);

      log.info('🔄 Starting cache creation process...');

      // Import Firebase Storage functions
      const { ref: storageRef, listAll } = await import('firebase/storage');
      const { storage } = await import('../config/secure-firebase');

      // Skenuj všechny soubory
      const allFiles = [];
      const rootRef = storageRef(storage, '');
      const rootResult = await listAll(rootRef);

      // Skenuj všechny složky
      for (const folderRef of rootResult.prefixes) {
        const folderResult = await listAll(folderRef);

        // Přidej soubory z hlavní složky
        for (const itemRef of folderResult.items) {
          try {
            const metadata = await itemRef.getMetadata();
            const downloadURL = await itemRef.getDownloadURL();

            allFiles.push({
              name: itemRef.name,
              fullPath: itemRef.fullPath,
              size: metadata.size,
              contentType: metadata.contentType,
              timeCreated: metadata.timeCreated,
              updated: metadata.updated,
              downloadURL: downloadURL,
              folder: folderRef.name,
              category: folderRef.name === 'hudba' ? 'hudba' : 'slova',
              language: folderRef.name.includes('CZ') ? 'CZ' :
                       folderRef.name.includes('SK') ? 'SK' :
                       folderRef.name.includes('EN') ? 'EN' : null
            });
          } catch (error) {
            log.warn(`Failed to process file ${itemRef.name}:`, error.message);
          }
        }

        // Skenuj podsložky (např. slova/CZ, slova/SK, slova/EN)
        for (const subFolderRef of folderResult.prefixes) {
          const subFolderResult = await listAll(subFolderRef);

          for (const itemRef of subFolderResult.items) {
            try {
              const metadata = await itemRef.getMetadata();
              const downloadURL = await itemRef.getDownloadURL();

              allFiles.push({
                name: itemRef.name,
                fullPath: itemRef.fullPath,
                size: metadata.size,
                contentType: metadata.contentType,
                timeCreated: metadata.timeCreated,
                updated: metadata.updated,
                downloadURL: downloadURL,
                folder: subFolderRef.fullPath,
                category: 'slova',
                language: subFolderRef.name
              });
            } catch (error) {
              log.warn(`Failed to process file ${itemRef.name}:`, error.message);
            }
          }
        }
      }

      setScanProgress({ current: 0, total: allFiles.length });
      log.info(`📁 Found ${allFiles.length} audio files to process`);

      // Extrahuj metadata pro každý soubor
      const filesWithMetadata = [];
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        setScanProgress({ current: i + 1, total: allFiles.length });

        try {
          log.info(`⏱️ Extracting metadata for ${file.name} (${i + 1}/${allFiles.length})`);
          const metadata = await extractAudioMetadata(file.downloadURL);

          filesWithMetadata.push({
            ...file,
            duration: metadata.duration,
            durationFormatted: metadata.durationFormatted,
            durationDetailed: metadata.durationDetailed,
            isValid: metadata.isValid
          });
        } catch (error) {
          log.warn(`Failed to extract metadata for ${file.name}:`, error.message);
          filesWithMetadata.push({
            ...file,
            duration: 0,
            durationFormatted: 'N/A',
            durationDetailed: 'N/A',
            isValid: false
          });
        }
      }

      setScanningFiles(false);
      log.info('💾 Saving metadata to Realtime Database...');

      // Ulož do Realtime Database
      const result = await audioMetadataStorageService.saveBatchMetadata(filesWithMetadata);

      if (result.success) {
        log.success(`✅ Cache creation completed: ${result.savedCount}/${result.totalCount} files saved`);
        alert(`✅ Cache úspěšně vytvořen! Uloženo ${result.savedCount}/${result.totalCount} souborů do Realtime Database.`);

        // Reload cache data
        await loadAllCacheData();
      } else {
        throw new Error('Failed to save cache to database');
      }

    } catch (error) {
      log.error('Failed to create cache:', error);
      setCacheError(`Error creating cache: ${error.message}`);
      alert(`❌ Chyba při vytváření cache: ${error.message}`);
    } finally {
      setCreatingCache(false);
      setScanningFiles(false);
      setScanProgress({ current: 0, total: 0 });
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('cs-CZ');
  };

  const renderCacheOverview = () => {
    if (!cacheData.audio_metadata) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Cache není vytvořen</h3>
          <p className="text-yellow-700">
            Realtime Database cache neobsahuje žádná data. Klikněte na &quot;Vytvořit Cache&quot; pro skenování a vytvoření cache.
          </p>
        </div>
      );
    }

    const files = Object.values(cacheData.audio_metadata).filter(file => file && typeof file === 'object');
    const slovaFiles = files.filter(file => file.category === 'slova');
    const hudbaFiles = files.filter(file => file.category === 'hudba');

    const slovaByLanguage = {
      CZ: slovaFiles.filter(file => file.language === 'CZ'),
      SK: slovaFiles.filter(file => file.language === 'SK'),
      EN: slovaFiles.filter(file => file.language === 'EN'),
      main: slovaFiles.filter(file => !file.language)
    };

    return (
      <div className="space-y-6">
        {/* Celkové statistiky */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">📊 Celkové statistiky cache</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded p-3">
              <div className="text-2xl font-bold text-blue-600">{cacheData.totalFiles}</div>
              <div className="text-sm text-gray-600">Celkem souborů</div>
            </div>
            <div className="bg-white rounded p-3">
              <div className="text-2xl font-bold text-green-600">{formatBytes(cacheData.totalSize)}</div>
              <div className="text-sm text-gray-600">Celková velikost</div>
            </div>
            <div className="bg-white rounded p-3">
              <div className="text-2xl font-bold text-purple-600">{formatDuration(cacheData.totalDuration)}</div>
              <div className="text-sm text-gray-600">Celková délka</div>
            </div>
          </div>
        </div>

        {/* Rozdělení podle kategorií */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hudba */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-3">🎵 Hudba ({hudbaFiles.length} souborů)</h3>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Celková velikost:</span> {formatBytes(hudbaFiles.reduce((sum, f) => sum + (f.size || 0), 0))}
              </div>
              <div className="text-sm">
                <span className="font-medium">Celková délka:</span> {formatDuration(hudbaFiles.reduce((sum, f) => sum + (f.duration || 0), 0))}
              </div>
            </div>
          </div>

          {/* Slova */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-800 mb-3">💬 Slova ({slovaFiles.length} souborů)</h3>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Celková velikost:</span> {formatBytes(slovaFiles.reduce((sum, f) => sum + (f.size || 0), 0))}
              </div>
              <div className="text-sm">
                <span className="font-medium">Celková délka:</span> {formatDuration(slovaFiles.reduce((sum, f) => sum + (f.duration || 0), 0))}
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-xs text-gray-600">
                  CZ: {slovaByLanguage.CZ.length} souborů
                </div>
                <div className="text-xs text-gray-600">
                  SK: {slovaByLanguage.SK.length} souborů
                </div>
                <div className="text-xs text-gray-600">
                  EN: {slovaByLanguage.EN.length} souborů
                </div>
                <div className="text-xs text-gray-600">
                  Main: {slovaByLanguage.main.length} souborů
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nejnovější soubory */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🕒 Nejnovější soubory</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files
              .sort((a, b) => new Date(b.timeCreated) - new Date(a.timeCreated))
              .slice(0, 10)
              .map((file, index) => (
                <div key={index} className="bg-white rounded p-2 text-sm">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-gray-600">
                    {file.category} • {file.language || 'N/A'} • {formatBytes(file.size)} • {file.durationFormatted}
                  </div>
                  <div className="text-xs text-gray-500">
                    Vytvořeno: {formatDate(file.timeCreated)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🗄️ Cache Management</h1>
        <p className="text-gray-600">
          Správa a příprava cache v Realtime Database. Zde můžete zobrazit všechny cache data a vytvořit nové.
        </p>
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono">
            v{import.meta.env.VITE_APP_VERSION || 'dev'}
          </span>
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono">
            Build: {new Date().toLocaleDateString('cs-CZ')} {new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-mono">
            Commit: 14d3007
          </span>
        </div>
      </div>

      {(cacheError || error) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Chyba</h3>
          <p className="text-red-700">{cacheError || error?.message}</p>
        </div>
      )}

      {!user && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">🔐 Vyžaduje přihlášení</h3>
          <p className="text-yellow-700">
            Pro přístup k cache managementu se musíte nejdříve přihlásit.
          </p>
        </div>
      )}

      {/* Akce */}
      <div className="flex gap-4 flex-wrap mb-6">
        <button
          onClick={loadAllCacheData}
          disabled={cacheLoading || !user}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cacheLoading ? '🔄 Loading...' : '🔄 Refresh Cache Data'}
        </button>

        <button
          onClick={scanAndCreateCache}
          disabled={creatingCache || cacheLoading || !user}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creatingCache ? '🔄 Creating Cache...' : '⚡ Create/Update Cache'}
        </button>
      </div>

      {/* Progress bar pro vytváření cache */}
      {scanningFiles && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">⏱️ Extracting Audio Metadata</h3>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
            ></div>
          </div>
          <div className="text-sm text-blue-700">
            Processing {scanProgress.current} of {scanProgress.total} files...
          </div>
        </div>
      )}

      {/* Cache přehled */}
      {renderCacheOverview()}
    </div>
  );
};

export default CacheManagementPanel;
