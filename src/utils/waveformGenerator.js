/**
 * Waveform Generator
 * Generuje waveform data z audio souboru
 */

/**
 * Generuje waveform data z audio bufferu
 * @param {AudioBuffer} audioBuffer - Audio buffer
 * @param {number} samples - Počet vzorků pro waveformu (default: 150)
 * @returns {Array<number>} - Pole amplitud (0-1)
 */
export const generateWaveformFromBuffer = (audioBuffer, samples = 150) => {
  try {
    const rawData = audioBuffer.getChannelData(0); // Získej první kanál
    const blockSize = Math.floor(rawData.length / samples);
    const waveform = [];

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      const end = start + blockSize;

      // Vypočítej průměrnou amplitudu pro tento blok
      for (let j = start; j < end && j < rawData.length; j++) {
        sum += Math.abs(rawData[j]);
      }

      // Normalizuj na 0-1
      const average = sum / blockSize;
      waveform.push(Math.min(average, 1));
    }

    return waveform;
  } catch (error) {
    console.error('Error generating waveform from buffer:', error);
    return new Array(samples).fill(0.5); // Vrátí prázdnou waveformu
  }
};

/**
 * Generuje waveform data z audio URL (pro klienta)
 * POZNÁMKA: Firebase Storage má CORS omezení, takže tato funkce může selhat.
 * Pro správné generování waveformů použijte Firebase Functions nebo server-side generování.
 *
 * @param {string} audioUrl - URL audio souboru
 * @param {number} samples - Počet vzorků pro waveformu (default: 150)
 * @returns {Promise<Array<number>|null>} - Pole amplitud (0-1) nebo null při chybě
 */
export const generateWaveformFromUrl = async (audioUrl, samples = 150) => {
  // Firebase Storage má CORS omezení, takže generování na klientovi obvykle selže
  // Vrátíme null místo prázdného pole, aby bylo jasné, že generování selhalo
  console.warn('⚠️ Waveform generation from URL is not reliable due to CORS restrictions. Use server-side generation instead.');

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Zkus XMLHttpRequest jako primární metodu (může fungovat i s CORS)
    let arrayBuffer;
    try {
      arrayBuffer = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', audioUrl, true);
        xhr.responseType = 'arraybuffer';

        const timeout = setTimeout(() => {
          xhr.abort();
          reject(new Error('XHR timeout'));
        }, 30000); // 30 sekund timeout

        xhr.onload = () => {
          clearTimeout(timeout);
          if (xhr.status === 200) {
            resolve(xhr.response);
          } else {
            reject(new Error(`XHR error! status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('XHR network error (likely CORS)'));
        };

        xhr.ontimeout = () => {
          clearTimeout(timeout);
          reject(new Error('XHR timeout'));
        };

        xhr.send();
      });
    } catch (xhrError) {
      // Pokud XHR selže (obvykle kvůli CORS), zkus fetch jako fallback
      console.warn('XHR failed, trying fetch:', xhrError.message);

      try {
        const response = await fetch(audioUrl, {
          mode: 'cors',
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        arrayBuffer = await response.arrayBuffer();
      } catch (fetchError) {
        // Obě metody selhaly - pravděpodobně CORS problém
        console.error('Both XHR and fetch failed (CORS restriction):', fetchError.message);
        throw new Error('CORS restriction: Cannot generate waveform from client-side. Use server-side generation.');
      }
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Zavři AudioContext
    audioContext.close();

    // Generuj waveformu
    return generateWaveformFromBuffer(audioBuffer, samples);
  } catch (error) {
    // Vrátíme null místo prázdného pole, aby bylo jasné, že generování selhalo
    console.error('Error generating waveform from URL (CORS restriction):', error.message);
    return null; // Null znamená, že generování selhalo
  }
};

/**
 * Vykresli waveformu na canvas z pole amplitud
 * Realistický bar waveform (čárky nahoru a dolů od středu)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array<number>} waveform - Pole amplitud (0-32768 absolutní hodnoty nebo 0-1 normalizované, automaticky detekuje)
 * @param {number} width - Šířka canvasu
 * @param {number} height - Výška canvasu
 * @param {string} color - Barva waveformy
 * @param {string} style - Styl vizualizace: 'bar' (čárky), 'line' (spojitá čára), 'mirror' (symetrický)
 * @param {number|null} globalMax - Globální maximum pro normalizaci napříč všemi soubory (zachová relativní rozdíly)
 */
export const drawWaveformFromData = (ctx, waveform, width, height, color = '#3b82f6', style = 'bar', globalMax = null) => {
  if (!waveform || !Array.isArray(waveform) || waveform.length === 0) {
    console.warn('⚠️ drawWaveformFromData: waveform je prázdné nebo není pole!');
    return;
  }

  // Vymazat canvas
  ctx.clearRect(0, 0, width, height);

  const centerY = height / 2;
  const barWidth = Math.max(1, width / waveform.length);
  const spacing = barWidth > 2 ? 0.2 : 0; // Mezera mezi čárkami, pokud jsou dostatečně široké

  // Nastav barvu
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  // Najdi maximum
  const maxValue = Math.max(...waveform.map(Math.abs));

  // Rozhodni, zda jsou data normalizovaná (0-1) nebo absolutní (0-32768)
  const isNormalized = maxValue < 1.5;

  // ✅ PRO NORMALIZOVANÁ DATA: Použij LOKÁLNÍ normalizaci - každý soubor má svůj vlastní max
  // ✅ PRO ABSOLUTNÍ HODNOTY: Použij globální normalizaci - zachová relativní rozdíly mezi soubory
  const normalizationBase = isNormalized ? maxValue : (globalMax && globalMax > 0 ? globalMax : maxValue);

  // Maximální amplituda (47.5% výšky nahoru a dolů = 95% celkem, 5% padding)
  const maxAmplitude = height * 0.475;

  console.log(`🎨 drawWaveformFromData - Nový přístup:`, {
    samples: waveform.length,
    width,
    height,
    barWidth: barWidth.toFixed(2),
    isNormalized: isNormalized ? 'ANO (0-1)' : 'NE (absolutní)',
    maxValue: maxValue.toFixed(4),
    normalizationBase: normalizationBase.toFixed(4),
    maxAmplitude: maxAmplitude.toFixed(2),
    usingLocalMax: isNormalized ? 'ANO ✅' : 'NE (globální)'
  });

  if (style === 'bar') {
    // Kresli čárky pomocí fillRect - spolehlivější než lineTo
    for (let i = 0; i < waveform.length; i++) {
      const value = Math.abs(waveform[i]);
      const normalizedValue = value / normalizationBase; // Normalizuj na 0-1
      const amplitude = normalizedValue * maxAmplitude; // Vypočítej amplitudu

      // X pozice pro čárku
      const x = i * barWidth + (spacing * barWidth);
      const barWidthActual = barWidth * (1 - spacing * 2);

      // Horní čárka (nahoru od středu)
      const topY = centerY - amplitude;
      // Dolní čárka (dolů od středu)
      const bottomY = centerY + amplitude;

      // Vykresli svislou čárku pomocí fillRect
      if (amplitude > 0.5) { // Ignoruj příliš malé čárky (šum)
        ctx.fillRect(x, topY, barWidthActual, bottomY - topY);
      }
    }

    // Debug: zkontroluj první a poslední čárku
    if (waveform.length > 0) {
      const firstValue = Math.abs(waveform[0]) / normalizationBase;
      const lastValue = Math.abs(waveform[waveform.length - 1]) / normalizationBase;
      const firstAmplitude = firstValue * maxAmplitude;
      const lastAmplitude = lastValue * maxAmplitude;
      console.log(`🎨 drawWaveformFromData - Vykresleno ${waveform.length} čárek:`, {
        firstBar: { value: firstValue.toFixed(4), amplitude: firstAmplitude.toFixed(2), yRange: `${(centerY - firstAmplitude).toFixed(1)}-${(centerY + firstAmplitude).toFixed(1)}` },
        lastBar: { value: lastValue.toFixed(4), amplitude: lastAmplitude.toFixed(2), yRange: `${(centerY - lastAmplitude).toFixed(1)}-${(centerY + lastAmplitude).toFixed(1)}` }
      });
    }
  } else if (style === 'line') {
    // Line waveform - spojitá čára
    ctx.beginPath();
    for (let i = 0; i < waveform.length; i++) {
      const value = Math.abs(waveform[i]) / normalizationBase;
      const amplitude = value * maxAmplitude;
      const y = centerY - amplitude;
      const x = i * barWidth + barWidth / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  } else if (style === 'mirror') {
    // Mirror waveform - symetrický tvar s vyplněním
    ctx.beginPath();

    // Horní část
    for (let i = 0; i < waveform.length; i++) {
      const value = Math.abs(waveform[i]) / normalizationBase;
      const amplitude = value * maxAmplitude;
      const y = centerY - amplitude;
      const x = i * barWidth + barWidth / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Dolní část (zpětně)
    for (let i = waveform.length - 1; i >= 0; i--) {
      const value = Math.abs(waveform[i]) / normalizationBase;
      const amplitude = value * maxAmplitude;
      const y = centerY + amplitude;
      const x = i * barWidth + barWidth / 2;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  }
};

export default {
  generateWaveformFromBuffer,
  generateWaveformFromUrl,
  drawWaveformFromData
};

