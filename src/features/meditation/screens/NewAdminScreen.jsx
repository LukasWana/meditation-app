import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Database, Upload, BarChart3, FileAudio, FileText, RefreshCw, Download, Wifi, WifiOff, HardDrive } from 'lucide-react';
import { storage, db, database } from '@services/firebase';
import { ref, listAll, getMetadata, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { ref as dbRef, set, get } from 'firebase/database';
import offlineCacheService from '@services/offlineCacheService';

const NewAdminScreen = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioStats, setAudioStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    hudbaFiles: 0,
    slovaFiles: 0,
    hudbaSize: 0,
    slovaSize: 0
  });
  const [fileData, setFileData] = useState([]);
  const [preparedData, setPreparedData] = useState(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, needs-update, up-to-date

  // Offline cache states
  const [cacheStats, setCacheStats] = useState(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(null);
  const [isCaching, setIsCaching] = useState(false);

  // Automatická kontrola při načtení
  useEffect(() => {
    checkForUpdates();
    initializeOfflineCache();
  }, []);

  // Inicializace offline cache
  const initializeOfflineCache = async () => {
    try {
      await offlineCacheService.initialize();
      await loadCacheStats();
    } catch (error) {
      console.error('❌ Failed to initialize offline cache:', error);
    }
  };

  // Načti statistiky cache
  const loadCacheStats = async () => {
    try {
      const stats = await offlineCacheService.getCacheStats();
      setCacheStats(stats);
      setIsOfflineReady(stats ? stats.isOfflineReady : false);
    } catch (error) {
      console.error('❌ Failed to load cache stats:', error);
    }
  };

  // Spusť stahování všech audio souborů do cache
  const startCachingAllFiles = async () => {
    if (isCaching) return;

    setIsCaching(true);
    setCacheProgress({ current: 0, total: fileData.length, percentage: 0 });

    try {
      const result = await offlineCacheService.cacheAllAudioFiles(fileData, (progress) => {
        setCacheProgress(progress);
      });

      console.log('✅ Caching completed:', result);
      await loadCacheStats(); // Aktualizuj statistiky
    } catch (error) {
      console.error('❌ Caching failed:', error);
    } finally {
      setIsCaching(false);
      setCacheProgress(null);
    }
  };

  // Vymaž cache
  const clearCache = async () => {
    if (!confirm('Opravdu chcete vymazat všechny stažené soubory?')) return;

    try {
      await offlineCacheService.clearCache();
      await loadCacheStats();
      console.log('✅ Cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  };

  // Rekurzivní načtení všech souborů ze složky
  const getAllFilesRecursively = async (folderRef, folderName) => {
    const allFiles = [];

    const processFolder = async (ref) => {
      const result = await listAll(ref);

      // Přidej všechny soubory z aktuální složky
      for (const fileRef of result.items) {
        try {
          const metadata = await getMetadata(fileRef);
          const downloadURL = await getDownloadURL(fileRef);
          allFiles.push({
            name: fileRef.name,
            fullPath: fileRef.fullPath,
            size: metadata.size,
            folder: folderName,
            downloadURL: downloadURL
          });
        } catch (error) {
          console.warn(`Chyba při načítání souboru ${fileRef.name}:`, error);
        }
      }

      // Rekurzivně zpracuj všechny podsložky
      for (const folderRef of result.prefixes) {
        await processFolder(folderRef);
      }
    };

    await processFolder(folderRef);
    return allFiles;
  };

  // Načtení statistik z Firebase Storage
  const loadAudioStats = async () => {
    setLoading(true);
    try {
      const hudbaRef = ref(storage, 'hudba');
      const slovaRef = ref(storage, 'slova');

      const [hudbaFiles, slovaFiles] = await Promise.all([
        getAllFilesRecursively(hudbaRef, 'hudba'),
        getAllFilesRecursively(slovaRef, 'slova')
      ]);

      const hudbaMetadata = hudbaFiles;
      const slovaMetadata = slovaFiles;

      const allFiles = [...hudbaMetadata, ...slovaMetadata];

      const hudbaSize = hudbaMetadata.reduce((sum, file) => sum + file.size, 0);
      const slovaSize = slovaMetadata.reduce((sum, file) => sum + file.size, 0);
      const totalSize = hudbaSize + slovaSize;

      setAudioStats({
        totalFiles: allFiles.length,
        totalSize: totalSize,
        hudbaFiles: hudbaMetadata.length,
        slovaFiles: slovaMetadata.length,
        hudbaSize: hudbaSize,
        slovaSize: slovaSize
      });

      setFileData(allFiles);

      console.log('📊 Načtené soubory:', {
        hudba: hudbaMetadata.length,
        slova: slovaMetadata.length,
        celkem: allFiles.length,
        hudbaSoubory: hudbaMetadata.map(f => f.name),
        slovaSoubory: slovaMetadata.map(f => f.name)
      });
    } catch (error) {
      console.error('Chyba při načítání statistik:', error);
    } finally {
      setLoading(false);
    }
  };

  // Kontrola, jestli jsou data aktuální
  const checkForUpdates = async () => {
    setUpdateStatus('checking');
    setLoading(true);

    try {
      console.log('🔍 Kontroluji, jestli jsou data aktuální...');

      // Načti aktuální data z Firebase Storage
      const hudbaRef = ref(storage, 'hudba');
      const slovaRef = ref(storage, 'slova');

      const [hudbaFiles, slovaFiles] = await Promise.all([
        getAllFilesRecursively(hudbaRef, 'hudba'),
        getAllFilesRecursively(slovaRef, 'slova')
      ]);

      const currentFiles = [...hudbaFiles, ...slovaFiles];

      // Načti data z Realtime Database pro porovnání
      let dbData = null;
      try {
        const dbRefPath = dbRef(database, 'audio-metadata');
        const snapshot = await get(dbRefPath);
        if (snapshot.exists()) {
          dbData = snapshot.val();
        }
      } catch (error) {
        console.warn('Nepodařilo se načíst data z Realtime Database:', error);
      }

      // Porovnej data
      const comparison = compareData(currentFiles, dbData);

      setNeedsUpdate(comparison.needsUpdate);
      setLastUpdateCheck(new Date());

      if (comparison.needsUpdate) {
        setUpdateStatus('needs-update');
        console.log('📝 Data potřebují aktualizaci:', comparison.changes);
      } else {
        setUpdateStatus('up-to-date');
        console.log('✅ Data jsou aktuální, aktualizace není potřeba');
      }

      // Aktualizuj statistiky
      const hudbaSize = hudbaFiles.reduce((sum, file) => sum + file.size, 0);
      const slovaSize = slovaFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSize = hudbaSize + slovaSize;

      setAudioStats({
        totalFiles: currentFiles.length,
        totalSize: totalSize,
        hudbaFiles: hudbaFiles.length,
        slovaFiles: slovaFiles.length,
        hudbaSize: hudbaSize,
        slovaSize: slovaSize
      });

      setFileData(currentFiles);

    } catch (error) {
      console.error('Chyba při kontrole aktualizací:', error);
      setUpdateStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Porovnání dat mezi Storage a Realtime Database
  const compareData = (storageFiles, dbData) => {
    if (!dbData || !dbData.files) {
      return { needsUpdate: true, changes: ['Realtime Database je prázdná'] };
    }

    const dbFiles = dbData.files || [];
    const changes = [];

    // Porovnej počet souborů
    if (storageFiles.length !== dbFiles.length) {
      changes.push(`Počet souborů: Storage ${storageFiles.length} vs DB ${dbFiles.length}`);
    }

    // Porovnej názvy souborů
    const storageFileNames = new Set(storageFiles.map(f => f.name));
    const dbFileNames = new Set(dbFiles.map(f => f.fileName));

    const newFiles = [...storageFileNames].filter(name => !dbFileNames.has(name));
    const removedFiles = [...dbFileNames].filter(name => !storageFileNames.has(name));

    if (newFiles.length > 0) {
      changes.push(`Nové soubory: ${newFiles.length} (${newFiles.slice(0, 3).join(', ')}${newFiles.length > 3 ? '...' : ''})`);
    }

    if (removedFiles.length > 0) {
      changes.push(`Odebráné soubory: ${removedFiles.length} (${removedFiles.slice(0, 3).join(', ')}${removedFiles.length > 3 ? '...' : ''})`);
    }

    // Porovnej velikosti souborů
    const storageTotalSize = storageFiles.reduce((sum, file) => sum + file.size, 0);
    const dbTotalSize = dbFiles.reduce((sum, file) => sum + (file.size || 0), 0);

    if (Math.abs(storageTotalSize - dbTotalSize) > 1024) { // Rozdíl větší než 1KB
      changes.push(`Celková velikost: Storage ${formatFileSize(storageTotalSize)} vs DB ${formatFileSize(dbTotalSize)}`);
    }

    return {
      needsUpdate: changes.length > 0,
      changes: changes
    };
  };

  // Helper funkce pro extrakci tématu z názvu souboru
  const extractTopicFromFileName = (fileName) => {
    const topics = {
      'uzkost': 'Úzkosť',
      'osamelost': 'Osamelosť',
      'strach': 'Strach',
      'stres': 'Stres',
      'praca': 'Práca',
      'spank': 'Spánok',
      'pokoj': 'Pokoj',
      'relax': 'Relax'
    };

    for (const [key, value] of Object.entries(topics)) {
      if (fileName.toLowerCase().includes(key)) {
        return value;
      }
    }
    return 'Meditácia';
  };

  // Helper funkce pro extrakci názvu z názvu souboru
  const extractTitleFromFileName = (fileName) => {
    const nameWithoutExt = fileName.replace(/\.mp3$/i, '');
    const parts = nameWithoutExt.split('/');
    const lastPart = parts[parts.length - 1];

    // Odstraň prefixy jako "muzsky4FSK-", "zensky4MSK-", "zensky4FSK-", "muzsky4MSK-"
    const cleanName = lastPart.replace(/^(muzsky|zensky)\d*[A-Z]+-?/i, '');

    // Nahraď pomlčky mezerami a velkými písmeny
    return cleanName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/[<>]/g, ''); // Remove potential XSS characters
  };

  // Připravení dat pro Realtime Database
  const prepareDataForRealtimeDB = () => {
    const prepared = {
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalFiles: audioStats.totalFiles,
        totalSize: audioStats.totalSize,
        hudbaFiles: audioStats.hudbaFiles,
        slovaFiles: audioStats.slovaFiles,
        hudbaSize: audioStats.hudbaSize,
        slovaSize: audioStats.slovaSize
      },
      files: fileData.map(file => {
        const baseFile = {
          fileName: file.name,
          size: file.size,
          sizeFormatted: formatFileSize(file.size),
          duration: estimateDuration(file.size),
          durationFormatted: formatDuration(estimateDuration(file.size)),
          folder: file.folder,
          downloadURL: file.downloadURL,
          category: file.folder === 'hudba' ? 'music' : 'speech'
        };

        // Pro slova soubory přidej pokročilé metadata
        if (file.folder === 'slova') {
          const fileName = file.name;
          const isMale = fileName.includes('muzsky') || fileName.includes('male');
          const isFemale = fileName.includes('zensky') || fileName.includes('female');
          const gender = isMale ? 'male' : isFemale ? 'female' : 'none';
          const topic = extractTopicFromFileName(fileName);
          const is4F = fileName.includes('4F');
          const is4M = fileName.includes('4M');
          const mediaType = is4F ? '4F' : is4M ? '4M' : 'unknown';
          const displayName = extractTitleFromFileName(fileName);

          return {
            ...baseFile,
            displayName: displayName,
            gender: gender,
            topic: topic,
            mediaType: mediaType,
            fullPath: file.fullPath,
            audioSrc: file.downloadURL,
            parsed: {
              gender: gender,
              topic: topic,
              title: displayName,
              mediaType: mediaType,
              is4F: is4F,
              is4M: is4M
            }
          };
        }

        // Pro hudba soubory použij jednoduchý název
        return {
          ...baseFile,
          displayName: file.name.replace(/\.[^/.]+$/, "")
        };
      })
    };

    setPreparedData(prepared);
  };

  // Odhad délky audio souboru na základě velikosti (přibližně 1MB = 1 minuta)
  const estimateDuration = (sizeInBytes) => {
    if (!sizeInBytes || sizeInBytes <= 0) return 0;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return Math.round(sizeInMB * 60); // sekundy
  };

  // Formátování velikosti souboru
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formátování délky
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Uložení dat do Realtime Database
  const saveToRealtimeDB = async () => {
    if (!preparedData) return;

    setLoading(true);
    try {
      // Zkus nejdříve produkční databázi
      const dbRefPath = dbRef(database, 'audio-metadata');
      await set(dbRefPath, preparedData);
      console.log('✅ Data úspěšně uložena do Realtime Database');
      alert('Data byla úspěšně uložena do Realtime Database!');
    } catch (error) {
      console.error('❌ Chyba při ukládání do Realtime Database:', error);

      // Fallback - zkus uložit do localStorage jako backup
      try {
        localStorage.setItem('audioMetadata_backup', JSON.stringify(preparedData));
        console.log('💾 Data uložena do localStorage jako backup');
        alert('Realtime Database není dostupná. Data byla uložena do localStorage jako backup.');
      } catch (localError) {
        console.error('❌ Chyba při ukládání do localStorage:', localError);
        alert('Chyba při ukládání dat. Zkuste to prosím znovu.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Uložení dat do Firestore (pouze pro admin s oprávněními)
  const saveToFirestore = async () => {
    if (!preparedData) return;

    setLoading(true);
    try {
      // Zkus uložit do Firestore
      const docRef = await addDoc(collection(db, 'audio-metadata'), preparedData);
      console.log('✅ Data úspěšně uložena do Firestore:', docRef.id);
      alert('Data byla úspěšně uložena do Firestore!');
    } catch (error) {
      console.error('❌ Chyba při ukládání do Firestore:', error);

      if (error.code === 'permission-denied') {
        alert('Chyba oprávnění: Pro zápis do Firestore potřebujete admin oprávnění. Zkuste Realtime Database místo toho.');
      } else {
        alert('Chyba při ukládání do Firestore: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudioStats();
  }, []);

  const themeClasses = isDarkMode
    ? 'bg-gray-900 text-white'
    : 'bg-white text-gray-900';

  const cardClasses = isDarkMode
    ? 'bg-gray-800 border-gray-700'
    : 'bg-gray-50 border-gray-200';

  const hudbaPercentage = audioStats.totalSize > 0
    ? Math.round((audioStats.hudbaSize / audioStats.totalSize) * 100)
    : 0;
  const slovaPercentage = 100 - hudbaPercentage;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses}`} style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
            <p className="text-gray-500">Správa audio metadat a statistik</p>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-3 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>

        {/* Statistiky */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <div className="flex items-center">
              <FileAudio className="text-blue-500 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-500">Celkem souborů</p>
                <p className="text-2xl font-bold">{audioStats.totalFiles}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <div className="flex items-center">
              <Database className="text-green-500 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-500">Celková velikost</p>
                <p className="text-2xl font-bold">{formatFileSize(audioStats.totalSize)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <div className="flex items-center">
              <FileAudio className="text-purple-500 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-500">Hudba soubory</p>
                <p className="text-2xl font-bold">{audioStats.hudbaFiles}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <div className="flex items-center">
              <FileText className="text-orange-500 mr-3" size={24} />
              <div>
                <p className="text-sm text-gray-500">Slova soubory</p>
                <p className="text-2xl font-bold">{audioStats.slovaFiles}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Graf zaplněnosti */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`p-6 rounded-lg border mb-8 ${cardClasses}`}
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <BarChart3 className="mr-2" size={24} />
            Rozdělení obsahu
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Hudba</span>
                <span className="text-sm text-gray-500">{hudbaPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${hudbaPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(audioStats.hudbaSize)} ({audioStats.hudbaFiles} souborů)
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Slova</span>
                <span className="text-sm text-gray-500">{slovaPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${slovaPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(audioStats.slovaSize)} ({audioStats.slovaFiles} souborů)
              </p>
            </div>
          </div>
        </motion.div>

        {/* Kontrola aktualizací */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`p-6 rounded-lg border mb-6 ${cardClasses}`}
        >
          <h3 className="text-xl font-semibold mb-4">Kontrola aktualizací</h3>
          <p className="text-gray-500 mb-4">
            Zkontroluje, jestli jsou data v Realtime Database aktuální s Firebase Storage.
          </p>

          <div className="space-y-4">
            <button
              onClick={checkForUpdates}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : 'Zkontrolovat aktualizace'}
            </button>

            {/* Status zobrazení */}
            {updateStatus === 'checking' && (
              <div className="text-center text-blue-600">
                <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
                Kontroluji data...
              </div>
            )}

            {updateStatus === 'up-to-date' && (
              <div className="text-center text-green-600 bg-green-50 p-3 rounded-lg">
                <div className="text-lg font-semibold mb-2">✅ Data jsou aktuální</div>
                <div className="text-sm text-gray-600 mb-2">
                  Realtime Database obsahuje nejnovější data z Firebase Storage
                </div>
                <div className="text-sm text-gray-500">
                  Kontrolováno: {lastUpdateCheck ? lastUpdateCheck.toLocaleString() : 'N/A'}
                </div>
              </div>
            )}

            {updateStatus === 'needs-update' && (
              <div className="text-center text-orange-600 bg-orange-50 p-3 rounded-lg">
                <div className="text-lg font-semibold mb-2">📝 Data potřebují aktualizaci</div>
                <div className="text-sm text-gray-600 mb-2">
                  Realtime Database neobsahuje nejnovější data z Firebase Storage
                </div>
                <div className="text-sm text-gray-500">
                  Kontrolováno: {lastUpdateCheck ? lastUpdateCheck.toLocaleString() : 'N/A'}
                </div>
              </div>
            )}

            {updateStatus === 'error' && (
              <div className="text-center text-red-600 bg-red-50 p-3 rounded-lg">
                <div className="text-lg font-semibold mb-2">❌ Chyba při kontrole</div>
                <div className="text-sm text-gray-600">
                  Nepodařilo se zkontrolovat stav dat
                </div>
              </div>
            )}

            {updateStatus === 'idle' && (
              <div className="text-center text-gray-600 bg-gray-50 p-3 rounded-lg">
                <div className="text-lg font-semibold mb-2">🔍 Zkontrolujte stav dat</div>
                <div className="text-sm text-gray-600">
                  Klikněte na tlačítko výše pro kontrolu, jestli jsou data aktuální
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Offline Cache sekce */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`p-6 rounded-lg border mb-6 ${cardClasses}`}
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <HardDrive className="mr-2" size={24} />
            Offline Cache
          </h3>
          <p className="text-gray-500 mb-4">
            Stáhněte audio soubory do cache pro offline použití aplikace.
          </p>

          {/* Cache statistiky */}
          {cacheStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-lg ${isOfflineReady ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center mb-2">
                  {isOfflineReady ? <Wifi className="text-green-500 mr-2" size={20} /> : <WifiOff className="text-gray-400 mr-2" size={20} />}
                  <span className="font-semibold">Offline stav</span>
                </div>
                <p className={`text-sm ${isOfflineReady ? 'text-green-600' : 'text-gray-500'}`}>
                  {isOfflineReady ? 'Připraveno pro offline' : 'Není připraveno'}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center mb-2">
                  <FileAudio className="text-blue-500 mr-2" size={20} />
                  <span className="font-semibold">Stažené soubory</span>
                </div>
                <p className="text-sm text-blue-600">
                  {cacheStats.totalFiles} / {audioStats.totalFiles}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center mb-2">
                  <Database className="text-purple-500 mr-2" size={20} />
                  <span className="font-semibold">Velikost cache</span>
                </div>
                <p className="text-sm text-purple-600">
                  {cacheStats.totalSizeFormatted}
                </p>
              </div>
            </div>
          )}

          {/* Progress bar pro stahování */}
          {isCaching && cacheProgress && (
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Stahování souborů...</span>
                <span className="text-sm text-gray-500">
                  {cacheProgress.current} / {cacheProgress.total} ({cacheProgress.percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${cacheProgress.percentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Aktuálně: {cacheProgress.fileName}
              </p>
            </div>
          )}

          {/* Tlačítka pro správu cache */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={startCachingAllFiles}
                disabled={isCaching || fileData.length === 0}
                className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Download className="mr-2" size={16} />
                {isCaching ? 'Stahování...' : 'Stáhnout vše do cache'}
              </button>

              <button
                onClick={loadCacheStats}
                className="flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="mr-2" size={16} />
                Aktualizovat statistiky
              </button>

              <button
                onClick={clearCache}
                disabled={!cacheStats || cacheStats.totalFiles === 0}
                className="flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <HardDrive className="mr-2" size={16} />
                Vymazat cache
              </button>
            </div>

            {/* Informace o offline režimu */}
            <div className={`p-4 rounded-lg ${isOfflineReady ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-start">
                {isOfflineReady ? (
                  <Wifi className="text-green-500 mr-3 mt-0.5" size={20} />
                ) : (
                  <WifiOff className="text-yellow-500 mr-3 mt-0.5" size={20} />
                )}
                <div>
                  <h4 className="font-semibold mb-1">
                    {isOfflineReady ? 'Aplikace je připravena pro offline použití' : 'Aplikace není připravena pro offline použití'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {isOfflineReady
                      ? 'Všechny audio soubory jsou stažené a aplikace bude fungovat i bez internetového připojení.'
                      : 'Pro offline použití je potřeba stáhnout audio soubory do cache pomocí tlačítka výše.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Akce */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <h3 className="text-xl font-semibold mb-4">Příprava dat</h3>
            <p className="text-gray-500 mb-4">
              Připraví data pro uložení do databáze s názvy souborů a odhadovanými délkami.
            </p>
            <button
              onClick={prepareDataForRealtimeDB}
              disabled={loading || fileData.length === 0}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : 'Připravit data'}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <h3 className="text-xl font-semibold mb-4">Uložení dat</h3>
            <p className="text-gray-500 mb-4">
              Uloží připravená data do Firebase databází.
            </p>
            <div className="space-y-2">
              <button
                onClick={saveToRealtimeDB}
                disabled={loading || !preparedData || updateStatus !== 'needs-update'}
                className={`w-full py-2 px-4 rounded-lg transition-colors ${
                  updateStatus === 'needs-update'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
              >
                {loading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : 'Uložit do Realtime DB'}
              </button>
              <button
                onClick={saveToFirestore}
                disabled={loading || !preparedData || updateStatus !== 'needs-update'}
                className={`w-full py-2 px-4 rounded-lg transition-colors ${
                  updateStatus === 'needs-update'
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
              >
                {loading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : 'Uložit do Firestore'}
              </button>
              {updateStatus === 'up-to-date' && (
                <div className="text-center mt-2 p-2 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">
                    ✅ Data jsou aktuální
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Uložení není potřeba
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        if (confirm('Opravdu chcete vynutit přepsání dat v Realtime Database? Tato akce přepíše všechna existující data.')) {
                          saveToRealtimeDB();
                        }
                      }}
                      disabled={loading || !preparedData}
                      className={`w-full py-2 px-4 rounded-lg transition-colors ${
                        preparedData
                          ? 'bg-orange-500 hover:bg-orange-600 text-white'
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {loading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : '⚠️ Vynutit aktualizaci Realtime DB'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Opravdu chcete vynutit přepsání dat v Firestore? Tato akce přepíše všechna existující data.')) {
                          saveToFirestore();
                        }
                      }}
                      disabled={loading || !preparedData}
                      className={`w-full py-2 px-4 rounded-lg transition-colors ${
                        preparedData
                          ? 'bg-purple-500 hover:bg-purple-600 text-white'
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {loading ? <RefreshCw className="animate-spin mx-auto" size={20} /> : '⚠️ Vynutit aktualizaci Firestore'}
                    </button>
                  </div>
                </div>
              )}

              {updateStatus === 'needs-update' && (
                <div className="text-center mt-2 p-2 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">
                    📝 Aktualizace je potřeba
                  </p>
                  <p className="text-xs text-gray-500">
                    Klikněte pro uložení nových dat
                  </p>
                </div>
              )}

              {updateStatus === 'idle' && (
                <div className="text-center mt-2 p-2 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">
                    🔍 Nejdříve zkontrolujte data
                  </p>
                  <p className="text-xs text-gray-500">
                    Tlačítka budou aktivní po kontrole
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Náhled dat */}
        {preparedData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className={`mt-8 p-6 rounded-lg border ${cardClasses}`}
          >
            <h3 className="text-xl font-semibold mb-4">Náhled připravených dat</h3>
            <div className="bg-gray-800 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{JSON.stringify(preparedData, null, 2)}</pre>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NewAdminScreen;
