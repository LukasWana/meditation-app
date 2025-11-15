import { useRef, useEffect, useState } from 'react';

/**
 * Hook pro audio analýzu pomocí Web Audio API
 * Vrací frekvenční data a amplitudu pro vizualizaci
 *
 * @param {React.RefObject<HTMLAudioElement>} audioRef - Reference na audio element
 * @param {boolean} isPlaying - Zda se audio přehrává
 * @returns {Object} - Audio analýza data { frequencies, amplitude, bass, mid, treble }
 */
export const useAudioAnalysis = (audioRef, isPlaying) => {
  const [audioData, setAudioData] = useState({
    frequencies: new Array(64).fill(0),
    amplitude: 0,
    bass: 0,
    mid: 0,
    treble: 0
  });

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dataArrayRef = useRef(null);

  // Inicializace AudioContext a AnalyserNode
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // Vytvoř nebo použij existující AudioContext
    let audioContext = window.globalAudioContext;
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      window.globalAudioContext = audioContext;
    }

    audioContextRef.current = audioContext;

    // Vytvoř AnalyserNode
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256; // 128 frekvenčních pásem
    analyser.smoothingTimeConstant = 0.8; // Vyhlazení pro plynulejší animaci
    analyserRef.current = analyser;

    // Vytvoř data array pro frekvenční data
    const bufferLength = analyser.frequencyBinCount; // 128
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;

    // Připoj audio element k AudioContext
    const connectAudio = () => {
      try {
        // Zkontroluj, zda už existuje MediaElementSource pro tento audio element
        // (Web Audio API umožňuje pouze jeden MediaElementSource na audio element)
        if (audio._mediaElementSource) {
          // Použij existující source
          sourceRef.current = audio._mediaElementSource;
          if (!sourceRef.current.isConnected) {
            sourceRef.current.connect(analyser);
          }
        } else {
          // Vytvoř nový MediaElementSource z audio elementu
          const source = audioContext.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(audioContext.destination); // Připoj zpět k výstupu
          sourceRef.current = source;
          audio._mediaElementSource = source; // Ulož reference pro další použití
        }
      } catch (error) {
        console.warn('⚠️ Audio analýza: Chyba při připojování audio:', error);
        // Pokud už existuje source, použij ho
        if (sourceRef.current && !sourceRef.current.isConnected) {
          try {
            sourceRef.current.connect(analyser);
          } catch (e) {
            console.warn('⚠️ Audio analýza: Nepodařilo se připojit existující source:', e);
          }
        }
      }
    };

    // Připoj audio při změně src
    const handleLoadedMetadata = () => {
      connectAudio();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Připoj audio okamžitě, pokud je už načteno
    if (audio.readyState >= 1) {
      connectAudio();
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // Ignoruj chyby při odpojování
        }
      }
    };
  }, [audioRef]);

  // Analýza audio dat při přehrávání
  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !dataArrayRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Resetuj data když se nepřehrává
      setAudioData({
        frequencies: new Array(64).fill(0),
        amplitude: 0,
        bass: 0,
        mid: 0,
        treble: 0
      });
      return;
    }

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    const analyze = () => {
      if (!isPlaying || !analyser || !dataArray) {
        return;
      }

      // Získej frekvenční data
      analyser.getByteFrequencyData(dataArray);

      // Redukuj na 64 hodnot pro shader (z 128)
      const frequencies = [];
      for (let i = 0; i < 64; i++) {
        frequencies.push(dataArray[i * 2] / 255.0); // Normalizuj na 0-1
      }

      // Vypočti celkovou amplitudu (průměr všech frekvencí)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const amplitude = sum / (dataArray.length * 255); // Normalizuj na 0-1

      // Vypočti frekvenční pásma
      // Bass: 0-20 (indexy 0-4)
      let bassSum = 0;
      for (let i = 0; i < 5; i++) {
        bassSum += dataArray[i];
      }
      const bass = bassSum / (5 * 255);

      // Mid: 20-100 (indexy 5-20)
      let midSum = 0;
      for (let i = 5; i < 21; i++) {
        midSum += dataArray[i];
      }
      const mid = midSum / (16 * 255);

      // Treble: 100+ (indexy 21+)
      let trebleSum = 0;
      for (let i = 21; i < dataArray.length; i++) {
        trebleSum += dataArray[i];
      }
      const treble = trebleSum / ((dataArray.length - 21) * 255);

      setAudioData({
        frequencies,
        amplitude,
        bass,
        mid,
        treble
      });

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    animationFrameRef.current = requestAnimationFrame(analyze);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying]);

  return audioData;
};

