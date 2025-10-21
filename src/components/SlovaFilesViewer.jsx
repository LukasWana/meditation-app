import React, { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { storage } from '../config/secure-firebase';
import log from '@services/logger';

/**
 * Slova Files Viewer Component
 * Zobrazuje detailní informace o souborech v sekci slova
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
    totalSize: 0
  });

  const loadSlovaFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      log.info('🔄 Loading slova files from Firebase Storage...');

      // Načti soubory z kořenové slova složky
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
            folder: 'slova'
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
                folder: `slova/${lang}`
              });
            } catch (metaError) {
              log.warn(`Failed to get metadata for ${itemRef.name}:`, metaError.message);
            }
          }
        } catch (langError) {
          log.warn(`Failed to scan slova/${lang}:`, langError.message);
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
        totalSize: totalSize
      });

      log.success(`✅ Loaded ${allFiles.length} slova files from Firebase Storage`);

    } catch (error) {
      log.error('Failed to load slova files:', error);
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
      </h3>
      
      {files.length === 0 ? (
        <p className="text-gray-500 italic">Žádné soubory v této složce</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {files.map((file, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <strong>Název:</strong> {file.name}
                </div>
                <div>
                  <strong>Velikost:</strong> {formatBytes(file.size)}
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
          🗣️ Slova Files Viewer
        </h2>
        <p className="text-blue-700">
          Detailní přehled všech souborů v sekci slova včetně jazykových variant
        </p>
      </div>

      {/* Summary */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-green-900 mb-2">📊 Celkové statistiky</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Celkem souborů:</strong> {files.totalFiles}
          </div>
          <div>
            <strong>Celková velikost:</strong> {formatBytes(files.totalSize)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={loadSlovaFiles}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh Files'}
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
            <p className="mt-2 text-gray-600">Loading slova files...</p>
          </div>
        </div>
      )}

      {/* File Lists */}
      {!loading && (
        <div className="space-y-4">
          {renderFileList(files.slova, 'Slova (hlavní složka)', 'slova')}
          {renderFileList(files.slovaCZ, 'Slova CZ (české soubory)', 'slova/CZ')}
          {renderFileList(files.slovaSK, 'Slova SK (slovenské soubory)', 'slova/SK')}
          {renderFileList(files.slovaEN, 'Slova EN (anglické soubory)', 'slova/EN')}
        </div>
      )}
    </div>
  );
};

export default SlovaFilesViewer;
