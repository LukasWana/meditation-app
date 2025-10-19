import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';
import { AudioPlayer } from '@features/audio';
import { useFirebaseHudbaFilter } from '@features/audio/hooks/useFirebaseHudbaFilter';
import { log } from '@services/logger';
import cacheService from '@services/cacheServiceRefactored';

// Vylepšená funkce pro načtení duration s retry logikou
const getAudioDuration = (audioSrc, retries = 3) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    let timeoutId;

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const onLoadedMetadata = () => {
      cleanup();
      const duration = audio.duration;
      if (isFinite(duration) && duration > 0) {
        log.debug(`✅ Duration loaded successfully: ${duration}s`);
        resolve(duration); // Vrať duration v sekundách, ne jako string
      } else {
        log.warn(`Invalid duration received: ${duration}`);
        resolve(null);
      }
    };

    const onError = () => {
      cleanup();
      log.warn(`Audio loading failed for ${audioSrc}, retries left: ${retries - 1}`);
      if (retries > 1) {
        // Retry s exponenciálním backoff
        setTimeout(() => {
          getAudioDuration(audioSrc, retries - 1).then(resolve);
        }, 1000 * (4 - retries)); // 1s, 2s, 3s
      } else {
        resolve(null);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);

    // Timeout po 10 sekundách
    timeoutId = setTimeout(() => {
      cleanup();
      log.warn(`Timeout loading duration for ${audioSrc}`);
      resolve(null);
    }, 10000);

    audio.src = audioSrc;
  });
};

const HudbaScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  gender = 'none',
  onPlayerStateChange
}) => {
  const [activeAudio, setActiveAudio] = useState(null);
  const [durations, setDurations] = useState(new Map());

  // Funkce pro získání zobrazené délky skladby s vylepšenými fallback mechanismy
  const getDisplayDuration = (item) => {
    console.log(`🎵 Getting duration for ${item.title}:`, {
      audioSrc: item.audioSrc,
      metadataDuration: item.duration,
      hasStateDuration: item.audioSrc ? durations.has(item.audioSrc) : false,
      stateDuration: item.audioSrc ? durations.get(item.audioSrc) : null
    });

    // 1. Nejdříve zkus načíst z durations state (nejrychlejší)
    if (item.audioSrc && durations.has(item.audioSrc)) {
      const duration = durations.get(item.audioSrc);
      console.log(`🎵 Using state duration for ${item.title}: ${duration}s`);
      return formatDuration(duration);
    }

    // 2. Pak zkus načíst z persistentní cache (localStorage)
    if (item.audioSrc) {
      const cachedDuration = cacheService.getDuration(item.audioSrc);
      console.log(`🎵 Cached duration for ${item.title}:`, cachedDuration);
      if (cachedDuration && cachedDuration !== 'N/A' && cachedDuration > 0) {
        console.log(`🎵 Using persistent cached duration for ${item.title}: ${cachedDuration}s`);
        // Aktualizuj state pro budoucí použití
        setDurations(prev => new Map(prev).set(item.audioSrc, cachedDuration));
        return formatDuration(cachedDuration);
      }
    }

    // 3. Fallback na původní duration z metadata
    if (item.duration && item.duration !== 'N/A') {
      console.log(`🎵 Using metadata duration for ${item.title}: ${item.duration}`);
      return item.duration;
    }

    // 4. Poslední fallback - zkus načíst z static metadata
    if (item.fileName) {
      const staticMetadata = cacheService.getMetadata(item.fileName);
      console.log(`🎵 Static metadata for ${item.title}:`, staticMetadata);
      if (staticMetadata && staticMetadata.duration && staticMetadata.duration !== 'N/A') {
        console.log(`🎵 Using static metadata duration for ${item.title}: ${staticMetadata.duration}`);
        return staticMetadata.duration;
      }
    }

    // 5. Konečný fallback
    console.log(`🎵 No duration found for ${item.title}, using N/A`);
    return 'N/A';
  };

  // Funkce pro formátování délky v sekundách na MM:SS
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 'N/A') return 'N/A';

    // Pokud už je string ve formátu MM:SS, vrať ho
    if (typeof seconds === 'string' && seconds.includes(':')) {
      return seconds;
    }

    // Pokud je to číslo (sekundy), převeď na MM:SS
    if (typeof seconds === 'number' && seconds > 0) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    return 'N/A';
  };

  // Použij hudební filtrovací systém z Firebase
  const { hudbaItems, isLoading, error, stats, isLoadingCovers, isLoadingDurations } = useFirebaseHudbaFilter();

  // Debug logging s informacemi o cache
  React.useEffect(() => {
    log.debug('HudbaScreen state:', {
      isLoading,
      error,
      itemsCount: hudbaItems?.length || 0,
      stats,
      durationsStateSize: durations.size,
      cacheStats: cacheService.getStats ? cacheService.getStats() : 'N/A'
    });

    // Debug: vypiš detaily každé položky s duration informacemi
    if (hudbaItems && hudbaItems.length > 0) {
      hudbaItems.forEach((item, index) => {
        const cachedDuration = item.audioSrc ? cacheService.getDuration(item.audioSrc) : null;
        const stateDuration = item.audioSrc ? durations.get(item.audioSrc) : null;

        log.debug(`🎵 Item ${index + 1}:`, {
          title: item.title,
          type: item.type,
          metadataDuration: item.duration,
          cachedDuration: cachedDuration,
          stateDuration: stateDuration,
          displayDuration: getDisplayDuration(item),
          tracks: item.tracks?.length || 'N/A',
          audioSrc: !!item.audioSrc
        });
      });
    }
  }, [isLoading, error, hudbaItems, stats, durations]);

  // Načti délky skladeb po načtení UI s vylepšenou logikou
  React.useEffect(() => {
    if (hudbaItems && hudbaItems.length > 0 && !isLoading) {
      log.debug('🔄 Loading durations for songs...');

      hudbaItems.forEach(async (item) => {
        if (item.type === 'song' && item.audioSrc) {
          // Zkontroluj, jestli už máme duration v cache nebo state
          const hasCachedDuration = cacheService.getDuration(item.audioSrc) || durations.has(item.audioSrc);
          const hasMetadataDuration = item.duration && item.duration !== 'N/A';

          // Načti duration pouze pokud ho nemáme
          if (!hasCachedDuration && !hasMetadataDuration) {
            try {
              const duration = await getAudioDuration(item.audioSrc);
              if (duration && duration > 0) {
                log.debug(`⏱️ Duration loaded for ${item.title}: ${duration}s`);
                // Ulož do persistentní cache
                cacheService.setDuration(item.audioSrc, duration);
                // Aktualizuj state pro okamžité zobrazení
                setDurations(prev => new Map(prev).set(item.audioSrc, duration));
              }
            } catch (error) {
              log.warn(`Failed to load duration for ${item.title}:`, error);
            }
          } else {
            log.debug(`⏱️ Duration already available for ${item.title}`);
          }
        }
      });
    }
  }, [hudbaItems, isLoading]);

  const handleItemClick = (item) => {
    if (item.type === 'album') {
      // Spusť první skladbu z alba
      if (item.tracks && item.tracks.length > 0) {
        const firstTrack = item.tracks[0];
        setActiveAudio({
          audioSrc: firstTrack.audioSrc,
          title: firstTrack.trackName,
          fileName: firstTrack.fileName,
          albumCover: item.coverImage,
          albumTracks: item.tracks,
          currentTrackIndex: 0
        });
        onPlayerStateChange?.(true);
      }
    } else if (item.type === 'song' || item.audioSrc) {
      // Pro samostatné skladby nebo jednotlivé skladby
      setActiveAudio({
        ...item,
        albumCover: item.coverImage // Předaj cover obrázek
      });
      onPlayerStateChange?.(true);
    }
  };

  const handleCloseAudio = () => {
    setActiveAudio(null);
    onPlayerStateChange?.(false);
  };

  // Loading state - Hidden, show content immediately
  // if (isLoading) {
  //   return (
  //     <FramerPageTransition screenKey="hudba">
  //       <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
  //         <BackButton onClick={() => onNavigateToScreen('home')} />
  //         <div className="text-center">
  //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
  //           <p className="text-xl text-gray-700">Načítám hudbu...</p>
  //         </div>
  //       </div>
  //     </FramerPageTransition>
  //   );
  // }

  // Error state
  if (error) {
    return (
      <FramerPageTransition screenKey="hudba">
        <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center">
            <p className="text-xl text-red-600 mb-4">Chyba při načítání</p>
            <p className="text-gray-700">{error}</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  return (
    <FramerPageTransition screenKey="hudba">
      <div
        className={`min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative ${
          activeAudio ? 'pointer-events-none' : ''
        }`}
        onTouchStart={activeAudio ? undefined : onTouchStart}
        onTouchMove={activeAudio ? undefined : onTouchMove}
        onTouchEnd={activeAudio ? undefined : onTouchEnd}
      >
        <BackButton
          onClick={() => onNavigateToScreen('home')}
          className={activeAudio ? 'pointer-events-none opacity-50' : ''}
        />

        <div className="max-w-md w-full mt-16">
          <FramerSection
            className="text-center mb-8"
            animationType="fadeIn"
            delay={0.1}
          >
            <h1 className="text-6xl font-light" style={{fontFamily: 'Playfair Display'}}>
              hudba
            </h1>

            {/* Loading indikátory - Hidden */}
            {/* {(isLoadingCovers || isLoadingDurations) && (
              <div className="mt-4 text-sm text-gray-600">
                {isLoadingCovers && <div>🖼️ Načítám obrázky alb...</div>}
                {isLoadingDurations && <div>⏱️ Načítám délky skladeb...</div>}
              </div>
            )} */}
            {/* <p className="text-xl text-center text-gray-700 mb-8" style={{fontFamily: 'Playfair Display'}}>
              hudobné meditácie a relaxačné zvuky
            </p> */}

            {/* Zobraz statistiky - ZAKOMENTOVÁNO */}
            {/* {stats && (
              <div className="text-center mb-8 p-4 bg-white/30 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Dostupné skladby: {stats.availableFiles} z {stats.totalFiles}
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  Hudební meditace a relaxační zvuky
                </p>
                {stats.lastUpdated && (
                  <p className="text-xs text-gray-400">
                    Aktualizováno: {new Date(stats.lastUpdated).toLocaleTimeString('sk-SK')}
                  </p>
                )}
              </div>
            )} */}
          </FramerSection>

          <div className="space-y-4">
            {hudbaItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">Žiadne skladby nie sú dostupné</p>
                <p className="text-gray-500 text-sm mt-2">Skúste zmeniť nastavenia v menu</p>
              </div>
            ) : (
              hudbaItems.map((item, idx) => (
                <FramerSection
                  key={item.key || idx}
                  animationType="slideInUp"
                  delay={0.2 + idx * 0.1}
                >
                  <FramerButton
                    variant="ghost"
                    className={`w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10 ${
                      activeAudio ? 'pointer-events-none opacity-50' : ''
                    }`}
                    onClick={activeAudio ? undefined : () => handleItemClick(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {item.type === 'album' && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            {item.coverImage ? (
                              <img
                                src={item.coverImage}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500">
                                {isLoadingCovers ? (
                                  <div className="animate-spin text-lg">⏳</div>
                                ) : (
                                  <div className="text-2xl">🎵</div>
                                )}
                              </div>
                            )}
                            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500" style={{display: 'none'}}>
                              <div className="text-2xl">🎵</div>
                            </div>
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-2xl font-light" style={{fontFamily: 'Playfair Display'}}>
                            {item.title}
                          </h3>
                          {item.type === 'album' && (
                            <p className="text-sm text-gray-500 mt-1">
                              Album • {item.tracks.length} skladieb
                            </p>
                          )}
                          {item.type === 'song' && (
                            <p className="text-sm text-gray-500 mt-1">
                              Skladba • {getDisplayDuration(item)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {item.type === 'song' && (
                          <span className="text-2xl font-light text-gray-500" style={{fontFamily: 'Playfair Display'}}>
                            {getDisplayDuration(item)}
                          </span>
                        )}
                        {item.type === 'album' && (
                          <span className="text-2xl font-light text-gray-500" style={{fontFamily: 'Playfair Display'}}>
                            {item.totalDuration}
                          </span>
                        )}
                      </div>
                    </div>
                  </FramerButton>
                </FramerSection>
              ))
            )}
          </div>

        </div>

        {/* Audio Player Modal */}
        <AnimatePresence>
          {activeAudio && (
            <AudioPlayer
              key="audio-player"
              audioSrc={activeAudio.audioSrc}
              title={activeAudio.title}
              onClose={handleCloseAudio}
              albumCover={activeAudio.albumCover}
              albumTracks={activeAudio.albumTracks}
              currentTrackIndex={activeAudio.currentTrackIndex}
              onTrackChange={(newIndex) => {
                if (activeAudio.albumTracks && activeAudio.albumTracks[newIndex]) {
                  const track = activeAudio.albumTracks[newIndex];
                  setActiveAudio({
                    ...activeAudio,
                    audioSrc: track.audioSrc,
                    title: track.trackName,
                    fileName: track.fileName,
                    currentTrackIndex: newIndex
                  });
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Duration Tests - pouze v development módu */}
      </div>
    </FramerPageTransition>
  );
};

export default HudbaScreen;