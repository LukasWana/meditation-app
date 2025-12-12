/**
 * Firebase Function pro generování waveformy z audio souboru
 * Běží na serveru, takže nemá CORS problémy
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Inicializace Firebase Admin pouze pokud ještě není inicializován
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Generuje waveform data z audio souboru pomocí ffmpeg (správná metoda)
 * Používá PCM data pro přesné generování waveformy
 * @param {string} tempFilePath - Cesta k dočasnému audio souboru
 * @param {number} samples - Počet vzorků pro waveformu (default: 800)
 * @returns {Promise<Array<number>>} - Pole amplitud (0-32768) - absolutní hodnoty bez normalizace
 */
async function generateWaveformFromFile(tempFilePath, samples = 800) {
  const { spawn } = require('child_process');
  const pcmFilePath = path.join(os.tmpdir(), `pcm-${Date.now()}-${path.basename(tempFilePath)}.raw`);

  try {
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

    ffmpeg.stderr.on('data', (data) => {
      ffmpegError += data.toString();
    });

    await new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg failed with code ${code}: ${ffmpegError}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`ffmpeg error: ${error.message}`));
      });
    });

    // Načti PCM data
    const pcmBuffer = fs.readFileSync(pcmFilePath);

    // PCM data jsou 16-bit signed integers (2 bytes per sample)
    const waveform = [];
    const pcmDataLength = pcmBuffer.length / 2; // 2 bytes per sample
    const samplesPerPoint = Math.floor(pcmDataLength / samples);

    // ZACHOVEJME absolutní hodnoty pro zachování decay pattern
    // Použijme RMS (Root Mean Square) kombinovaný s peak pro lepší reprezentaci hlasitosti
    let globalMaxAmplitude = 0; // Pro kontrolu, ale NEPOUŽÍVEJME pro normalizaci!

    // Analyzuj PCM data a vytvoř waveformu
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

    // ✅ DEBUG: Zkontroluj hodnoty PŘED RETURN - musí být absolutní (0-32768)
    if (waveform.length > 0) {
      const checkMax = Math.max(...waveform);
      const checkMin = Math.min(...waveform);
      const checkAvg = waveform.reduce((a, b) => a + b, 0) / waveform.length;
      const first5 = waveform.slice(0, 5);
      const last5 = waveform.slice(-5);

      console.log(`🔍 generateWaveformFromFile - DEBUG PŘED RETURN:`, {
        samples: waveform.length,
        max: checkMax.toFixed(2),
        min: checkMin.toFixed(2),
        avg: checkAvg.toFixed(2),
        first5: first5.map(v => v.toFixed(2)),
        last5: last5.map(v => v.toFixed(2)),
        isAbsolute: checkMax > 1000 ? 'ANO (0-32768) ✅' : `NE (0-1) ⚠️ - max je ${checkMax.toFixed(2)}, mělo by být > 1000`,
        globalMaxAmplitude: globalMaxAmplitude.toFixed(2)
      });

      // ✅ KRITICKÁ KONTROLA: Pokud jsou hodnoty normalizované, něco je špatně!
      if (checkMax < 1.5) {
        console.error(`❌ CHYBA: Waveform data jsou NORMALIZOVANÁ (max=${checkMax.toFixed(2)}), ale měly by být ABSOLUTNÍ (0-32768)!`);
        console.error(`❌ globalMaxAmplitude=${globalMaxAmplitude.toFixed(2)} - toto by mělo být maximum z PCM dat`);
      }
    }

    // KRITICKÉ: NEUKLÁDEJME normalizované hodnoty - uložíme absolutní hodnoty!
    // Normalizace bude provedena při vizualizaci podle globálního maxima napříč všemi soubory
    // To zajistí, že každý soubor bude mít odlišný vizuální průběh
    // Uložíme také metadata (min, max, avg) pro lepší porovnání

    // Debug: zobraz hodnoty po normalizaci
    if (waveform.length > 0) {
      const postNormMin = Math.min(...waveform);
      const postNormMax = Math.max(...waveform);
      const postNormAvg = waveform.reduce((a, b) => a + b, 0) / waveform.length;

      // Zkontroluj, zda je decay pattern viditelný (první hodnoty by měly být vyšší než poslední)
      const firstQuarter = waveform.slice(0, Math.floor(waveform.length / 4));
      const lastQuarter = waveform.slice(-Math.floor(waveform.length / 4));
      const firstQuarterAvg = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
      const lastQuarterAvg = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
      const decayRatio = firstQuarterAvg > 0 ? lastQuarterAvg / firstQuarterAvg : 0;

      console.log(`📊 Waveform stats: min=${postNormMin.toFixed(4)}, max=${postNormMax.toFixed(4)}, avg=${postNormAvg.toFixed(4)}`);
      console.log(`📊 Decay pattern check: first quarter avg=${firstQuarterAvg.toFixed(4)}, last quarter avg=${lastQuarterAvg.toFixed(4)}, ratio=${decayRatio.toFixed(4)} (should be < 1 for decay)`);

      // Zobraz prvních 10 a posledních 10 hodnot pro kontrolu decay pattern
      const first10 = waveform.slice(0, 10);
      const last10 = waveform.slice(-10);
      console.log(`📊 First 10 values: ${first10.map(v => v.toFixed(4)).join(', ')}`);
      console.log(`📊 Last 10 values: ${last10.map(v => v.toFixed(4)).join(', ')}`);
    }

    // Odstraň dočasný PCM soubor
    if (fs.existsSync(pcmFilePath)) {
      fs.unlinkSync(pcmFilePath);
    }

    return waveform;

  } catch (error) {
    // Odstraň dočasný PCM soubor i při chybě
    if (fs.existsSync(pcmFilePath)) {
      fs.unlinkSync(pcmFilePath);
    }
    throw error;
  }
}


/**
 * HTTP Callable Function pro generování waveformy
 * @param {string} fileName - Název souboru v Firebase Storage
 * @param {number} samples - Počet vzorků pro waveformu (default: 800)
 * @returns {Promise<Object>} - Waveform data nebo chyba
 */
exports.generateWaveform = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB'
  })
  .https
  .onCall(async (data, _context) => {
    try {
      // ✅ OPRAVA: Zvýšeno z 150 na 800 pro lepší detail
      const { fileName, samples = 800 } = data || {};

      if (!fileName) {
        return { success: false, error: 'fileName is required' };
      }

      console.log(`🌊 Generating waveform for ${fileName}...`);

      // Stáhni audio soubor z Firebase Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(fileName);

      // Zkontroluj, zda soubor existuje
      const [exists] = await file.exists();
      if (!exists) {
        return { success: false, error: 'File not found in Storage' };
      }

      // Stáhni soubor do dočasné složky
      const tempFilePath = path.join(os.tmpdir(), `waveform-${Date.now()}-${path.basename(fileName)}`);
      await file.download({ destination: tempFilePath });

      try {
        // Vygeneruj waveformu pomocí ffmpeg (správná metoda)
        let waveformData = null;

        try {
          waveformData = await generateWaveformFromFile(tempFilePath, samples);
          console.log(`✅ Waveform generated using ffmpeg PCM for ${fileName}`);

          // Debug: zobraz statistiku pro kontrolu
          const minVal = Math.min(...waveformData);
          const maxVal = Math.max(...waveformData);
          const avgVal = waveformData.reduce((a, b) => a + b, 0) / waveformData.length;
          console.log(`📊 Waveform stats for ${fileName}: min=${minVal.toFixed(3)}, max=${maxVal.toFixed(3)}, avg=${avgVal.toFixed(3)}`);

        } catch (ffmpegError) {
          console.error(`❌ ffmpeg failed for ${fileName}:`, ffmpegError.message);
          console.error(`❌ Cannot generate accurate waveform without ffmpeg - returning null`);
          // NEPOUŽÍVEJME fallback metodu - vytváří syntetický vzor, který není skutečný!
          // Raději vrať null a nech uživatele znovu vygenerovat waveform pomocí ffmpeg
          waveformData = null;
          console.error(`❌ Waveform generation failed for ${fileName} - ffmpeg required`);
        }

        // Sanitizuj cestu pro Realtime Database
        const sanitizePath = (path) => {
          return path
            .replace(/\./g, '_DOT_')
            .replace(/#/g, '_HASH_')
            .replace(/\$/g, '_DOLLAR_')
            .replace(/\[/g, '_LBRACKET_')
            .replace(/\]/g, '_RBRACKET_')
            .replace(/\//g, '_SLASH_')
            .replace(/\\/g, '_BACKSLASH_');
        };

        // Ulož waveform data do Realtime Database
        const safePath = sanitizePath(fileName);
        const rtdbRef = admin.database().ref(`audio-metadata/${safePath}`);

        // Vypočítej metadata pro lepší porovnání
        const waveformMin = waveformData.length > 0 ? Math.min(...waveformData) : 0;
        const waveformMax = waveformData.length > 0 ? Math.max(...waveformData) : 0;
        const waveformAvg = waveformData.length > 0
          ? waveformData.reduce((a, b) => a + b, 0) / waveformData.length
          : 0;

        // ✅ DEBUG: Zkontroluj hodnoty před uložením
        const first5BeforeSave = waveformData.slice(0, 5);
        const last5BeforeSave = waveformData.slice(-5);
        console.log(`💾 Ukládám waveform pro ${fileName}:`, {
          samples: waveformData.length,
          min: waveformMin.toFixed(2),
          max: waveformMax.toFixed(2),
          avg: waveformAvg.toFixed(2),
          first5: first5BeforeSave.map(v => v.toFixed(2)),
          last5: last5BeforeSave.map(v => v.toFixed(2)),
          isAbsolute: waveformMax > 1 ? 'ANO (0-32768)' : 'NE (0-1)'
        });

        // Aktualizuj pouze waveform data (zachovej existující metadata)
        // ULOŽÍME ABSOLUTNÍ HODNOTY (0-32768) - normalizace bude při vizualizaci!
        await rtdbRef.update({
          waveformData: waveformData, // Absolutní hodnoty (0-32768)
          waveformMin: waveformMin,   // Metadata pro globální normalizaci
          waveformMax: waveformMax,
          waveformAvg: waveformAvg,
          waveformGenerated: new Date().toISOString(),
          waveformSamples: samples,
          lastUpdated: new Date().toISOString()
        });

        console.log(`✅ Waveform generated and saved for ${fileName} (${waveformData.length} samples)`);

        return {
          success: true,
          waveformData: waveformData,
          samples: waveformData.length
        };
      } finally {
        // Odstraň dočasný soubor
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to generate waveform:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  });

