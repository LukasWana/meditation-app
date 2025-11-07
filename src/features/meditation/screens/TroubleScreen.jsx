import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FramerButton, FramerSection, FramerPageTransition, BackButton } from '@components';
import { AudioPlayer } from '@features/audio';
import { useFirebaseAudioFilter } from '@features/audio/hooks/useFirebaseAudioFilter';
import { useLanguage } from '@contexts/LanguageContext';

const MeditaceTroubleScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  gender = 'none', // Přidáme gender prop pro filtrování
  onPlayerStateChange // Callback pro předání stavu přehrávače
}) => {
  const [activeAudio, setActiveAudio] = useState(null);

  const { t } = useLanguage();

  // Použij nový filtrovací systém
  const { troubleItems: meditaceItems, isLoading, error, userStats, audioFiles } = useFirebaseAudioFilter(gender);

  const handleItemClick = (item) => {
    // Použij audioSrc nebo fileName jako fallback
    const audioSrc = item.audioSrc || item.fileName;
    if (audioSrc) {
      // Vytvoř "album" s jednou skladbou pro autoplay funkcionalitu
      setActiveAudio({
        audioSrc: audioSrc,
        title: item.title,
        fileName: item.fileName || item.audioSrc,
        albumTracks: [{
          audioSrc: audioSrc,
          trackName: item.title,
          fileName: item.fileName || item.audioSrc
        }],
        currentTrackIndex: 0
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
        <div className="min-h-screen w-full max-w-full bg-[#f4ddc4] flex flex-col items-center justify-center p-2 sm:p-8 pb-20 overflow-x-hidden relative">
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
    <FramerPageTransition screenKey="meditace">
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
            <h1 className="text-6xl font-light">
              {t('meditace')}
            </h1>
            <p className="text-xl text-center text-gray-700 mb-8">
              {t('mluvene')}
            </p>

            {/* Zobraz statistiky pro uživatele */}
            {userStats && (
              <div className="text-center mb-8 p-4 bg-white/30 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Dostupné meditácie: {userStats.filteredForUser} z {userStats.totalAvailable}
                </p>
                <p className="text-xs text-gray-500 mb-1">
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
            )}
          </FramerSection>

          <div className="space-y-4">
            {meditaceItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">Žiadne meditácie nie sú dostupné</p>
                <p className="text-gray-500 text-sm mt-2">Skúste zmeniť nastavenia v menu</p>
              </div>
            ) : (
              meditaceItems.map((item, idx) => (
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
              allFiles={audioFiles}
              autoplayEnabled={true}
            />
          )}
        </AnimatePresence>
      </div>
    </FramerPageTransition>
  );
};

export default MeditaceTroubleScreen;
