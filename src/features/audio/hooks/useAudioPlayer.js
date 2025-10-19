import { useState, useRef, useEffect } from 'react';
import cacheService from '@services/cacheService';
import { log } from '@services/logger';

export const useAudioPlayer = (audioUrl, albumTracks = null, currentTrackIndex = 0, onTrackChange = null, autoplayEnabled = true) => {

  // Zjednodušený state management - sloučené související stavy
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    isActivated: false,
    hasInteracted: false
  });

  const [playbackState, setPlaybackState] = useState({
    currentTime: 0,
    duration: 0,
    isLoading: true,
    shouldAutoplay: false,
    wasPlayingBeforeSwitch: false,
    hasError: false,
    errorMessage: null
  });
  const audioRef = useRef(null);
  const fadeTimeoutRef = useRef(null);
  const fadeOutIntervalRef = useRef(null);
  const fadeInIntervalRef = useRef(null);

  // Aktivuj audio při změně skladby
  useEffect(() => {
    if (audioUrl) {
      console.log('🎵 Track changed, activating audio...');
      try {
        // Použij globální AudioContext pokud existuje, jinak vytvoř nový
        let audioContext = window.globalAudioContext;
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          window.globalAudioContext = audioContext;
        }

        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('🎵 Track audio activated!');
            window.audioActivated = true;
            setAudioState(prev => ({ ...prev, hasInteracted: true }));
          }).catch(() => {
            console.log('🎵 Track audio activation failed');
          });
        } else {
          console.log('🎵 Track audio already active');
          window.audioActivated = true;
          setAudioState(prev => ({ ...prev, hasInteracted: true }));
        }
      } catch {
        console.log('🎵 Track audio activation error');
      }
    }
  }, [audioUrl]);

  // Sleduj změnu audioUrl a zachovej stav přehrávání
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      log.audio('🎵 Audio URL effect: skipping - no audio element or audioUrl:', { hasAudio: !!audio, audioUrl });
      return;
    }

    log.audio('🎵 Audio URL changed:', audioUrl);

    // Ulož aktuální stav přehrávání před změnou zdroje
    const wasPlaying = audioState.isPlaying;
    setPlaybackState(prev => ({ ...prev, wasPlayingBeforeSwitch: wasPlaying }));

    // Vyčisti audio element před načtením nového souboru
    log.audio('🎵 Cleaning up audio element before loading new source');
    log.audio('🎵 Audio element state before cleanup:', {
      readyState: audio.readyState,
      networkState: audio.networkState,
      paused: audio.paused,
      currentTime: audio.currentTime,
      ended: audio.ended
    });

    // Zastav všechny fade operace
    if (fadeOutIntervalRef.current) {
      clearInterval(fadeOutIntervalRef.current);
      fadeOutIntervalRef.current = null;
    }
    if (fadeInIntervalRef.current) {
      clearInterval(fadeInIntervalRef.current);
      fadeInIntervalRef.current = null;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1; // Reset volume na normální hodnotu

    // Vyčisti všechny event listeners před reloadem
    audio.removeEventListener('timeupdate', () => {});
    audio.removeEventListener('loadedmetadata', () => {});
    audio.removeEventListener('loadeddata', () => {});
    audio.removeEventListener('ended', () => {});
    audio.removeEventListener('error', () => {});
    audio.removeEventListener('canplay', () => {});

    audio.load(); // Force reload of audio element

    log.audio('🎵 Audio element reloaded, new state:', {
      readyState: audio.readyState,
      networkState: audio.networkState,
      paused: audio.paused,
      currentTime: audio.currentTime,
      ended: audio.ended
    });

    // Resetuj stav pro nový soubor
    setPlaybackState(prev => ({ ...prev, currentTime: 0 }));
    // Nezastavuj duration hned - zkus načíst z cache nebo počkej na načtení
    const cachedDuration = audioUrl ? cacheService.getDuration(audioUrl) : null;
    if (cachedDuration) {
      setPlaybackState(prev => ({ ...prev, duration: cachedDuration, isLoading: true })); // Použij cached duration
      log.audio(`Using cached duration: ${cachedDuration}s`);
    } else {
      setPlaybackState(prev => ({ ...prev, duration: 0, isLoading: true })); // Reset pouze pokud není v cache
    }

    // Pokud byl audio přehráván, zachovej stav přehrávání
    if (wasPlaying) {
      // Nezastavuj přehrávání - nech autoplay logiku rozhodnout
      log.audio('Audio was playing, will attempt autoplay after load');
      // Nastav shouldAutoPlay na true pro spuštění autoplay po načtení
      setPlaybackState(prev => ({ ...prev, shouldAutoplay: true }));
      // Zachovej stav přehrávání pro okamžitou autoplay
      setAudioState(prev => ({ ...prev, isPlaying: true }));
    }

    // Načti délku při načítání metadata
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        // Nastav duration pouze pokud není už nastavená z cache
        if (!cachedDuration) {
          setPlaybackState(prev => ({ ...prev, duration: audio.duration }));
          log.audio(`Duration loaded: ${audio.duration}s`);
        } else {
          log.audio(`Duration already cached: ${audio.duration}s`);
        }

        // Ulož délku do cache pro budoucí použití
        if (audioUrl) {
          cacheService.setDuration(audioUrl, audio.duration);
        }
      }
    };

    // Přidej event listener pro loadeddata (když je audio připravené k přehrávání)
    const handleLoadedData = () => {
      log.audio('🎵 Audio loaded and ready to play');
      setPlaybackState(prev => ({ ...prev, isLoading: false }));

      // Oprav stav audio elementu po načtení
      fixAudioElementState(audio).then(() => {
        log.audio('🎵 Audio element state fixed after load');
      });
    };

    // Přidej event listener pro error handling
    const handleError = (event) => {
      log.error('🎵 Audio loading error:', event);
      setPlaybackState(prev => ({
        ...prev,
        isLoading: false,
        duration: 0,
        hasError: true,
        errorMessage: event.error?.message || 'Audio loading failed'
      }));
    };

    // Přidej event listener pro canplay (když je audio připravené k přehrávání)
    const handleCanPlay = () => {
      log.audio('🎵 Audio can play');
      setPlaybackState(prev => ({ ...prev, isLoading: false }));

      // Oprav stav audio elementu po canplay event
      fixAudioElementState(audio).then(() => {
        log.audio('🎵 Audio element state fixed after canplay');
      });
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    log.audio('Audio source changed, was playing:', wasPlaying);

    // Cleanup event listeners
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl]); // Odstranil isPlaying z dependency array

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setPlaybackState(prev => ({ ...prev, currentTime: audio.currentTime }));
    const updateDuration = () => {
      const audioDuration = audio.duration;
        setPlaybackState(prev => ({ ...prev, duration: audioDuration, isLoading: false }));

      // Ulož duration do cache
      if (audioDuration && audioUrl) {
        cacheService.setDuration(audioUrl, audioDuration);
      }

       // Auto-play při změně tracku (pouze pokud uživatel už jednou klikl na play a autoplay je zapnutý)
       // Ale ne při prvním vstupu do přehrávače (prohlížeč by to blokoval)
       // A pouze pokud je zvuk aktivován
       const canAutoplay = (playbackState.shouldAutoplay || playbackState.wasPlayingBeforeSwitch) &&
                          autoplayEnabled &&
                          audioState.hasInteracted &&
                          !audioState.showActivation;

       if (canAutoplay) {
         log.audio('🎵 AUTOPLAY: Starting autoplay sequence');
         log.audio('🎵 AUTOPLAY: Conditions:', {
           shouldAutoplay: playbackState.shouldAutoplay,
           wasPlayingBeforeSwitch: playbackState.wasPlayingBeforeSwitch,
           autoplayEnabled,
           hasInteracted: audioState.hasInteracted,
           showActivation: audioState.showActivation
         });
         log.audio('🎵 AUTOPLAY: Audio element state:', {
           readyState: audio.readyState,
           networkState: audio.networkState,
           paused: audio.paused,
           currentTime: audio.currentTime,
           volume: audio.volume,
           muted: audio.muted
         });

         // Zkontroluj jestli je audio element připravený pro autoplay
         if (audio.readyState >= 2 && audio.networkState !== 3) {
           log.audio('🎵 AUTOPLAY: Audio element is ready, attempting autoplay');

           // Aktivuj AudioContext před autoplay
           try {
             // Použij globální AudioContext pokud existuje, jinak vytvoř nový
             let audioContext = window.globalAudioContext;
             if (!audioContext) {
               audioContext = new (window.AudioContext || window.webkitAudioContext)();
               window.globalAudioContext = audioContext;
             }

             if (audioContext.state === 'suspended') {
               console.log('🎵 AUTOPLAY: AudioContext suspended, attempting resume');
               audioContext.resume().then(() => {
                 console.log('🎵 AUTOPLAY: AudioContext resumed, proceeding with autoplay');
                 window.audioActivated = true;
                 proceedWithAutoplay();
               }).catch((error) => {
                 console.log('🎵 AUTOPLAY: Failed to resume AudioContext:', error);
                 proceedWithAutoplay();
               });
             } else {
               console.log('🎵 AUTOPLAY: AudioContext is active, proceeding with autoplay');
               window.audioActivated = true;
               proceedWithAutoplay();
             }
           } catch (error) {
             console.log('🎵 AUTOPLAY: No AudioContext available, proceeding with autoplay');
             proceedWithAutoplay();
           }

           const proceedWithAutoplay = () => {
             // Přidej delší delay pro autoplay aby se audio element stihl připravit
             setTimeout(() => {
               // Zjednodušený autoplay - jen spusť audio bez složitých kontrol
               audio.play().then(() => {
                 setAudioState(prev => ({ ...prev, isPlaying: true }));
                 setPlaybackState(prev => ({ ...prev, shouldAutoplay: false, wasPlayingBeforeSwitch: false }));
                 console.log('✅ AUTOPLAY: Auto-play successful');
               }).catch((error) => {
                 console.log('❌ AUTOPLAY: Failed to auto-play:', error);
                 setAudioState(prev => ({ ...prev, isPlaying: false }));
                 setPlaybackState(prev => ({ ...prev, shouldAutoplay: false, wasPlayingBeforeSwitch: false }));
               });
             }, 500); // 500ms delay pro autoplay
           };
         } else {
           log.audio('🎵 AUTOPLAY: Audio element not ready for autoplay, skipping');
           log.audio('🎵 AUTOPLAY: Audio readyState:', audio.readyState, 'networkState:', audio.networkState);

           // Reset autoplay flags
           setPlaybackState(prev => ({ ...prev, shouldAutoplay: false, wasPlayingBeforeSwitch: false }));
           setAudioState(prev => ({ ...prev, isPlaying: false })); // Nezachovej stav pokud audio není připravené
         }
       } else {
         log.audio('Audio loaded, waiting for user interaction to play');
         log.audio('Autoplay conditions:', {
           shouldAutoplay: playbackState.shouldAutoplay,
           wasPlayingBeforeSwitch: playbackState.wasPlayingBeforeSwitch,
           autoplayEnabled,
           hasInteracted: audioState.hasInteracted,
           showActivation: audioState.showActivation
         });
         if (audioState.showActivation) {
           log.audio('🎵 AUTOPLAY: Blocked - audio not activated yet');
         } else if (!audioState.hasInteracted) {
           log.audio('🎵 AUTOPLAY: Blocked - no user interaction yet');
         } else if (!autoplayEnabled) {
           log.audio('🎵 AUTOPLAY: Blocked - autoplay disabled');
         }
       }
    };
    const handleEnded = () => {
      setAudioState(prev => ({ ...prev, isPlaying: false }));

      // Automatické přehrávání další skladby v albu
      if (albumTracks && albumTracks.length > 1 && onTrackChange) {
        const nextIndex = (currentTrackIndex + 1) % albumTracks.length;
        onTrackChange(nextIndex);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);

      // Cleanup fade timeout
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }

      // Cleanup fade intervals
      if (fadeOutIntervalRef.current) {
        clearInterval(fadeOutIntervalRef.current);
        fadeOutIntervalRef.current = null;
      }
      if (fadeInIntervalRef.current) {
        clearInterval(fadeInIntervalRef.current);
        fadeInIntervalRef.current = null;
      }
    };
  }, [playbackState.wasPlayingBeforeSwitch, playbackState.shouldAutoplay, autoplayEnabled, audioUrl, albumTracks, currentTrackIndex, onTrackChange, audioState.hasInteracted]);

  // Autoplay při změně tracku - pouze pokud uživatel už jednou klikl na play
  useEffect(() => {
    if (albumTracks && albumTracks.length > 1 && currentTrackIndex > 0 && audioState.hasInteracted) {
        // Pokud se mění track a uživatel už jednou klikl na play, spusť autoplay
        setPlaybackState(prev => ({ ...prev, shouldAutoplay: true, wasPlayingBeforeSwitch: true }));
    }
  }, [currentTrackIndex, albumTracks, audioState.hasInteracted]);

  // Fade out funkce
  const fadeOut = (audio, duration = 1000, callback) => {
    if (!audio) return;

    log.audio(`🎵 Starting fadeOut with duration: ${duration}ms`);
    try {
      // Vyčisti předchozí fade interval pokud existuje
      if (fadeOutIntervalRef.current) {
        clearInterval(fadeOutIntervalRef.current);
      }

      const startVolume = audio.volume;
      const fadeStep = duration > 50 ? startVolume / (duration / 50) : startVolume / 10; // Ochrana proti division by zero
      let currentVolume = startVolume;

      fadeOutIntervalRef.current = setInterval(() => {
        try {
          currentVolume -= fadeStep;
          if (currentVolume <= 0) {
            currentVolume = 0;
            audio.volume = currentVolume;
            log.audio('🎵 FadeOut completed, pausing audio');
            audio.pause();
            log.audio('🎵 Audio paused after fadeOut');
            audio.volume = startVolume; // Obnov původní hlasitost
            if (fadeOutIntervalRef.current) {
              clearInterval(fadeOutIntervalRef.current);
              fadeOutIntervalRef.current = null;
            }
            if (callback) callback();
          } else {
            audio.volume = currentVolume;
          }
        } catch (error) {
          log.error('Error in fadeOut interval:', error);
          if (fadeOutIntervalRef.current) {
            clearInterval(fadeOutIntervalRef.current);
            fadeOutIntervalRef.current = null;
          }
        }
      }, 50);

      return fadeOutIntervalRef.current;
    } catch (error) {
      log.error('Error in fadeOut:', error);
      if (callback) callback();
    }
  };

  // Fade in funkce
  const fadeIn = (audio, duration = 1000) => {
    if (!audio) return;

    log.audio(`🎵 Starting fadeIn with duration: ${duration}ms`);
    try {
      // Vyčisti předchozí fade interval pokud existuje
      if (fadeInIntervalRef.current) {
        clearInterval(fadeInIntervalRef.current);
      }

      audio.volume = 0;
      const fadeStep = duration > 50 ? 1 / (duration / 50) : 1 / 10; // Ochrana proti division by zero
      let currentVolume = 0;

      fadeInIntervalRef.current = setInterval(() => {
        try {
          currentVolume += fadeStep;
          if (currentVolume >= 1) {
            currentVolume = 1;
            audio.volume = currentVolume;
            log.audio('🎵 FadeIn completed');
            if (fadeInIntervalRef.current) {
              clearInterval(fadeInIntervalRef.current);
              fadeInIntervalRef.current = null;
            }
          } else {
            audio.volume = currentVolume;
          }
        } catch (error) {
          log.error('Error in fadeIn interval:', error);
          if (fadeInIntervalRef.current) {
            clearInterval(fadeInIntervalRef.current);
            fadeInIntervalRef.current = null;
          }
        }
      }, 50);

      return fadeInIntervalRef.current;
    } catch (error) {
      log.error('Error in fadeIn:', error);
    }
  };

  // Tyto funkce nejsou používány - odstraněny pro zjednodušení

  // Oprava stavu audio elementu po načtení - zajistí že je audio připravené k přehrávání
  const fixAudioElementState = (audio) => {
    if (!audio) return Promise.resolve();

    log.audio('🎵 Fixing audio element state after load');

    return new Promise((resolve) => {
      // Zkontroluj jestli je audio element v dobrém stavu
      if (audio.readyState >= 2) { // HAVE_CURRENT_DATA nebo vyšší
        log.audio('🎵 Audio element is ready, fixing state');

        // Zkontroluj jestli je audio paused ale mělo by hrát
        if (audio.paused && audioState.isPlaying) {
          log.audio('🎵 Audio is paused but should be playing, attempting to resume');
          audio.play().then(() => {
            log.audio('✅ Audio resumed successfully');
            resolve();
          }).catch((error) => {
            log.error('Failed to resume audio:', error);
            resolve(); // Pokračuj i při chybě
          });
        } else {
          log.audio('🎵 Audio element state is correct');
          resolve();
        }
      } else {
        log.audio('🎵 Audio element not ready, waiting for canplay event');
        const handleCanPlay = () => {
          audio.removeEventListener('canplay', handleCanPlay);
          log.audio('🎵 Audio can play, fixing state');
          resolve();
        };
        audio.addEventListener('canplay', handleCanPlay);

        // Timeout pro případ že se canplay event nespustí
        setTimeout(() => {
          audio.removeEventListener('canplay', handleCanPlay);
          log.audio('🎵 Canplay timeout, proceeding anyway');
          resolve();
        }, 3000);
      }
    });
  };

  // Centrální funkce pro audio playback - používá se ve všech funkcích
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

        // Zkus znovu po delší pauze pro lepší kompatibilitu s prohlížeči
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            log.audio(`🎵 [${context}] Retrying audio play after error (first attempt)`);
            audio.play().then(() => {
              log.audio(`✅ [${context}] Audio playing successfully on retry`);
              resolve();
            }).catch((retryError) => {
              log.error(`Failed to play audio on retry in ${context}:`, retryError);

              // Zkus ještě jednou s ještě delší pauzou
              setTimeout(() => {
                log.audio(`🎵 [${context}] Retrying audio play after error (second attempt)`);
                audio.play().then(() => {
                  log.audio(`✅ [${context}] Audio playing successfully on second retry`);
                  resolve();
                }).catch((secondRetryError) => {
                  log.error(`Failed to play audio on second retry in ${context}:`, secondRetryError);

                  // Poslední pokus s ještě delší pauzou
                  setTimeout(() => {
                    log.audio(`🎵 [${context}] Retrying audio play after error (final attempt)`);
                    audio.play().then(() => {
                      log.audio(`✅ [${context}] Audio playing successfully on final retry`);
                      resolve();
                    }).catch((finalRetryError) => {
                      log.error(`Failed to play audio on final retry in ${context}:`, finalRetryError);
                      reject(finalRetryError);
                    });
                  }, 500);
                });
              }, 300);
            });
          }, 200);
        });
      } else {
        // Pro běžné pokusy jen jeden retry
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            log.audio(`🎵 [${context}] Retrying audio play after error`);
            audio.play().then(() => {
              log.audio(`✅ [${context}] Audio playing successfully on retry`);
              resolve();
            }).catch((retryError) => {
              log.error(`Failed to play audio on retry in ${context}:`, retryError);
              reject(retryError);
            });
          }, 100);
        });
      }
    });
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    log.audio(`🎵 Toggle play/pause - currently playing: ${audioState.isPlaying}`);

    // Zkontroluj jestli je audio paused ale UI si myslí že hraje
    if (audio.paused && audioState.isPlaying) {
      log.audio('🎵 Audio is paused but UI thinks it\'s playing, syncing state');
      setAudioState(prev => ({ ...prev, isPlaying: false }));
    }

    // Zkontroluj jestli audio hraje ale UI si myslí že je paused
    if (!audio.paused && !audioState.isPlaying) {
      log.audio('🎵 Audio is playing but UI thinks it\'s paused, syncing state');
      setAudioState(prev => ({ ...prev, isPlaying: true }));
    }

    if (audioState.isPlaying) {
      // Zjednodušené zastavení
      audio.pause();
      setAudioState(prev => ({ ...prev, isPlaying: false }));
      console.log('🎵 Audio paused');
    } else {
      // Fade in při spuštění
      log.audio('🎵 Playing audio with fade in');

      // Pokud uživatel ještě neaktivoval zvuk, zkus aktivovat automaticky
      if (!audioState.hasInteracted) {
        // Pokud je audio už aktivováno globálně, použij to
        if (window.audioActivated) {
          log.audio('🎵 PRVNÍ SPUŠTĚNÍ: Audio je už aktivováno globálně, pokračuji s přehráváním...');
          setAudioState(prev => ({ ...prev, hasInteracted: true }));
          proceedWithPlay();
          return;
        }

        log.audio('🎵 PRVNÍ SPUŠTĚNÍ: Zkouším aktivovat zvuk automaticky...');

        // Zkus aktivovat audio automaticky
        try {
          // Použij globální AudioContext pokud existuje, jinak vytvoř nový
          let audioContext = window.globalAudioContext;
          if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            window.globalAudioContext = audioContext;
          }

          if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
              console.log('🎵 Audio aktivován automaticky, pokračuji s přehráváním...');
              setAudioState(prev => ({ ...prev, hasInteracted: true }));
              window.audioActivated = true;
              proceedWithPlay();
            }).catch((error) => {
              console.log('🎵 PRVNÍ SPUŠTĚNÍ: Automatická aktivace selhala');
            });
          } else {
            console.log('🎵 Audio už je aktivní, pokračuji s přehráváním...');
            setAudioState(prev => ({ ...prev, hasInteracted: true }));
            window.audioActivated = true;
            proceedWithPlay();
          }
        } catch {
          console.log('🎵 PRVNÍ SPUŠTĚNÍ: Chyba při aktivaci');
        }
        return;
      }

      log.audio('🎵 SPUŠTĚNÍ: Zvuk je aktivován, spouštím audio...');
      proceedWithPlay();

      const proceedWithPlay = () => {
        // Zjednodušený play - jen spusť audio
        audio.play().then(() => {
          setAudioState(prev => ({ ...prev, isPlaying: true }));
          setAudioState(prev => ({ ...prev, hasInteracted: true })); // Označ že uživatel už jednou klikl na play
          console.log('🎵 User interaction recorded - autoplay now enabled');
        }).catch(() => {
          console.log('🎵 Audio play failed');
          setAudioState(prev => ({ ...prev, isPlaying: false }));
        });
      };
    }
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio || !playbackState.duration || isNaN(playbackState.duration) || playbackState.duration <= 0) return;

    const currentAudioTime = audio.currentTime;
    const newTime = Math.max(0, currentAudioTime - 10);

    log.audio('Skip backward:', { currentAudioTime, newTime, duration: playbackState.duration });

    if (isFinite(newTime) && newTime >= 0) {
      audio.currentTime = newTime;
      setPlaybackState(prev => ({ ...prev, currentTime: newTime }));
    }
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio || !playbackState.duration || isNaN(playbackState.duration) || playbackState.duration <= 0) return;

    const currentAudioTime = audio.currentTime;
    const newTime = Math.min(playbackState.duration, currentAudioTime + 10);

    log.audio('Skip forward:', { currentAudioTime, newTime, duration: playbackState.duration });

    if (isFinite(newTime) && newTime >= 0) {
      audio.currentTime = newTime;
      setPlaybackState(prev => ({ ...prev, currentTime: newTime }));
    }
  };

  const handleSeek = (progressValue) => {
    const audio = audioRef.current;
    if (!audio || !playbackState.duration || isNaN(playbackState.duration) || playbackState.duration <= 0) return;

    // Aktivuj audio context při user interaction
    const audioContext = window.AudioContext || window.webkitAudioContext;
    if (audioContext) {
      const ctx = new audioContext();
      if (ctx.state === 'suspended') {
        log.audio('🎵 AudioContext suspended in handleSeek, attempting resume');
        ctx.resume().then(() => {
          log.audio('🎵 AudioContext resumed successfully in handleSeek');
        }).catch((error) => {
          log.error('Failed to resume AudioContext in handleSeek:', error);
        });
      }
    }

    try {
      // progressValue is already in percentage (0-100)
      const progress = Math.max(0, Math.min(1, progressValue / 100));
      const newTime = progress * playbackState.duration;

      // Validate newTime is finite
      if (isFinite(newTime) && newTime >= 0) {
        // Fade out, změň pozici, fade in
        const wasPlaying = audioState.isPlaying;

        if (wasPlaying) {
          fadeOut(audio, 300, () => {
            audio.currentTime = newTime;
            setPlaybackState(prev => ({ ...prev, currentTime: newTime }));
            if (wasPlaying) {
              playAudio('seek').then(() => {
                fadeIn(audio, 300);
                log.audio('✅ Seek and resume successful');
              }).catch((error) => {
                log.error('Failed to resume after seek:', error);
                log.audio('⚠️ Seek successful but resume failed');
              });
            }
          });
        } else {
          audio.currentTime = newTime;
          setPlaybackState(prev => ({ ...prev, currentTime: newTime }));
          log.audio('✅ Seek successful');
        }
      }
    } catch (error) {
      log.error('Error in handleSeek:', error);
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = playbackState.duration > 0 ? (playbackState.currentTime / playbackState.duration) * 100 : 0;



  // Funkce pro fade out při zavření přehrávače
  const fadeOutAndClose = (onClose, duration = 3000) => {
    const audio = audioRef.current;

    // Zavři přehrávač okamžitě
    onClose();

    // Pokud je audio a přehrává se, spusť fade out na pozadí
    if (audio && audioState.isPlaying) {
      fadeOut(audio, duration, () => {
        // Po dokončení fade out nic nedělej - přehrávač už je zavřený
        log.audio('Background fade out completed');
      });
    }
  };

  return {
    audioRef,
    isPlaying: audioState.isPlaying,
    currentTime: playbackState.currentTime,
    duration: playbackState.duration,
    isLoading: playbackState.isLoading,
    progress,
    togglePlayPause,
    skipBackward,
    skipForward,
    handleSeek,
    formatTime,
    fadeOutAndClose,
    hasError: playbackState.hasError,
    errorMessage: playbackState.errorMessage
  };
};
