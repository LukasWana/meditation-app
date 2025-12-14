import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';
// Odstraněny skeleton loadery
import { AudioPlayer } from '@features/audio';
// Preloadery odstraněny - data se načítají při startu
import { useRealtimeMeditationFilter } from '@hooks/useRealtimeMeditationFilter';

const MeditationScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  gender = 'none', // Přidáme gender prop pro filtrování
  onPlayerStateChange, // Callback pro předání stavu přehrávače
  onGenderChange // Callback pro změnu pohlaví
}) => {
  const [activeAudio, setActiveAudio] = useState(null);
  const { t, language } = useLanguage();
  const { getScreenBackgroundColor } = useTheme();

  // Debug: zobraz aktuální jazyk a gender
  console.log(`🔍 MeditationScreen - Current language: ${language}`);
  console.log(`🔍 MeditationScreen - Current gender: ${gender}`);

  // Stabilizuj language hodnotu
  const normalizedLanguage = useMemo(() => language.toLowerCase(), [language]);

  // Použij nový Realtime Database filtrovací systém
  const { meditationItems, isLoading, error, audioFiles } = useRealtimeMeditationFilter(gender, normalizedLanguage);

  // Debug: zobraz informace o načtených datech
  console.log(`🔍 MeditationScreen - meditationItems:`, meditationItems);
  console.log(`🔍 MeditationScreen - isLoading:`, isLoading);
  console.log(`🔍 MeditationScreen - error:`, error);
  console.log(`🔍 MeditationScreen - audioFiles:`, audioFiles);

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
      onPlayerStateChange?.(true); // Informuj o aktivním přehrávači
    }
  };

  const handleCloseAudio = () => {
    setActiveAudio(null);
    onPlayerStateChange?.(false); // Informuj o zavřeném přehrávači
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
        className={`min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative ${
          activeAudio ? 'pointer-events-none' : ''
        }`}
        style={{ backgroundColor: getScreenBackgroundColor() }}
        onTouchStart={activeAudio ? undefined : onTouchStart}
        onTouchMove={activeAudio ? undefined : onTouchMove}
        onTouchEnd={activeAudio ? undefined : onTouchEnd}
      >
        {/* Top row with Back Button, Dropdowns and Settings */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 px-2">
          {/* Left - Back Button */}
          <div className="flex-shrink-0">
            <button
              onClick={() => onNavigateToScreen('home')}
              className={`w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-black/10 hover:bg-white/30 flex items-center justify-center p-0 transition-colors ${
                activeAudio ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
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
                    className={`w-full p-6 text-left bg-white/50 backdrop-blur rounded-none border border-black/10 ${
                      activeAudio ? 'pointer-events-none opacity-50' : ''
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
                          {item.duration}
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
