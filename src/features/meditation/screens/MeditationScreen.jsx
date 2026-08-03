import React, { useState, useMemo, useEffect } from 'react';
import cacheService from '@services/cacheServiceRefactored';
import { AnimatePresence } from 'framer-motion';
import FramerButton from '@components/FramerButton';
import FramerSection from '@components/FramerSection';
import FramerPageTransition from '@components/FramerPageTransition';
import BackButton from '@components/BackButton';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
import { storage, ensureFirebase } from '@config/secure-firebase';
import { ref as fbRef, getDownloadURL as fbGetDownloadURL } from 'firebase/storage';
// Odstraněny skeleton loadery
import { AudioPlayer } from '@features/audio';
// Preloadery odstraněny - data se načítají při startu
import { useRealtimeMeditationFilter } from '@features/audio/hooks';

import { useUserPrefsStore } from '@stores/userPrefsStore';
import { useAudioPlayerStore } from '@stores/audioPlayerStore';

const getAudioDuration = (audioSrc, retries = 3) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    let timeoutId;
    let isResolved = false;

    const cleanup = () => {
      if (isResolved) return;
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      if (timeoutId) clearTimeout(timeoutId);
      audio.src = '';
      audio.load();
    };

    const resolveOnce = (value) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve(value);
    };

    const onLoadedMetadata = () => {
      const duration = audio.duration;
      if (isFinite(duration) && duration > 0) {
        resolveOnce(duration);
      } else {
        resolveOnce(null);
      }
    };

    const onError = () => {
      if (retries > 1) {
        cleanup();
        setTimeout(() => {
          getAudioDuration(audioSrc, retries - 1).then(resolveOnce);
        }, 1000 * (4 - retries));
      } else {
        resolveOnce(null);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);

    timeoutId = setTimeout(() => {
      resolveOnce(null);
    }, 10000);

    audio.src = audioSrc;
  });
};

const MeditationScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) => {
  const { gender } = useUserPrefsStore();
  const { setPlayerActive } = useAudioPlayerStore();
  const [activeAudio, setActiveAudio] = useState(null);
  const { t, language } = useLanguage();
  const { getScreenBackgroundColor } = useTheme();

  // Stabilizuj language hodnotu
  const normalizedLanguage = useMemo(() => language.toLowerCase(), [language]);

  // Použij nový Realtime Database filtrovací systém - inicializováno nahoře kvůli TDZ
  const { meditationItems, isLoading, error, audioFiles } = useRealtimeMeditationFilter(gender, normalizedLanguage);

  const [durations, setDurations] = useState(new Map());

  // Funkce pro formátování délky v sekundách na MM:SS
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 'N/A') return 'N/A';
    if (typeof seconds === 'string' && seconds.includes(':')) {
      return seconds;
    }
    if (typeof seconds === 'number' && seconds > 0) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return 'N/A';
  };

  // Statický fallback pro časy meditací, pokud selže načtení ze sítě i cache
  const getStaticFallbackDuration = (fileName) => {
    if (!fileName) return '12:00';
    const lower = fileName.toLowerCase();
    if (lower.includes('uzkost') || lower.includes('osamelost')) return '14:25';
    if (lower.includes('strach')) return '12:40';
    if (lower.includes('stres') || lower.includes('praca')) return '11:15';
    if (lower.includes('spank') || lower.includes('spanok')) return '18:50';
    if (lower.includes('depres') || lower.includes('depresia')) return '15:30';
    if (lower.includes('relax') || lower.includes('relaxacia')) return '13:10';
    return '12:00';
  };

  // Funkce pro získání zobrazené délky s fallbacky
  const getDisplayDuration = (item) => {
    const audioSrc = item.audioSrc || item.fileName;
    if (audioSrc && durations.has(audioSrc)) {
      return formatDuration(durations.get(audioSrc));
    }
    if (audioSrc) {
      const cachedDuration = cacheService.getDuration(audioSrc);
      if (cachedDuration && cachedDuration !== 'N/A' && cachedDuration > 0) {
        return formatDuration(cachedDuration);
      }
    }
    if (item.duration && item.duration !== 'N/A') {
      return formatDuration(item.duration);
    }
    return getStaticFallbackDuration(audioSrc || item.title);
  };

  // Načti cached durations do state
  useEffect(() => {
    if (meditationItems && meditationItems.length > 0) {
      const newDurations = new Map();
      meditationItems.forEach((item) => {
        const audioSrc = item.audioSrc || item.fileName;
        if (audioSrc) {
          const cachedDuration = cacheService.getDuration(audioSrc);
          if (cachedDuration && cachedDuration !== 'N/A' && cachedDuration > 0) {
            newDurations.set(audioSrc, cachedDuration);
          }
        }
      });
      if (newDurations.size > 0) {
        setDurations(prev => {
          const combined = new Map(prev);
          newDurations.forEach((duration, audioSrc) => {
            combined.set(audioSrc, duration);
          });
          return combined;
        });
      }
    }
  }, [meditationItems]);

  // Načti délky na pozadí
  useEffect(() => {
    if (!meditationItems || meditationItems.length === 0 || isLoading) return;

    let isMounted = true;
    const loadingSet = new Set();

    const loadDurations = async () => {
      await ensureFirebase();
      for (const item of meditationItems) {
        if (!isMounted) break;
        const audioSrc = item.audioSrc || item.fileName;

        if (audioSrc) {
          const hasCachedDuration = cacheService.getDuration(audioSrc) || durations.has(audioSrc);
          const hasMetadataDuration = item.duration && item.duration !== 'N/A';

          if (!hasCachedDuration && !hasMetadataDuration && !loadingSet.has(audioSrc)) {
            loadingSet.add(audioSrc);
            try {
              // Získání reálné download URL z Firebase Storage, pokud je audioSrc jen relativní cesta
              let playUrl = audioSrc;
              if (audioSrc && !audioSrc.startsWith('http') && !audioSrc.startsWith('blob:')) {
                try {
                  const audioRef = fbRef(storage, audioSrc);
                  playUrl = await fbGetDownloadURL(audioRef);
                } catch (e) {
                  console.warn('Failed to get Firebase download URL for duration:', e);
                }
              }

              if (playUrl && (playUrl.startsWith('http') || playUrl.startsWith('blob:'))) {
                const duration = await getAudioDuration(playUrl);
                if (!isMounted) return;

                if (duration && duration > 0) {
                  cacheService.setDuration(audioSrc, duration);
                  setDurations(prev => {
                    if (!isMounted) return prev;
                    const newMap = new Map(prev);
                    newMap.set(audioSrc, duration);
                    return newMap;
                  });
                }
              }
            } catch (error) {
              console.warn(`Failed to load duration for ${item.title}:`, error);
            } finally {
              loadingSet.delete(audioSrc);
            }
          }
        }
      }
    };

    loadDurations();

    return () => {
      isMounted = false;
      loadingSet.clear();
    };
  }, [meditationItems, isLoading]); // Odstraněno 'durations' pro zamezení nekonečného restartování smyčky

  // Preloading odstraněn - data se načítají při startu aplikace

  const handleItemClick = (item) => {
    // Použij audioSrc nebo fileName jako fallback
    const audioSrc = item.audioSrc || item.fileName;
    if (audioSrc) {
      // Extrahuj gender z parsed nebo přímo z item
      const gender = item.parsed?.gender || item.gender || null;

      // Vytvoř "album" s jednou skladbou pro autoplay funkcionalitu
      setActiveAudio({
        audioSrc: audioSrc,
        title: item.title,
        fileName: item.fileName || item.audioSrc,
        gender: gender, // Předaj gender pro ukládání do historie
        albumTracks: [{
          audioSrc: audioSrc,
          trackName: item.title,
          fileName: item.fileName || item.audioSrc
        }],
        currentTrackIndex: 0,
        allFiles: item.allFiles || [] // Předaj všechny soubory pro dané téma
      });
      setPlayerActive(true); // Informuj o aktivním přehrávači
    }
  };

  const handleCloseAudio = () => {
    setActiveAudio(null);
    setPlayerActive(false); // Informuj o zavřeném přehrávači
  };

  // Loading state - show loading during data fetch
  if (isLoading) {
    return (
      <FramerPageTransition screenKey="meditace">
        <div
          className="min-h-screen w-full max-w-full flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative"
          style={{ backgroundColor: getScreenBackgroundColor() }}
        >
          <BackButton onClick={() => onNavigateToScreen('home')} />
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
            <p className="text-xl text-gray-700">Načítám meditácie...</p>
          </div>
        </div>
      </FramerPageTransition>
    );
  }

  // Error state
  if (error) {
    return (
      <FramerPageTransition screenKey="meditace">
        <div
          className="min-h-screen w-full max-w-full flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative"
          style={{ backgroundColor: getScreenBackgroundColor() }}
        >
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
    <FramerPageTransition screenKey="meditace">
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ backgroundColor: getScreenBackgroundColor() }}
        onTouchStart={activeAudio ? undefined : onTouchStart}
        onTouchMove={activeAudio ? undefined : onTouchMove}
        onTouchEnd={activeAudio ? undefined : onTouchEnd}
      >
        {/* Top row with Back Button, Dropdowns and Settings */}
        <div 
          className="absolute left-4 right-4 flex items-center justify-between z-10 px-2"
          style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        >
          {/* Left - Back Button */}
          <div className="flex-shrink-0">
            <button
              onClick={() => onNavigateToScreen('home')}
              className={`w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-black/10 hover:bg-white/30 flex items-center justify-center p-0 transition-colors ${activeAudio ? 'pointer-events-none opacity-50' : ''
                }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-w-md w-full" style={{ marginTop: '4rem', paddingTop: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('slova')}
              </h1>
            </div>
            <p className="text-xl text-center text-gray-700 mb-8">
              {t('mluvene')}
            </p>



            {/* Zobraz statistiky pro uživatele - ZAKOMENTOVÁNO kvůli poskakování */}
            {/* {userStats && (
              <div className="text-center mb-8 p-4 bg-white/30 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Dostupné meditácie: {userStats.filteredForUser} z {userStats.totalAvailable}
                </p>
                <p className="text-xs text-gray-500 mb-1 h-4 flex items-center justify-center">
                  {gender === 'none' ? 'Obecný obsah' :
                   gender === 'female' ? 'Personalizované pro ženy' :
                   'Personalizované pro muže'}
                </p>
                {userStats.lastUpdated && (
                  <p className="text-xs text-gray-400">
                    Aktualizováno: {new Date(userStats.lastUpdated).toLocaleTimeString('sk-SK')}
                  </p>
                )}
              </div>
            )} */}
          </FramerSection>

          <div className="space-y-4">
            {meditationItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">Žiadne meditácie nie sú dostupné</p>
                <p className="text-gray-500 text-sm mt-2">Skúste zmeniť nastavenia v menu</p>
              </div>
            ) : (
              meditationItems.map((item, idx) => (
                <FramerSection
                  key={item.key || idx}
                  animationType="slideInUp"
                  delay={0.2 + idx * 0.1}
                >
                  <FramerButton
                    variant="ghost"
                    className={`w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10 cv-auto-card ${activeAudio ? 'pointer-events-none opacity-50' : ''
                      }`}
                    onClick={activeAudio ? undefined : () => handleItemClick(item)}
                  // Hover preloading odstraněn
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h3 className="text-2xl font-light">
                            {item.title}
                          </h3>
                          {/* {item.voiceInfo && (
                            <p className="text-sm text-gray-500 mt-1">
                              {item.voiceInfo}
                            </p>
                          )} */}
                        </div>
                      </div>
                       <div className="flex items-center space-x-3">
                        <span className="text-2xl font-light text-gray-500">
                          {getDisplayDuration(item)}
                        </span>
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
              fileName={activeAudio.fileName}
              gender={activeAudio.gender}
              onClose={handleCloseAudio}
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
              allFiles={activeAudio.allFiles || []}
              autoplayEnabled={true}
            />
          )}
        </AnimatePresence>
      </div>
    </FramerPageTransition>
  );
};

export default MeditationScreen;
