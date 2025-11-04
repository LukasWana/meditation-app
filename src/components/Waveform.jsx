import React, { useEffect, useRef, useState } from 'react';
import { drawWaveformFromData } from '@utils/waveformGenerator';

const Waveform = ({
  waveformData,
  globalMax = null, // ✅ Globální maximum ze všech souborů pro globální normalizaci
  width = '100%',
  height = 90,
  color = '#3b82f6'
  // Poznámka: audioUrl, progressColor, cursorColor, barWidth, barGap, onPlayPause, isPlaying, currentTime, onSeek jsou pro budoucí použití
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  // Zkontroluj, zda máme waveformData
  const hasWaveformData = waveformData && Array.isArray(waveformData) && waveformData.length > 0;

  // Použij canvas s waveformData - vlastní vizualizace zachová skutečná data
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!canvasRef.current) return;

      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        let canvasWidth = typeof width === 'number' ? width : 200;
        if (typeof width === 'string') {
          canvasWidth = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 200;
        }

        canvas.width = canvasWidth;
        canvas.height = height;

        if (hasWaveformData) {
          // Debug: zobraz hodnoty pro kontrolu
          // ✅ DEBUG: Ověř, zda jsou data unikátní pro každý soubor
          const minValue = Math.min(...waveformData);
          const maxValue = Math.max(...waveformData);
          const avgValue = waveformData.reduce((a, b) => a + b, 0) / waveformData.length;
          const valueRange = maxValue - minValue;
          const first5 = waveformData.slice(0, 5);
          const last5 = waveformData.slice(-5);
          const dataSignature = `${first5.map(v => v.toFixed(2)).join(',')}-${last5.map(v => v.toFixed(2)).join(',')}`;

          console.log('🌊 Waveform.jsx - Drawing waveform:', {
            samples: waveformData.length,
            min: minValue.toFixed(4),
            max: maxValue.toFixed(4),
            avg: avgValue.toFixed(4),
            first5: first5.map(v => v.toFixed(4)),
            last5: last5.map(v => v.toFixed(4)),
            firstValue: waveformData[0]?.toFixed(4),
            lastValue: waveformData[waveformData.length - 1]?.toFixed(4),
            dataSignature: dataSignature.substring(0, 50) + '...',
            isAbsolute: maxValue > 1,
            // Zkontroluj variabilitu - pokud je malá, soubory vypadají stejně
            variability: valueRange / avgValue < 0.5 ? 'LOW (soubory vypadají stejně)' : 'OK'
          });

          // Použij vlastní vizualizaci - s globální normalizací pro zachování rozdílů mezi soubory
          drawWaveformFromData(ctx, waveformData, canvasWidth, height, color, 'bar', globalMax);
        } else {
          // Prázdná waveformu
          ctx.clearRect(0, 0, canvasWidth, height);
          ctx.strokeStyle = '#d1d5db';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, height / 2);
          ctx.lineTo(canvasWidth, height / 2);
          ctx.stroke();
        }

        setIsLoading(false);
      } catch (error) {
        console.warn('Error drawing waveform:', error);
        setIsLoading(false);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [waveformData, width, height, color, hasWaveformData]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ width, minHeight: height }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded z-10">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Canvas rendering pro uložená waveform data - vlastní vizualizace zachová skutečná data */}
      <canvas
        ref={canvasRef}
        width={typeof width === 'number' ? width : 200}
        height={height}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default Waveform;

