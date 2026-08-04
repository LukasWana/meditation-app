import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import FramerSection from '@components/FramerSection';
import FramerPageTransition from '@components/FramerPageTransition';
import BackButton from '@components/BackButton';
import { AudioPlayer } from '@features/audio';
import { AlbumGrid } from '../components';
import { useHudbaScreenData } from '../hooks';
import { useLanguage } from '@contexts/LanguageContext';
import { useTheme } from '@contexts/ThemeContext';


const HudbaScreen = ({
  onNavigateToScreen,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onPlayerStateChange
}) => {
  const [activeAudio, setActiveAudio] = useState(null);
  const { t } = useLanguage();
  const { getScreenBackgroundColor } = useTheme();

  // Hlavní logika pro data HudbaScreen
  const {
    hudbaItems,
    isLoading,
    error,
    stats,
    isLoadingCovers,
    isLoadingDurations: _isLoadingDurations,
    getDisplayDuration
  } = useHudbaScreenData();

  // Debug: zobraz stav načítání
  useEffect(() => {
    console.log('🎵 HudbaScreen state:', {
      hudbaItemsLength: hudbaItems?.length || 0,
      isLoading,
      error,
      stats
    });
  }, [hudbaItems, isLoading, error, stats]);

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
      // Pro samostatné skladby - vytvoř "album" s jednou skladbou pro autoplay
      setActiveAudio({
        ...item,
        albumCover: item.coverImage,
        albumTracks: [{
          audioSrc: item.audioSrc,
          trackName: item.title,
          fileName: item.fileName
        }],
        currentTrackIndex: 0
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
    <FramerPageTransition screenKey="hudba">
      <div
        className="min-h-screen w-full max-w-full flex flex-col items-center justify-start p-2 sm:p-8 pb-20 overflow-x-hidden relative"
        style={{ backgroundColor: getScreenBackgroundColor() }}
        onTouchStart={activeAudio ? undefined : onTouchStart}
        onTouchMove={activeAudio ? undefined : onTouchMove}
        onTouchEnd={activeAudio ? undefined : onTouchEnd}
      >
        <BackButton
          onClick={() => onNavigateToScreen('home')}
          className={activeAudio ? 'pointer-events-none opacity-50' : ''}
        />

        <div className="max-w-md w-full" style={{ marginTop: '5rem', paddingTop: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <FramerSection
            className="text-center mb-6"
            animationType="fadeIn"
            delay={0.1}
          >
            <div style={{ height: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h1 className="text-4xl font-light" style={{ minHeight: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('hudba')}
              </h1>
            </div>

            {/* Loading indikátory - Hidden */}
            {/* {(isLoadingCovers || isLoadingDurations) && (
              <div className="mt-4 text-sm text-gray-600">
                {isLoadingCovers && <div>🖼️ Načítám obrázky alb...</div>}
                {isLoadingDurations && <div>⏱️ Načítám délky skladeb...</div>}
              </div>
            )} */}
            {/* <p className="text-xl text-center text-gray-700 mb-8">
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

          <AlbumGrid
            hudbaItems={hudbaItems}
            activeAudio={activeAudio}
            onItemClick={handleItemClick}
            getDisplayDuration={getDisplayDuration}
            isLoadingCovers={isLoadingCovers}
          />

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
              autoplayEnabled={true}
            />
          )}
        </AnimatePresence>

        {/* Duration Tests - pouze v development módu */}
      </div>
    </FramerPageTransition>
  );
};

export default HudbaScreen;