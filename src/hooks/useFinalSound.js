import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook pro přehrávání finálního zvuku po dokončení dýchání
 *
 * @param {string} breathFinalSound - Cesta k finálnímu zvuku (Firebase Storage path)
 * @param {boolean} isBreathing - Zda probíhá dýchání (pro reset flagu)
 * @returns {Function} playFinalSound - Funkce pro přehrání finálního zvuku
 */
export const useFinalSound = (breathFinalSound, isBreathing) => {
  const finalSoundPlayedRef = useRef(false);

  // Resetuj flag když se spustí nové dýchání
  useEffect(() => {
    if (isBreathing) {
      finalSoundPlayedRef.current = false;
    }
  }, [isBreathing]);

  // Funkce pro přehrání finálního zvuku
  const playFinalSound = useCallback(async () => {
    console.log('🔊 playFinalSound called', { breathFinalSound, alreadyPlayed: finalSoundPlayedRef.current });

    if (!breathFinalSound || breathFinalSound === 'none') {
      console.log('⚠️ No final sound configured');
      return;
    }

    if (finalSoundPlayedRef.current) {
      console.log('⚠️ Final sound already played');
      return;
    }

    // Označ, že finální zvuk byl přehrán
    finalSoundPlayedRef.current = true;

    try {
      console.log('🔍 Loading final sound metadata:', breathFinalSound);
      const { realtimeMetadataService } = await import('@services/realtimeMetadataService');
      const { ref, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('@services/firebase');

      let url = null;

      // Zkus načíst z metadata
      const metadata = await realtimeMetadataService.getFileMetadata(breathFinalSound);
      console.log('📦 Final sound metadata:', metadata);

      if (metadata && (metadata.downloadURL || metadata.audioSrc)) {
        url = metadata.downloadURL || metadata.audioSrc;
        console.log('✅ Found URL in metadata:', url);
      } else {
        // Pokud není v metadata, zkus načíst přímo z Firebase Storage (fallback)
        console.log('⚠️ Metadata missing, trying Firebase Storage directly');
        try {
          const audioRef = ref(storage, breathFinalSound);
          url = await getDownloadURL(audioRef);
          console.log('✅ Found URL from Firebase Storage:', url);
        } catch (storageError) {
          console.error('❌ Failed to load final sound from Firebase Storage:', storageError);
          finalSoundPlayedRef.current = false;
          return;
        }
      }

      if (url) {
        console.log('▶️ Playing final sound from URL:', url);
        const audio = new Audio(url);
        audio.volume = 1;
        audio.play().catch((error) => {
          console.error('❌ Failed to play final sound:', error);
          // Resetuj flag při chybě, aby se mohl zkusit znovu
          finalSoundPlayedRef.current = false;
        });
        console.log('✅ Final sound playback started');
      } else {
        console.warn('⚠️ No download URL found');
        finalSoundPlayedRef.current = false;
      }
    } catch (error) {
      console.error('❌ Error playing final sound:', error);
      // Resetuj flag při chybě
      finalSoundPlayedRef.current = false;
    }
  }, [breathFinalSound]);

  return playFinalSound;
};

