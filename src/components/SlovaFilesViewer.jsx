import React, { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '../config/secure-firebase';
import { extractAudioMetadata, formatDuration, formatDurationDetailed } from '../utils/audioMetadataExtractor';
import audioMetadataStorageService from '../services/audioMetadataStorageService';
import log from '@services/logger';

/**
 * Meditacie Files Viewer Component
 * Zobrazuje detailní informace o souborech v sekci meditacie
 */
const SlovaFilesViewer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState({
    slova: [],
    slovaCZ: [],
    slovaSK: [],
    slovaEN: [],
    totalFiles: 0,
    totalSize: 0,
    totalDuration: 0
  });
  const [loadingDurations, setLoadingDurations] = useState(false);
  const [savingToDB, setSavingToDB] = useState(false);

  const loadSlovaFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      log.info('🔄 Loading meditacie files from Firebase Storage...');

      // Načti soubory z kořenové meditacie složky
      const slovaRef = ref(storage, 'meditacie');
      const slovaResult = await listAll(slovaRef);

      const slovaFiles = [];
      for (const itemRef of slovaResult.items) {
        try {
          const metadata = await getMetadata(itemRef);
          const downloadURL = await getDownloadURL(itemRef);

          slovaFiles.push({
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated,
            updated: metadata.updated,
            downloadURL: downloadURL,
            folder: 'meditacie',
            duration: 0,
            durationFormatted: 'N/A',
            durationDetailed: 'N/A'
          });
        } catch (metaError) {
          log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
        }
      }

      // Načti soubory z jazykových podsložek
      const languageFolders = ['CZ', 'SK', 'EN'];
      const languageFiles = { CZ: [], SK: [], EN: [] };

      for (const lang of languageFolders) {
        try {
          const langRef = ref(storage, `meditacie/${lang}`);
          const langResult = await listAll(langRef);

          for (const itemRef of langResult.items) {
            try {
              const metadata = await getMetadata(itemRef);
              const downloadURL = await getDownloadURL(itemRef);

              languageFiles[lang].push({
                name: itemRef.name,
                fullPath: itemRef.fullPath,
                size: metadata.size,
                contentType: metadata.contentType,
                timeCreated: metadata.timeCreated,
                updated: metadata.updated,
                downloadURL: downloadURL,
                folder: `meditacie/${lang}`,
                duration: 0,
                durationFormatted: 'N/A',
                durationDetailed: 'N/A'
              });
            } catch (metaError) {
              log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
            }
          }
        } catch (langError) {
          log.warn(`Failed to scan meditacie/${lang}:`, langError.message);
        }
      }

      // Vypočti celkové statistiky
      const allFiles = [...slovaFiles, ...languageFiles.CZ, ...languageFiles.SK, ...languageFiles.EN];
      const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);

      setFiles({
        slova: slovaFiles,
        slovaCZ: languageFiles.CZ,
        slovaSK: languageFiles.SK,
        slovaEN: languageFiles.EN,
        totalFiles: allFiles.length,
        totalSize: totalSize,
        totalDuration: 0
      });

      log.success(`✅ Loaded ${allFiles.length} meditacie files from Firebase Storage`);

    } catch (error) {
      log.error('Failed to load meditacie files:', error);
      setError(`Error loading files: ${error.message}`);
    } finally {
      setLoading(false);
    }
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

  const loadAudioDurations = async () => {
    if (loadingDurations) return;

    try {
      setLoadingDurations(true);
      log.info('🔄 Loading audio durations...');

      const allFiles = [...files.slova, ...files.slovaCZ, ...files.slovaSK, ...files.slovaEN];
      let totalDuration = 0;

      // Načti délky pro všechny soubory
      for (const file of allFiles) {
        try {
          const audioMetadata = await extractAudioMetadata(file.downloadURL);
          file.duration = audioMetadata.duration;
          file.durationFormatted = audioMetadata.durationFormatted;
          file.durationDetailed = audioMetadata.durationDetailed;
          totalDuration += audioMetadata.duration;
        } catch (error) {
          log.warn(`Failed to get duration for ${file.name}:`, error.message);
        }
      }

      // Aktualizuj state s novými délkami
      setFiles(prevFiles => ({
        ...prevFiles,
        totalDuration: totalDuration
      }));

      log.success(`✅ Loaded audio durations. Total: ${formatDuration(totalDuration)}`);
    } catch (error) {
      log.error('Failed to load audio durations:', error);
    } finally {
      setLoadingDurations(false);
    }
  };

  const saveToRealtimeDatabase = async () => {
    if (savingToDB) return;

    try {
      setSavingToDB(true);
      log.info('🔄 Saving meditacie metadata to Realtime Database...');

      const allFiles = [...files.slova, ...files.slovaCZ, ...files.slovaSK, ...files.slovaEN];

      // Připrav data pro uložení
      const filesData = allFiles.map(file => ({
        name: file.name,
        fullPath: file.fullPath,
        size: file.size,
        contentType: file.contentType,
        duration: file.duration,
        durationFormatted: file.durationFormatted,
        durationDetailed: file.durationDetailed,
        folder: file.folder,
        category: 'meditacie',
        language: file.folder.includes('CZ') ? 'CZ' : file.folder.includes('SK') ? 'SK' : file.folder.includes('EN') ? 'EN' : null,
        downloadURL: file.downloadURL
      }));

      const result = await audioMetadataStorageService.saveBatchMetadata(filesData);

      if (result.success) {
        log.success(`✅ Successfully saved ${result.savedCount}/${result.totalCount} meditacie files to Realtime Database`);
        alert(`✅ Úspěšně uloženo ${result.savedCount}/${result.totalCount} meditacie souborů do Realtime Database!`);
      } else {
        throw new Error('Failed to save to database');
      }
    } catch (error) {
      log.error('Failed to save meditacie metadata to Realtime Database:', error);
      alert(`❌ Chyba při ukládání do databáze: ${error.message}`);
    } finally {
      setSavingToDB(false);
    }
  };

  const renderFileList = (files, title, _folder) => (
    <div className="border rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        📁 {title}
        <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {files.length} souborů
        </span>
        {files.length > 0 && (
          <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
            {formatBytes(files.reduce((sum, file) => sum + (file.size || 0), 0))}
          </span>
        )}
      </h3>

      {files.length === 0 ? (
        <p className="text-gray-500 italic">Žádné soubory v této složce</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {files.map((file, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <strong>Název:</strong> {file.name}
                </div>
                <div>
                  <strong>Velikost:</strong> {formatBytes(file.size)}
                </div>
                <div>
                  <strong>Délka:</strong> {file.durationFormatted}
                  {file.durationDetailed !== 'N/A' && (
                    <span className="ml-1 text-gray-600">({file.durationDetailed})</span>
                  )}
                </div>
                <div>
                  <strong>Typ:</strong> {file.contentType}
                </div>
                <div>
                  <strong>Vytvořeno:</strong> {formatDate(file.timeCreated)}
                </div>
                <div>
                  <strong>Aktualizováno:</strong> {formatDate(file.updated)}
                </div>
                <div>
                  <strong>Složka:</strong> {file.folder}
                </div>
                <div>
                  <strong>Délka (sec):</strong> {file.duration || 'N/A'}
                </div>
              </div>
              <div className="mt-2">
                <strong>URL:</strong>
                <a
                  href={file.downloadURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {file.downloadURL}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  useEffect(() => {
    loadSlovaFiles();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">
          🗣️ Meditacie Files Viewer
        </h2>
        <p className="text-blue-700">
          Detailní přehled všech souborů v sekci meditacie včetně jazykových variant
        </p>
      </div>

      {/* Summary */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-green-900 mb-2">📊 Celkové statistiky</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Celkem souborů:</strong> {files.totalFiles}
          </div>
          <div>
            <strong>Celková velikost:</strong> {formatBytes(files.totalSize)}
          </div>
          <div>
            <strong>Celková délka:</strong> {formatDuration(files.totalDuration)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 flex-wrap">
        <button
          onClick={loadSlovaFiles}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh Files'}
        </button>

        <button
          onClick={loadAudioDurations}
          disabled={loadingDurations || loading}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
        >
          {loadingDurations ? '⏱️ Loading Durations...' : '⏱️ Load Durations'}
        </button>

        <button
          onClick={saveToRealtimeDatabase}
          disabled={savingToDB || loading || files.totalFiles === 0}
          className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
        >
          {savingToDB ? '💾 Saving to DB...' : '💾 Save to Realtime DB'}
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

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading meditacie files...</p>
          </div>
        </div>
      )}

      {/* File Lists */}
      {!loading && (
        <div className="space-y-4">
          {renderFileList(files.slova, 'Meditacie (hlavní složka)', 'meditacie')}
          {renderFileList(files.slovaCZ, 'Meditacie CZ (české soubory)', 'meditacie/CZ')}
          {renderFileList(files.slovaSK, 'Meditacie SK (slovenské soubory)', 'meditacie/SK')}
          {renderFileList(files.slovaEN, 'Meditacie EN (anglické soubory)', 'meditacie/EN')}
        </div>
      )}
    </div>
  );
};

export default SlovaFilesViewer;
