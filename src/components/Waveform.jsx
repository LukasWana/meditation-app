import React, { useMemo, useEffect, useRef } from 'react';

const Waveform = ({
  waveformData,
  globalMax = null, // ✅ Globální maximum ze všech souborů pro globální normalizaci
  width = '100%',
  height = 90,
  color = '#3b82f6',
  barWidth = 2,
  barGap = 1
}) => {
  const canvasRef = useRef(null);

  // Zkontroluj, zda máme waveformData
  const hasWaveformData = waveformData && Array.isArray(waveformData) && waveformData.length > 0;

  // Normalizuj waveform data na formát 0-1
  const normalizedWaveformData = useMemo(() => {
    if (!hasWaveformData) return null;

    // Najdi maximum
    const maxValue = Math.max(...waveformData.map(Math.abs));

    // Rozhodni, zda jsou data normalizovaná (0-1) nebo absolutní (0-32768)
    const isNormalized = maxValue < 1.5;

    // Pro normalizovaná data: použij lokální normalizaci - každý soubor má svůj vlastní max
    // Pro absolutní hodnoty: použij globální normalizaci - zachová relativní rozdíly
    const normalizationBase = isNormalized
      ? maxValue
      : (globalMax && globalMax > 0 ? globalMax : maxValue);

    // Normalizuj data na rozsah 0-1
    return waveformData.map(value => {
      const absValue = Math.abs(value);
      return absValue / normalizationBase;
    });
  }, [waveformData, globalMax, hasWaveformData]);

  // Vykresli waveform na canvas
  useEffect(() => {
    if (!canvasRef.current || !normalizedWaveformData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Urči šířku canvasu
    let canvasWidth = typeof width === 'number' ? width : 150;
    if (typeof width === 'string' && canvas.parentElement) {
      canvasWidth = canvas.parentElement.offsetWidth || 150;
    }

    canvas.width = canvasWidth;
    canvas.height = height;

    // Vymazat canvas
    ctx.clearRect(0, 0, canvasWidth, height);

    // Nastav barvu
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    // Vypočítej pozice pro čárky
    const centerY = height / 2;
    const totalBarWidth = barWidth + barGap;
    const maxBars = Math.floor(canvasWidth / totalBarWidth);

    // Vykresli čárky
    for (let i = 0; i < maxBars; i++) {
      const dataIndex = Math.floor((i * normalizedWaveformData.length) / maxBars);
      const value = normalizedWaveformData[dataIndex];

      if (value === undefined || isNaN(value)) continue;

      // Vypočítej amplitudu (47.5% výšky nahoru a dolů = 95% celkem)
      const amplitude = value * (height * 0.475);

      // X pozice pro čárku
      const x = i * totalBarWidth;

      // Horní čárka (nahoru od středu)
      const topY = centerY - amplitude;
      // Dolní čárka (dolů od středu)
      const bottomY = centerY + amplitude;

      // Vykresli svislou čárku
      if (amplitude > 0.5) { // Ignoruj příliš malé čárky (šum)
        ctx.fillRect(x, topY, barWidth, bottomY - topY);
      }
    }
  }, [normalizedWaveformData, width, height, color, barWidth, barGap]);

  // Pokud nemáme data, zobraz prázdnou waveformu
  if (!hasWaveformData || !normalizedWaveformData) {
    return (
      <div
        className="relative w-full flex items-center justify-center"
        style={{ width, minHeight: height }}
      >
        <div className="text-gray-400 text-xs">Žádná waveform data</div>
      </div>
    );
  }

  // Urči šířku jako číslo
  const numericWidth = typeof width === 'number' ? width : 150;

  return (
    <div
      className="relative w-full"
      style={{ width, minHeight: height }}
    >
      <canvas
        ref={canvasRef}
        width={numericWidth}
        height={height}
        style={{
          display: 'block',
          width: typeof width === 'number' ? `${width}px` : '100%',
          height: `${height}px`
        }}
      />
    </div>
  );
};

export default Waveform;

