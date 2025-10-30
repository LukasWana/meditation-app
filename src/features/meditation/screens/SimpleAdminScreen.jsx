import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Database, RefreshCw, Upload, BarChart3, Activity } from 'lucide-react';
import { storage, db, database, auth } from '@services/firebase';
import { ref, listAll, getMetadata, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ref as dbRef, set, get } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import DataStorageCharts from '@components/admin/DataStorageCharts';
import FirebaseMonitoring from '@components/admin/FirebaseMonitoring';
// import { extractAudioMetadata } from '@utils/audioMetadataExtractor'; // Nepoužíváme kvůli CORS

const SimpleAdminScreen = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showCharts, setShowCharts] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(true); // ✅ NOVÉ: zobrazit monitoring ve výchozím stavu
  const [newFiles, setNewFiles] = useState([]); // ✅ FÁZE 3: detekované nové soubory
  const [changedFiles, setChangedFiles] = useState([]); // ✅ FÁZE 3: detekované změněné soubory

  // Automatická kontrola při načtení
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Zkontroluj Firestore
      const metadataCollection = collection(db, 'audio-metadata');
      const q = query(metadataCollection, orderBy('fileName'));
      const querySnapshot = await getDocs(q);

      const slovaFiles = [];
      const sampleFiles = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.fileName && data.fileName.includes('slova/')) {
          slovaFiles.push(data);
        }
        if (sampleFiles.length < 3) {
          sampleFiles.push({
            fileName: data.fileName,
            folder: data.folder,
            hasDownloadURL: !!(data.downloadURL || data.audioSrc)
          });
        }
      });

      console.log('🔍 Firestore sample files:');
      sampleFiles.forEach((file, i) => {
        console.log(`  ${i + 1}. ${file.fileName}`);
        console.log(`     Folder: ${file.folder}`);
        console.log(`     Has DownloadURL: ${file.hasDownloadURL}`);
      });

      setStatus(`📊 Firestore: ${querySnapshot.size} souborů, 🎤 SLOVA: ${slovaFiles.length} souborů`);
    } catch (error) {
      setStatus(`❌ Chyba při načítání: ${error.message}`);
    }
  };

  // Synchronizace Firestore → Realtime Database
  const syncFirestoreToRealtime = async () => {
    setLoading(true);
    setStatus('🔄 Synchronizuji...');

    try {
      // Přihlásit se anonymně
      try {
        await signInAnonymously(auth);
        console.log('✅ Anonymous authentication successful');
      } catch (authError) {
        console.warn('⚠️ Anonymous auth failed:', authError.message);
      }

      // Načti všechna metadata z Firestore
      const metadataCollection = collection(db, 'audio-metadata');
      const q = query(metadataCollection, orderBy('fileName'));
      const querySnapshot = await getDocs(q);

      const metadataArray = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Zajisti, že má všechny potřebné vlastnosti
        const processedData = {
          ...data,
          // Zajisti, že má downloadURL nebo audioSrc
          downloadURL: data.downloadURL || data.audioSrc,
          // Zajisti, že má folder
          folder: data.folder || (data.fileName?.includes('slova/') ? 'slova' : 'hudba'),
          // Zajisti, že má displayName
          displayName: data.displayName || data.title || data.fileName?.replace(/\.[^/.]+$/, ""),
          // Zajisti, že má fullPath
          fullPath: data.fullPath || data.fileName
        };
        metadataArray.push(processedData);
      });

      const slovaFiles = metadataArray.filter(file =>
        file.fileName && file.fileName.includes('slova/')
      );

      console.log('🔍 Sample processed data:');
      metadataArray.slice(0, 3).forEach((file, i) => {
        console.log(`  ${i + 1}. ${file.fileName}`);
        console.log(`     Folder: ${file.folder}`);
        console.log(`     DisplayName: ${file.displayName}`);
        console.log(`     DownloadURL: ${file.downloadURL ? 'Yes' : 'No'}`);
      });

      // Ulož do Realtime Database
      const realtimeRef = dbRef(database, 'audio-metadata');
      await set(realtimeRef, {
        files: metadataArray,
        lastSync: new Date().toISOString(),
        totalFiles: metadataArray.length,
        slovaFiles: slovaFiles.length
      });

      setStatus(`✅ Synchronizace dokončena! 📊 ${metadataArray.length} souborů, 🎤 ${slovaFiles.length} SLOVA souborů`);
      console.log('✅ Successfully synced Firestore to Realtime Database');

    } catch (error) {
      setStatus(`❌ Chyba při synchronizaci: ${error.message}`);
      console.error('❌ Sync failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Kompletní proces: Skenování Storage → Extrakce metadat → Uložení do Realtime DB
  const fullMetadataSync = async () => {
    setLoading(true);
    setStatus('🔄 Spouštím kompletní synchronizaci...');

    try {
      // 1. Přihlásit se anonymně
      try {
        await signInAnonymously(auth);
        console.log('✅ Anonymous authentication successful');
      } catch (authError) {
        console.warn('⚠️ Anonymous auth failed:', authError.message);
      }

      // 2. Skenovat Firebase Storage
      setStatus('🔍 Skenuji Firebase Storage...');
      const allFiles = await scanFirebaseStorage();
      console.log(`📊 Nalezeno ${allFiles.length} souborů ve Storage`);

      // 3. Připravit metadata pro každý MP3 soubor
      setStatus('📊 Připravuji metadata z velikosti souborů...');
      const metadataArray = [];
      let processedCount = 0;

      for (const file of allFiles) {
        try {
          const progress = Math.round(((processedCount + 1) / allFiles.length) * 100);
          setStatus(`📊 Měřím délku... ${processedCount + 1}/${allFiles.length} (${progress}%) - ${file.name}`);

          // Generuj správné downloadURL pomocí getDownloadURL
          let downloadURL = file.downloadURL;
          if (!downloadURL) {
            try {
              const fileRef = ref(storage, file.fullPath);
              downloadURL = await getDownloadURL(fileRef);
              console.log(`🔗 Generated downloadURL for ${file.name}`);
            } catch (urlError) {
              console.warn(`⚠️ Failed to generate downloadURL for ${file.name}:`, urlError);
              // Použij fallback URL
              downloadURL = `https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/${encodeURIComponent(file.fullPath)}?alt=media`;
            }
          }

          // ✅ NOVÉ: Zkus skutečné měření délky z Audio API
          let realDuration = null;
          let extractionMethod = 'estimated';

          try {
            console.log(`🎵 Measuring real duration for ${file.name}...`);
            realDuration = await getAudioDuration(downloadURL);

            if (realDuration && realDuration > 0) {
              extractionMethod = 'extracted';
              console.log(`✅ ${file.name}: ${formatDuration(realDuration)} (REAL)`);
            } else {
              console.warn(`⚠️ Audio API returned invalid duration for ${file.name}, using estimate`);
            }
          } catch (audioError) {
            console.warn(`⚠️ Audio API failed for ${file.name}:`, audioError.message);
          }

          // Fallback na odhad z velikosti souboru pokud Audio API selhalo
          const finalDuration = realDuration || estimateDurationFromSize(file.size);
          const audioMetadata = {
            duration: finalDuration,
            durationFormatted: formatDuration(finalDuration),
            durationDetailed: formatDurationDetailed(finalDuration),
            isValid: finalDuration > 0,
            extractionMethod // 'extracted' nebo 'estimated'
          };

          console.log(`📊 ${file.name}: ${audioMetadata.durationFormatted} (${extractionMethod.toUpperCase()})`);

          // Vytvoř kompletní metadata objekt
          const completeMetadata = {
            fileName: file.fullPath,
            displayName: extractDisplayName(file.name),
            folder: file.folder,
            subFolder: extractSubFolder(file.fullPath),
            downloadURL: downloadURL,
            fullPath: file.fullPath,
            duration: audioMetadata.duration,
            durationFormatted: audioMetadata.durationFormatted,
            durationDetailed: audioMetadata.durationDetailed,
            isValid: audioMetadata.isValid,
            extractionMethod: audioMetadata.extractionMethod, // ✅ NOVÉ: jak byla délka získána
            fileSize: file.size,
            contentType: 'audio/mpeg',
            lastModified: new Date().toISOString(),
            extracted: audioMetadata.isValid,
            // Dodatečné informace pro slova soubory
            ...(file.folder === 'slova' ? {
              gender: extractGender(file.name),
              topic: extractTopic(file.name),
              type: extractType(file.name)
            } : {})
          };

          metadataArray.push(completeMetadata);
          processedCount++;

        } catch (error) {
          console.warn(`⚠️ Chyba při zpracování ${file.name}:`, error.message);

          // Přidej soubor s odhadem délky (error fallback)
          const estimatedDuration = estimateDurationFromSize(file.size);
          metadataArray.push({
            fileName: file.fullPath,
            displayName: extractDisplayName(file.name),
            folder: file.folder,
            subFolder: extractSubFolder(file.fullPath),
            downloadURL: file.downloadURL || `https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/${encodeURIComponent(file.fullPath)}?alt=media`,
            fullPath: file.fullPath,
            duration: estimatedDuration,
            durationFormatted: formatDuration(estimatedDuration),
            durationDetailed: formatDurationDetailed(estimatedDuration),
            isValid: estimatedDuration > 0,
            extractionMethod: 'error-fallback', // ✅ NOVÉ: označit že selhalo
            fileSize: file.size,
            contentType: 'audio/mpeg',
            lastModified: new Date().toISOString(),
            extracted: false,
            error: error.message
          });
          processedCount++;
        }
      }

      // 4. Filtruj slova soubory a spočítej statistiky
      const slovaFiles = metadataArray.filter(file => file.folder === 'slova');
      const hudbaFiles = metadataArray.filter(file => file.folder === 'hudba');

      // ✅ NOVÉ: Statistiky metod extraction
      const extractedCount = metadataArray.filter(f => f.extractionMethod === 'extracted').length;
      const estimatedCount = metadataArray.filter(f => f.extractionMethod === 'estimated').length;
      const errorCount = metadataArray.filter(f => f.extractionMethod === 'error-fallback').length;

      console.log(`📊 Zpracováno: ${metadataArray.length} souborů`);
      console.log(`🎤 SLOVA: ${slovaFiles.length} souborů`);
      console.log(`🎵 HUDBA: ${hudbaFiles.length} souborů`);
      console.log(`✅ Skutečně změřeno: ${extractedCount} souborů`);
      console.log(`📏 Odhadnuto: ${estimatedCount} souborů`);
      if (errorCount > 0) {
        console.log(`⚠️ Chyby: ${errorCount} souborů`);
      }

      // 5. Uložit do Realtime Database
      setStatus('💾 Ukládám do Realtime Database...');
      const realtimeRef = dbRef(database, 'audio-metadata');
      await set(realtimeRef, {
        files: metadataArray,
        lastSync: new Date().toISOString(),
        totalFiles: metadataArray.length,
        slovaFiles: slovaFiles.length,
        hudbaFiles: hudbaFiles.length,
        validFiles: metadataArray.filter(f => f.isValid).length,
        invalidFiles: metadataArray.filter(f => !f.isValid).length
      });

      // ✅ NOVÉ: Vylepšený status s extraction statistikami
      const successRate = Math.round((extractedCount / metadataArray.length) * 100);
      setStatus(`✅ Dokončeno! 📊 ${metadataArray.length} souborů | 🎤 ${slovaFiles.length} SLOVA | 🎵 ${hudbaFiles.length} HUDBA | ✅ ${extractedCount} skutečně změřeno (${successRate}%)`);
      console.log('✅ Full metadata sync completed successfully');

    } catch (error) {
      setStatus(`❌ Chyba při kompletní synchronizaci: ${error.message}`);
      console.error('❌ Full sync failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pomocné funkce pro extrakci informací ze jména souboru
  const extractDisplayName = (fileName) => {
    const nameWithoutExt = fileName.replace(/\.mp3$/i, '');
    const parts = nameWithoutExt.split('/');
    const lastPart = parts[parts.length - 1];

    // Odstraň prefixy jako "muzsky4FSK-", "zensky4MSK-", "zensky4FSK-", "muzsky4MSK-"
    const cleanName = lastPart.replace(/^(muzsky|zensky)\d*[A-Z]+-?/i, '');

    // Nahraď pomlčky mezerami a velkými písmeny
    return cleanName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const extractSubFolder = (fullPath) => {
    const parts = fullPath.split('/');
    return parts.length > 2 ? parts[1] : null;
  };

  const extractGender = (fileName) => {
    if (fileName.includes('muzsky') || fileName.includes('MSK')) return 'male';
    if (fileName.includes('zensky') || fileName.includes('FSK')) return 'female';
    return null;
  };

  const extractTopic = (fileName) => {
    // Extrahuj téma ze jména souboru (např. "muzsky1MSK-meditace.mp3" -> "meditace")
    const match = fileName.match(/-([^-]+)\.mp3$/i);
    return match ? match[1] : null;
  };

  const extractType = (fileName) => {
    if (fileName.includes('MSK')) return 'MSK';
    if (fileName.includes('FSK')) return 'FSK';
    return null;
  };

  // Skutečné měření délky z Audio API
  const getAudioDuration = (audioSrc) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      let resolved = false;

      audio.addEventListener('loadedmetadata', () => {
        if (resolved) return;
        resolved = true;

        const duration = audio.duration;
        if (isFinite(duration) && duration > 0) {
          resolve(Math.floor(duration)); // Vrať sekundy
        } else {
          resolve(null);
        }
      });

      audio.addEventListener('error', (error) => {
        if (resolved) return;
        resolved = true;
        console.warn('Audio duration extraction failed:', error);
        resolve(null);
      });

      // Timeout po 10 sekundách (někdy trvá déle načíst metadata)
      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        console.warn('Audio duration extraction timeout');
        resolve(null);
      }, 10000);

      audio.src = audioSrc;
    });
  };

  // Fallback: Odhad délky z velikosti souboru (když Audio API selže)
  const estimateDurationFromSize = (sizeInBytes) => {
    if (sizeInBytes <= 0) {
      return 300; // 5 minut - výchozí odhad
    }
    // MP3 průměrně 128 kbps = přibližně 960 KB/min = 0.94 MB/min
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return Math.round(sizeInMB * 60); // sekundy (1MB ≈ 1 minuta)
  };

  // Formátování délky
  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Detailní formátování délky
  const formatDurationDetailed = (seconds) => {
    if (!seconds || seconds <= 0) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };


  // Skenování Firebase Storage - pouze listAll bez getMetadata/getDownloadURL
  const scanFirebaseStorage = async () => {
    const allFiles = [];
    console.log('🔍 Skenuji Firebase Storage (pouze listAll)...');

    // Vymaž všechny cache v prohlížeči
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('🧹 Vymazávám všechny cache...');
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log(`✅ Vymazán cache: ${cacheName}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Nelze vymazat cache:', error);
    }

    // Rekurzivní načtení všech souborů ze složky
    const getAllFilesRecursively = async (folderRef, folderName) => {
      const allFiles = [];

      const processFolder = async (currentFolderRef) => {
        try {
          const result = await listAll(currentFolderRef);
          console.log(`📂 Skenuji složku: ${folderName} (${result.items.length} souborů)`);

          // Přidej pouze MP3 soubory z aktuální složky
          for (const fileRef of result.items) {
            if (fileRef.name.toLowerCase().endsWith('.mp3')) {
              // Použij pouze informace z listAll - bez getMetadata/getDownloadURL
              allFiles.push({
                name: fileRef.name,
                fullPath: fileRef.fullPath,
                size: 0, // Bude odhadnuto z názvu souboru
                folder: folderName,
                downloadURL: null // Bude vygenerováno později pomocí getDownloadURL
              });
              console.log(`✅ Načteno: ${fileRef.name} - POUZE LIST`);
            }
          }

          // Rekurzivně zpracuj všechny podsložky
          for (const subFolderRef of result.prefixes) {
            await processFolder(subFolderRef);
          }
        } catch (error) {
          console.warn(`❌ Chyba při skenování složky ${folderName}:`, error);
        }
      };

      await processFolder(folderRef);
      return allFiles;
    };

    // Skenuj hudba a slova složky
    const hudbaRef = ref(storage, 'hudba');
    const slovaRef = ref(storage, 'slova');

    console.log('🚀 Začínám skenování Firebase Storage...');
    const [hudbaFiles, slovaFiles] = await Promise.all([
      getAllFilesRecursively(hudbaRef, 'hudba'),
      getAllFilesRecursively(slovaRef, 'slova')
    ]);

    // Spoj všechny soubory
    allFiles.push(...hudbaFiles, ...slovaFiles);

    console.log(`✅ Skenování dokončeno! Nalezeno ${allFiles.length} MP3 souborů`);
    console.log(`🎵 HUDEBA: ${hudbaFiles.length} souborů`);
    console.log(`🎤 SLOVA: ${slovaFiles.length} souborů`);

    return allFiles;
  };

  // Vymazat cache a načíst data přímo z Firebase
  const clearCacheAndReload = async () => {
    setLoading(true);
    setStatus('🧹 Vymazávám cache a načítám data přímo z Firebase...');

    try {
      // Import cache služeb
      const cacheService = (await import('@services/cacheServiceRefactored')).default;
      const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
      const { fastMetadataService } = await import('@services/fastMetadataService');
      const { slovaDataService } = await import('@services/slovaDataService');

      // Vymaž všechny cache
      console.log('🧹 Clearing all caches...');
      cacheService.clear(); // Vymaže všechny cache

      // Vymaž také localStorage cache
      if (typeof window !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('meditation') || key.includes('cache') || key.includes('metadata'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 Removed ${keysToRemove.length} localStorage entries`);
      }

      // Vymaž Service Worker cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('🧹 Clearing Service Worker caches...');
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log(`✅ Deleted cache: ${cacheName}`);
        }
      }

      console.log('✅ All caches cleared');

      // Načti data přímo z Realtime Database
      setStatus('📡 Načítám data přímo z Realtime Database...');
      const realtimeMetadata = await realtimeMetadataService.getAllMetadata();

      if (realtimeMetadata && Object.keys(realtimeMetadata).length > 0) {
        console.log(`✅ Loaded ${Object.keys(realtimeMetadata).length} metadata entries from Realtime Database`);

        // Ulož do cache pro rychlý přístup
        Object.entries(realtimeMetadata).forEach(([key, value]) => {
          cacheService.setMetadata(key, value);
        });

        // Reinicializuj služby s novými daty
        setStatus('🔄 Reinicializuji služby...');
        await fastMetadataService.initialize(true);
        await slovaDataService.initialize();

        const slovaFiles = Object.values(realtimeMetadata).filter(file =>
          file.folder === 'slova' || (file.fileName && file.fileName.includes('slova/'))
        );

        const hudbaFiles = Object.values(realtimeMetadata).filter(file =>
          file.folder === 'hudba' || (file.fileName && file.fileName.includes('hudba/'))
        );

        setStatus(`✅ Cache vymazána! Načteno ${Object.keys(realtimeMetadata).length} souborů, ${slovaFiles.length} SLOVA, ${hudbaFiles.length} HUDEBA`);
        console.log('✅ Cache cleared and data reloaded from Firebase');
      } else {
        setStatus('❌ Žádná data v Realtime Database');
      }

    } catch (error) {
      setStatus(`❌ Chyba při vymazání cache: ${error.message}`);
      console.error('❌ Clear cache failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FÁZE 3: Zkontrolovat nové a změněné soubory
  const checkForNewFiles = async () => {
    setLoading(true);
    setStatus('🔍 Kontroluji nové soubory...');

    try {
      // 1. Načti všechny soubory z Firebase Storage
      setStatus('📁 Skenuji Firebase Storage...');
      const storageFiles = await scanFirebaseStorage();
      console.log(`📊 Nalezeno ${storageFiles.length} souborů ve Storage`);

      // 2. Načti existující metadata z Realtime Database
      setStatus('📊 Načítám existující metadata...');
      const realtimeRef = dbRef(database, 'audio-metadata');
      const snapshot = await get(realtimeRef);

      const existingMetadata = new Map();
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.files && Array.isArray(data.files)) {
          data.files.forEach(file => {
            existingMetadata.set(file.fullPath || file.fileName, file);
          });
        }
      }

      console.log(`📊 Existující metadata: ${existingMetadata.size} souborů`);

      // 3. Porovnej a najdi nové a změněné soubory
      const newFilesList = [];
      const changedFilesList = [];

      for (const storageFile of storageFiles) {
        const existing = existingMetadata.get(storageFile.fullPath);

        if (!existing) {
          // Nový soubor - není v DB
          newFilesList.push(storageFile);
        } else {
          // Zkontroluj jestli se změnil
          const sizeChanged = existing.fileSize !== storageFile.size;

          if (sizeChanged) {
            changedFilesList.push({
              ...storageFile,
              oldSize: existing.fileSize,
              reason: 'size changed'
            });
          }
        }
      }

      setNewFiles(newFilesList);
      setChangedFiles(changedFilesList);

      const totalChanges = newFilesList.length + changedFilesList.length;

      if (totalChanges === 0) {
        setStatus('✅ Žádné nové soubory! Všechna metadata jsou aktuální.');
      } else {
        setStatus(`🆕 Nalezeno: ${newFilesList.length} nových souborů, ${changedFilesList.length} změněných souborů`);
      }

      console.log(`🆕 Nové soubory:`, newFilesList.map(f => f.name));
      console.log(`🔄 Změněné soubory:`, changedFilesList.map(f => f.name));

    } catch (error) {
      setStatus(`❌ Chyba při kontrole: ${error.message}`);
      console.error('❌ Check for new files failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FÁZE 3: Synchronizovat jen nové a změněné soubory
  const syncOnlyChanges = async () => {
    const filesToSync = [...newFiles, ...changedFiles];

    if (filesToSync.length === 0) {
      setStatus('⚠️ Žádné soubory k synchronizaci. Spusť nejdříve "Zkontrolovat nové soubory".');
      return;
    }

    setLoading(true);
    setStatus(`🔄 Synchronizuji ${filesToSync.length} souborů...`);

    try {
      // Přihlásit se anonymně
      try {
        await signInAnonymously(auth);
      } catch (authError) {
        console.warn('⚠️ Anonymous auth failed:', authError.message);
      }

      // Načti existující metadata z Realtime Database
      const realtimeRef = dbRef(database, 'audio-metadata');
      const snapshot = await get(realtimeRef);

      let existingFiles = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        existingFiles = data.files || [];
      }

      // Vytvoř Map pro rychlé vyhledávání
      const existingMap = new Map(existingFiles.map(f => [f.fullPath || f.fileName, f]));

      // Zpracuj pouze nové a změněné soubory
      const metadataArray = [];
      let processedCount = 0;

      for (const file of filesToSync) {
        try {
          const progress = Math.round(((processedCount + 1) / filesToSync.length) * 100);
          setStatus(`📊 Měřím délku... ${processedCount + 1}/${filesToSync.length} (${progress}%) - ${file.name}`);

          // Generuj downloadURL
          let downloadURL = file.downloadURL;
          if (!downloadURL) {
            try {
              const fileRef = ref(storage, file.fullPath);
              downloadURL = await getDownloadURL(fileRef);
            } catch (urlError) {
              downloadURL = `https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/${encodeURIComponent(file.fullPath)}?alt=media`;
            }
          }

          // Změř duration
          let realDuration = null;
          let extractionMethod = 'estimated';

          try {
            realDuration = await getAudioDuration(downloadURL);
            if (realDuration && realDuration > 0) {
              extractionMethod = 'extracted';
            }
          } catch (audioError) {
            console.warn(`⚠️ Audio API failed for ${file.name}`);
          }

          const finalDuration = realDuration || estimateDurationFromSize(file.size);

          // Vytvoř metadata
          const completeMetadata = {
            fileName: file.fullPath,
            displayName: extractDisplayName(file.name),
            folder: file.folder,
            subFolder: extractSubFolder(file.fullPath),
            downloadURL: downloadURL,
            fullPath: file.fullPath,
            duration: finalDuration,
            durationFormatted: formatDuration(finalDuration),
            durationDetailed: formatDurationDetailed(finalDuration),
            isValid: finalDuration > 0,
            extractionMethod: extractionMethod,
            fileSize: file.size,
            contentType: 'audio/mpeg',
            lastModified: new Date().toISOString(),
            extracted: finalDuration > 0,
            ...(file.folder === 'slova' ? {
              gender: extractGender(file.name),
              topic: extractTopic(file.name),
              type: extractType(file.name)
            } : {})
          };

          metadataArray.push(completeMetadata);
          processedCount++;

        } catch (error) {
          console.warn(`⚠️ Chyba při zpracování ${file.name}:`, error.message);
          processedCount++;
        }
      }

      // Aktualizuj existující soubory nebo přidej nové
      metadataArray.forEach(newMeta => {
        const existingIndex = existingFiles.findIndex(f =>
          (f.fullPath || f.fileName) === newMeta.fullPath
        );

        if (existingIndex >= 0) {
          // Aktualizuj existující
          existingFiles[existingIndex] = newMeta;
        } else {
          // Přidej nový
          existingFiles.push(newMeta);
        }
      });

      // Ulož zpět do Realtime Database
      const slovaFiles = existingFiles.filter(f => f.folder === 'slova');
      const hudbaFiles = existingFiles.filter(f => f.folder === 'hudba');

      await set(realtimeRef, {
        files: existingFiles,
        lastSync: new Date().toISOString(),
        totalFiles: existingFiles.length,
        slovaFiles: slovaFiles.length,
        hudbaFiles: hudbaFiles.length
      });

      setStatus(`✅ Synchronizováno ${metadataArray.length} souborů! 📊 Celkem: ${existingFiles.length} | 🎤 ${slovaFiles.length} SLOVA | 🎵 ${hudbaFiles.length} HUDBA`);

      // Vymaž seznam změn
      setNewFiles([]);
      setChangedFiles([]);

    } catch (error) {
      setStatus(`❌ Chyba při synchronizaci: ${error.message}`);
      console.error('❌ Sync changes failed:', error);
    } finally {
      setLoading(false);
    }
  };


  const cardClasses = isDarkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Zjednodušený Admin Panel</h1>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-4xl mx-auto">
        {/* Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border mb-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}
        >
          <div className="flex items-center">
            <Database className="mr-3 text-blue-500" size={20} />
            <span className="font-medium">Status:</span>
            <span className="ml-2">{status || 'Připraveno'}</span>
          </div>
        </motion.div>

        {/* Hlavní funkce */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ✅ FÁZE 3: Zkontrolovat nové soubory */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <RefreshCw className="mr-2 text-blue-500" size={24} />
              Zkontrolovat nové soubory
            </h3>
            <p className="text-gray-500 mb-4">
              Porovná Firebase Storage s Realtime Database a najde nové nebo změněné MP3 soubory. Rychlejší než plná synchronizace.
            </p>
            <button
              onClick={checkForNewFiles}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center mb-3"
            >
              {loading ? (
                <RefreshCw className="animate-spin mr-2" size={20} />
              ) : (
                <RefreshCw className="mr-2" size={20} />
              )}
              {loading ? 'Kontroluji...' : '🔍 Zkontrolovat nové soubory'}
            </button>

            {/* Zobrazení detekovaných změn */}
            {(newFiles.length > 0 || changedFiles.length > 0) && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Nalezené změny:
                </h4>
                {newFiles.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-blue-700">
                      🆕 Nové soubory: <span className="font-bold">{newFiles.length}</span>
                    </p>
                    <div className="text-xs text-blue-600 mt-1 max-h-20 overflow-y-auto">
                      {newFiles.slice(0, 5).map((file, idx) => (
                        <div key={idx}>• {file.name}</div>
                      ))}
                      {newFiles.length > 5 && (
                        <div>... a {newFiles.length - 5} dalších</div>
                      )}
                    </div>
                  </div>
                )}
                {changedFiles.length > 0 && (
                  <div>
                    <p className="text-sm text-blue-700">
                      🔄 Změněné soubory: <span className="font-bold">{changedFiles.length}</span>
                    </p>
                    <div className="text-xs text-blue-600 mt-1 max-h-20 overflow-y-auto">
                      {changedFiles.slice(0, 5).map((file, idx) => (
                        <div key={idx}>• {file.name}</div>
                      ))}
                      {changedFiles.length > 5 && (
                        <div>... a {changedFiles.length - 5} dalších</div>
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={syncOnlyChanges}
                  disabled={loading}
                  className="w-full mt-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin mr-2" size={16} />
                  ) : (
                    <Upload className="mr-2" size={16} />
                  )}
                  {loading ? 'Synchronizuji...' : `✨ Synchronizovat ${newFiles.length + changedFiles.length} souborů`}
                </button>
              </div>
            )}
          </motion.div>

          {/* Kompletní synchronizace Storage → Realtime DB */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="mr-2 text-green-500" size={24} />
              Kompletní synchronizace
            </h3>
            <p className="text-gray-500 mb-4">
              Skenuje Firebase Storage, změří délku všech MP3 souborů a uloží do Realtime Database. Doporučeno jen pro první spuštění.
            </p>
            <button
              onClick={fullMetadataSync}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <RefreshCw className="animate-spin mr-2" size={20} />
              ) : (
                <Upload className="mr-2" size={20} />
              )}
              {loading ? 'Synchronizuji...' : '🚀 Kompletní synchronizace (všechny soubory)'}
            </button>
          </motion.div>

          {/* Synchronizace Firestore → Realtime DB */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="mr-2 text-purple-500" size={24} />
              Rychlá synchronizace
            </h3>
            <p className="text-gray-500 mb-4">
              Aktualizuje Realtime Database s metadaty z Firestore. Spustit po přidání nové meditace v adminu.
            </p>
            <button
              onClick={syncFirestoreToRealtime}
              disabled={loading}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <RefreshCw className="animate-spin mr-2" size={20} />
              ) : (
                <RefreshCw className="mr-2" size={20} />
              )}
              {loading ? 'Synchronizuji...' : '🔄 Synchronizovat Firestore → Realtime DB'}
            </button>
          </motion.div>

          {/* Vymazat cache a načíst data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <RefreshCw className="mr-2 text-orange-500" size={24} />
              Vymazat cache a načíst data
            </h3>
            <p className="text-gray-500 mb-4">
              Vymaže všechny cache a načte data přímo z Realtime Database. Použít když se data neaktualizují v UI aplikaci.
            </p>
            <button
              onClick={clearCacheAndReload}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <RefreshCw className="animate-spin mr-2" size={20} />
              ) : (
                <RefreshCw className="mr-2" size={20} />
              )}
              {loading ? 'Vymazávám cache...' : '🧹 Vymazat cache a načíst data'}
            </button>
          </motion.div>
        </div>

        {/* Firebase Monitoring */}
        {showMonitoring && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <FirebaseMonitoring />
          </motion.div>
        )}

        {/* Grafy úložišť dat */}
        {showCharts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`mt-6 ${cardClasses}`}
          >
            <DataStorageCharts />
          </motion.div>
        )}

        {/* Rychlé akce */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 rounded-lg border mt-6 ${cardClasses}`}
        >
          <h3 className="text-xl font-semibold mb-4">Rychlé akce</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={checkStatus}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              🔍 Zkontrolovat status
            </button>
            <button
              onClick={() => setStatus('')}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
            >
              🗑️ Vymazat status
            </button>
            <button
              onClick={() => setShowMonitoring(!showMonitoring)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center"
            >
              <Activity className="w-4 h-4 mr-2" />
              {showMonitoring ? 'Skrýt monitoring' : 'Zobrazit Firebase monitoring'}
            </button>
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showCharts ? 'Skrýt grafy' : 'Zobrazit grafy úložišť'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SimpleAdminScreen;
