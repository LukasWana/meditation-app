import { useCallback, useRef, useEffect } from 'react';
import { storage, ensureFirebase } from '@config/secure-firebase';
import { ref as fbRef, getDownloadURL as fbGetDownloadURL } from 'firebase/storage';

/**
 * Hook pro přehrávání finálního zvuku po dokončení dýchání
 *
 * @param {string} breathFinalSound - Cesta k finálnímu zvuku (Firebase Storage path)
 * @param {boolean} isBreathing - Zda probíhá dýchání (pro reset flagu)
 * @returns {Function} playFinalSound - Funkce pro přehrání finálního zvuku
 */
export const useFinalSound = (breathFinalSound, isBreathing) => {
  const finalSoundPlayedRef = useRef(false);
  const audioRef = useRef(null);

  // Resetuj flag když se spustí nové dýchání
  useEffect(() => {
    if (isBreathing) {
      finalSoundPlayedRef.current = false;
    }
  }, [isBreathing]);

  // Zastav a uvolni audio při odmountování
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Funkce pro přehrání finálního zvuku
  const playFinalSound = useCallback(async () => {
    if (!breathFinalSound || breathFinalSound === 'none') {
      return;
    }

    if (finalSoundPlayedRef.current) {
      return;
    }

    // Označ, že finální zvuk byl přehrán
    finalSoundPlayedRef.current = true;

    try {
      await ensureFirebase();
      let url = null;

      if (breathFinalSound.startsWith('dychanie/')) {
        url = '/' + breathFinalSound;
      } else {
        const { realtimeMetadataService } = await import('@services/realtimeMetadataService');

        // Zkus načíst z metadata
        const metadata = await realtimeMetadataService.getFileMetadata(breathFinalSound);

        if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
          url = metadata.downloadURL || metadata.audioSrc;
        } else {
          // Pokud není v metadata, zkus načíst přímo z Firebase Storage (fallback)
          try {
            const audioRef = fbRef(storage, breathFinalSound);
            url = await fbGetDownloadURL(audioRef);
          } catch (storageError) {
            console.error('Failed to load final sound from Firebase Storage:', storageError);
            finalSoundPlayedRef.current = false;
            return;
          }
        }
      }

      if (url) {
        // Aktivovat AudioContext před přehráním (pro přehrávání i bez focusu)
        let audioContext = window.globalAudioContext;
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          window.globalAudioContext = audioContext;
        }

        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const audio = new Audio(url);
        audio.crossOrigin = 'anonymous'; // Povolí CORS pro Android Chrome
        audio.volume = 1;
        audioRef.current = audio;

        // Bez uvolnění po dohrání zůstane element i jeho dekódovaný buffer
        // v paměti až do reloadu (každé dýchání = jeden navíc)
        const release = () => {
          audio.src = '';
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
        };
        audio.addEventListener('ended', release, { once: true });

        audio.play().catch((error) => {
          console.error('Failed to play final sound:', error);
          audio.removeEventListener('ended', release);
          release();
          // Resetuj flag při chybě, aby se mohl zkusit znovu
          finalSoundPlayedRef.current = false;
        });
      } else {
        finalSoundPlayedRef.current = false;
      }
    } catch (error) {
      console.error('Error playing final sound:', error);
      // Resetuj flag při chybě
      finalSoundPlayedRef.current = false;
    }
  }, [breathFinalSound]);

  return playFinalSound;
};

