import React, { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '../config/secure-firebase';
import { extractAudioMetadata, formatDuration, formatDurationDetailed } from '../utils/audioMetadataExtractor';
import log from '@services/logger';

/**
 * Hudba Files Viewer Component
 * Zobrazuje detailní informace o hudebních souborech
 */
const HudbaFilesViewer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState({
    hudba: [],
    totalFiles: 0,
    totalSize: 0,
    totalDuration: 0
  });
  const [loadingDurations, setLoadingDurations] = useState(false);

  const loadHudbaFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      log.info('🔄 Loading hudba files from Firebase Storage...');

      // Načti soubory z kořenové složky a prohledej všechny podsložky
      const rootRef = ref(storage, '');
      const rootResult = await listAll(rootRef);
      
      const hudbaFiles = [];

      // Prohledej všechny podsložky pro hudbu
      for (const folderRef of rootResult.prefixes) {
        try {
          const folderResult = await listAll(folderRef);
          
          // Pokud je to hudba/ složka nebo obsahuje hudební soubory
          if (folderRef.name === 'hudba' || folderRef.name.toLowerCase().includes('hudba')) {
            // Přidej soubory přímo z hudba složky
            for (const itemRef of folderResult.items) {
              try {
                const metadata = await getMetadata(itemRef);
                const downloadURL = await getDownloadURL(itemRef);
                
                hudbaFiles.push({
                  name: itemRef.name,
                  fullPath: itemRef.fullPath,
                  size: metadata.size,
                  contentType: metadata.contentType,
                  timeCreated: metadata.timeCreated,
                  updated: metadata.updated,
                  downloadURL: downloadURL,
                  folder: folderRef.name,
                  duration: 0,
                  durationFormatted: 'N/A',
                  durationDetailed: 'N/A'
                });
              } catch (metaError) {
                log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
              }
            }

            // Prohledej podsložky v hudba/ (alba)
            for (const subFolderRef of folderResult.prefixes) {
              try {
                const subFolderResult = await listAll(subFolderRef);
                
                for (const itemRef of subFolderResult.items) {
                  try {
                    const metadata = await getMetadata(itemRef);
                    const downloadURL = await getDownloadURL(itemRef);
                    
                    hudbaFiles.push({
                      name: itemRef.name,
                      fullPath: itemRef.fullPath,
                      size: metadata.size,
                      contentType: metadata.contentType,
                      timeCreated: metadata.timeCreated,
                      updated: metadata.updated,
                      downloadURL: downloadURL,
                      folder: `${folderRef.name}/${subFolderRef.name}`,
                      duration: 0,
                      durationFormatted: 'N/A',
                      durationDetailed: 'N/A'
                    });
                  } catch (metaError) {
                    log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
                  }
                }
              } catch (subError) {
                log.warn(`Failed to scan subfolder ${subFolderRef.name}:`, subError.message);
              }
            }
          }
        } catch (folderError) {
          log.warn(`Failed to scan folder ${folderRef.name}:`, folderError.message);
        }
      }

      // Také zkontroluj soubory přímo v kořenové složce, které vypadají jako hudba
      for (const itemRef of rootResult.items) {
        try {
          const name = itemRef.name.toLowerCase();
          const isAudioFile = name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a');
          const looksLikeMusic = name.includes('hudba') || name.includes('music') || name.startsWith('00--00--00--');
          
          if (isAudioFile && looksLikeMusic) {
            const metadata = await getMetadata(itemRef);
            const downloadURL = await getDownloadURL(itemRef);
            
            hudbaFiles.push({
              name: itemRef.name,
              fullPath: itemRef.fullPath,
              size: metadata.size,
              contentType: metadata.contentType,
              timeCreated: metadata.timeCreated,
              updated: metadata.updated,
              downloadURL: downloadURL,
              folder: 'root',
              duration: 0,
              durationFormatted: 'N/A',
              durationDetailed: 'N/A'
            });
          }
        } catch (metaError) {
          log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
        }
      }

      // Vypočti celkové statistiky
      const totalSize = hudbaFiles.reduce((sum, file) => sum + (file.size || 0), 0);

      setFiles({
        hudba: hudbaFiles,
        totalFiles: hudbaFiles.length,
        totalSize: totalSize,
        totalDuration: 0
      });

      log.success(`✅ Loaded ${hudbaFiles.length} hudba files from Firebase Storage`);

    } catch (error) {
      log.error('Failed to load hudba files:', error);
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

      const allFiles = files.hudba;
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

  const renderFileList = (files, title, folder) => (
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
        {files.length > 0 && (
          <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
            {formatDuration(files.reduce((sum, file) => sum + (file.duration || 0), 0))}
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
    loadHudbaFiles();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold text-purple-900 mb-2">
          🎵 Hudba Files Viewer
        </h2>
        <p className="text-purple-700">
          Detailní přehled všech hudebních souborů
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
          onClick={loadHudbaFiles}
          disabled={loading}
          className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading hudba files...</p>
          </div>
        </div>
      )}

      {/* File Lists */}
      {!loading && (
        <div className="space-y-4">
          {renderFileList(files.hudba, 'Hudba (hudební soubory)', 'hudba')}
        </div>
      )}
    </div>
  );
};

export default HudbaFilesViewer;
