import { ref as dbRef, set } from 'firebase/database';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';
import { database, storage, auth, db, ensureFirebase } from '@config/secure-firebase';
import { extractAudioMetadata } from '@utils/audioMetadataExtractor';
import { generateWaveformViaFunction } from '@utils/generateWaveformViaFunction';
import { extractDisplayName, extractSubFolder, extractGender, extractTopic, extractType, estimateDurationFromSize, formatDuration, formatDurationDetailed } from '@utils/adminHelpers';

export const useAdminSync = (setLoading, setStatus) => {
  const checkStatus = async () => {
    try {
      await ensureFirebase();
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
        if (data.fileName && (data.fileName.includes('meditacie/') || data.folder === 'meditacie')) {
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

      const _mp3Count = querySnapshot.size - dychanieFiles.length; // přibližně
      const _oggCount = dychanieFiles.length; // přibližně
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
      await ensureFirebase();
      if (!auth.currentUser) {
        setStatus('❌ Přihlaste se admin účtem.');
        setLoading(false);
        return;
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
          folder: data.folder || (data.fileName?.includes('meditacie/') ? 'meditacie' : 'hudba'),
          // Zajisti, že má displayName
          displayName: data.displayName || data.title || data.fileName?.replace(/\.[^/.]+$/, ""),
          // Zajisti, že má fullPath
          fullPath: data.fullPath || data.fileName
        };
        metadataArray.push(processedData);
      });

      const slovaFiles = metadataArray.filter(file =>
        (file.fileName && file.fileName.includes('meditacie/')) || file.folder === 'meditacie'
      );
      const hudbaFiles = metadataArray.filter(file =>
        file.fileName && file.fileName.includes('hudba/')
      );
      const dychanieFiles = metadataArray.filter(file =>
        file.fileName && file.fileName.includes('dychanie/')
      );

      const _mp3Count = metadataArray.filter(f => f.fileName?.toLowerCase().endsWith('.mp3')).length;
      const _oggCount = metadataArray.filter(f => {
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
        mp3Files: _mp3Count,
        oggFiles: _oggCount
      });

      setStatus(`✅ Synchronizace dokončena! 📊 ${metadataArray.length} souborů (${_mp3Count} MP3, ${_oggCount} OGG), 🎤 ${slovaFiles.length} SLOVA, 🎵 ${hudbaFiles.length} HUDEBA, 🫁 ${dychanieFiles.length} DÝCHANIE`);
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
      await ensureFirebase();
      if (!auth.currentUser) {
        setStatus('❌ Přihlaste se admin účtem.');
        setLoading(false);
        return;
      }

      // 2. Skenovat Firebase Storage
      setStatus('🔍 Skenuji Firebase Storage...');
      const allFiles = await scanFirebaseStorage();
      console.log(`📊 Nalezeno ${allFiles.length} souborů ve Storage`);

      // 3. Připravit metadata pro každý audio soubor s reálnou délkou (paralelně)
      setStatus('📊 Připravuji metadata s reálnou délkou...');

      // Helper funkce pro zpracování jednoho souboru
      const processFile = async (file, _index) => {
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
            // Dodatečné informace pro meditacie soubory
            ...(file.folder === 'meditacie' ? {
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
          batch.map((file, _batchIndex) => processFile(file, i + _batchIndex))
        );

        // Přidej úspěšné výsledky
        batchResults.forEach((result, _batchIndex) => {
          if (result.status === 'fulfilled' && result.value) {
            metadataArray.push(result.value);
          } else if (result.status === 'rejected') {
            console.error(`❌ Chyba při zpracování souboru v batchu:`, result.reason);
          }
        });
      }

      // 4. Filtruj soubory podle složek
      const slovaFiles = metadataArray.filter(file => file.folder === 'meditacie');
      const hudbaFiles = metadataArray.filter(file => file.folder === 'hudba');
      const dychanieFiles = metadataArray.filter(file => file.folder === 'dychanie');

      const _mp3Count = metadataArray.filter(f => f.fileName?.toLowerCase().endsWith('.mp3')).length;
      const _oggCount = metadataArray.filter(f => {
        const name = f.fileName?.toLowerCase() || '';
        return name.endsWith('.ogg') || name.endsWith('.oga');
      }).length;

      console.log(`📊 Zpracováno: ${metadataArray.length} souborů (${_mp3Count} MP3, ${_oggCount} OGG)`);
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
        mp3Files: _mp3Count,
        oggFiles: _oggCount,
        validFiles: metadataArray.filter(f => f.isValid).length,
        invalidFiles: metadataArray.filter(f => !f.isValid).length
      });

      setStatus(`✅ Kompletní synchronizace dokončena! 📊 ${metadataArray.length} souborů (${_mp3Count} MP3, ${_oggCount} OGG), 🎤 ${slovaFiles.length} SLOVA, 🎵 ${hudbaFiles.length} HUDEBA, 🫁 ${dychanieFiles.length} DÝCHANIE`);
      console.log('✅ Full metadata sync completed successfully');

    } catch (error) {
      setStatus(`❌ Chyba při kompletní synchronizaci: ${error.message}`);
      console.error('❌ Full sync failed:', error);
    } finally {
      setLoading(false);
    }
  };


  // Skenování Firebase Storage - pouze listAll bez getMetadata/getDownloadURL
  const scanFirebaseStorage = async () => {
    const allFiles = [];
    console.log('🔍 Skenuji Firebase Storage (pouze listAll)...');

    await ensureFirebase();

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

    // Skenuj hudba, meditacie a dychanie složky
    const hudbaRef = ref(storage, 'hudba');
    const slovaRef = ref(storage, 'meditacie');
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
      getAllFilesRecursively(slovaRef, 'meditacie')
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

    const _mp3Count = allFiles.filter(f => {
      const name = (f.name || f.fullPath || '').toLowerCase();
      return name.endsWith('.mp3');
    }).length;
    const _oggCount = allFiles.filter(f => {
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

    console.log(`✅ Skenování dokončeno! Nalezeno ${allFiles.length} audio souborů (${_mp3Count} MP3, ${_oggCount} OGG)`);
    console.log(`🎵 HUDEBA: ${hudbaFiles.length} souborů`);
    console.log(`🎤 SLOVA: ${slovaFiles.length} souborů`);
    console.log(`🫁 DÝCHANIE: ${dychanieFiles.length} souborů`);
    console.log(`🫁 OGG soubory: ${_oggCount} (z toho ${dychanieFiles.filter(f => {
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
          file.folder === 'meditacie' || (file.fileName && file.fileName.includes('meditacie/'))
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
      await ensureFirebase();
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


  return {
    checkStatus,
    syncFirestoreToRealtime,
    fullMetadataSync,
    clearCacheAndReload,
    downloadMP3ForOffline
  };
};
