/**
 * Hook pro legacy playback funkce
 * Obsahuje playAudio a související logiku
 */
import log from '@services/logger';

export const useLegacyPlayback = (audioRef, audioUrl, _audioState, _setAudioState, _setPlaybackState) => {
  /**
   * Centrální funkce pro audio playback - používá se ve všech funkcích
   * @param {string} context - Kontext pro logování
   * @returns {Promise} - Promise pro play operaci
   */
  const playAudio = (context = 'unknown') => {
    const audio = audioRef.current;
    if (!audio) {
      log.audio(`⚠️ [${context}] Audio element not found`);
      return Promise.reject(new Error('Audio element not found'));
    }

    if (!audio.src || audio.src === '') {
      log.audio(`⚠️ [${context}] Audio src is empty:`, { src: audio.src, audioUrl });
      return Promise.reject(new Error('Audio src is empty'));
    }

    // Ujisti se že volume není 0
    if (audio.volume === 0) {
      log.audio(`🎵 [${context}] Volume is 0, setting to 1`);
      audio.volume = 1;
    }

    console.log(`🎵 Attempting to play audio`);

    // Zkontroluj jestli audio skončilo
    if (audio.ended) {
      audio.currentTime = 0;
    }

    // Zkontroluj AudioContext stav a aktivuj ho
    try {
      // Použij globální AudioContext pokud existuje, jinak vytvoř nový
      let audioContext = window.globalAudioContext;
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        window.globalAudioContext = audioContext;
      }

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('🎵 AudioContext activated in playAudio');
          window.audioActivated = true;
        }).catch((error) => {
          console.log('🎵 AudioContext resume failed:', error);
        });
      } else {
        window.audioActivated = true;
      }
    } catch (error) {
      console.log('🎵 AudioContext creation failed:', error);
    }

    // Reset audio element pokud je v špatném stavu
    if (audio.readyState === 0 || audio.networkState === 3) {
      console.log('🎵 Audio in bad state, reloading...');
      audio.load();
      return new Promise((resolve, reject) => {
        const handleLoadedData = () => {
          console.log('🎵 Audio reloaded, attempting play');
          audio.play().then(() => {
            console.log('🎵 Audio playing after reload');
            resolve();
          }).catch((error) => {
            console.log('🎵 Audio play failed after reload:', error);
            reject(error);
          });
        };
        audio.addEventListener('loadeddata', handleLoadedData, { once: true });
      });
    }

    // Zkontroluj jestli je audio element připravený
    if (audio.readyState < 2) {
      console.log('🎵 Audio not ready, waiting...');
      return new Promise((resolve, reject) => {
        const handleCanPlay = () => {
          audio.removeEventListener('canplay', handleCanPlay);
          audio.play().then(() => {
            console.log('🎵 Audio playing after canplay');
            resolve();
          }).catch((error) => {
            console.log('🎵 Audio play failed after canplay:', error);
            reject(error);
          });
        };
        audio.addEventListener('canplay', handleCanPlay);
      });
    }

    return audio.play().then(() => {
      console.log('🎵 Audio playing successfully!');
    }).catch((error) => {
      log.error(`Failed to play audio in ${context}:`, error);
      log.audio(`⚠️ [${context}] Audio play failed, error details:`, {
        name: error.name,
        message: error.message,
        code: error.code
      });

      // Pro první spuštění zkus více pokusů s delšími pauzami
      if (context.includes('first') || context.includes('retry')) {
        log.audio(`🎵 [${context}] První spuštění - zkouším více pokusů`);

        return new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 3;
          const attemptPlay = () => {
            attempts++;
            log.audio(`🎵 [${context}] Pokus ${attempts}/${maxAttempts}`);

            audio.play().then(() => {
              log.audio(`🎵 [${context}] Úspěch na pokus ${attempts}`);
              resolve();
            }).catch((retryError) => {
              log.audio(`🎵 [${context}] Pokus ${attempts} selhal:`, retryError.message);

              if (attempts < maxAttempts) {
                log.audio(`🎵 [${context}] Zkouším znovu za 200ms...`);
                setTimeout(() => {
                  attemptPlay();
                }, 200);
              } else {
                log.audio(`🎵 [${context}] Všechny pokusy selhaly`);
                reject(retryError);
              }
            });
          };

          // První pokus po krátké pauze
          setTimeout(() => {
            attemptPlay();
          }, 100);
        });
      }

      // Pro běžné chyby vrať Promise.reject
      return Promise.reject(error);
    });
  };

  return {
    playAudio
  };
};
