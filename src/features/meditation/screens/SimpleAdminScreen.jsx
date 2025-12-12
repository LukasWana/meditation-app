import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Database, Download, RefreshCw, Upload, FileAudio, BarChart3, Play, Pause, Save, Edit } from 'lucide-react';
import { storage, db, database, auth } from '@config/secure-firebase';
import { ref, listAll, getMetadata, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { ref as dbRef, set, get } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import DataStorageCharts from '@components/admin/DataStorageCharts';
import { extractAudioMetadata } from '@utils/audioMetadataExtractor';
import { generateWaveformViaFunction } from '@utils/generateWaveformViaFunction';
import { syncAllFilesViaFunction } from '@utils/syncAllFilesViaFunction';
import Waveform from '@components/Waveform';
import { realtimeMetadataService } from '@services/realtimeMetadataService';

const SimpleAdminScreen = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [showCharts, setShowCharts] = useState(false);

  // Editace popisků zvuků
  const [soundFiles, setSoundFiles] = useState([]);
  const [editingDescriptions, setEditingDescriptions] = useState({});
  const [playingPreview, setPlayingPreview] = useState(null);
  const previewAudioRef = useRef(null);

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
      const hudbaFiles = [];
      const dychanieFiles = [];
      const sampleFiles = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.fileName && data.fileName.includes('slova/')) {
          slovaFiles.push(data);
        }
        if (data.fileName && data.fileName.includes('hudba/')) {
          hudbaFiles.push(data);
        }
        if (data.fileName && data.fileName.includes('dychanie/')) {
          dychanieFiles.push(data);
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

      const mp3Count = querySnapshot.size - dychanieFiles.length; // přibližně
      const oggCount = dychanieFiles.length; // přibližně
      setStatus(`📊 Firestore: ${querySnapshot.size} souborů, 🎤 SLOVA: ${slovaFiles.length}, 🎵 HUDEBA: ${hudbaFiles.length}, 🫁 DÝCHANIE: ${dychanieFiles.length}`);
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
      const hudbaFiles = metadataArray.filter(file =>
        file.fileName && file.fileName.includes('hudba/')
      );
      const dychanieFiles = metadataArray.filter(file =>
        file.fileName && file.fileName.includes('dychanie/')
      );

      const mp3Count = metadataArray.filter(f => f.fileName?.toLowerCase().endsWith('.mp3')).length;
      const oggCount = metadataArray.filter(f => {
        const name = f.fileName?.toLowerCase() || '';
        return name.endsWith('.ogg') || name.endsWith('.oga');
      }).length;

      console.log('🔍 Sample processed data:');
      metadataArray.slice(0, 3).forEach((file, i) => {
        console.log(`  ${i + 1}. ${file.fileName}`);
        console.log(`     Folder: ${file.folder}`);
        console.log(`     DisplayName: ${file.displayName}`);
        console.log(`     DownloadURL: ${file.downloadURL ? 'Yes' : 'No'}`);
      });

      // Ulož do Realtime Database v novém formátu (každý soubor má svůj vlastní klíč)
      // Použij sanitizePath pro správné klíče v Realtime Database
      const { realtimeMetadataService } = await import('@services/realtimeMetadataService');

      let savedCount = 0;
      for (const fileData of metadataArray) {
        try {
          if (!fileData.fileName) {
            console.warn('⚠️ Skipping file without fileName:', fileData);
            continue;
          }

          // Sanitizuj cestu pro Realtime Database
          const safePath = realtimeMetadataService.sanitizePath(fileData.fileName);
          const fileRef = dbRef(database, `audio-metadata/${safePath}`);

          // Ulož metadata pro tento soubor
          await set(fileRef, {
            ...fileData,
            fileName: fileData.fileName, // Zachovej původní fileName
            lastUpdated: new Date().toISOString(),
            source: 'firestore-sync'
          });

          savedCount++;
        } catch (error) {
          console.error(`❌ Failed to save ${fileData.fileName}:`, error);
        }
      }

      // Aktualizuj timestamp synchronizace
      const syncRef = dbRef(database, 'audio-metadata-sync');
      await set(syncRef, {
        lastSync: new Date().toISOString(),
        totalFiles: metadataArray.length,
        savedFiles: savedCount,
        slovaFiles: slovaFiles.length,
        hudbaFiles: hudbaFiles.length,
        dychanieFiles: dychanieFiles.length,
        mp3Files: mp3Count,
        oggFiles: oggCount
      });

      setStatus(`✅ Synchronizace dokončena! 📊 ${metadataArray.length} souborů (${mp3Count} MP3, ${oggCount} OGG), 🎤 ${slovaFiles.length} SLOVA, 🎵 ${hudbaFiles.length} HUDEBA, 🫁 ${dychanieFiles.length} DÝCHANIE`);
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

      // 3. Připravit metadata pro každý audio soubor s reálnou délkou (paralelně)
      setStatus('📊 Připravuji metadata s reálnou délkou...');

      // Helper funkce pro zpracování jednoho souboru
      const processFile = async (file, index) => {
        try {
          // Získej metadata ze Storage (velikost souboru)
          let fileSize = file.size;
          let fileRef = ref(storage, file.fullPath);

          if (!fileSize || fileSize === 0) {
            try {
              const storageMetadata = await getMetadata(fileRef);
              fileSize = storageMetadata.size;
              console.log(`📦 Velikost souboru pro ${file.name}: ${Math.round(fileSize / 1024 / 1024 * 100) / 100}MB`);
            } catch (metaError) {
              console.warn(`⚠️ Nelze získat metadata pro ${file.name}:`, metaError.message);
            }
          }

          // Generuj správné downloadURL pomocí getDownloadURL
          let downloadURL = file.downloadURL;
          if (!downloadURL) {
            try {
              downloadURL = await getDownloadURL(fileRef);
              console.log(`🔗 Generated downloadURL for ${file.name}: ${downloadURL}`);
            } catch (urlError) {
              console.warn(`⚠️ Failed to generate downloadURL for ${file.name}:`, urlError);
              // Použij fallback URL
              downloadURL = `https://firebasestorage.googleapis.com/v0/b/meditations-audio.firebasestorage.app/o/${encodeURIComponent(file.fullPath)}?alt=media`;
            }
          }

          // Získej reálnou délku audio souboru
          // Pro OGG soubory použij odhad z velikosti, pro MP3 zkus extrahovat skutečnou délku
          let audioMetadata;
          const fileExt = file.name.toLowerCase();
          const isOggFile = fileExt.endsWith('.ogg') || fileExt.endsWith('.oga');

          if (isOggFile) {
            // Pro OGG soubory použij odhad z velikosti (HTML5 Audio API může mít problémy s OGG)
            console.log(`🫁 OGG soubor ${file.name}: používám odhad z velikosti`);
            // Urči contentType pro správný odhad délky
            const oggContentType = fileExt.endsWith('.ogg') || fileExt.endsWith('.oga') ? 'audio/ogg' : 'audio/mpeg';
            const estimatedDuration = estimateDurationFromSize(fileSize, oggContentType);
            audioMetadata = {
              duration: estimatedDuration,
              durationFormatted: formatDuration(estimatedDuration),
              durationDetailed: formatDurationDetailed(estimatedDuration),
              isValid: estimatedDuration > 0
            };
            console.log(`📊 ${file.name}: ${audioMetadata.durationFormatted} (Odhad z velikosti - OGG)`);
          } else {
            // Pro MP3 soubory zkus extrahovat skutečnou délku
            try {
              console.log(`🎵 Načítám reálnou délku pro ${file.name}...`);
              // Použij extractAudioMetadata bez fetch fallback
              audioMetadata = await extractAudioMetadata(downloadURL, { useFetchFallback: false });

              if (!audioMetadata.isValid || audioMetadata.duration === 0) {
                // Fallback na odhad z velikosti, pokud se nepodařilo získat reálnou délku
                console.warn(`⚠️ Nepodařilo se získat reálnou délku pro ${file.name}, použiji odhad`);
                const estimatedDuration = estimateDurationFromSize(fileSize, contentType);
                audioMetadata = {
                  duration: estimatedDuration,
                  durationFormatted: formatDuration(estimatedDuration),
                  durationDetailed: formatDurationDetailed(estimatedDuration),
                  isValid: estimatedDuration > 0
                };
                console.log(`📊 ${file.name}: ${audioMetadata.durationFormatted} (Odhad z velikosti)`);
              } else {
                console.log(`✅ ${file.name}: ${audioMetadata.durationFormatted} (Reálná délka)`);
              }
            } catch (audioError) {
              // Fallback na odhad z velikosti při chybě
              console.warn(`⚠️ Chyba při získávání délky pro ${file.name}:`, audioError.message);
              const estimatedDuration = estimateDurationFromSize(fileSize, contentType);
              audioMetadata = {
                duration: estimatedDuration,
                durationFormatted: formatDuration(estimatedDuration),
                durationDetailed: formatDurationDetailed(estimatedDuration),
                isValid: estimatedDuration > 0
              };
              console.log(`📊 ${file.name}: ${audioMetadata.durationFormatted} (Odhad z velikosti - chyba)`);
            }
          }

          // Urči contentType podle přípony souboru (před vytvořením metadat)
          const fileNameForContentType = file.name.toLowerCase();
          let contentType = 'audio/mpeg'; // default pro MP3
          if (fileNameForContentType.endsWith('.ogg') || fileNameForContentType.endsWith('.oga')) {
            contentType = 'audio/ogg';
          }

          // Vygeneruj waveformu pomocí Firebase Function (server-side, bez CORS problémů)
          // POUZE pro sekci "dychanie" (pro náhledy ve zvukové galerii)
          let waveformData = null;
          const isDychanieFile = file.folder === 'dychanie' || file.fullPath.startsWith('dychanie/');

          if (isDychanieFile && (fileExt.endsWith('.mp3') || fileExt.endsWith('.ogg') || fileExt.endsWith('.oga'))) {
            try {
              console.log(`🌊 Generating waveform via Function for ${file.name} (dychanie file)...`);
              // ✅ OPRAVA: Zvýšeno z 150 na 800 pro lepší detail
              const result = await generateWaveformViaFunction(file.fullPath, 800);
              if (result.success && result.waveformData && Array.isArray(result.waveformData) && result.waveformData.length > 0) {
                waveformData = result.waveformData;

                // Debug: zobraz ukázku hodnot pro kontrolu, že jsou různé
                const sampleValues = waveformData.slice(0, 10);
                const minValue = Math.min(...waveformData);
                const maxValue = Math.max(...waveformData);
                const avgValue = waveformData.reduce((a, b) => a + b, 0) / waveformData.length;

                console.log(`✅ Waveform generated for ${file.name}:`, {
                  samples: waveformData.length,
                  min: minValue.toFixed(3),
                  max: maxValue.toFixed(3),
                  avg: avgValue.toFixed(3),
                  sample: sampleValues.map(v => v.toFixed(3))
                });
              } else {
                console.warn(`⚠️ Waveform generation failed for ${file.name}:`, result.error);
                waveformData = null;
              }
            } catch (error) {
              console.warn(`⚠️ Failed to generate waveform for ${file.name}:`, error.message);
              // Pokračuj i bez waveformy - není to kritická chyba
              waveformData = null;
            }
          } else if (!isDychanieFile) {
            // Nezobrazuj log pro soubory mimo dychanie
            console.log(`⏭️ Skipping waveform generation for ${file.name} (not dychanie file)`);
          } else {
            console.log(`⏭️ Skipping waveform generation for ${file.name} (not audio file)`);
          }

          // Vytvoř kompletní metadata objekt
          // fileName musí být celá cesta včetně složky (např. "dychanie/prana-breath/file.ogg")
          const metadata = {
            fileName: file.fullPath, // Celá cesta: "dychanie/prana-breath/file.ogg"
            displayName: extractDisplayName(file.name),
            folder: file.folder,
            subFolder: extractSubFolder(file.fullPath),
            downloadURL: downloadURL,
            fullPath: file.fullPath,
            duration: audioMetadata.duration,
            durationFormatted: audioMetadata.durationFormatted,
            durationDetailed: audioMetadata.durationDetailed,
            isValid: audioMetadata.isValid,
            fileSize: fileSize,
            contentType: contentType,
            lastModified: new Date().toISOString(),
            extracted: audioMetadata.isValid,
            // Waveform data
            waveformData: waveformData,
            waveformGenerated: waveformData ? new Date().toISOString() : null,
            waveformSamples: waveformData ? 800 : null,
            // Dodatečné informace pro slova soubory
            ...(file.folder === 'slova' ? {
              gender: extractGender(file.name),
              topic: extractTopic(file.name),
              type: extractType(file.name)
            } : {})
          };

          // Debug pro dychanie soubory
          if (file.folder === 'dychanie') {
            console.log(`🫁 Dychanie metadata: fileName=${metadata.fileName}, fullPath=${metadata.fullPath}, downloadURL=${metadata.downloadURL ? 'yes' : 'no'}`);
          }

          return metadata;
        } catch (error) {
          console.warn(`⚠️ Chyba při zpracování ${file.name}:`, error.message);

          // Urči contentType podle přípony souboru
          const errorFileName = file.name.toLowerCase();
          let errorContentType = 'audio/mpeg'; // default pro MP3
          if (errorFileName.endsWith('.ogg') || errorFileName.endsWith('.oga')) {
            errorContentType = 'audio/ogg';
          }

          // Vrátí soubor s odhadem délky při chybě
          const estimatedDuration = estimateDurationFromSize(file.size || 0, errorContentType);
          return {
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
            fileSize: file.size || 0,
            contentType: errorContentType,
            lastModified: new Date().toISOString(),
            extracted: false,
            error: error.message
          };
        }
      };

      // Paralelní zpracování s limitem současných requestů (5-10 současně)
      const MAX_CONCURRENT = 8; // Počet současných requestů
      const metadataArray = [];

      for (let i = 0; i < allFiles.length; i += MAX_CONCURRENT) {
        const batch = allFiles.slice(i, i + MAX_CONCURRENT);
        setStatus(`📊 Zpracovávám batch ${Math.floor(i / MAX_CONCURRENT) + 1}/${Math.ceil(allFiles.length / MAX_CONCURRENT)} (${i + 1}-${Math.min(i + MAX_CONCURRENT, allFiles.length)}/${allFiles.length})`);

        const batchResults = await Promise.allSettled(
          batch.map((file, batchIndex) => processFile(file, i + batchIndex))
        );

        // Přidej úspěšné výsledky
        batchResults.forEach((result, batchIndex) => {
          if (result.status === 'fulfilled' && result.value) {
            metadataArray.push(result.value);
          } else if (result.status === 'rejected') {
            console.error(`❌ Chyba při zpracování souboru v batchu:`, result.reason);
          }
        });
      }

      // 4. Filtruj soubory podle složek
      const slovaFiles = metadataArray.filter(file => file.folder === 'slova');
      const hudbaFiles = metadataArray.filter(file => file.folder === 'hudba');
      const dychanieFiles = metadataArray.filter(file => file.folder === 'dychanie');

      const mp3Count = metadataArray.filter(f => f.fileName?.toLowerCase().endsWith('.mp3')).length;
      const oggCount = metadataArray.filter(f => {
        const name = f.fileName?.toLowerCase() || '';
        return name.endsWith('.ogg') || name.endsWith('.oga');
      }).length;

      console.log(`📊 Zpracováno: ${metadataArray.length} souborů (${mp3Count} MP3, ${oggCount} OGG)`);
      console.log(`🎤 SLOVA: ${slovaFiles.length} souborů`);
      console.log(`🎵 HUDEBA: ${hudbaFiles.length} souborů`);
      console.log(`🫁 DÝCHANIE: ${dychanieFiles.length} souborů`);

      // 5. Uložit do Realtime Database
      setStatus('💾 Ukládám do Realtime Database...');
      const realtimeRef = dbRef(database, 'audio-metadata');
      await set(realtimeRef, {
        files: metadataArray,
        lastSync: new Date().toISOString(),
        totalFiles: metadataArray.length,
        slovaFiles: slovaFiles.length,
        hudbaFiles: hudbaFiles.length,
        dychanieFiles: dychanieFiles.length,
        mp3Files: mp3Count,
        oggFiles: oggCount,
        validFiles: metadataArray.filter(f => f.isValid).length,
        invalidFiles: metadataArray.filter(f => !f.isValid).length
      });

      setStatus(`✅ Kompletní synchronizace dokončena! 📊 ${metadataArray.length} souborů (${mp3Count} MP3, ${oggCount} OGG), 🎤 ${slovaFiles.length} SLOVA, 🎵 ${hudbaFiles.length} HUDEBA, 🫁 ${dychanieFiles.length} DÝCHANIE`);
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
    // Podporuje MP3, OGG, OGA formáty
    const nameWithoutExt = fileName.replace(/\.(mp3|ogg|oga)$/i, '');
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
    // Extrahuj téma ze jména souboru (podporuje MP3, OGG, OGA formáty)
    const match = fileName.match(/-([^-]+)\.(mp3|ogg|oga)$/i);
    return match ? match[1] : null;
  };

  const extractType = (fileName) => {
    if (fileName.includes('MSK')) return 'MSK';
    if (fileName.includes('FSK')) return 'FSK';
    return null;
  };

  // Odhad délky z velikosti souboru
  // Pro MP3: přibližně 1MB = 1 minuta
  // Pro OGG: přibližně 0.5MB = 1 minuta (OGG má lepší kompresi)
  const estimateDurationFromSize = (sizeInBytes, contentType = 'audio/mpeg') => {
    if (sizeInBytes <= 0) {
      // Pokud nemáme velikost, použij výchozí odhad (5 minut)
      return 300; // 5 minut
    }
    const sizeInMB = sizeInBytes / (1024 * 1024);

    // Pro OGG použij jiný přepočet (lepší komprese)
    const isOgg = contentType === 'audio/ogg';
    const mbPerMinute = isOgg ? 0.5 : 1.0; // OGG má lepší kompresi

    return Math.round(sizeInMB * 60 / mbPerMinute); // sekundy
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
    // Použijeme jednodušší přístup - podobný jako v fastMetadataService
    const getAllFilesRecursively = async (folderRef, folderName) => {
      const allFiles = [];

      const processFolder = async (currentFolderRef) => {
        try {
          const result = await listAll(currentFolderRef);
          const folderPath = currentFolderRef.fullPath || currentFolderRef.name || '';
          const folderNameOnly = currentFolderRef.name || folderPath.split('/').pop() || '';

          console.log(`📂 Skenuji složku: ${folderPath} (${folderNameOnly})`);
          console.log(`   - Items: ${result.items.length}, Prefixes: ${result.prefixes.length}`);

          // Přidej audio soubory z aktuální složky (MP3, OGG, OGA)
          for (const fileRef of result.items) {
            const fileName = fileRef.name.toLowerCase();
            const isAudioFile = fileName.endsWith('.mp3') ||
                               fileName.endsWith('.ogg') ||
                               fileName.endsWith('.oga');

            console.log(`   📄 Soubor: ${fileRef.name} (fullPath: ${fileRef.fullPath}), isAudio: ${isAudioFile}`);

            if (isAudioFile) {
              // Použij fileRef.fullPath, který už obsahuje celou cestu od rootu
              // Pokud není k dispozici, sestav cestu z folderPath
              let fullPath = fileRef.fullPath;
              let relativePath;

              if (fullPath && fullPath.startsWith(folderName)) {
                // fileRef.fullPath už obsahuje celou cestu (např. "dychanie/prana-breath/file.ogg")
                relativePath = fullPath.replace(`${folderName}/`, '');
              } else if (fullPath) {
                // fullPath je relativní, přidej folderName
                fullPath = `${folderName}/${fullPath}`;
                relativePath = fullPath.replace(`${folderName}/`, '');
              } else {
                // Sestav cestu z folderPath a fileRef.name
                if (folderPath === folderName || folderPath === `${folderName}/`) {
                  // Jsme v root složce
                  relativePath = fileRef.name;
                } else {
                  // Jsme v podsložce - extrahuj relativní cestu z folderPath
                  const relativeFolderPath = folderPath.replace(`${folderName}/`, '');
                  relativePath = `${relativeFolderPath}/${fileRef.name}`;
                }
                fullPath = `${folderName}/${relativePath}`;
              }

              // Použij pouze informace z listAll - bez getMetadata/getDownloadURL
              allFiles.push({
                name: relativePath, // Relativní cesta včetně podsložky (např. "prana-breath/file.ogg")
                fullPath: fullPath, // Celá cesta včetně složky (např. "dychanie/prana-breath/file.ogg")
                size: 0, // Bude odhadnuto z názvu souboru
                folder: folderName,
                downloadURL: null // Bude vygenerováno později pomocí getDownloadURL
              });
              console.log(`✅ Načteno: ${fullPath} (relativní: ${relativePath}) - POUZE LIST`);
            }
          }

          // Rekurzivně zpracuj všechny podsložky
          console.log(`   🔍 Nalezeno ${result.prefixes.length} podsložek`);
          for (const subFolderRef of result.prefixes) {
            const subFolderPath = subFolderRef.fullPath || subFolderRef.name;
            console.log(`   📁 Zpracovávám podsložku: ${subFolderPath}`);
            await processFolder(subFolderRef);
          }
        } catch (error) {
          console.error(`❌ Chyba při skenování složky ${currentFolderRef.fullPath || currentFolderRef.name}:`, error);
        }
      };

      await processFolder(folderRef);
      return allFiles;
    };

    // Skenuj hudba, slova a dychanie složky
    const hudbaRef = ref(storage, 'hudba');
    const slovaRef = ref(storage, 'slova');
    const dychanieRef = ref(storage, 'dychanie');

    console.log('🚀 Začínám skenování Firebase Storage...');

    // Zkontroluj, jestli složka dychanie existuje
    let dychanieFiles = [];
    try {
      const dychanieTest = await listAll(dychanieRef);
      console.log(`🫁 Dychanie složka: Items=${dychanieTest.items.length}, Prefixes=${dychanieTest.prefixes.length}`);
      console.log(`🫁 Dychanie podsložky:`, dychanieTest.prefixes.map(p => p.name || p.fullPath));

      // Pokud máme přístup, načteme soubory přímo ze Storage
      dychanieFiles = await getAllFilesRecursively(dychanieRef, 'dychanie');
    } catch (dychanieTestError) {
      console.warn(`⚠️ Nemám přístup k dychanie složce v Storage (403 Forbidden), načítám z Realtime Database...`);
      console.error(`❌ Chyba při kontrole dychanie složky:`, dychanieTestError);

      // Pokud nemáme přístup k Storage, načteme metadata z Realtime Database
      try {
        const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
        const realtimeMetadata = await realtimeMetadataService.getAllMetadata();

        // Filtruj pouze dychanie soubory (OGG formát)
        const dychanieMetadata = Object.values(realtimeMetadata).filter(file => {
          const fileName = (file.fileName || '').toLowerCase();
          const isInDychanieFolder = fileName.startsWith('dychanie/');
          const isOggFile = fileName.endsWith('.ogg') || fileName.endsWith('.oga');
          const isMp3File = fileName.endsWith('.mp3');
          return isInDychanieFolder && (isOggFile || isMp3File);
        });

        console.log(`🫁 Načteno ${dychanieMetadata.length} dychanie souborů z Realtime Database`);

        // Převeď metadata na formát pro admin panel
        dychanieFiles = dychanieMetadata.map(file => {
          // Extrahuj relativní cestu (bez "dychanie/" prefixu)
          const relativePath = file.fileName.replace('dychanie/', '');
          return {
            name: relativePath,
            fullPath: file.fileName,
            size: file.size || 0,
            folder: 'dychanie',
            downloadURL: file.downloadURL || file.audioSrc || null
          };
        });

        console.log(`✅ Přepracováno ${dychanieFiles.length} souborů z Realtime Database`);
      } catch (realtimeError) {
        console.error(`❌ Chyba při načítání z Realtime Database:`, realtimeError);
      }
    }

    const [hudbaFiles, slovaFiles] = await Promise.all([
      getAllFilesRecursively(hudbaRef, 'hudba'),
      getAllFilesRecursively(slovaRef, 'slova')
    ]);

    console.log(`🫁 Dychanie files výsledek: ${dychanieFiles.length} souborů`);
    if (dychanieFiles.length > 0) {
      console.log('🫁 Sample dychanie files:', dychanieFiles.slice(0, 3).map(f => ({
        name: f.name,
        fullPath: f.fullPath,
        folder: f.folder
      })));
    }

    // Spoj všechny soubory
    allFiles.push(...hudbaFiles, ...slovaFiles, ...dychanieFiles);

    const mp3Count = allFiles.filter(f => {
      const name = (f.name || f.fullPath || '').toLowerCase();
      return name.endsWith('.mp3');
    }).length;
    const oggCount = allFiles.filter(f => {
      const name = (f.name || f.fullPath || '').toLowerCase();
      return name.endsWith('.ogg') || name.endsWith('.oga');
    }).length;

    // Debug: zobraz dychanie soubory
    const dychanieDebug = allFiles.filter(f => f.folder === 'dychanie');
    console.log(`🫁 DEBUG Dychanie soubory: ${dychanieDebug.length}`);
    console.log('🫁 Sample dychanie files:', dychanieDebug.slice(0, 5).map(f => ({
      name: f.name,
      fullPath: f.fullPath,
      folder: f.folder
    })));

    console.log(`✅ Skenování dokončeno! Nalezeno ${allFiles.length} audio souborů (${mp3Count} MP3, ${oggCount} OGG)`);
    console.log(`🎵 HUDEBA: ${hudbaFiles.length} souborů`);
    console.log(`🎤 SLOVA: ${slovaFiles.length} souborů`);
    console.log(`🫁 DÝCHANIE: ${dychanieFiles.length} souborů`);
    console.log(`🫁 OGG soubory: ${oggCount} (z toho ${dychanieFiles.filter(f => {
      const name = (f.name || f.fullPath || '').toLowerCase();
      return name.endsWith('.ogg') || name.endsWith('.oga');
    }).length} v dychanie)`);

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

  // Stáhnout MP3 pro offline
  const downloadMP3ForOffline = async () => {
    setLoading(true);
    setStatus('🔄 Stahuji MP3 soubory...');

    try {
      // Získej seznam všech audio souborů ze Storage
      const storageRef = ref(storage);
      const result = await listAll(storageRef);

      let downloadedCount = 0;
      const totalFiles = result.items.length;

      for (const itemRef of result.items) {
        try {
          // Získej URL
          const url = await getDownloadURL(itemRef);

          // Stáhni soubor do cache
          const response = await fetch(url);
          const blob = await response.blob();

          // Ulož do IndexedDB nebo localStorage
          const fileName = itemRef.name;
          const fileKey = `offline_audio_${fileName}`;

          // Použij IndexedDB pro větší soubory
          if ('indexedDB' in window) {
            const request = indexedDB.open('AudioCache', 1);
            request.onupgradeneeded = (event) => {
              const db = event.target.result;
              if (!db.objectStoreNames.contains('audioFiles')) {
                db.createObjectStore('audioFiles');
              }
            };

            request.onsuccess = (event) => {
              const db = event.target.result;
              const transaction = db.transaction(['audioFiles'], 'readwrite');
              const store = transaction.objectStore('audioFiles');
              store.put(blob, fileKey);
            };
          }

          downloadedCount++;
          setStatus(`🔄 Stahuji... ${downloadedCount}/${totalFiles} (${fileName})`);

        } catch (fileError) {
          console.warn(`⚠️ Failed to download ${itemRef.name}:`, fileError);
        }
      }

      setStatus(`✅ Offline stahování dokončeno! 📁 ${downloadedCount}/${totalFiles} souborů staženo`);

    } catch (error) {
      setStatus(`❌ Chyba při stahování: ${error.message}`);
      console.error('❌ Download failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Načtení zvuků pro editaci popisků
  const loadSoundFiles = async () => {
    setLoading(true);
    setStatus('🔄 Načítám zvuky...');
    try {
      const allMetadata = await realtimeMetadataService.getAllMetadata();

      // Filtruj pouze soubory z dychanie složky
      const dychanieFiles = Object.values(allMetadata).filter(file => {
        const fileName = file.fileName || '';
        const isInDychanieFolder = fileName.startsWith('dychanie/');
        const isOggFile = fileName.endsWith('.ogg') || fileName.endsWith('.oga');
        const isMp3File = fileName.endsWith('.mp3');
        return isInDychanieFolder && (isOggFile || isMp3File);
      });

      const mappedFiles = dychanieFiles.map(file => {
        const fileNameOnly = file.fileNameOnly || file.fileName.split('/').pop();
        const name = file.displayName || file.fileNameOnly || fileNameOnly.replace(/\.(ogg|oga|mp3)$/i, '');

        return {
          id: file.fileName,
          fileName: file.fileName,
          fileNameOnly: fileNameOnly,
          name: name,
          description: file.description || '',
          downloadURL: file.downloadURL || file.audioSrc,
          waveformData: file.waveformData || file.waveform || null,
          waveformMax: file.waveformMax || null
        };
      });

      setSoundFiles(mappedFiles);
      setStatus(`✅ Načteno ${mappedFiles.length} zvuků`);
    } catch (error) {
      setStatus(`❌ Chyba při načítání zvuků: ${error.message}`);
      console.error('❌ Failed to load sound files:', error);
    } finally {
      setLoading(false);
    }
  };

  // Uložení popisku
  const saveDescription = async (fileName, description) => {
    setLoading(true);
    setStatus('💾 Ukládám popisek...');
    try {
      const safePath = realtimeMetadataService.sanitizePath(fileName);
      const fileRef = dbRef(database, `audio-metadata/${safePath}`);

      // Načti aktuální metadata
      const snapshot = await get(fileRef);
      const currentData = snapshot.exists() ? snapshot.val() : {};

      // Aktualizuj popisek
      await set(fileRef, {
        ...currentData,
        description: description,
        lastUpdated: new Date().toISOString()
      });

      // Aktualizuj lokální state
      setSoundFiles(prev => prev.map(file =>
        file.fileName === fileName ? { ...file, description } : file
      ));
      setEditingDescriptions(prev => {
        const next = { ...prev };
        delete next[fileName];
        return next;
      });

      setStatus('✅ Popisek uložen');
    } catch (error) {
      setStatus(`❌ Chyba při ukládání popisku: ${error.message}`);
      console.error('❌ Failed to save description:', error);
    } finally {
      setLoading(false);
    }
  };

  // Preview zvuku
  const handlePreview = async (file) => {
    if (!file.downloadURL) {
      setStatus('⚠️ Není dostupná download URL pro preview');
      return;
    }

    // Pokud už se přehrává tento soubor, zastav ho
    if (playingPreview === file.fileName && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
      setPlayingPreview(null);
      return;
    }

    // Zastav aktuálně přehrávaný soubor
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }

    // Vytvoř nový audio element a přehraj
    const audio = new Audio(file.downloadURL);
    audio.volume = 0.7;

    audio.onended = () => {
      setPlayingPreview(null);
      previewAudioRef.current = null;
    };

    audio.onerror = (error) => {
      console.error('❌ Chyba při přehrávání preview:', error);
      setPlayingPreview(null);
      previewAudioRef.current = null;
    };

    try {
      await audio.play();
      previewAudioRef.current = audio;
      setPlayingPreview(file.fileName);
    } catch (error) {
      console.error('❌ Nelze přehrát audio:', error);
      setStatus('❌ Nelze přehrát audio');
    }
  };

  // Cleanup při unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
        previewAudioRef.current = null;
      }
    };
  }, []);

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
          {/* Kompletní synchronizace Storage → Realtime DB */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="mr-2 text-green-500" size={24} />
              Kompletní synchronizace
            </h3>
            <p className="text-gray-500 mb-4">
              Skenuje Firebase Storage, získá reálnou délku MP3 souborů a uloží metadata do Realtime Database. Doporučeno pro první spuštění.
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
              {loading ? 'Synchronizuji...' : '🚀 Kompletní synchronizace Storage → Realtime DB'}
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

          {/* Automatická synchronizace všech souborů pomocí Firebase Function */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="mr-2 text-blue-500" size={24} />
              Automatická synchronizace všech souborů
            </h3>
            <p className="text-gray-500 mb-4">
              Vygeneruje metadata pro všechny MP3, OGG, OGA soubory a obrázky pomocí Firebase Function (server-side). Generuje také waveformy.
            </p>
            <button
              onClick={async () => {
                setLoading(true);
                setStatus('🔄 Spouštím automatickou synchronizaci všech souborů...');
                try {
                  const result = await syncAllFilesViaFunction((current, total) => {
                    setStatus(`🔄 Synchronizuji... ${current}/${total} souborů`);
                  });
                  if (result.success) {
                    setStatus(`✅ Synchronizace dokončena! ${result.message}`);
                    console.log('✅ Sync results:', result.results);
                  } else {
                    setStatus(`❌ Chyba při synchronizaci: ${result.error}`);
                  }
                } catch (error) {
                  setStatus(`❌ Chyba: ${error.message}`);
                  console.error('❌ Sync failed:', error);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <RefreshCw className="animate-spin mr-2" size={20} />
              ) : (
                <Database className="mr-2" size={20} />
              )}
              {loading ? 'Synchronizuji...' : '🚀 Automatická synchronizace všech souborů'}
            </button>
          </motion.div>

          {/* Vymazat cache a načíst data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
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

          {/* Offline stahování */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`p-6 rounded-lg border ${cardClasses}`}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Download className="mr-2 text-blue-500" size={24} />
              Offline stahování
            </h3>
            <p className="text-gray-500 mb-4">
              Stáhne všechny MP3 soubory pro offline použití. Uloží je do prohlížeče.
            </p>
            <button
              onClick={downloadMP3ForOffline}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {loading ? (
                <RefreshCw className="animate-spin mr-2" size={20} />
              ) : (
                <FileAudio className="mr-2" size={20} />
              )}
              {loading ? 'Stahuji...' : '📁 Stáhnout MP3 pro offline'}
            </button>
          </motion.div>
        </div>

        {/* Grafy úložišť dat */}
        {showCharts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`mt-6 ${cardClasses}`}
          >
            <DataStorageCharts />
          </motion.div>
        )}

        {/* Editace popisků zvuků */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`p-6 rounded-lg border mt-6 ${cardClasses}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold flex items-center">
              <Edit className="mr-2 text-indigo-500" size={24} />
              Editace popisků zvuků
            </h3>
            <button
              onClick={loadSoundFiles}
              disabled={loading}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center"
            >
              {loading ? (
                <RefreshCw className="animate-spin mr-2" size={16} />
              ) : (
                <FileAudio className="mr-2" size={16} />
              )}
              {soundFiles.length > 0 ? '🔄 Obnovit' : '📂 Načíst zvuky'}
            </button>
          </div>

          {soundFiles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Klikněte na "Načíst zvuky" pro zobrazení seznamu zvuků k editaci popisků.
            </p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {soundFiles.map((file) => (
                <motion.div
                  key={file.id}
                  className={`p-4 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  {/* Název a popisek */}
                  <div className="mb-3">
                    <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {file.name}
                    </div>
                    {editingDescriptions[file.fileName] !== undefined ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingDescriptions[file.fileName]}
                          onChange={(e) => {
                            setEditingDescriptions(prev => ({
                              ...prev,
                              [file.fileName]: e.target.value
                            }));
                          }}
                          className={`w-full p-2 rounded border text-sm ${
                            isDarkMode
                              ? 'bg-gray-800 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          rows={2}
                          placeholder="Zadejte popisek..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveDescription(file.fileName, editingDescriptions[file.fileName])}
                            disabled={loading}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded text-sm transition-colors flex items-center"
                          >
                            <Save size={14} className="mr-1" />
                            Uložit
                          </button>
                          <button
                            onClick={() => {
                              setEditingDescriptions(prev => {
                                const next = { ...prev };
                                delete next[file.fileName];
                                return next;
                              });
                            }}
                            className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                          >
                            Zrušit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className={`text-xs flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {file.description || <span className="italic">Žádný popisek</span>}
                        </div>
                        <button
                          onClick={() => {
                            setEditingDescriptions(prev => ({
                              ...prev,
                              [file.fileName]: file.description || ''
                            }));
                          }}
                          className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs transition-colors flex items-center"
                        >
                          <Edit size={12} className="mr-1" />
                          Editovat
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Waveforma a preview */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Waveform
                        key={`${file.fileName}-${file.waveformMax || 'no-globalMax'}`}
                        audioUrl={file.downloadURL}
                        waveformData={file.waveformData}
                        globalMax={file.waveformMax}
                        width="100%"
                        height={50}
                        color={isDarkMode ? "#9ca3af" : "#6b7280"}
                      />
                    </div>
                    <button
                      onClick={() => handlePreview(file)}
                      className={`p-2 rounded-full transition-colors flex items-center justify-center flex-shrink-0 ${
                        playingPreview === file.fileName
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : isDarkMode
                          ? 'bg-gray-600 hover:bg-gray-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      title={playingPreview === file.fileName ? 'Zastavit' : 'Přehrát'}
                      type="button"
                    >
                      {playingPreview === file.fileName ? (
                        <Pause size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

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
