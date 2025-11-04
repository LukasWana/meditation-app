/**
 * Firebase Functions pro synchronizaci metadat
 * Sleduje změny ve Firebase Storage a aktualizuje metadata v databázi
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const path = require('path');
const os = require('os');
const fs = require('fs');

// Inicializace Firebase Admin pouze pokud ještě není inicializován
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const rtdb = admin.database();

// Exportuj základní funkce pro testování
exports.helloWorld = functions.https.onRequest((req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  res.send('Hello from Firebase Functions!');
});

exports.testMetadata = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 30,
    memory: '128MB'
  })
  .https
  .onCall(async (data, context) => {
    return {
      success: true,
      message: 'Metadata service is working',
      timestamp: new Date().toISOString()
    };
  });

/**
 * Extrahuje metadata z audio souboru pomocí ffprobe (MP3, OGG, OGA)
 * @param {string} fileName - Název souboru
 * @param {string} bucketName - Název bucketu
 * @returns {Promise<Object>} Metadata objekt
 */
async function extractAudioMetadata(fileName, bucketName) {
  try {
    // Použij admin.storage() místo new Storage() pro správný bucket
    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(fileName);

    // Stáhni soubor do dočasné složky
    const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}-${path.basename(fileName)}`);
    await file.download({ destination: tempFilePath });

    try {
      // Extrahuj metadata pomocí ffprobe
      let duration = null;
      try {
        const { spawn } = require('child_process');
        duration = await new Promise((resolve, reject) => {
          const ffprobe = spawn('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            tempFilePath
          ]);

          let output = '';
          let errorOutput = '';

          ffprobe.stdout.on('data', (data) => {
            output += data.toString();
          });

          ffprobe.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          ffprobe.on('close', (code) => {
            if (code === 0) {
              try {
                const result = JSON.parse(output);
                const durationSeconds = parseFloat(result.format.duration) || 0;
                resolve(Math.round(durationSeconds));
              } catch (parseError) {
                resolve(null);
              }
            } else {
              resolve(null);
            }
          });
        });
      } catch (ffprobeError) {
        console.warn(`⚠️ Failed to extract audio duration with ffprobe: ${ffprobeError.message}`);
        duration = null;
      }

      // Podporuje MP3, OGG, OGA formáty
      const nameWithoutExt = fileName.replace(/\.(mp3|ogg|oga)$/i, '');
      const pathParts = fileName.split('/');
      const folder = pathParts[0];
      const subFolder = pathParts.length > 2 ? pathParts[1] : null;

      // Urči contentType podle přípony
      const fileNameLower = fileName.toLowerCase();
      let contentType = 'audio/mpeg'; // default pro MP3
      if (fileNameLower.endsWith('.ogg') || fileNameLower.endsWith('.oga')) {
        contentType = 'audio/ogg';
      }

      // Formátování délky
      const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      };

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

      // Extrahuj pohlaví, téma, typ pro slova soubory
      const extractGender = (name) => {
        if (name.includes('muzsky') || name.includes('male') || name.includes('MSK')) return 'male';
        if (name.includes('zensky') || name.includes('female') || name.includes('FSK')) return 'female';
        return null;
      };

      const extractTopic = (name) => {
        const match = name.match(/-([^-]+)\.(mp3|ogg|oga)$/i);
        return match ? match[1] : null;
      };

      const extractType = (name) => {
        if (name.includes('MSK')) return 'MSK';
        if (name.includes('FSK')) return 'FSK';
        return null;
      };

      const metadata = {
        fileName: fileName,
        title: nameWithoutExt.split('/').pop(),
        duration: duration,
        durationFormatted: formatDuration(duration),
        durationDetailed: formatDurationDetailed(duration),
        folder: folder,
        subFolder: subFolder,
        album: subFolder || null,
        contentType: contentType,
        lastModified: new Date().toISOString(),
        extracted: duration !== null,
        isValid: duration !== null && duration > 0,
        // Dodatečné informace pro slova soubory
        ...(fileName.startsWith('slova/') ? {
          gender: extractGender(path.basename(fileName)),
          topic: extractTopic(path.basename(fileName)),
          type: extractType(path.basename(fileName))
        } : {})
      };

      // Odstraň dočasný soubor
      fs.unlinkSync(tempFilePath);

      return metadata;

    } catch (error) {
      // Odstraň dočasný soubor i při chybě
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw error;
    }

  } catch (error) {
    console.error(`Error extracting audio metadata for ${fileName}:`, error);
    return null;
  }
}

/**
 * Aktualizuje metadata v databázi
 * @param {string} fileName - Název souboru
 * @param {Object} metadata - Metadata objekt
 */
async function updateMetadataDatabase(fileName, metadata) {
  try {
    // Uložit do Firestore
    await db.collection('audio-metadata').doc(fileName).set(metadata, { merge: true });
    console.log(`✅ Metadata updated in Firestore for ${fileName}`);

    // Uložit také do Realtime Database pro rychlý přístup
    await updateRealtimeDatabase(fileName, metadata);

  } catch (error) {
    console.error(`❌ Failed to update metadata for ${fileName}:`, error);
  }
}

/**
 * Aktualizuje metadata v Realtime Database
 * @param {string} fileName - Název souboru
 * @param {Object} metadata - Metadata objekt
 */
async function updateRealtimeDatabase(fileName, metadata) {
  try {
    // Sanitizuj cestu pro Realtime Database
    const safePath = sanitizePath(fileName);

    const rtdbRef = rtdb.ref(`audio-metadata/${safePath}`);

    // Získej aktuální metadata, pokud existují
    const snapshot = await rtdbRef.once('value');
    const currentMetadata = snapshot.val() || {};

    // Slouč s existujícími metadaty (zachovej waveform data, pokud existují)
    await rtdbRef.set({
      ...currentMetadata,
      ...metadata,
      lastUpdated: new Date().toISOString(),
      source: 'firebase-storage'
    });

    console.log(`✅ Metadata updated in Realtime Database for ${safePath}`);
  } catch (error) {
    console.error(`❌ Failed to update metadata in Realtime Database for ${fileName}:`, error);
  }
}

/**
 * Sanitizuje cestu pro Realtime Database
 * @param {string} path - Původní cesta
 * @returns {string} - Bezpečná cesta
 */
function sanitizePath(path) {
  return path
    .replace(/\./g, '_DOT_')      // . -> _DOT_
    .replace(/#/g, '_HASH_')      // # -> _HASH_
    .replace(/\$/g, '_DOLLAR_')   // $ -> _DOLLAR_
    .replace(/\[/g, '_LBRACKET_') // [ -> _LBRACKET_
    .replace(/\]/g, '_RBRACKET_') // ] -> _RBRACKET_
    .replace(/\//g, '_SLASH_')    // / -> _SLASH_
    .replace(/\\/g, '_BACKSLASH_'); // \ -> _BACKSLASH_
}

/**
 * Generuje waveform data z audio souboru (server-side, bez CORS problémů)
 * Používá ffmpeg pro správné dekódování audio dat
 * @param {string} fileName - Název souboru v Firebase Storage
 * @param {string} bucketName - Název bucketu
 * @returns {Promise<Array<number>|null>} - Pole amplitud (0-1) nebo null při chybě
 */
async function generateWaveformForFile(fileName, bucketName) {
  try {
    console.log(`🌊 Generating waveform for ${fileName}...`);

    // Použij admin.storage() místo new Storage() pro správný bucket
    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(fileName);

    // Zkontroluj, zda soubor existuje
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`⚠️ File not found: ${fileName}`);
      return null;
    }

    // Stáhni soubor do dočasné složky
    const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}-${path.basename(fileName)}`);
    await file.download({ destination: tempFilePath });

    // Cesta pro PCM data
    const pcmFilePath = path.join(os.tmpdir(), `pcm-${Date.now()}-${path.basename(fileName)}.raw`);

    try {
      const { spawn } = require('child_process');

      // Konvertuj audio soubor na raw PCM data pomocí ffmpeg
      const ffmpeg = spawn('ffmpeg', [
        '-i', tempFilePath,           // Vstupní soubor
        '-f', 's16le',                // Formát: signed 16-bit little-endian PCM
        '-ac', '1',                   // Mono (jeden kanál)
        '-ar', '44100',               // Sample rate: 44.1 kHz
        '-y',                         // Přepiš výstupní soubor
        pcmFilePath                   // Výstupní soubor
      ]);

      let ffmpegError = '';
      let ffmpegOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        ffmpegError += output;
        ffmpegOutput += output;
      });

      ffmpeg.stdout.on('data', (data) => {
        ffmpegOutput += data.toString();
      });

      await new Promise((resolve, reject) => {
        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`ffmpeg failed with code ${code}: ${ffmpegError || ffmpegOutput}`));
          }
        });

        ffmpeg.on('error', (error) => {
          reject(new Error(`ffmpeg error: ${error.message}${ffmpegError ? ` - ${ffmpegError}` : ''}`));
        });
      });

      // Načti PCM data
      const pcmBuffer = fs.readFileSync(pcmFilePath);

      // PCM data jsou 16-bit signed integers (2 bytes per sample)
      // Konvertuj na pole Int16 hodnot
      // ✅ OPRAVA: Zvýšeno z 150 na 800 pro lepší detail - 150 vzorků způsobovalo masivní vyhlazení
      const samples = 800;
      const waveform = [];
      const pcmDataLength = pcmBuffer.length / 2; // 2 bytes per sample
      const samplesPerPoint = Math.floor(pcmDataLength / samples);

      // ZACHOVEJME absolutní hodnoty pro zachování decay pattern
      // Použijme peak hodnoty bez normalizace - zachová skutečný průběh zvuku
      let globalMaxAmplitude = 0; // Pro kontrolu, ale NEPOUŽÍVEJME pro normalizaci!

      // Analyzuj PCM data a vytvoř waveformu
      // Použijme RMS (Root Mean Square) kombinovaný s peak pro lepší reprezentaci hlasitosti
      for (let i = 0; i < samples; i++) {
        const startIndex = i * samplesPerPoint;
        const endIndex = Math.min(startIndex + samplesPerPoint, pcmDataLength);

        let maxAmplitude = 0;
        let minAmplitude = 32768;

        // Projdi všechny vzorky v tomto bloku
        for (let j = startIndex; j < endIndex; j++) {
          // Načti 16-bit signed integer (little-endian)
          const byteIndex = j * 2;
          if (byteIndex + 1 < pcmBuffer.length) {
            const sample = pcmBuffer.readInt16LE(byteIndex);
            // ZACHOVEJME absolutní hodnotu bez normalizace!
            const amplitude = Math.abs(sample); // Absolutní hodnota (0-32768)

            maxAmplitude = Math.max(maxAmplitude, amplitude);
            minAmplitude = Math.min(minAmplitude, amplitude);
            globalMaxAmplitude = Math.max(globalMaxAmplitude, amplitude);
          }
        }

        // ✅ OPRAVA: Použijme POUZE peak hodnoty - RMS vyhlazuje data!
        // Peak hodnoty zachová detail a dynamiku - důležité pro vizuální waveform
        // Pro lepší detail nepoužíváme RMS vůbec - pouze peak hodnoty

        // Ulož peak hodnotu (0-32768) - zachová skutečný průběh s decay
        // NENORMALIZUJME - uložíme absolutní hodnoty pro normalizaci při vizualizaci!
        waveform.push(maxAmplitude);
      }

      // KRITICKÉ: NEUKLÁDEJME normalizované hodnoty - uložíme absolutní hodnoty!
      // Normalizace bude provedena při vizualizaci podle globálního maxima napříč všemi soubory
      // To zajistí, že každý soubor bude mít odlišný vizuální průběh

      // Debug: zobraz statistiku pro kontrolu
      if (waveform.length > 0) {
        const minVal = Math.min(...waveform);
        const maxVal = Math.max(...waveform);
        const avgVal = waveform.reduce((a, b) => a + b, 0) / waveform.length;
        const first10 = waveform.slice(0, 10);
        const last10 = waveform.slice(-10);
        console.log(`📊 Waveform stats for ${fileName}: min=${minVal.toFixed(2)}, max=${maxVal.toFixed(2)}, avg=${avgVal.toFixed(2)} (absolutní hodnoty)`);
        console.log(`📊 First 10 values: ${first10.map(v => v.toFixed(2)).join(', ')}`);
        console.log(`📊 Last 10 values: ${last10.map(v => v.toFixed(2)).join(', ')}`);
      }

      // Odstraň dočasné soubory
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (fs.existsSync(pcmFilePath)) {
        fs.unlinkSync(pcmFilePath);
      }

      console.log(`✅ Waveform generated for ${fileName} (${waveform.length} samples)`);
      return waveform;

    } catch (error) {
      // Odstraň dočasné soubory i při chybě
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (fs.existsSync(pcmFilePath)) {
        fs.unlinkSync(pcmFilePath);
      }

      console.error(`❌ Failed to generate waveform with ffmpeg for ${fileName}:`, error.message);
      console.error(`❌ Cannot generate accurate waveform without ffmpeg - returning null`);

      // NEPOUŽÍVEJME fallback metodu - vytváří syntetický vzor, který není skutečný!
      // Raději vrať null a nech uživatele znovu vygenerovat waveform pomocí ffmpeg
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (fs.existsSync(pcmFilePath)) {
        fs.unlinkSync(pcmFilePath);
      }

      return null; // Vrať null místo syntetického vzoru
    }

  } catch (error) {
    console.error(`❌ Failed to generate waveform for ${fileName}:`, error);
    return null;
  }
}

/**
 * Aktualizuje timestamp poslední synchronizace
 */
async function updateLastSync() {
  try {
    await db.collection('system').doc('lastSync').set({
      timestamp: new Date().toISOString()
    });
    console.log('✅ Last sync timestamp updated');
  } catch (error) {
    console.error('❌ Failed to update last sync timestamp:', error);
  }
}

/**
 * Extrahuje metadata z obrázku
 * @param {string} fileName - Název souboru
 * @param {string} bucketName - Název bucketu
 * @returns {Promise<Object>} - Metadata objekt pro obrázek
 */
async function extractImageMetadata(fileName, bucketName) {
  try {
    // Použij admin.storage() místo new Storage() pro správný bucket
    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file(fileName);

    // Stáhni soubor do dočasné složky
    const tempFilePath = path.join(os.tmpdir(), `image-${Date.now()}-${path.basename(fileName)}`);
    await file.download({ destination: tempFilePath });

    try {
      // Pro extrakci rozlišení obrázku použijeme ffprobe (pokud je dostupný)
      // nebo základní metadata z Firebase Storage

      // Zkus extrahovat rozlišení pomocí ffprobe
      let width = null;
      let height = null;

      try {
        const { spawn } = require('child_process');
        const ffprobeResult = await new Promise((resolve) => {
          const ffprobe = spawn('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_streams',
            '-select_streams', 'v:0',
            tempFilePath
          ]);

          let output = '';
          let errorOutput = '';

          ffprobe.stdout.on('data', (data) => {
            output += data.toString();
          });

          ffprobe.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          ffprobe.on('close', (code) => {
            if (code === 0) {
              try {
                const result = JSON.parse(output);
                if (result.streams && result.streams.length > 0) {
                  const stream = result.streams[0];
                  width = stream.width || null;
                  height = stream.height || null;
                }
                resolve({ width, height });
              } catch (parseError) {
                resolve({ width: null, height: null });
              }
            } else {
              resolve({ width: null, height: null });
            }
          });
        });

        width = ffprobeResult.width;
        height = ffprobeResult.height;
      } catch (ffprobeError) {
        // ffprobe není dostupný nebo selhal - použijeme základní metadata
        console.warn(`⚠️ Failed to extract image dimensions with ffprobe: ${ffprobeError.message}`);
      }

      // Načti velikost souboru
      const fileStats = fs.statSync(tempFilePath);
      const fileSize = fileStats.size;

      // Urči contentType podle přípony
      const fileNameLower = fileName.toLowerCase();
      let contentType = 'image/jpeg'; // default
      if (fileNameLower.endsWith('.png')) {
        contentType = 'image/png';
      } else if (fileNameLower.endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (fileNameLower.endsWith('.webp')) {
        contentType = 'image/webp';
      }

      // Urči, zda je to cover obrázek
      const isCover = path.basename(fileName).toLowerCase().includes('cover');

      // Extrahuj složku a subfolder
      const pathParts = fileName.split('/');
      const folder = pathParts[0];
      const subFolder = pathParts.length > 2 ? pathParts[1] : null;

      const metadata = {
        fileName: fileName,
        displayName: path.basename(fileName, path.extname(fileName)),
        folder: folder,
        subFolder: subFolder,
        album: subFolder || null,
        type: 'image',
        contentType: contentType,
        fileSize: fileSize,
        width: width,
        height: height,
        dimensions: width && height ? `${width}x${height}` : null,
        isCover: isCover,
        downloadURL: `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media`,
        fullPath: fileName,
        lastModified: new Date().toISOString(),
        extracted: true
      };

      // Odstraň dočasný soubor
      fs.unlinkSync(tempFilePath);

      return metadata;

    } catch (error) {
      // Odstraň dočasný soubor i při chybě
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw error;
    }

  } catch (error) {
    console.error(`❌ Failed to extract image metadata for ${fileName}:`, error);
    return null;
  }
}

/**
 * Sleduje změny ve Firebase Storage
 * Spouští se při každé změně souboru
 * Automaticky generuje metadata pro MP3, OGG, OGA i obrázky
 */
exports.onFileUpload = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB'
  })
  .storage
  .object()
  .onFinalize(async (object) => {
    const fileName = object.name;
    const bucketName = object.bucket;

    console.log(`📁 Storage change detected: ${fileName}`);

    const fileNameLower = fileName.toLowerCase();

    // Zkontroluj typ souboru
    const isAudioFile = fileNameLower.endsWith('.mp3') ||
                       fileNameLower.endsWith('.ogg') ||
                       fileNameLower.endsWith('.oga');

    const isImageFile = fileNameLower.endsWith('.jpg') ||
                       fileNameLower.endsWith('.jpeg') ||
                       fileNameLower.endsWith('.png') ||
                       fileNameLower.endsWith('.gif') ||
                       fileNameLower.endsWith('.webp');

    // Zpracuj pouze soubory v podporovaných složkách
    const isInTargetFolder = fileName.startsWith('hudba/') ||
                             fileName.startsWith('slova/') ||
                             fileName.startsWith('dychanie/') ||
                             fileName.startsWith('metadata/'); // Pro obrázky

    if (!isInTargetFolder) {
      console.log(`⏭️ Skipping file outside target folders: ${fileName}`);
      return null;
    }

    // Zpracuj audio soubory
    if (isAudioFile) {
      try {
        // Extrahuj metadata pomocí ffprobe (funguje pro MP3 i OGG)
        const metadata = await extractAudioMetadata(fileName, bucketName);

        if (metadata) {
          // Získej download URL
          const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(fileName)}?alt=media`;
          metadata.downloadURL = downloadURL;
          metadata.fileSize = parseInt(object.size) || 0;

          // Ulož do databáze
          await updateMetadataDatabase(fileName, metadata);

          // Vygeneruj a ulož waveformu (server-side, bez CORS problémů)
          try {
            const waveformData = await generateWaveformForFile(fileName, bucketName);
            if (waveformData && Array.isArray(waveformData) && waveformData.length > 0) {
              // Aktualizuj metadata s waveformou v Realtime Database
              const safePath = sanitizePath(fileName);
              const rtdbRef = rtdb.ref(`audio-metadata/${safePath}`);

              // Vypočítej metadata pro lepší porovnání
              const waveformMin = waveformData.length > 0 ? Math.min(...waveformData) : 0;
              const waveformMax = waveformData.length > 0 ? Math.max(...waveformData) : 0;
              const waveformAvg = waveformData.length > 0
                ? waveformData.reduce((a, b) => a + b, 0) / waveformData.length
                : 0;

              // Aktualizuj pouze waveform data (zachovej existující metadata)
              // ULOŽÍME ABSOLUTNÍ HODNOTY (0-32768) - normalizace bude při vizualizaci!
              await rtdbRef.update({
                waveformData: waveformData, // Absolutní hodnoty (0-32768)
                waveformMin: waveformMin,   // Metadata pro globální normalizaci
                waveformMax: waveformMax,
                waveformAvg: waveformAvg,
                waveformGenerated: new Date().toISOString(),
                waveformSamples: waveformData.length,
                lastUpdated: new Date().toISOString()
              });

              console.log(`✅ Waveform saved for ${fileName}`);
            }
          } catch (waveformError) {
            console.warn(`⚠️ Failed to generate waveform for ${fileName}:`, waveformError.message);
            // Pokračuj i bez waveformy - není to kritická chyba
          }

          // Aktualizuj timestamp synchronizace
          await updateLastSync();

          console.log(`✅ Audio metadata sync completed for ${fileName}`);
        }
      } catch (error) {
        console.error(`❌ Failed to sync audio metadata for ${fileName}:`, error);
      }
    }
    // Zpracuj obrázky
    else if (isImageFile) {
      try {
        // Extrahuj metadata z obrázku
        const metadata = await extractImageMetadata(fileName, bucketName);

        if (metadata) {
          // Ulož do Realtime Database
          const safePath = sanitizePath(fileName);
          const rtdbRef = rtdb.ref(`image-metadata/${safePath}`);

          await rtdbRef.set({
            ...metadata,
            lastUpdated: new Date().toISOString(),
            source: 'firebase-storage'
          });

          // Ulož také do Firestore
          await db.collection('image-metadata').doc(fileName).set(metadata, { merge: true });

          console.log(`✅ Image metadata saved for ${fileName}`);
        }
      } catch (error) {
        console.error(`❌ Failed to sync image metadata for ${fileName}:`, error);
      }
    }
    else {
      console.log(`⏭️ Skipping unsupported file type: ${fileName}`);
    }

    return null;
  });

/**
 * Manuální synchronizace všech souborů (audio i obrázky)
 * Vygeneruje metadata pro všechny MP3, OGG, OGA soubory a obrázky
 */
exports.syncAllFiles = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540, // 9 minut
    memory: '1GB'
  })
  .https
  .onCall(async (data, context) => {
    try {
      console.log('🚀 Starting manual sync for all files...');

      // Použij admin.storage() místo new Storage() pro správný bucket
      const bucket = admin.storage().bucket();

      // Seznam všech souborů v podporovaných složkách
      // getFiles s prefixem BEZ delimiteru automaticky vrací všechny soubory včetně podsložek
      const folders = ['hudba', 'slova', 'dychanie', 'metadata'];
      const allFiles = [];

      for (const folder of folders) {
        try {
          console.log(`📁 Listing ALL files in ${folder}/ (including all subfolders)...`);

          // Získej všechny soubory včetně podsložek pomocí prefixu
          // BEZ delimiteru - to zajišťuje, že se načtou všechny soubory včetně všech podsložek
          const [files] = await bucket.getFiles({
            prefix: `${folder}/`,
            // autoPaginate: true zajišťuje, že se načtou všechny stránky
            autoPaginate: true
            // NEPOUŽÍVÁME delimiter: '/' - to by limitovalo na jednu úroveň!
          });

          console.log(`📊 Found ${files.length} files in ${folder}/ (including ALL subfolders)`);

          // Debug: zobraz prvních 30 souborů pro kontrolu
          if (files.length > 0) {
            const sampleFiles = files.slice(0, 30).map(f => f.name);
            console.log(`📄 Sample files from ${folder}/:`, sampleFiles);

            // Zobraz unikátní podsložky pro ověření
            const subfolders = new Set();
            files.forEach(file => {
              const parts = file.name.split('/');
              // Pokud má více než 2 části (např. hudba/ambient-journey/track.mp3)
              if (parts.length > 2) {
                const subfolder = parts.slice(0, 2).join('/');
                subfolders.add(subfolder);
              }
            });
            if (subfolders.size > 0) {
              console.log(`📂 Found ${subfolders.size} unique subfolders in ${folder}/:`, Array.from(subfolders));
            } else {
              console.log(`📂 No subfolders found in ${folder}/ - all files are in root`);
            }
          } else {
            console.warn(`⚠️ No files found in ${folder}/`);
          }

          allFiles.push(...files);
        } catch (error) {
          console.error(`❌ Failed to list files in ${folder}/:`, error.message);
          console.error(`❌ Error details:`, error);
        }
      }

      // Odstraň duplikáty (pokud nějaké jsou)
      const uniqueFiles = [];
      const seenFiles = new Set();
      for (const file of allFiles) {
        if (!seenFiles.has(file.name)) {
          seenFiles.add(file.name);
          uniqueFiles.push(file);
        }
      }

      // Seřaď soubory podle názvu pro konzistentní zpracování
      uniqueFiles.sort((a, b) => a.name.localeCompare(b.name));

      console.log(`📊 Total unique files found: ${uniqueFiles.length} (across all folders and subfolders)`);
      if (allFiles.length !== uniqueFiles.length) {
        console.log(`⚠️ Removed ${allFiles.length - uniqueFiles.length} duplicate files`);
      }

      // Debug: zobraz počty souborů podle složek
      const filesByFolder = {};
      uniqueFiles.forEach(file => {
        const folder = file.name.split('/')[0];
        filesByFolder[folder] = (filesByFolder[folder] || 0) + 1;
      });
      console.log(`📊 Files by folder:`, filesByFolder);

      // Debug: zobraz počty souborů podle podsložek pro každou složku
      const filesBySubFolder = {};
      uniqueFiles.forEach(file => {
        const parts = file.name.split('/');
        if (parts.length >= 2) {
          const folder = parts[0];
          const subFolder = parts.length > 2 ? parts.slice(0, 2).join('/') : folder;
          if (!filesBySubFolder[folder]) {
            filesBySubFolder[folder] = {};
          }
          filesBySubFolder[folder][subFolder] = (filesBySubFolder[folder][subFolder] || 0) + 1;
        }
      });
      console.log(`📊 Files by subfolder:`, filesBySubFolder);

      const results = {
        audioFiles: 0,
        imageFiles: 0,
        processedAudio: 0,
        processedImages: 0,
        errors: []
      };

      // Zpracuj soubory
      let processedCount = 0;
      const totalFiles = uniqueFiles.length;
      const processedFiles = new Set(); // Pro sledování již zpracovaných souborů

      for (const file of uniqueFiles) {
        processedCount++;
        const fileName = file.name;
        const fileNameLower = fileName.toLowerCase();

        // Zkontroluj, zda už není soubor zpracovaný (ochrana proti duplikátům)
        if (processedFiles.has(fileName)) {
          console.warn(`⚠️ Skipping duplicate file: ${fileName}`);
          continue;
        }
        processedFiles.add(fileName);

        // Progress logging každých 10 souborů
        if (processedCount % 10 === 0 || processedCount === totalFiles) {
          console.log(`🔄 Processing ${processedCount}/${totalFiles} files... (${Math.round(processedCount / totalFiles * 100)}%)`);
        }

        const isAudioFile = fileNameLower.endsWith('.mp3') ||
                           fileNameLower.endsWith('.ogg') ||
                           fileNameLower.endsWith('.oga');

        const isImageFile = fileNameLower.endsWith('.jpg') ||
                           fileNameLower.endsWith('.jpeg') ||
                           fileNameLower.endsWith('.png') ||
                           fileNameLower.endsWith('.gif') ||
                           fileNameLower.endsWith('.webp');

        if (isAudioFile) {
          results.audioFiles++;
          try {
            // Simuluj object pro onFileUpload
            const object = {
              name: fileName,
              bucket: bucket.name,
              size: file.metadata.size
            };

            // Zpracuj jako při uploadu
            const metadata = await extractAudioMetadata(fileName, bucket.name);
            if (metadata) {
              metadata.downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
              metadata.fileSize = parseInt(file.metadata.size) || 0;

              await updateMetadataDatabase(fileName, metadata);

              // Vygeneruj waveformu
              const waveformData = await generateWaveformForFile(fileName, bucket.name);
              if (waveformData && Array.isArray(waveformData) && waveformData.length > 0) {
                const safePath = sanitizePath(fileName);
                const rtdbRef = rtdb.ref(`audio-metadata/${safePath}`);

                // Aktualizuj pouze waveform data (zachovej existující metadata)
                await rtdbRef.update({
                  waveformData: waveformData,
                  waveformGenerated: new Date().toISOString(),
                  waveformSamples: waveformData.length,
                  lastUpdated: new Date().toISOString()
                });

                console.log(`✅ Waveform saved for ${fileName} (${waveformData.length} samples)`);
              } else {
                console.warn(`⚠️ Waveform generation returned invalid data for ${fileName}`);
              }

              results.processedAudio++;
            }
          } catch (error) {
            results.errors.push({ file: fileName, error: error.message });
            console.error(`❌ Failed to process ${fileName}:`, error);
          }
        } else if (isImageFile) {
          results.imageFiles++;
          try {
            const metadata = await extractImageMetadata(fileName, bucket.name);
            if (metadata) {
              const safePath = sanitizePath(fileName);
              const rtdbRef = rtdb.ref(`image-metadata/${safePath}`);
              await rtdbRef.set(metadata);
              await db.collection('image-metadata').doc(fileName).set(metadata, { merge: true });
              results.processedImages++;
            }
          } catch (error) {
            results.errors.push({ file: fileName, error: error.message });
            console.error(`❌ Failed to process ${fileName}:`, error);
          }
        }
      }

      await updateLastSync();

      console.log(`✅ Manual sync completed: ${results.processedAudio} audio, ${results.processedImages} images`);
      console.log(`📊 Summary:`, {
        totalFiles: allFiles.length,
        audioFiles: results.audioFiles,
        processedAudio: results.processedAudio,
        imageFiles: results.imageFiles,
        processedImages: results.processedImages,
        errors: results.errors.length
      });

      if (results.errors.length > 0) {
        console.warn(`⚠️ ${results.errors.length} errors occurred:`, results.errors.slice(0, 5));
      }

      return {
        success: true,
        message: `Processed ${results.processedAudio} audio files and ${results.processedImages} images from ${allFiles.length} total files`,
        results: {
          ...results,
          totalFiles: allFiles.length,
          filesByFolder: filesByFolder
        }
      };

    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * Manuální synchronizace všech MP3 souborů
 */
exports.syncStorage = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB'
  })
  .https
  .onCall(async (data, context) => {
    try {
      console.log('🚀 Starting manual metadata sync...');

      // Pro testování vytvoříme několik testovacích souborů
      const testFiles = [
        'hudba/generator.mp3',
        'hudba/meditacie.mp3',
        'hudba/noise-generator.mp3',
        'hudba/ambient-journey/01-track.mp3',
        'hudba/ambient-journey/02-track.mp3',
        'slova/muzsky4FSK-uzkost-osamelost.mp3',
        'slova/zensky4FSK-uzkost-osamelost.mp3'
      ];

      console.log(`📊 Processing ${testFiles.length} test files`);

      let processedCount = 0;

      // Zpracuj soubory postupně
      for (const fileName of testFiles) {
        try {
          const metadata = await extractAudioMetadata(fileName);
          if (metadata) {
            await updateMetadataDatabase(fileName, metadata);
            processedCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to sync ${fileName}:`, error);
        }
      }

      // Aktualizuj timestamp
      await updateLastSync();

      console.log('✅ Manual metadata sync completed');
      return {
        success: true,
        filesProcessed: processedCount,
        totalFiles: testFiles.length
      };

    } catch (error) {
      console.error('❌ Manual metadata sync failed:', error);
      return { success: false, error: error.message };
    }
  });

/**
 * Získá statistiky metadat
 */
exports.getFileStats = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '128MB'
  })
  .https
  .onCall(async (data, context) => {
    try {
      const snapshot = await db.collection('audio-metadata').limit(1000).get();
      const stats = {
        totalFiles: snapshot.size,
        byFolder: {},
        lastSync: null
      };

      // Spočítej podle složek
      const folderCounts = {};
      snapshot.forEach(doc => {
        const docData = doc.data();
        const folder = docData.folder || 'unknown';
        folderCounts[folder] = (folderCounts[folder] || 0) + 1;
      });

      stats.byFolder = folderCounts;

      // Získej timestamp poslední synchronizace
      try {
        const syncDoc = await db.collection('system').doc('lastSync').get();
        if (syncDoc.exists()) {
          stats.lastSync = syncDoc.data().timestamp;
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch last sync timestamp:', error);
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get metadata stats:', error);
      return { error: error.message };
    }
  });

/**
 * Uloží metadata do databáze
 */
exports.saveScrapedMetadata = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB'
  })
  .https
  .onCall(async (data, context) => {
    try {
      const { fileName, metadata } = data || {};

      if (!fileName || !metadata) {
        return { error: 'fileName and metadata are required' };
      }

      await updateMetadataDatabase(fileName, metadata);

      return {
        success: true,
        message: `Metadata saved for ${fileName}`
      };

    } catch (error) {
      console.error('❌ Failed to save metadata:', error);
      return { error: error.message };
    }
  });

/**
 * Vyčistí stará metadata
 */
exports.cleanupMetadata = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  })
  .https
  .onCall(async (data, context) => {
    try {
      console.log('🧹 Starting metadata cleanup...');

      // Najdi dokumenty starší než 30 dní
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const snapshot = await db.collection('audio-metadata')
        .where('lastModified', '<', thirtyDaysAgo.toISOString())
        .get();

      let deletedCount = 0;
      const batch = db.batch();

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      if (deletedCount > 0) {
        await batch.commit();
      }

      console.log(`✅ Cleaned up ${deletedCount} old metadata records`);

      return {
        success: true,
        deletedCount
      };

    } catch (error) {
      console.error('❌ Failed to cleanup metadata:', error);
      return { error: error.message };
    }
  });
