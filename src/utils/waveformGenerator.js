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
 * @param {Array<number>} waveform - Pole amplitud (0-1)
 * @param {number} width - Šířka canvasu
 * @param {number} height - Výška canvasu
 * @param {string} color - Barva waveformy
 * @param {string} style - Styl vizualizace: 'bar' (čárky), 'line' (spojitá čára), 'mirror' (symetrický)
 */
export const drawWaveformFromData = (ctx, waveform, width, height, color = '#3b82f6', style = 'bar', globalMax = null) => {
  if (!waveform || waveform.length === 0) {
    return;
  }

  ctx.clearRect(0, 0, width, height);

  // Vyplň pozadí (volitelné)
  // ctx.fillStyle = '#f9fafb';
  // ctx.fillRect(0, 0, width, height);

  const centerY = height / 2;
  const step = width / waveform.length;

  // KRITICKÉ: Použijme absolutní hodnoty BEZ normalizace podle vlastního rozsahu
  // Normalizace podle vlastního rozsahu způsobuje, že všechny soubory vypadají stejně
  // Každý soubor má jiné absolutní hodnoty (0-1, ale různé průměry), takže zachová skutečný průběh
  const maxAmp = height * 0.475; // 47.5% výšky nahoru a dolů = 95% celkem

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5; // Mírně tlustší čárky pro lepší viditelnost

  if (style === 'bar') {
    // ✅ OPRAVA: Normalizuj každý waveform podle jeho VLASTNÍHO maxima
    // To zajistí, že každý soubor využije celou výšku canvasu podle svých vlastních hodnot
    // Tím se zachová relativní průběh (decay pattern) a každý soubor bude mít odlišný vzhled

    // Najdi maximum TENTO waveform (ne globální!)
    const maxValue = Math.max(...waveform.map(Math.abs));
    const minValue = Math.min(...waveform.map(Math.abs));

    // Debug: zobraz hodnoty pro kontrolu
    if (waveform.length > 0 && (maxValue > 1 || minValue !== maxValue)) {
      console.log('🎨 drawWaveformFromData:', {
        samples: waveform.length,
        min: minValue.toFixed(2),
        max: maxValue.toFixed(2),
        range: (maxValue - minValue).toFixed(2),
        first3: waveform.slice(0, 3).map(v => v.toFixed(2)),
        last3: waveform.slice(-3).map(v => v.toFixed(2)),
        isAbsolute: maxValue > 1
      });
    }

    // ✅ KRITICKÁ OPRAVA: Použijme GLOBÁLNÍ normalizaci místo lokální!
    // Lokální normalizace podle vlastního maxima způsobuje, že všechny soubory vypadají stejně
    // Protože všechny mají podobný max (0.81-0.82), takže po normalizaci všechny mají max=1.0
    // Globální normalizace zachová skutečné rozdíly - soubory s různými průměry (0.51, 0.46, 0.40) vypadají odlišně

    // ✅ Použijme globální maximum pro normalizaci - zachová skutečné rozdíly mezi soubory
    // Pokud není globální maximum poskytnuto, použijeme lokální maximum jako fallback
    const normalizationBase = globalMax && globalMax > 0 ? globalMax : maxValue;

    // ✅ DEBUG: Zobraz normalizační základ pro první 3 soubory
    if (waveform.length > 0) {
      const first3 = waveform.slice(0, 3);
      const avgValue = waveform.reduce((a, b) => a + Math.abs(b), 0) / waveform.length;
      console.log(`🎨 drawWaveformFromData: max=${maxValue.toFixed(4)}, avg=${avgValue.toFixed(4)}, globalMax=${globalMax?.toFixed(4)}, normalizationBase=${normalizationBase.toFixed(4)}, first3=${first3.map(v => v.toFixed(2)).join(',')}`);
    }

    for (let i = 0; i < waveform.length; i++) {
      // Normalizuj podle GLOBÁLNÍHO maxima - zachová skutečné rozdíly mezi soubory
      // Soubory s různými průměry (0.51, 0.46, 0.40) budou mít různé amplitudy
      let value = Math.abs(waveform[i]) / normalizationBase;

      const amplitude = value * maxAmp;

      // X pozice pro střed čárky
      const x = i * step + step / 2;

      // Horní čárka (nahoru od středu)
      const topY = centerY - amplitude;
      // Dolní čárka (dolů od středu)
      const bottomY = centerY + amplitude;

      // Vykresli svislou čárku
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.stroke();
    }
  } else if (style === 'line') {
    // Line waveform - spojitá čára nahoru a dolů od středu
    // Použij stejnou globální normalizaci jako u bar stylu
    const maxValue = Math.max(...waveform.map(Math.abs));
    const normalizationBase = globalMax && globalMax > 0 ? globalMax : maxValue;

    ctx.beginPath();

    // Horní část (nahoru)
    for (let i = 0; i < waveform.length; i++) {
      const value = Math.abs(waveform[i]) / normalizationBase;
      const amplitude = value * maxAmp;
      const y = centerY - amplitude;
      const x = i * step + step / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Dolní část (dolů) - zpětně
    for (let i = waveform.length - 1; i >= 0; i--) {
      const value = Math.abs(waveform[i]) / normalizationBase;
      const amplitude = value * maxAmp;
      const y = centerY + amplitude;
      const x = i * step + step / 2;
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.stroke();
  } else if (style === 'mirror') {
    // Mirror waveform - symetrický tvar s vyplněním (původní styl)
    // Použij stejnou globální normalizaci jako u bar stylu
    const maxValue = Math.max(...waveform.map(Math.abs));
    const normalizationBase = globalMax && globalMax > 0 ? globalMax : maxValue;

    ctx.beginPath();

    // Horní část
    for (let i = 0; i < waveform.length; i++) {
      const value = Math.abs(waveform[i]) / normalizationBase;
      const amplitude = value * maxAmp;
      const y = centerY - amplitude;
      const x = i * step + step / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Dolní část
    for (let i = waveform.length - 1; i >= 0; i--) {
      const value = Math.abs(waveform[i]) / normalizationBase;
      const amplitude = value * maxAmp;
      const y = centerY + amplitude;
      const x = i * step + step / 2;
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

