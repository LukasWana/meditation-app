import React, { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '../config/secure-firebase';
import { extractAudioMetadata, formatDuration, formatDurationDetailed } from '../utils/audioMetadataExtractor';
import log from '@services/logger';

/**
 * Unified Files Overview Component
 * Jednotný přehled všech souborů v aplikaci
 */
const UnifiedFilesOverview = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState({
    slova: [],
    slovaCZ: [],
    slovaSK: [],
    slovaEN: [],
    hudba: [],
    totalFiles: 0,
    totalSize: 0,
    totalDuration: 0
  });
  const [loadingDurations, setLoadingDurations] = useState(false);
  const [viewMode, setViewMode] = useState('summary'); // summary, detailed, variants

  const loadAllFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      log.info('🔄 Loading all files from Firebase Storage...');

      // Načti soubory ze slova složky
      const slovaRef = ref(storage, 'slova');
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
            folder: 'slova',
            category: 'slova',
            duration: 0,
            durationFormatted: 'N/A',
            durationDetailed: 'N/A'
          });
        } catch (metaError) {
          log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
        }
      }

      // Načti soubory z jazykových podsložek slova
      const languageFolders = ['CZ', 'SK', 'EN'];
      const languageFiles = { CZ: [], SK: [], EN: [] };

      for (const lang of languageFolders) {
        try {
          const langRef = ref(storage, `slova/${lang}`);
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
                folder: `slova/${lang}`,
                category: 'slova',
                language: lang,
                duration: 0,
                durationFormatted: 'N/A',
                durationDetailed: 'N/A'
              });
            } catch (metaError) {
              log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
            }
          }
        } catch (langError) {
          log.warn(`Failed to scan slova/${lang}:`, langError.message);
        }
      }

      // Načti soubory z hudba složky
      const hudbaRef = ref(storage, 'hudba');
      const hudbaResult = await listAll(hudbaRef);
      
      const hudbaFiles = [];
      for (const itemRef of hudbaResult.items) {
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
            folder: 'hudba',
            category: 'hudba',
            duration: 0,
            durationFormatted: 'N/A',
            durationDetailed: 'N/A'
          });
        } catch (metaError) {
          log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
        }
      }

      // Vypočti celkové statistiky
      const allFiles = [...slovaFiles, ...languageFiles.CZ, ...languageFiles.SK, ...languageFiles.EN, ...hudbaFiles];
      const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);

      setFiles({
        slova: slovaFiles,
        slovaCZ: languageFiles.CZ,
        slovaSK: languageFiles.SK,
        slovaEN: languageFiles.EN,
        hudba: hudbaFiles,
        totalFiles: allFiles.length,
        totalSize: totalSize,
        totalDuration: 0
      });

      log.success(`✅ Loaded ${allFiles.length} total files from Firebase Storage`);

    } catch (error) {
      log.error('Failed to load all files:', error);
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
      log.info('🔄 Loading audio durations for all files...');

      const allFiles = [...files.slova, ...files.slovaCZ, ...files.slovaSK, ...files.slovaEN, ...files.hudba];
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

  const groupFilesByVariants = () => {
    const allFiles = [...files.slova, ...files.slovaCZ, ...files.slovaSK, ...files.slovaEN, ...files.hudba];
    const variants = {};
    
    allFiles.forEach(file => {
      // Extrahuj základní název (bez jazyka a přípony)
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/_(CZ|SK|EN)$/i, '');
      
      if (!variants[baseName]) {
        variants[baseName] = [];
      }
      variants[baseName].push(file);
    });
    
    return variants;
  };

  const renderSummaryView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Slova Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">🗣️ Slova</h3>
        <div className="space-y-2 text-sm">
          <div><strong>Celkem souborů:</strong> {files.slova.length + files.slovaCZ.length + files.slovaSK.length + files.slovaEN.length}</div>
          <div><strong>Hlavní složka:</strong> {files.slova.length}</div>
          <div><strong>CZ varianty:</strong> {files.slovaCZ.length}</div>
          <div><strong>SK varianty:</strong> {files.slovaSK.length}</div>
          <div><strong>EN varianty:</strong> {files.slovaEN.length}</div>
          <div><strong>Celková velikost:</strong> {formatBytes([...files.slova, ...files.slovaCZ, ...files.slovaSK, ...files.slovaEN].reduce((sum, file) => sum + (file.size || 0), 0))}</div>
        </div>
      </div>

      {/* Hudba Summary */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-purple-900 mb-3">🎵 Hudba</h3>
        <div className="space-y-2 text-sm">
          <div><strong>Celkem souborů:</strong> {files.hudba.length}</div>
          <div><strong>Celková velikost:</strong> {formatBytes(files.hudba.reduce((sum, file) => sum + (file.size || 0), 0))}</div>
        </div>
      </div>

      {/* Celkové statistiky */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-green-900 mb-3">📊 Celkem</h3>
        <div className="space-y-2 text-sm">
          <div><strong>Celkem souborů:</strong> {files.totalFiles}</div>
          <div><strong>Celková velikost:</strong> {formatBytes(files.totalSize)}</div>
          <div><strong>Celková délka:</strong> {formatDuration(files.totalDuration)}</div>
        </div>
      </div>
    </div>
  );

  const renderDetailedView = () => {
    const allFiles = [...files.slova, ...files.slovaCZ, ...files.slovaSK, ...files.slovaEN, ...files.hudba];
    
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">📋 Všechny soubory</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allFiles.map((file, index) => (
              <div key={index} className="bg-white p-3 rounded border text-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div><strong>Název:</strong> {file.name}</div>
                  <div><strong>Kategorie:</strong> {file.category}</div>
                  <div><strong>Velikost:</strong> {formatBytes(file.size)}</div>
                  <div><strong>Délka:</strong> {file.durationFormatted}</div>
                  <div><strong>Složka:</strong> {file.folder}</div>
                  <div><strong>Jazyk:</strong> {file.language || 'N/A'}</div>
                  <div><strong>Vytvořeno:</strong> {formatDate(file.timeCreated)}</div>
                  <div><strong>URL:</strong> 
                    <a href={file.downloadURL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline ml-1">
                      Stáhnout
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderVariantsView = () => {
    const variants = groupFilesByVariants();
    
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">🔄 Varianty souborů</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.entries(variants).map(([baseName, variantFiles]) => (
              <div key={baseName} className="bg-white p-3 rounded border">
                <h4 className="font-semibold text-lg mb-2">{baseName}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                  {variantFiles.map((file, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded">
                      <div><strong>Jazyk:</strong> {file.language || 'Obecné'}</div>
                      <div><strong>Složka:</strong> {file.folder}</div>
                      <div><strong>Velikost:</strong> {formatBytes(file.size)}</div>
                      <div><strong>Délka:</strong> {file.durationFormatted}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    loadAllFiles();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          📁 Unified Files Overview
        </h2>
        <p className="text-gray-700">
          Kompletní přehled všech souborů v aplikaci - slova a hudba
        </p>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setViewMode('summary')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'summary' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📊 Přehled
        </button>
        <button
          onClick={() => setViewMode('detailed')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'detailed' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📋 Detailní
        </button>
        <button
          onClick={() => setViewMode('variants')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            viewMode === 'variants' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🔄 Varianty
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-4 flex-wrap">
        <button
          onClick={loadAllFiles}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh All Files'}
        </button>
        
        <button
          onClick={loadAudioDurations}
          disabled={loadingDurations || loading}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
        >
          {loadingDurations ? '⏱️ Loading Durations...' : '⏱️ Load All Durations'}
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
            <p className="mt-2 text-gray-600">Loading all files...</p>
          </div>
        </div>
      )}

      {/* Content based on view mode */}
      {!loading && (
        <>
          {viewMode === 'summary' && renderSummaryView()}
          {viewMode === 'detailed' && renderDetailedView()}
          {viewMode === 'variants' && renderVariantsView()}
        </>
      )}
    </div>
  );
};

export default UnifiedFilesOverview;
